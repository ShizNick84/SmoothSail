#!/bin/bash
# generate-reports.sh - Generate comprehensive test reports

set -e

echo "📄 Generating Test Reports"
echo "========================="

REPORT_DIR="tests/reports"
DATE=$(date +%Y%m%d_%H%M%S)

# Create reports directory
mkdir -p "$REPORT_DIR"

# Generate HTML coverage report
echo "📊 Generating coverage report..."
npm run test:coverage -- --reporters=html
cp -r coverage/* "$REPORT_DIR/"

# Generate JUnit XML report for CI/CD
echo "🔧 Generating JUnit XML report..."
npm test -- --reporters=jest-junit --outputFile="$REPORT_DIR/junit-$DATE.xml"

# Generate JSON report for analysis
echo "📋 Generating JSON report..."
npm test -- --reporters=json --outputFile="$REPORT_DIR/test-results-$DATE.json"

# Generate markdown summary
echo "📝 Generating markdown summary..."
cat > "$REPORT_DIR/test-summary-$DATE.md" << EOF
# Test Report - $(date)

## Summary

- **Date**: $(date)
- **Environment**: $(node --version)
- **Platform**: $(uname -s)

## Test Results

### Coverage Summary
$(npm run test:coverage --silent | grep -A 10 "Coverage Summary" || echo "Coverage data not available")

### Test Categories

#### Unit Tests
- Location: \`tests/unit/\`
- Purpose: Test individual components in isolation

#### Integration Tests
- Location: \`tests/integration/\`
- Purpose: Test component interactions

#### Performance Tests
- Location: \`tests/performance/\`
- Purpose: Validate system performance

#### Security Tests
- Location: \`tests/security/\`
- Purpose: Security vulnerability assessment

#### End-to-End Tests
- Location: \`tests/e2e/\`
- Purpose: Complete workflow validation

## Files Generated

- HTML Coverage Report: \`coverage/index.html\`
- JUnit XML: \`junit-$DATE.xml\`
- JSON Results: \`test-results-$DATE.json\`

## Next Steps

1. Review failed tests if any
2. Update test coverage for new features
3. Run security tests regularly
4. Monitor performance benchmarks

EOF

# Generate performance benchmark report
echo "⚡ Generating performance benchmark..."
cat > "$REPORT_DIR/performance-benchmark-$DATE.md" << EOF
# Performance Benchmark Report - $(date)

## System Specifications

- **CPU**: Intel i5 (Intel NUC)
- **Memory**: 12GB RAM
- **Storage**: 256GB SSD
- **OS**: Ubuntu 22.04 LTS

## Benchmark Results

### API Response Times
- Average: TBD ms
- 95th Percentile: TBD ms
- 99th Percentile: TBD ms

### Database Performance
- Query Average: TBD ms
- Connection Pool: TBD connections
- Throughput: TBD queries/sec

### Trading Engine
- Order Processing: TBD ms
- Strategy Calculation: TBD ms
- Risk Assessment: TBD ms

### Memory Usage
- Baseline: TBD MB
- Peak Usage: TBD MB
- Garbage Collection: TBD ms

### Recommendations

1. Monitor memory usage to stay within 12GB limit
2. Optimize database queries for SSD performance
3. Tune SSH tunnel for optimal latency
4. Regular performance regression testing

EOF

# Clean old reports (keep last 30 days)
find "$REPORT_DIR" -name "*.xml" -mtime +30 -delete
find "$REPORT_DIR" -name "*.json" -mtime +30 -delete
find "$REPORT_DIR" -name "*.md" -mtime +30 -delete

echo "✅ Test reports generated in $REPORT_DIR"
echo "📊 View coverage report: open $REPORT_DIR/index.html"