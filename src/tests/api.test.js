const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');
const User = require('../models/User');

require('dotenv').config();

// Use a separate test database
const TEST_DB = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/user_management_test';

let authToken;
let userId;

// ─── Setup & Teardown ─────────────────────────────────────────────────────────
beforeAll(async () => {
  await mongoose.connect(TEST_DB);
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.connection.close();
  server.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('🔐 Auth Endpoints', () => {

  describe('POST /api/auth/register', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'Pass123' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.data.user.password).toBeUndefined(); // password never returned
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'Pass123' });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'Pass123' });

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject weak password (no number)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'new@example.com', password: 'weakpass' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Pass123' });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
      userId = res.body.data.user._id;
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPass1' });

      expect(res.statusCode).toBe(401);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'Pass123' });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request with no token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken123');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// USER CRUD TESTS
// ─────────────────────────────────────────────────────────────────────────────
describe('👥 User Endpoints', () => {
  let adminToken;
  let createdUserId;

  beforeAll(async () => {
    // Create an admin user for these tests
    await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Admin123',
      role: 'admin',
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin123' });

    adminToken = res.body.token;
  });

  describe('POST /api/users', () => {
    it('admin should create a user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New User', email: 'newuser@example.com', password: 'NewPass1', role: 'user' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user._id).toBeDefined();
      createdUserId = res.body.data.user._id;
    });

    it('regular user should NOT create users', async () => {
      // Login as regular user
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Pass123' });

      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ name: 'Unauthorized', email: 'unauth@example.com', password: 'Pass123' });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/users', () => {
    it('admin should get all users', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should support search query', async () => {
      const res = await request(app)
        .get('/api/users?search=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('GET /api/users/:id', () => {
    it('admin should get user by ID', async () => {
      const res = await request(app)
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user._id).toBe(createdUserId);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/users/64f1234567890abcdef12345')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('admin should update user', async () => {
      const res = await request(app)
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.user.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('admin should delete user', async () => {
      const res = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should return 404 for already-deleted user', async () => {
      const res = await request(app)
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(404);
    });
  });
});
