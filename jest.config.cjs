const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/e2e/', // Ignore Playwright E2E tests in the root tests/e2e folder
    '<rootDir>/e2e/',       // Ignore Playwright E2E tests in the root e2e folder
  ],
  transformIgnorePatterns: [
    '/node_modules/(?!next-auth|@babel|@next|dnd-core|@react-dnd|react-dnd|react-dnd-html5-backend)/',
  ],
  // reporters: [
  //   'default',
  //   ['jest-html-reporters', {
  //     publicPath: './html-report',
  //     filename: 'report.html',
  //     expand: true,
  //   }],
  // ],
};

module.exports = createJestConfig(customJestConfig); 