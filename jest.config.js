/* global module */
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/**/*.test.ts'],
  moduleDirectories: ['node_modules', 'src'],
  setupFiles: ['<rootDir>/src/tests/setupEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setupAfterEnv.ts'],
  globalSetup: '<rootDir>/src/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/src/tests/globalTeardown.ts',
  maxWorkers: 1,
  testTimeout: 30000,
};
