# MenuGo Backend API

A production-ready Express.js backend with TypeScript, featuring Better Auth authentication, clean architecture with repositories, services, and controllers.

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Request handlers
│   ├── db/              # Database connection & schemas
│   ├── middlewares/     # Express middlewares
│   ├── repositories/    # Data access layer
│   ├── routes/          # API routes
│   ├── services/        # Business logic layer
│   ├── types/           # TypeScript types & interfaces
│   └── utils/           # Utility functions
├── auth.ts              # Better Auth configuration
├── index.ts             # Application entry point
└── package.json
```

## 🚀 Architecture Layers

### 1. **Controllers**
Handle HTTP requests and responses. Extract data from requests and pass it to services.

### 2. **Services** 
Contain business logic. Coordinate between repositories and implement complex operations.

### 3. **Repositories**
Handle data access. Direct interaction with the database using Drizzle ORM.

### 4. **Middlewares**
- `auth.middleware.ts` - Authentication using Better Auth sessions
- `error.middleware.ts` - Global error handling
- `logger.middleware.ts` - Request logging
- `validate.middleware.ts` - Input validation

## 📦 Features

- ✅ Clean architecture (Controller → Service → Repository)
- ✅ TypeScript for type safety
- ✅ Express.js web framework
- ✅ Drizzle ORM with PostgreSQL
- ✅ Better Auth for authentication
- ✅ Expo mobile support
- ✅ Request logging
- ✅ Global error handling
- ✅ Pagination support
- ✅ CORS enabled
- ✅ Environment variables
- ✅ Graceful shutdown

## 🛠️ Setup

1. **Install dependencies:**
   ```bash
   bun install
   ```

2. **Environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run migrations:**
   ```bash
   bun run migrate
   ```

4. **Start development server:**
   ```bash
   bun run dev
   ```

## 📝 Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run migrate` - Run database migrations
- `bun run generate` - Generate migration files
- `bun run studio` - Open Drizzle Studio

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000
```

---

## 🔐 Better Auth Endpoints

Better Auth provides built-in authentication endpoints at `/api/auth/*`. All requests use `POST` method unless specified.

### Authentication

#### **Sign Up with Email & Password**
```http
POST /api/auth/sign-up/email
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```
**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "image": null,
    "createdAt": "2026-01-07T00:00:00.000Z"
  },
  "session": {
    "id": "session-id",
    "userId": "uuid",
    "expiresAt": "2026-02-07T00:00:00.000Z",
    "token": "session-token"
  }
}
```

---

#### **Sign In with Email & Password**
```http
POST /api/auth/sign-in/email
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
**Response (200):**
```json
{
  "user": { /* user object */ },
  "session": { /* session object */ }
}
```

---

#### **Sign Out**
```http
POST /api/auth/sign-out
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Response (200):**
```json
{
  "success": true
}
```

---

### Email Verification

#### **Send Verification Email**
```http
POST /api/auth/send-verification-email
```
**Request Body:**
```json
{
  "email": "user@example.com"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

---

#### **Verify Email**
```http
POST /api/auth/verify-email
```
**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```
**Response (200):**
```json
{
  "success": true,
  "user": { /* updated user object with emailVerified: true */ }
}
```

---

### Magic Link Authentication

#### **Send Magic Link**
```http
POST /api/auth/send-magic-link
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "callbackURL": "myapp://auth/callback"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Magic link sent to email"
}
```

---

#### **Verify Magic Link**
```http
GET /api/auth/verify-magic-link?token=<token>
```
**Query Parameters:**
- `token` (string, required): Token from magic link email

**Response (200):**
```json
{
  "user": { /* user object */ },
  "session": { /* session object */ }
}
```

---

### Password Management

#### **Forgot Password**
```http
POST /api/auth/forgot-password
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "callbackURL": "myapp://reset-password"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

#### **Reset Password**
```http
POST /api/auth/reset-password
```
**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewSecurePassword123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

---

#### **Change Password**
```http
POST /api/auth/change-password
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Session Management

#### **Get Session**
```http
GET /api/auth/get-session
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Response (200):**
```json
{
  "session": {
    "id": "session-id",
    "userId": "uuid",
    "expiresAt": "2026-02-07T00:00:00.000Z"
  },
  "user": { /* user object */ }
}
```

---

#### **List Sessions**
```http
GET /api/auth/list-sessions
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Response (200):**
```json
{
  "sessions": [
    {
      "id": "session-id-1",
      "userId": "uuid",
      "expiresAt": "2026-02-07T00:00:00.000Z",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0..."
    }
  ]
}
```

---

#### **Revoke Session**
```http
POST /api/auth/revoke-session
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Request Body:**
```json
{
  "sessionId": "session-id-to-revoke"
}
```
**Response (200):**
```json
{
  "success": true
}
```

---

#### **Revoke All Sessions**
```http
POST /api/auth/revoke-all-sessions
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Response (200):**
```json
{
  "success": true,
  "revokedCount": 3
}
```

