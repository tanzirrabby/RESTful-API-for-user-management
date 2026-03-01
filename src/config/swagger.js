const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User Management API',
      version: '2.0.0',
      description: 'A RESTful API for managing users with JWT authentication, rate limiting, and role-based access control.',
      contact: { name: 'API Support', email: 'support@example.com' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (get it from /api/auth/login)',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints (register, login, logout)' },
      { name: 'Users', description: 'User CRUD operations' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
