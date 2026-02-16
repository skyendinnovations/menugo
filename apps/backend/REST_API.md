# 🍽️ Restaurant Module API Documentation

This document describes the Restaurants API and its request/response shapes.

Base URL: `/api/restaurants`

Notes:
- All protected endpoints require authentication via `Authorization: Bearer <token>`.
- When a restaurant is created, an `owner` role is created for that restaurant (if missing) and the creating user is assigned that role (mapped in `user_roles`).

---

## Endpoints

### Create a New Restaurant
- URL: `/`
- Method: `POST`
- Auth: required (Bearer token)
- Request body (JSON):
```json
{
  "name": "Restaurant Name",
  "slug": "optional-slug-or-omit-to-auto-generate",
  "description": "optional",
  "workflowSettings": {
    "hasKitchenView": true,
    "orderFlow": ["received", "preparing", "ready", "served", "paid"]
  }
}
```
- Success Response (201):
```json
{
  "success": true,
  "message": "Restaurant created successfully",
  "data": {
    "id": 123,
    "name": "Restaurant Name",
    "slug": "restaurant-name-slug",
    "workflowSettings": { "hasKitchenView": true, "orderFlow": ["received"] },
    "isActive": true,
    "createdAt": "2026-01-09T00:00:00Z",
    "updatedAt": "2026-01-09T00:00:00Z"
  }
}
```

Behavior:
- If `slug` is omitted the server generates a unique slug from the `name`.
- The creating user is automatically added as a restaurant member with `isOwner: true` and assigned the `owner` role for that restaurant.

### Get All Restaurants
- URL: `/`
- Method: `GET`
- Auth: required (Bearer token)
- Success Response (200):
```json
{
  "success": true,
  "message": "Restaurants retrieved successfully",
  "data": [
    { "id": 123, "name": "Restaurant Name", "slug": "restaurant-name-slug", "isActive": true }
  ]
}
```

### Get Restaurant by ID
- URL: `/:id`
- Method: `GET`
- Auth: required (Bearer token)
- Success Response (200):
```json
{
  "success": true,
  "message": "Restaurant retrieved successfully",
  "data": {
    "id": 123,
    "name": "Restaurant Name",
    "slug": "restaurant-name-slug",
    "workflowSettings": { "hasKitchenView": true, "orderFlow": ["received"] },
    "isActive": true
  }
}
```

### Update Restaurant
- URL: `/:id`
- Method: `PUT`
- Auth: required (Bearer token)
- Permission: only the restaurant owner (or users with appropriate role) may update a restaurant.
- Request body (partial update allowed):
```json
{
  "name": "Updated Name",
  "description": "Optional",
  "isActive": false
}
```
- Success Response (200):
```json
{
  "success": true,
  "message": "Restaurant updated successfully",
  "data": {
    "id": 123,
    "name": "Updated Name",
    "slug": "restaurant-name-slug",
    "isActive": false,
    "updatedAt": "2026-01-10T00:00:00Z"
  }
}
```

### Delete Restaurant
- URL: `/:id`
- Method: `DELETE`
- Auth: required (Bearer token)
- Permission: only the restaurant owner (or users with appropriate role) may delete a restaurant.
- Success Response (200):
```json
{
  "success": true,
  "message": "Restaurant deleted successfully",
  "data": {
    "id": 123
  }
}
```

---

If you want, I can add example cURL commands and an example response shape for errors (401/403/400). Let me know which extras you prefer.
