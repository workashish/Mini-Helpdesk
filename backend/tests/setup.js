// Test setup file
const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_PATH = ':memory:';

// Set longer timeout for integration tests
jest.setTimeout(30000);

// Clean up after tests
afterAll(async () => {
  // Clean up any test artifacts
});