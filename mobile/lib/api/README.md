# API Layer

This folder contains all API service classes for managing HTTP requests and external API interactions.

## Structure

```
api/
├── base.ts          # Base API class with common HTTP methods
├── auth.ts          # Authentication API service
└── index.ts         # Main export file
```

## Usage

### User Management API

```typescript
// Update user role (admin only)
await authAPI.updateUserRole({
  userId: 'user-id',
  role: 'admin'
});

// Get user details (admin or self)
const { user } = await authAPI.getUser('user-id');

// List all users (admin only)
const { users } = await authAPI.getUsers();
```

### Creating New API Services

1. Create a new file in the `api/` folder
2. Extend the `BaseAPI` class for common HTTP methods
3. Export the service instance
4. Add exports to `index.ts`

Example:

```typescript
// api/users.ts
import BaseAPI from './base';

class UsersAPI extends BaseAPI {
  async getUsers() {
    return this.get('/users');
  }

  async createUser(userData: UserData) {
    return this.post('/users', userData);
  }
}

export const usersAPI = new UsersAPI();

// api/index.ts
export { usersAPI } from './users';
export type { UserData } from './users';
```

## Base API Features

- Automatic JSON serialization/deserialization
- Error handling with meaningful messages
- Configurable base URL from environment variables
- Common HTTP methods (GET, POST, PUT, DELETE)
- TypeScript support for request/response types