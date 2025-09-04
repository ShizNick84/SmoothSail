# Test Execution Guide

## Overview

This guide provides detailed instructions for executing tests in the AI Crypto Trading Agent project. Tests are organized by category and can be run individually or as part of a comprehensive test suite.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test category
npm run test:unit
npm run test:integration
npm run test:performance
npm run test:security
npm run test:e2e
```

## Test Categories

### 1. Unit Tests

**Purpose**: Test individual components in isolation

**Location**: `tests/unit/`

**Execution**:
```bash
# Run all unit tests
npm run test:unit

# Run specific component tests
npm test -- --testPathPattern="unit/trading"
npm test -- --testPathPattern="unit/ai"
npm test -- --testPathPattern="unit/security"
```

**Coverage**: Individual functions, classes, and modules

### 2. Integration Tests

**Purpose**: Test component interactions and data flow

**Location**: `tests/integration/`

**Execution**:
```bash
# Run all integration tests
npm run test:integration

# Run API integration tests
npm test -- --testPathPattern="integration/api"

# Run system integration tests
npm test -- --testPathPattern="integration/system"
```

**Coverage**: API endpoints, database operations, service interactions

### 3. Performance Tests

**Purpose**: Validate system performance and resource usage

**Location**: `tests/performance/`

**Execution**:
```bash
# Run all performance tests
npm run test:performance

# Run Intel NUC specific tests
./tests/scripts/run-nuc-tests.sh

# Run load tests
npm test -- --testPathPattern="performance.*load"
```

**Coverage**: Response times, memory usage, CPU utilization, throughput

### 4. Security Tests

**Purpose**: Security vulnerability assessment and compliance

**Location**: `tests/security/`

**Execution**:
```bash
# Run all security tests
npm run test:security

# Run comprehensive security suite
./tests/scripts/run-security-tests.sh

# Run penetration tests
npm test -- --testPathPattern="security.*penetration"
```

**Coverage**: Authentication, authorization, encryption, input validation

### 5. End-to-End Tests

**Purpose**: Complete workflow validation

**Location**: `tests/e2e/`

**Execution**:
```bash
# Run all E2E tests
npm run test:e2e

# Run trading workflow tests
npm test -- --testPathPattern="e2e.*trading"

# Run system validation tests
npm test -- --testPathPattern="e2e.*system"
```

**Coverage**: Complete user workflows, system integration, real-world scenarios

## Test Scripts

### Comprehensive Test Suite

```bash
# Execute all test categories
./tests/scripts/run-all-tests.sh
```

This script runs:
1. Unit tests
2. Integration tests
3. Performance tests
4. Security tests
5. End-to-end tests
6. Generates coverage report
7. Creates test summary

### Intel NUC Specific Tests

```bash
# Run Intel NUC optimized tests
./tests/scripts/run-nuc-tests.sh
```

Tests Intel NUC specific features:
- Hardware optimization (12GB RAM, 256GB SSD, Intel i5)
- Memory usage optimization
- Disk space management
- CPU performance
- SSH tunnel performance

### Security Test Suite

```bash
# Run comprehensive security tests
./tests/scripts/run-security-tests.sh
```

Includes:
- Authentication and authorization
- Encryption and data protection
- Network security
- Input validation
- Threat detection
- Compliance testing
- Penetration testing

### Performance Benchmarks

```bash
# Run performance benchmarks
./tests/scripts/run-performance-tests.sh
```

Measures:
- API response times
- Database performance
- Trading engine performance
- Memory usage
- Load handling
- AI/LLM performance
- Network latency

## Test Configuration

### Environment Variables

```bash
# Test environment configuration
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/test_db
TEST_API_BASE_URL=http://localhost:3001
TEST_TIMEOUT=30000
LOG_LEVEL=error
```

### Jest Configuration

Key configuration options in `tests/setup/jest.config.js`:

- **Test Timeout**: 30 seconds
- **Coverage Threshold**: 80% for all metrics
- **Parallel Execution**: 50% of available cores
- **Test Categories**: Separate projects for each category
- **Reporters**: Default, JUnit XML, HTML

### Database Setup

```bash
# Create test database
createdb test_trading_agent

