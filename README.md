# 👥 User Management REST API

A production-ready RESTful API for managing users built with **Node.js**, **Express**, **MongoDB**, and **Mongoose** — secured with **JWT Authentication** and **Role-Based Access Control**.

![Node.js](https://img.shields.io/badge/Node.js-v23-green)
![Express](https://img.shields.io/badge/Express-4.18-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📌 Features

- ✅ RESTful API with full **CRUD** operations
- ✅ **JWT Authentication** (register, login, logout)
- ✅ **Role-Based Access Control** (admin, moderator, user)
- ✅ **MongoDB Atlas** cloud database with Mongoose schema
- ✅ **Rate Limiting** (prevents brute force attacks)
- ✅ **Request Logging** (Winston + Morgan)
- ✅ **Input Validation** (express-validator)
- ✅ **Password Hashing** (bcryptjs)
- ✅ **Swagger API Docs** at `/api/docs`
- ✅ **Postman Collection** included

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web framework |
| MongoDB Atlas | Cloud database |
| Mongoose | ODM / Schema definition |
| JSON Web Token | Authentication |
| bcryptjs | Password hashing |
| express-rate-limit | Rate limiting |
| Winston + Morgan | Logging |
| Swagger UI | API documentation |
| express-validator | Input validation |

---

## 📁 Project Structure

```
user-management-api/
├── src/
│   ├── config/
│   │   ├── database.js       # MongoDB connection
│   │   ├── logger.js         # Winston logger
│   │   └── swagger.js        # Swagger config
│   ├── middleware/
│   │   ├── auth.js           # JWT auth middleware
│   │   ├── rateLimiter.js    # Rate limiting
│   │   ├── validation.js     # Input validators
│   │   └── errorHandler.js   # Global error handler
│   ├── models/
│   │   └── User.js           # Mongoose User schema
│   ├── routes/
│   │   ├── authRoutes.js     # Register, Login, Logout
│   │   └── userRoutes.js     # CRUD operations
│   ├── tests/
│   │   └── api.test.js       # Automated tests
│   └── server.js             # App entry point
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v16+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com))

### 1. Clone the repository
```bash
git clone https://github.com/tanzirrabby/RESTful-API-for-user-management.git
cd RESTful-API-for-user-management
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs at: `http://localhost:3000`

---

## 🔐 Authentication

All `/api/users` endpoints require a **JWT Bearer Token**.

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `POST /api/auth/register` | Create account → get token |
| 2 | `POST /api/auth/login` | Login → get token |
| 3 | Add to header | `Authorization: Bearer <token>` |

---

## 📡 API Endpoints

### Auth Routes (No token required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/auth/me` | Get current user (token required) |
| POST | `/api/auth/logout` | Logout (token required) |

### User Routes (Token required)
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin, Moderator | Get all users |
| GET | `/api/users/:id` | All roles | Get user by ID |
| POST | `/api/users` | Admin only | Create new user |
| PUT | `/api/users/:id` | Admin, Owner | Full update user |
| PATCH | `/api/users/:id` | Admin, Owner | Partial update user |
| DELETE | `/api/users/:id` | Admin only | Delete user |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API info |
| GET | `/health` | Health check |
| GET | `/api/docs` | Swagger documentation |

---

## 📦 User Schema

```json
{
  "name": "String (required)",
  "email": "String (required, unique)",
  "password": "String (required, hashed)",
  "role": "user | admin | moderator",
  "age": "Number",
  "phone": "String",
  "isActive": "Boolean (default: true)",
  "address": {
    "street": "String",
    "city": "String",
    "state": "String",
    "country": "String",
    "zipCode": "String"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

---

## 💬 Sample Requests

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "password": "Secret123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "Secret123"
  }'
```

### Get All Users (Admin)
```bash
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Query Parameters

| Parameter | Example | Description |
|-----------|---------|-------------|
| `page` | `?page=2` | Page number |
| `limit` | `?limit=10` | Results per page |
| `search` | `?search=alice` | Search by name or email |
| `role` | `?role=admin` | Filter by role |
| `sortBy` | `?sortBy=name` | Sort field |
| `sortOrder` | `?sortOrder=asc` | Sort direction |

---

## 🧪 Testing

### Automated Tests
```bash
npm test
```

### Postman
Import `User_Management_API_v2.postman_collection.json` into Postman. The collection includes:
- All endpoints pre-configured
- Auto-saves JWT token after login
- Tests for success and error cases

### Swagger UI
Visit `http://localhost:3000/api/docs` for interactive API documentation.

---

## 🛡️ Security Features

- JWT tokens expire after 7 days
- Passwords hashed with bcryptjs (12 salt rounds)
- Password never returned in responses
- Rate limiting: 100 req/15min (API), 10 req/15min (Auth)
- Input validation on all endpoints
- Role-based access control

---

## 📊 Error Responses

```json
{
  "success": false,
  "message": "Error description here"
}
```

| Status | Meaning |
|--------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (wrong role) |
| 404 | Not Found |
| 409 | Conflict (duplicate email) |
| 429 | Too Many Requests |
| 500 | Server Error |

---

## 📝 License

This project is licensed under the MIT License.

---

## 👤 Author

**Tanzir**  
GitHub: [@tanzirrabby](https://github.com/tanzirrabby)
