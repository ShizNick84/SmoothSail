# AI Crypto Trading Agent - Test Suite

## Overview

This directory contains the comprehensive test suite for the AI Crypto Trading Agent. Tests are organized by component and functionality to ensure system reliability, security, and performance.

## Test Structure

```
tests/
├── unit/                     # Unit tests for individual components
│   ├── ai/                   # AI and LLM integration tests
│   ├── trading/              # Trading engine tests
│   ├── security/             # Security component tests
│   ├── infrastructure/       # Infrastructure tests
│   └── dashboard/            # Dashboard component tests
├── integration/              # Integration tests
│   ├── api/                  # API integration tests
│   ├── system/               # System integration tests
│   └── workflow/             # End-to-end workflow tests
├── performance/              # Performance and load tests
├── security/                 # Security and penetration tests
├── e2e/                      # End-to-end tests
├── fixtures/                 # Test data and fixtures
├── utils/                    # Test utilities and helpers
├── reports/                  # Test reports and documentation
└── scripts/                  # Test execution scripts
```

## Test Categories

### 1. Unit Tests
- **AI Components**: Sentiment analysis, LLM integration, market analysis
- **Trading Engine**: Strategy execution, risk management, order processing
- **Security**: Encryption, authentication, threat detection
- **Infrastructure**: SSH tunnel, database, monitoring
- **Dashboard**: UI components, API endpoints, real-time updates

### 2. Integration Tests
- **API Integration**: External API connectivity and data flow
- **System Integration**: Component interaction and data consistency
- **Workflow Integration**: Complete trading workflows

### 3. Performance Tests
- **Load Testing**: System performance under high load
- **Stress Testing**: System behavior at breaking points
- **Intel NUC Optimization**: Hardware-specific performance tests

### 4. Security Tests
- **Penetration Testing**: Security vulnerability assessment
- **Compliance Testing**: Security standard compliance
- **Threat Simulation**: Simulated attack scenarios

### 5. End-to-End Tests
- **Trading Simulation**: Complete trading cycle testing
- **System Validation**: Full system operational verification
- **Failure Recovery**: System resilience testing

## Running Tests

### Prerequisites

```bash
# Install test dependencies
npm install

# Setup test environment
npm run test:setup
```

### Test Execution

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:security
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test files
npm test -- --testPathPattern=trading
npm test -- --testPathPattern=security
```

### Test Scripts

```bash
# Execute comprehensive test suite
./tests/scripts/run-all-tests.sh

# Run Intel NUC specific tests
./tests/scripts/run-nuc-tests.sh

# Run security test suite
./tests/scripts/run-security-tests.sh

# Run performance benchmarks
./tests/scripts/run-performance-tests.sh

# Generate test reports
./tests/scripts/generate-reports.sh
```

## Test Configuration

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  globalSetup: '<rootDir>/tests/setup/global.setup.ts',
  globalTeardown: '<rootDir>/tests/setup/global.teardown.ts'
};
```

### Environment Configuration

```bash
# Test environment variables
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/test_db
TEST_API_BASE_URL=http://localhost:3001
TEST_TIMEOUT=30000
```

## Test Data Management

### Fixtures

Test fixtures are stored in `tests/fixtures/` and include:
- Market data samples
- Trading scenarios
- Configuration templates
- Mock API responses

### Test Database

```bash
# Setup test database
npm run test:db:setup

# Reset test database
npm run test:db:reset

# Seed test data
npm run test:db:seed
```

## Continuous Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
      - run: npm run test:coverage
```

### Test Reports

Test reports are generated in multiple formats:
- **HTML**: Interactive coverage reports
- **JUnit XML**: CI/CD integration
- **JSON**: Programmatic analysis
- **Markdown**: Documentation integration

## Test Guidelines

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow AAA pattern
3. **Isolation**: Tests should be independent
4. **Mocking**: Mock external dependencies
5. **Coverage**: Aim for >90% code coverage

### Test Structure

```typescript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  describe('method name', () => {
    it('should do something when condition', async () => {
      // Arrange
      const input = 'test data';
      
      // Act
      const result = await component.method(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
  it('should process orders within acceptable time', async () => {
    const startTime = Date.now();
    
    await tradingEngine.processOrder(mockOrder);
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(1000); // 1 second
  });
});
```

### Security Testing

```typescript
describe('Security Tests', () => {
  it('should reject unauthorized API requests', async () => {
    const response = await request(app)
      .get('/api/v1/trading/positions')
      .expect(401);
    
    expect(response.body.error).toBe('Unauthorized');
  });
});
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout values for slow operations
2. **Database Locks**: Ensure proper test isolation
3. **Port Conflicts**: Use different ports for test environment
4. **Memory Leaks**: Properly cleanup resources in afterEach

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Run specific test with debugging
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/trading/strategy.test.ts
```

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep test dependencies current
2. **Review Coverage**: Maintain high test coverage
3. **Performance Benchmarks**: Track performance regressions
4. **Security Scans**: Regular security test updates

### Test Metrics

- **Code Coverage**: >90% target
- **Test Execution Time**: <5 minutes for full suite
- **Flaky Test Rate**: <1% failure rate
- **Security Test Coverage**: 100% of security components

---

*This test suite is maintained as part of the AI Crypto Trading Agent project. For questions or contributions, refer to the project documentation.*