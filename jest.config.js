// =============================================================================
// AI CRYPTO TRADING AGENT - JEST TESTING CONFIGURATION
// =============================================================================
// Comprehensive testing configuration for financial trading system
// Ensures thorough testing with security and reliability focus
// =============================================================================

export default {
  // =============================================================================
  // BASIC CONFIGURATION
  // =============================================================================
  
  // Test environment
  testEnvironment: 'node',
  
  // TypeScript support
  preset: 'ts-jest',
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // =============================================================================
  // FILE PATTERNS
  // =============================================================================
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.ts',
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.spec.ts'
  ],
  
  // Files to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // =============================================================================
  // COVERAGE CONFIGURATION
  // =============================================================================
  
  // Coverage collection
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/tests/**/*',
    '!src/scripts/**/*'
  ],
  
  // Coverage thresholds - strict requirements for financial system
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    // Critical components require higher coverage
    './src/core/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/security/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/trading/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage output
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // =============================================================================
  // TEST EXECUTION
  // =============================================================================
  
  // Timeout for tests (important for async operations)
  testTimeout: 30000,
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/setup/jest.setup.ts'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/setup/global.setup.ts',
  globalTeardown: '<rootDir>/src/tests/setup/global.teardown.ts',
  
  // =============================================================================
  // MOCKING AND ISOLATION
  // =============================================================================
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Mock patterns
  modulePathIgnorePatterns: [
    '<rootDir>/dist/'
  ],
  
  // =============================================================================
  // REPORTING
  // =============================================================================
  
  // Verbose output for detailed test results
  verbose: true,
  
  // Error reporting
  errorOnDeprecated: true,
  
  // Test results processor
  reporters: ['default'],
  
  // =============================================================================
  // PERFORMANCE
  // =============================================================================
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Cache
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // =============================================================================
  // SECURITY TESTING SPECIFIC
  // =============================================================================
  
  // =============================================================================
  // ENVIRONMENT VARIABLES FOR TESTING
  // =============================================================================
  
  // Test environment setup
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest'
  }
};

// =============================================================================
// TESTING NOTES
// =============================================================================
// 1. High coverage thresholds ensure reliability for financial operations
// 2. Separate test suites allow focused testing of different aspects
// 3. Security and integration tests have longer timeouts for complex operations
// 4. Mocking is reset between tests to ensure test isolation
// 5. Run 'npm test' for all tests, 'npm run test:watch' for development
// 6. Critical components (core, security, trading) have higher coverage requirements
// =============================================================================