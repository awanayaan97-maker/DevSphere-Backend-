

const dns = require("node:dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io")
const jwt = require("jsonwebtoken");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./Config/db");
const errorMiddleware = require("./Middlewares/errorMiddleware")
const { ipLimiter } = require("./Middlewares/rateLimiter")
const authRoute = require("./Routes/authRoutes");
const userRoute = require("./Routes/userRoutes");
const articleRoute = require("./Routes/articleRoutes");
const postRoute = require("./Routes/postRoutes");
const discoverRoute = require("./Routes/discoverRoutes");
const aiRoute = require("./Routes/aiRoutes");
const dashboardRoute = require("./Routes/dashboardRoutes");

app.use(helmet());
app.use(cors());
app.use(express.json({limit: "1mb"}));
app.use(ipLimiter)

const server = http.createServer(app);

const io = new Server(server, {

    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"]
    }

})

io.on("connection", (socket) => {

     console.log(`User connected: ${socket.id}`);

    const token = socket.handshake.auth.token;

    if (!token) {
        return socket.disconnect()
    }

    try {
      
        const decodeToken = jwt.verify(token, process.env.JWT_SECRET);

        const userId = decodeToken.id.toString();

        socket.join(userId)
    } 
    
    catch (error) {
        socket.disconnect()
    }

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    })

})

connectDB()

app.use((req, res, next) => {
      req.io = io,
      next()
})

app.get("/", (req, res) => {
    res.send("<h1>Welcome To Our Website </h1>")
})

app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/article", articleRoute);
app.use("/api/post", postRoute)
app.use("/api/discover", discoverRoute);
app.use("/api/ai", aiRoute);
app.use("/api/dashboard", dashboardRoute)

app.use(errorMiddleware)

const PORT = process.env.PORT

server.listen(PORT, () => {
    console.log(`Server is working on Port ${PORT}`);
})