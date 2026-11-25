

# DevSphere Backend
### Powering a Developer Community & Knowledge Sharing Platform

**Built to connect developers. Engineered to handle real-world interactions.**

The DevSphere Backend is the server-side foundation of a full-stack developer community platform. It powers authentication, user management, technical articles, community posts, real-time notifications, AI-powered assistance, and dashboard analytics.

Developed with Node.js, Express, and MongoDB, the backend follows a modular architecture that separates routes, controllers, services, models, middleware, and validation logic.

The goal was to build more than basic CRUD APIs — to understand and implement how different backend systems work together in a real-world application.

 **Live Application:** https://devsphere-app.netlify.app/

 **Live Backend:** https://dev-sphere-backend-six.vercel.app/

 **Backend Repository:** https://github.com/awanayaan97-maker/DevSphere-Backend-

 **Frontend Repository:** https://github.com/awanayaan97-maker/DevSphere-Frontend

---

## Backend Architecture

DevSphere uses a modular and organized backend structure to keep responsibilities separated and make the codebase easier to maintain.

```text
src/
│
├── Config/
│   ├── cloudinary.js
│   ├── db.js
│   └── email.js
│
├── Controllers/
│   ├── aiController.js
│   ├── authController.js
│   ├── articleActionsController.js
│   ├── postActionsController.js
│   ├── userController.js
│   ├── dashboardController.js
│   ├── discoverController.js
│   └── ...
│
├── Middlewares/
│   ├── auhMiddleware.js
│   ├── errorMiddleware.js
│   ├── rateLimiter.js
│   ├── validateMiddleware.js
│   ├── multer.js
│   └── ...
│
├── Models/
│   ├── UserSchema.js
│   ├── PublishArticleSchema.js
│   ├── DraftArticleSchema.js
│   ├── Post.js
│   ├── NotificationSchema.js
│   └── ...
│
├── Prompts/
│   ├── articlePrompts.js
│   └── communityPrompts.js
│
├── Routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── articleRoutes.js
│   ├── postRoutes.js
│   ├── discoverRoutes.js
│   ├── aiRoutes.js
│   └── dashboardRoutes.js
│
├── services/
│   ├── authService.js
│   ├── articleService.js
│   ├── postService.js
│   ├── interactionService.js
│   ├── userService.js
│   ├── aiService.js
│   └── ...
│
├── Validators/
├── utils/
├── constants/
└── index.js
```

### How the Architecture Works

- **Routes:** Define API endpoints and connect requests to their respective controllers.
- **Middlewares:** Handle authentication, authorization, rate limiting, file uploads, and error handling.
- **Validators:** Validate incoming request data using Zod.
- **Controllers:** Handle incoming requests and send appropriate responses.
- **Services:** Contain application business logic and database operations.
- **Models:** Define MongoDB document structures using Mongoose.
- **Config:** Manage database, email, and Cloudinary configuration.
- **Prompts:** Organize instructions for the different AI assistants.
- **Utils:** Provide reusable helpers, API responses, errors, and token utilities.

---

## Core Features

### Authentication & Account Security

- User registration with email OTP verification.
- OTP resend functionality.
- Password hashing using bcrypt.
- User login with JWT authentication.
- Google authentication using Google OAuth.
- Secure password reset using time-limited reset tokens.
- Password reset token hashing before database storage.
- Account deactivation and reactivation support.

### Article Management

- Create, publish, edit, and delete articles.
- Save articles as drafts.
- Publish previously saved drafts.
- Article search and explore functionality.
- Article feeds with All and Following options.
- Article comments and replies.
- Like articles and comments.
- Bookmark articles.
- Image uploads through Cloudinary.
- Article-specific AI assistance.

### Community & Posts

- Create community posts with text and images.
- Upload multiple post images.
- Share programming code snippets through the frontend integration.
- Like and interact with posts.
- Add comments and replies.
- Like comments.
- Bookmark posts.
- Retrieve community feeds and individual posts.

### User & Social Connections

- Retrieve and update user profiles.
- Public profile access.
- Follow and unfollow developers.
- Retrieve followers and following lists.
- Retrieve user articles.
- Notification management.

### AI-Powered Assistance

DevSphere integrates Groq-powered AI assistance through two separate experiences.

**Article AI Assistant**
- Receives the current article's title and content.
- Converts article HTML content into readable text.
- Answers questions based on the article.
- Supports quick actions and conversational history.

**Community AI Assistant**
- Provides general-purpose programming assistance.
- Supports four modes:
  - Ask
  - Explain
  - Debug
  - Review
- Processes conversation history to maintain context.

### Real-Time Notifications

