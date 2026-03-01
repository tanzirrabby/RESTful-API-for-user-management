const mongoose = require('mongoose');

// Close DB connection after all tests
afterAll(async () => {
  await mongoose.connection.close();
});
