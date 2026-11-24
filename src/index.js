


const dns = require("node:dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const { createAdapter } = require("@socket.io/redis-adapter");
const cors = require("cors");
const helmet = require("helmet");
const app = express();
const connectDB = require("./Config/db");
const errorMiddleware = require("./Middlewares/errorMiddleware");
const { ipLimiter } = require("./Middlewares/rateLimiter");

const authRoute = require("./Routes/authRoutes");
const userRoute = require("./Routes/userRoutes");
const articleRoute = require("./Routes/articleRoutes");
const postRoute = require("./Routes/postRoutes");
const discoverRoute = require("./Routes/discoverRoutes");
const aiRoute = require("./Routes/aiRoutes");
const dashboardRoute = require("./Routes/dashboardRoutes");


let dbConnectionPromise = null;
async function ensureDB() {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (!dbConnectionPromise) {
        dbConnectionPromise = connectDB().catch((error) => {
            dbConnectionPromise = null;
            throw error;
        });
    }

    return dbConnectionPromise;
}


app.use(helmet());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173"
    ].filter(Boolean),
    credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(ipLimiter);


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL,
            "http://localhost:5173"
        ].filter(Boolean),
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true
    }
});


if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is missing in environment variables");
}

const redisPubClient = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: null
});

const redisSubClient = redisPubClient.duplicate();

redisPubClient.on("error", (error) => {
    console.error("Redis Publisher Error:", error);
});

redisSubClient.on("error", (error) => {
    console.error("Redis Subscriber Error:", error);
});


const redisReady = (async () => {
    await Promise.all([
        redisPubClient.connect(),
        redisSubClient.connect()
    ]);

    io.adapter(
        createAdapter(redisPubClient, redisSubClient)
    );

    console.log("Redis Adapter Connected Successfully");
})();


io.use(async (socket, next) => {
    try {
        await redisReady;
        next();
    } catch (error) {
        next(new Error("Redis connection failed"));
    }
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    const token = socket.handshake.auth.token;

    if (!token) {
        return socket.disconnect();
    }

    try {
        const decodeToken = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const userId = decodeToken.id.toString();

        socket.join(userId);
    } catch (error) {
        socket.disconnect();
    }

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});


app.use(async (req, res, next) => {
    try {
        await Promise.all([
            ensureDB(),
            redisReady
        ]);

        next();
    } catch (error) {
        next(error);
    }
});

app.use((req, res, next) => {
    req.io = io;
    next();
});


app.get("/", (req, res) => {
    res.send("<h1>Welcome To Our Website</h1>");
});
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/article", articleRoute);
app.use("/api/post", postRoute);
app.use("/api/discover", discoverRoute);
app.use("/api/ai", aiRoute);
app.use("/api/dashboard", dashboardRoute);
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
async function startServer() {
    try {
        await Promise.all([
            ensureDB(),
            redisReady
        ]);

        server.listen(PORT, () => {
            console.log("Server running on port " + PORT);
        });
    } catch (error) {
        console.error("Server startup failed:");
        console.error(error.stack || error);
        process.exit(1);
    }
}

if (!process.env.VERCEL) {
    startServer();
}

module.exports = server;
