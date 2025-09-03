// jest.setup.ts - Jest test setup

import { jest } from '@jest/globals';

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toBeValidTimestamp(received: any) {
    const timestamp = new Date(received).getTime();
    const pass = !isNaN(timestamp) && timestamp > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },

  toHaveValidApiResponse(received: any) {
    const hasSuccess = typeof received.success === 'boolean';
    const hasData = received.data !== undefined;
    const hasMetadata = received.metadata !== undefined;
    const pass = hasSuccess && hasData && hasMetadata;
    
    if (pass) {
      return {
        message: () => `expected response not to have valid API structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have valid API structure (success, data, metadata)`,
        pass: false,
      };
    }
  }
});

// Global test configuration
beforeAll(() => {
  // Set test timeouts
  jest.setTimeout(30000);

  // Mock console methods in test environment
  if (process.env.NODE_ENV === 'test') {
    global.console = {
      ...console,
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  }

  // Initialize performance tracking
  if (global.performanceMetrics) {
    global.performanceMetrics.testCount = 0;
    global.performanceMetrics.totalDuration = 0;
    global.performanceMetrics.memoryUsage = [];
  }
});

beforeEach(() => {
  // Track test start time
  global.testStartTime = Date.now();

  // Clear all mocks
  jest.clearAllMocks();

  // Reset environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
});

afterEach(() => {
  // Track test performance
  if (global.performanceMetrics && global.testStartTime) {
    const duration = Date.now() - global.testStartTime;
    global.performanceMetrics.testCount++;
    global.performanceMetrics.totalDuration += duration;
    
    // Track memory usage
    const memUsage = process.memoryUsage();
    global.performanceMetrics.memoryUsage.push(memUsage.heapUsed / 1024 / 1024); // MB
  }

  // Cleanup any test-specific resources
  jest.restoreAllMocks();
});

afterAll(() => {
  // Final cleanup
  jest.clearAllTimers();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in test environment
});

// Mock external dependencies for testing
jest.mock('node-fetch', () => ({
  default: jest.fn(),
}));

jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
  })),
}));

// Mock file system operations for testing
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
}));

// Mock child process for testing
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
  execSync: jest.fn(),
}));

// Export test utilities
export const testUtils = {
  // Create mock market data
  createMockMarketData: (overrides = {}) => ({
    symbol: 'BTC_USDT',
    price: '50000.00',
    volume: '1000.00',
    timestamp: Date.now(),
    ...overrides,
  }),

  // Create mock trading order
  createMockOrder: (overrides = {}) => ({
    id: 'test-order-123',
    symbol: 'BTC_USDT',
    side: 'BUY',
    amount: '0.1',
    price: '50000.00',
    status: 'PENDING',
    timestamp: Date.now(),
    ...overrides,
  }),

  // Create mock API response
  createMockApiResponse: (data = {}, success = true) => ({
    success,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  }),

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random test data
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  randomNumber: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomPrice: () => (Math.random() * 100000 + 1000).toFixed(2),
};

// Declare global types for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toBeValidTimestamp(): R;
      toHaveValidApiResponse(): R;
    }
  }

  var testStartTime: number;
  var performanceMetrics: {
    testCount: number;
    totalDuration: number;
    memoryUsage: number[];
  };
}