- Real-time communication using Socket.IO.
- Authenticated socket connections using JWT.
- User-specific notification rooms.
- Redis adapter integration for Socket.IO.
- Redis Pub/Sub clients through ioredis.

### Dashboard & Analytics

- Dashboard summary statistics.
- Top-performing articles.
- Followers analytics chart.
- User content management.
- Article and post management.

### Discover & Explore

- Retrieve popular tags.
- Discover developers.
- Retrieve bookmarked content.
- Explore content and developer profiles.

---

## Security & Validation

Security and request validation are important parts of the backend implementation.

- **JWT Authentication:** Protects authenticated API routes.
- **Password Hashing:** Uses bcrypt to securely hash user passwords.
- **Google Token Verification:** Validates Google authentication tokens.
- **Zod Validation:** Validates request bodies, parameters, and query data.
- **Rate Limiting:** Uses express-rate-limit with separate limits for IP addresses, users, login, signup, email, and AI requests.
- **Helmet:** Adds HTTP security-related headers.
- **CORS:** Configures permitted frontend origins.
- **Centralized Error Handling:** Handles application errors through reusable middleware.
- **OTP & Password Reset:** Uses hashed verification credentials and time-limited database records.

---

## Real-Time Architecture with Redis

DevSphere uses Socket.IO for real-time communication between the backend and connected clients.

To support Socket.IO communication through Redis, the backend integrates:

- Socket.IO
- ioredis
- Socket.IO Redis Adapter
- Redis Pub/Sub connections

The Redis adapter enables Socket.IO servers to communicate through Redis Pub/Sub, supporting real-time event distribution across multiple server instances.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Runtime | Node.js |
| Backend Framework | Express 5 |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JWT, bcrypt, Google OAuth |
| Real-Time Communication | Socket.IO |
| Redis Integration | ioredis, Socket.IO Redis Adapter |
| AI Integration | Groq SDK |
| File Uploads | Multer, Cloudinary |
| Email Service | Nodemailer |
| Validation | Zod |
| Security | Helmet, express-rate-limit |
| HTML Processing | Cheerio, html-to-text |

---

## API Structure

The backend organizes its API endpoints into dedicated route modules.

| Route Prefix | Responsibility |
|---|---|
| `/api/auth` | Signup, login, OTP verification, Google authentication, password reset |
| `/api/user` | User profiles, connections, following, notifications |
| `/api/article` | Articles, drafts, comments, likes, bookmarks, image uploads |
| `/api/post` | Community posts, comments, likes, bookmarks |
| `/api/discover` | Popular tags, bookmarks, developer discovery |
| `/api/ai` | Article and Community AI assistants |
| `/api/dashboard` | Dashboard statistics, top articles, followers chart, content |

---

## Getting Started

Follow these instructions to run the backend locally.

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- MongoDB database
- Redis instance
- Git

You will also need the credentials for the external services you want to use, such as Cloudinary, Google OAuth, Groq, and your email provider.

### 1. Clone the Repository

```bash
git clone https://github.com/awanayaan97-maker/DevSphere-Backend-.git
```

### 2. Navigate to the Project

```bash
cd DevSphere-Backend-
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory.

Use the provided `.env.example` as a reference and configure the required values:

```env
PORT=3000

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

PORTAL_EMAIL=your_email_address
PORTAL_PASSWORD=your_email_app_password

CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=your_groq_model

REDIS_URL=your_redis_connection_url

FRONTEND_URL=http://localhost:5173
```

**Important:** Never commit your actual `.env` file or expose private credentials in a public repository.

### 5. Start the Development Server

```bash
npm run start:dev
```

This starts the backend using Node.js watch mode.

### 6. Start the Production Server Locally

```bash
npm start
```

The backend runs on port `3000` by default unless another port is configured.

---

## Deployment

DevSphere uses separate hosting platforms for its frontend and backend.

| Component | Platform |
|---|---|
| Frontend | Netlify |
| Backend | Vercel |
| Database | MongoDB |
| Redis | Redis-compatible service |

**Live Application:** https://devsphere-app.netlify.app/

**Live Backend:** https://dev-sphere-backend-six.vercel.app/

---

## License

This project is licensed under the **MIT License**.

You are free to use, modify, and distribute this project under the terms of the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## About the Developer

**Ayaan Waheed**

DevSphere represents a hands-on journey into full-stack development, with a strong focus on understanding backend architecture and implementing real application functionality.

Building this backend involved working with authentication, database relationships, reusable business logic, API validation, real-time communication, AI integration, and external services.

The objective was to understand how these technologies work together to power a complete developer community platform.

Feel free to explore the repository, review the implementation, and learn from the project.

**GitHub:** https://github.com/awanayaan97-maker