---

### Account Management

#### **Update User**
```http
POST /api/auth/update-user
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Request Body:**
```json
{
  "name": "Jane Doe",
  "image": "https://example.com/avatar.jpg"
}
```
**Response (200):**
```json
{
  "user": { /* updated user object */ }
}
```

---

#### **Delete Account**
```http
POST /api/auth/delete-user
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Request Body:**
```json
{
  "password": "CurrentPassword123!"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

## 👥 User Management Endpoints

### Health Check
```http
GET /api/health
```
**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T12:00:00.000Z",
  "uptime": 123.456
}
```

---

### **Create User** (Public)
```http
POST /api/users
```
**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```
**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": false,
    "role": "user",
    "banned": false,
    "createdAt": "2026-01-07T00:00:00.000Z"
  },
  "message": "User created successfully"
}
```

---

### **Get Current User** 🔒
```http
GET /api/users/me
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Response (200):**
```json
{
  "success": true,
  "data": { /* user object */ },
  "message": "Current user retrieved successfully"
}
```

---

### **Get All Users** 🔒
```http
GET /api/users?page=1&limit=10
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "emailVerified": true,
      "role": "user",
      "banned": false,
      "createdAt": "2026-01-07T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### **Search Users** 🔒
```http
GET /api/users/search?q=john&page=1&limit=10
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**Query Parameters:**
- `q` (string, required): Search query
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [ /* matching users */ ],
  "pagination": { /* pagination info */ }
}
```

---

### **Get User by ID** 🔒
```http
GET /api/users/:id
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**URL Parameters:**
- `id` (string, required): User ID

**Response (200):**
```json
{
  "success": true,
  "data": { /* user object */ },
  "message": "User retrieved successfully"
}
```
**Error (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

### **Update User** 🔒
```http
PATCH /api/users/:id
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**URL Parameters:**
- `id` (string, required): User ID

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```
**Response (200):**
```json
{
  "success": true,
  "data": { /* updated user object */ },
  "message": "User updated successfully"
}
```

---

### **Delete User** 🔒
```http
DELETE /api/users/:id
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**URL Parameters:**
- `id` (string, required): User ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully"
  },
  "message": "User deleted successfully"
}
```

---

### **Ban User** 🔒 (Admin Only)
```http
PATCH /api/users/:id/ban
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**URL Parameters:**
- `id` (string, required): User ID

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated user object with banned: true */ },
  "message": "User banned successfully"
}
```
**Error (403):**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

---

### **Unban User** 🔒 (Admin Only)
```http
PATCH /api/users/:id/unban
```
**Headers:**
```
Authorization: Bearer <session-token>
```
**URL Parameters:**
- `id` (string, required): User ID

**Response (200):**
```json
{
  "success": true,
  "data": { /* updated user object with banned: false */ },
  "message": "User unbanned successfully"
}
```

---

## 🔑 Authentication & Authorization

### Headers
All protected endpoints (marked with 🔒) require authentication:
```
Authorization: Bearer <session-token>
```

### Roles
- `user` - Default role for all users
- `admin` - Administrative access (ban/unban users, etc.)

### Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "No token provided"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## 📖 Usage Examples

### Better Auth Examples

#### Sign Up and Sign In
```bash
# Sign up with email & password
curl -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "name": "John Doe"
  }'

# Sign in
curl -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'

# Get session
curl http://localhost:3000/api/auth/get-session \
  -H "Authorization: Bearer <session-token>"
```

#### Magic Link Authentication
```bash
# Send magic link
curl -X POST http://localhost:3000/api/auth/send-magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "callbackURL": "myapp://auth/callback"
  }'

# User clicks link in email, then:
curl http://localhost:3000/api/auth/verify-magic-link?token=<token-from-email>
```

#### Email Verification
```bash
# Send verification email
curl -X POST http://localhost:3000/api/auth/send-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Verify email
curl -X POST http://localhost:3000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "<token-from-email>"}'
```

#### Password Reset
```bash
# Request password reset
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "callbackURL": "myapp://reset-password"
  }'

# Reset password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-email>",
    "password": "NewSecurePass123!"
  }' Required |
|----------|-------------|---------|----------|
| PORT | Server port | 3000 | No |
| NODE_ENV | Environment | development | No |
| DATABASE_URL | PostgreSQL connection string | - | **Yes** |
| JWT_SECRET | JWT secret key | - | **Yes** |
| JWT_EXPIRES_IN | JWT expiration time | 7d | No |
| CORS_ORIGIN | CORS allowed origins | * | No |
| BETTER_AUTH_SECRET | Better Auth secret key | - | **Yes** |
| BETTER_AUTH_URL | Base URL for Better Auth | http://localhost:3000 | No |
| SMTP_HOST | Email SMTP host | - | **Yes** (for email features) |
| SMTP_PORT | Email SMTP port | 587 | No |
| SMTP_USER | Email SMTP username | - | **Yes** (for email features) |
| SMTP_PASS | Email SMTP password | - | **Yes** (for email features) |
| SMAuthentication:** Better Auth
- **ORM:** Drizzle
- **Database:** PostgreSQL (Neon)
- **Mobile Support:** Expo (via Better Auth plugin)
- **Email:** SMTP (configurable)
- **Validation:** Ready for Zod/Joi integration

