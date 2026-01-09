# 🍽️ Restaurant Module API Documentation

This document outlines the available endpoints for managing restaurants within the MERN stack application.

**Base URL:** `http://localhost:PORT/api/restaurants`

---

## 🚀 Endpoints

### 1. Create a New Restaurant
Creates a restaurant record in the database.

- **URL:** `/`
- **Method:** `POST`
- **Payload:**
```json
{
  "name": "Restaurant Name",
  "slug": "restaurant-name-slug",
  "workflowSettings": {
    "hasKitchenView": true,
    "orderFlow": ["received", "preparing", "ready", "served", "paid"]
  }
}

Success Response (201):

{
  "id": 1,
  "name": "Restaurant Name",
  "slug": "restaurant-name-slug",
  "isActive": true,
  "createdAt": "2026-01-09T00:00:00Z"
}


2. Get All Restaurants
Retrieves a list of all registered restaurants.

URL: /

Method: GET

Success Response (200):

[
  {
    "id": 1,
    "name": "Restaurant Name",
    "slug": "restaurant-name-slug",
    "isActive": true
  }
]


3. Get Restaurant by ID
Fetch details for a single restaurant using its unique ID.

URL: /:id

Method: GET

Success Response (200):

{
  "id": 1,
  "name": "Restaurant Name",
  "slug": "restaurant-name-slug",
  "workflowSettings": { ... },
  "isActive": true
}


4. Update Restaurant
Update the details or status of an existing restaurant.

URL: /:id

Method: PUT

Payload: (Partial updates allowed)

{
  "name": "Updated Name",
  "isActive": false
}

Success Response (200):

{
  "id": 1,
  "name": "Updated Name",
  "isActive": false,
  "updatedAt": "2026-01-09T00:00:00Z"
}
