# MenuGo Backend API

A production-ready Express.js backend with TypeScript, featuring a clean architecture with repositories, services, and controllers.

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
- `auth.middleware.ts` - Authentication & authorization
- `error.middleware.ts` - Global error handling
- `logger.middleware.ts` - Request logging
- `validate.middleware.ts` - Input validation

## 📦 Features

- ✅ Clean architecture (Controller → Service → Repository)
- ✅ TypeScript for type safety
- ✅ Express.js web framework
- ✅ Drizzle ORM with PostgreSQL
- ✅ JWT authentication (ready to implement)
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

### Health Check
- `GET /api/health` - Check server status

### Users
- `POST /api/users` - Create user (public)
- `GET /api/users/me` - Get current user (auth required)
- `GET /api/users` - List users with pagination (auth required)
- `GET /api/users/search?q=query` - Search users (auth required)
- `GET /api/users/:id` - Get user by ID (auth required)
- `PATCH /api/users/:id` - Update user (auth required)
- `DELETE /api/users/:id` - Delete user (auth required)
- `PATCH /api/users/:id/ban` - Ban user (admin only)
- `PATCH /api/users/:id/unban` - Unban user (admin only)

## 🔐 Authentication

To access protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## 📖 Usage Example

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# Get users with pagination
curl http://localhost:3000/api/users?page=1&limit=10 \
  -H "Authorization: Bearer <token>"

# Search users
curl http://localhost:3000/api/users/search?q=john&page=1&limit=10 \
  -H "Authorization: Bearer <token>"
```

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
