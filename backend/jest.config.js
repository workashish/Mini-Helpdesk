module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!routes/index.js',
    '!**/node_modules/**'
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};