# Run migrations
npm run db:migrate:test

# Seed test data
npm run db:seed:test
```

## Test Data and Fixtures

### Test Fixtures

Located in `tests/fixtures/`:

- **Market Data**: Sample price and volume data
- **Trading Orders**: Mock order data
- **Configuration**: Test configuration files
- **API Responses**: Mock API response data

### Mock Services

```typescript
// Example mock service usage
import { testUtils } from '../setup/jest.setup';

const mockMarketData = testUtils.createMockMarketData({
  symbol: 'ETH_USDT',
  price: '3000.00'
});

const mockOrder = testUtils.createMockOrder({
  side: 'SELL',
  amount: '1.0'
});
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
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Setup test database
        run: |
          createdb test_trading_agent
          npm run db:migrate:test
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Test Reports

Generated reports include:

1. **HTML Coverage Report**: `coverage/index.html`
2. **JUnit XML**: `tests/reports/junit.xml`
3. **JSON Results**: `tests/reports/test-results.json`
4. **Performance Summary**: `tests/reports/performance-summary.json`
5. **Markdown Summary**: `tests/reports/test-summary.md`

## Debugging Tests

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/trading/strategy.test.ts

# Use VS Code debugger
# Set breakpoints and run "Debug Jest Tests" configuration
```

### Verbose Output

```bash
# Run with verbose output
npm test -- --verbose

# Run with detailed error messages
npm test -- --verbose --no-coverage

# Watch mode for development
npm test -- --watch
```

### Test Isolation

```bash
# Run tests in isolation (no parallel execution)
npm test -- --runInBand

# Run single test file
npm test -- tests/unit/trading/strategy.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should calculate moving average"
```

## Performance Monitoring

### Memory Usage

```bash
# Monitor memory usage during tests
npm test -- --logHeapUsage

# Set memory limits
node --max-old-space-size=4096 node_modules/.bin/jest
```

### Execution Time

```bash
# Show test execution times
npm test -- --verbose --testTimeout=10000

# Profile slow tests
npm test -- --detectSlowTests
```

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   ```bash
   # Increase timeout
   npm test -- --testTimeout=60000
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   pg_isready -h localhost -p 5432
   
   # Reset test database
   npm run db:reset:test
   ```

3. **Port Conflicts**
   ```bash
   # Use different ports for testing
   export TEST_API_PORT=3002
   export TEST_DASHBOARD_PORT=3003
   ```

4. **Memory Leaks**
   ```bash
   # Run with heap profiling
   node --inspect node_modules/.bin/jest --detectLeaks
   ```

### Debug Information

```bash
# System information
node --version
npm --version
jest --version

# Test environment
echo $NODE_ENV
echo $TEST_DATABASE_URL

# Available tests
npm test -- --listTests
```

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, descriptive test names
2. **AAA Pattern**: Arrange, Act, Assert
3. **Test Isolation**: Each test should be independent
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include boundary conditions and error scenarios

### Test Organization

1. **Group Related Tests**: Use `describe` blocks effectively
2. **Setup and Teardown**: Use `beforeEach`/`afterEach` for cleanup
3. **Shared Utilities**: Create reusable test utilities
4. **Consistent Structure**: Follow established patterns

### Performance

1. **Parallel Execution**: Use Jest's parallel execution
2. **Test Timeouts**: Set appropriate timeouts
3. **Resource Cleanup**: Clean up resources after tests
4. **Selective Testing**: Run only necessary tests during development

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep test dependencies current
2. **Review Coverage**: Maintain high test coverage
3. **Performance Benchmarks**: Track performance regressions
4. **Security Updates**: Regular security test updates

### Metrics Tracking

- **Code Coverage**: Target >90%
- **Test Execution Time**: <5 minutes for full suite
- **Flaky Test Rate**: <1% failure rate
- **Security Coverage**: 100% of security components

---

*For additional help or questions about testing, refer to the project documentation or contact the development team.*