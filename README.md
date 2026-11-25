
DevSphere Backend 
The API and real-time engine behind DevSphere
DevSphere is a developer community and knowledge-sharing platform. This repository contains the backend that powers its authentication, articles, community posts, user connections, dashboard data, AI assistants, media uploads, and real-time notifications.

Built as part of a three-month full-stack development project, this backend focuses on separating request handling from business logic, validating incoming data, protecting API routes, and connecting multiple services into one application.

Live Application: https://devsphere-app.netlify.app/
Live Backend: https://dev-sphere-backend-six.vercel.app/
Frontend Repository: https://github.com/awanayaan97-maker/DevSphere-Frontend
Backend Repository: https://github.com/awanayaan97-maker/DevSphere-Backend-
What This Backend Powers

Authentication & Account Management
- Email and password signup and login.
- Email OTP verification and OTP resend.
- Google authentication using Google ID token verification.
- Password reset through time-limited reset links.
- Password hashing with bcrypt.
- JWT-based authentication for protected routes.
- Account deactivation.

Article Management
- Create, update, publish, and delete articles.
- Save articles as drafts and manage draft content.
- Retrieve article feeds, search results, and explore content.
- Article comments, nested replies, likes, and bookmarks.
- Image uploads for article content through Cloudinary.

Developer Community
- Create and retrieve community posts.
- Support for post images and code-snippet content submitted by the frontend.
- Like posts and comments.
- Create, edit, and delete comments, including replies.
- Bookmark posts.
- Upload and manage post images through Cloudinary.

User Profiles & Connections
- Retrieve private and public user profiles.
- Update profile information, profile images, and cover images.
- Follow and unfollow developers.
- Retrieve follower and following connections.
- Retrieve a user's articles.

Discovery
- Retrieve popular tags.
- Discover developers.
- Retrieve bookmarked content.

Dashboard
- Dashboard summary statistics.
- Top articles.
- Followers chart data.
- User content data for dashboard views.

AI Assistants
DevSphere provides two AI experiences powered by the Groq SDK:
- Article Assistant: Receives the relevant article content as context to answer questions about that article.
- Community Assistant: A general-purpose programming assistant with Ask, Explain, Debug, and Review modes. It is not supplied with the content of a particular community post.

Real-Time Notifications
- Socket.IO handles real-time client connections and notification events.
- Socket connections are authenticated using the application's JWT.
- The Socket.IO Redis adapter uses Redis publisher and subscriber connections to support communication across Socket.IO server instances.

Backend Architecture
The codebase is organized by responsibility, separating API routing, request validation, controllers, business services, database models, and shared utilities.
src/
├── Config/          # MongoDB, Cloudinary, and email configuration
├── constants/       # Shared categories and discovery constants
├── Controllers/     # HTTP request and response handling
├── Middlewares/     # Authentication, validation, uploads, errors, rate limits
├── Models/          # Mongoose schemas and data models
├── Prompts/         # AI assistant system prompts
├── Routes/          # API route definitions
├── services/        # Application business logic
├── uploads/         # Local upload directory
├── utils/           # Tokens, responses, errors, pagination, helpers
├── Validators/      # Zod validation schemas
└── index.js          # Express app, Socket.IO, Redis, and route setup
Request flow
Client Request
     ↓
   Routes
     ↓
Authentication / Validation / Rate Limiting
     ↓
  Controllers
     ↓
   Services
     ↓
 Mongoose Models
     ↓
   MongoDB
Controllers handle HTTP concerns, while services contain reusable application logic. Shared interaction operations are centralized in an interaction service for article and post interactions.

Technology Stack
Category	Technologies
Runtime	Node.js
Backend Framework	Express 5
Database	MongoDB, Mongoose
Authentication	JSON Web Token (JWT), bcrypt
Google Authentication	google-auth-library
Real-Time Communication	Socket.IO
Cross-Instance Socket Adapter	Socket.IO Redis Adapter, ioredis
Cache / Messaging Infrastructure	Redis (configured through REDIS_URL)
AI Integration	Groq SDK
Image Storage	Cloudinary, Multer
Email	Nodemailer
Validation	Zod
Security Middleware	Helmet, express-rate-limit
HTML Processing	Cheerio, html-to-text


Security & Request Handling
- JWT middleware protects authenticated API endpoints.
- Optional authentication middleware supports routes that can serve both signed-in and signed-out visitors.
- Passwords are hashed using bcrypt.
- Zod schemas validate selected request bodies, query parameters, and route parameters.
- Helmet applies common HTTP security headers.
- Rate limiters are configured for IP-level traffic and selected user, authentication, email, and AI operations.
- A centralized error middleware handles application errors.
- Google ID tokens are verified through Google's authentication library.
Note: The current authentication implementation uses JWTs. Separate access-token and refresh-token rotation flows are not currently implemented.

API Route Groups
The backend mounts the following API groups:
Base Path	Purpose
/api/auth	Signup, login, OTP verification, Google auth, password reset, account deactivation
/api/user	Profiles, profile updates, connections, follows, notifications
/api/article	Published articles, drafts, search, comments, likes, bookmarks, image uploads
/api/post	Community posts, comments, likes, bookmarks, image uploads
/api/discover	Popular tags, developer discovery, bookmarks
/api/ai	Article and community AI chat endpoints
/api/dashboard	Dashboard summary, top articles, follower chart, content


Getting Started
Prerequisites
Make sure you have the following:
- Node.js
- npm
- MongoDB connection string
- Redis connection URL
- Google OAuth credentials (for Google authentication)
- Cloudinary credentials (for image uploads)
- Groq API key and model (for AI features)
- Email account credentials for sending application emails
1. Clone the repository
git clone https://github.com/awanayaan97-maker/DevSphere-Backend-.git
2. Navigate to the project directory
cd DevSphere-Backend-
3. Install dependencies
npm install
4. Configure environment variables
Create a .env file in the project root. You can use .env.example as a reference and provide your own credentials:
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:5173

REDIS_URL=your_redis_connection_url

PORTAL_EMAIL=your_email_address
PORTAL_PASSWORD=your_email_app_password

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_groq_model
Use the matching environment values for your own setup. FRONTEND_URL should point to the frontend origin allowed to communicate with this backend. For local frontend development, use http://localhost:5173; for the deployed application, use https://devsphere-app.netlify.app in the backend deployment environment.

Important: Never commit your real .env file or expose private credentials. Keep .env.example limited to variable names and safe placeholders.
5. Run the development server
npm run start:dev
The development script uses Node.js watch mode and starts the application from src/index.js.
6. Run the production start command
npm start
The server uses the PORT environment variable when provided, otherwise it defaults to port 3000.

Deployment
The current application deployment uses:
Component	Platform / Service
Frontend	Netlify
Backend	Vercel
Database	MongoDB
Redis	Redis-compatible service configured through REDIS_URL
Image Storage	Cloudinary
AI Provider	Groq


When deploying the backend, configure all required environment variables in the hosting provider's project settings. Do not rely on a local .env file being available in the deployment environment.

License
This project is licensed under the MIT License. See the LICENSE file for details.

Developer
Ayaan Waheed
GitHub Profile

DevSphere is a practical full-stack project built to explore how authentication, content management, community interactions, AI integration, database operations, and real-time communication work together in a single application.

If you find the project interesting, feel free to explore the repositories and the live application.