---

## 🔐 Security Best Practices

1. **Environment Variables:** Never commit `.env` files to version control
2. **Passwords:** Always use strong passwords with minimum 8 characters
3. **Tokens:** Session tokens are HTTP-only and secure by default
4. **CORS:** Configure `CORS_ORIGIN` to only allow trusted domains in production
5. **Rate Limiting:** Consider adding rate limiting middleware for production
6. **HTTPS:** Always use HTTPS in production
7. **Database:** Use connection pooling and prepared statements (handled by Drizzle)
8. **Email:** Use app-specific passwords for SMTP (not your main email password)

---

## 🚀 Deployment

### Environment Setup
1. Set all required environment variables on your hosting platform
2. Ensure `NODE_ENV=production`
3. Set `BETTER_AUTH_URL` to your production domain
4. Configure `CORS_ORIGIN` to your frontend domains

### Database Migration
```bash
bun run migrate
```

### Build (if needed)
```bash
bun build index.ts --outdir ./dist
```

### Start Production Server
```bash
bun run start
```

---

## 📱 Mobile Integration (Expo)

Better Auth includes Expo support for React Native mobile apps. The backend is already configured with the Expo plugin.

### Mobile Client Setup
```typescript
// In your Expo app
import { betterAuthClient } from '@better-auth/expo/client';

const authClient = betterAuthClient({
  baseURL: 'http://localhost:3000', // or your production URL
});

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123'
});

// Use magic link
await authClient.sendMagicLink({
  email: 'user@example.com',
  callbackURL: 'myapp://auth/callback'
});
```

---
```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Auth
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRES_IN=7d
BETTER_AUTH_SECRET=your-better-auth-secret-key
BETTER_AUTH_URL=http://localhost:3000

# CORS
CORS_ORIGIN=http://localhost:5173,myapp://

# Email (for magic links, verification, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

---rs \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!"
  }'

# Get current user
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer <session-token>"

# Get users with pagination
curl http://localhost:3000/api/users?page=1&limit=10 \
  -H "Authorization: Bearer <session-token>"

# Search users
curl "http://localhost:3000/api/users/search?q=john&page=1&limit=10" \
  -H "Authorization: Bearer <session-token>"

# Update user
curl -X PATCH http://localhost:3000/api/users/<user-id> \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Doe"}'

# Ban user (admin only)
curl -X PATCH http://localhost:3000/api/users/<user-id>/ban \
  -H "Authorization: Bearer <admin-session-token>"
```

### JavaScript/TypeScript Client Example

```typescript
// Sign up
const signUp = async () => {
  const response = await fetch('http://localhost:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'SecurePass123!',
      name: 'John Doe'
    })
  });
  const data = await response.json();
  localStorage.setItem('session-token', data.session.token);
};

// Make authenticated request
const getCurrentUser = async () => {
  const token = localStorage.getItem('session-token');
  const response = await fetch('http://localhost:3000/api/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Send magic link
const sendMagicLink = async (email: string) => {
  await fetch('http://localhost:3000/api/auth/send-magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      callbackURL: 'myapp://auth/callback'
    })
  });
};
```

---

## 🎯 Adding New Features

### 1. Create Schema (if needed)
```typescript
// src/db/schemas/product.schema.ts
export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // ...
});
```

### 2. Create Repository
```typescript
// src/repositories/product.repository.ts
export class ProductRepository {
  async findAll() { /* ... */ }
  // ...
}
```

### 3. Create Service
```typescript
// src/services/product.service.ts
export class ProductService {
  async getAllProducts() { /* ... */ }
  // ...
}
```

### 4. Create Controller
```typescript
// src/controllers/product.controller.ts
export class ProductController {
  async getProducts(req, res, next) { /* ... */ }
  // ...
}
```

### 5. Create Routes
```typescript
// src/routes/product.routes.ts
router.get('/', productController.getProducts);
```

### 6. Register Routes
```typescript
// src/routes/index.ts
import productRoutes from './product.routes';
router.use('/products', productRoutes);
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| DATABASE_URL | PostgreSQL connection string | - |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| CORS_ORIGIN | CORS allowed origins | * |

## 📚 Tech Stack

- **Runtime:** Bun
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Drizzle
- **Database:** PostgreSQL (Neon)
- **Validation:** Ready for Zod/Joi integration

## 🤝 Contributing

1. Create a new branch for your feature
2. Follow the existing architecture pattern
3. Add proper error handling
4. Update this README if needed

## 📄 License

Private - SkyEnd Innovations
