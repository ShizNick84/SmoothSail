#!/bin/bash

# =============================================================================
# ERROR HANDLING TEST RUNNER
# =============================================================================
# 
# Comprehensive test runner for all error handling components including
# unit tests, integration tests, performance tests, and validation scenarios.
# 
# Usage: ./scripts/test-error-handling.sh [options]
# Options:
#   --unit          Run unit tests only
#   --integration   Run integration tests only
#   --performance   Run performance tests only
#   --all           Run all tests (default)
#   --coverage      Generate coverage report
#   --verbose       Verbose output
# 
# =============================================================================

set -e

# Configuration
TEST_DIR="src/core/error-handling/__tests__"
COVERAGE_DIR="coverage/error-handling"
LOG_FILE="test-results/error-handling-$(date +%Y%m%d-%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
RUN_UNIT=false
RUN_INTEGRATION=false
RUN_PERFORMANCE=false
RUN_ALL=true
GENERATE_COVERAGE=false
VERBOSE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --unit)
      RUN_UNIT=true
      RUN_ALL=false
      shift
      ;;
    --integration)
      RUN_INTEGRATION=true
      RUN_ALL=false
      shift
      ;;
    --performance)
      RUN_PERFORMANCE=true
      RUN_ALL=false
      shift
      ;;
    --all)
      RUN_ALL=true
      shift
      ;;
    --coverage)
      GENERATE_COVERAGE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Set test flags if running all
if [ "$RUN_ALL" = true ]; then
  RUN_UNIT=true
  RUN_INTEGRATION=true
  RUN_PERFORMANCE=true
fi

# Create directories
mkdir -p test-results
mkdir -p "$COVERAGE_DIR"

# Logging function
log() {
  echo -e "$1" | tee -a "$LOG_FILE"
}

# Print header
print_header() {
  log "${BLUE}=============================================${NC}"
  log "${BLUE}  ERROR HANDLING COMPREHENSIVE TEST SUITE  ${NC}"
  log "${BLUE}=============================================${NC}"
  log ""
  log "Test Configuration:"
  log "  Unit Tests: $RUN_UNIT"
  log "  Integration Tests: $RUN_INTEGRATION"
  log "  Performance Tests: $RUN_PERFORMANCE"
  log "  Coverage Report: $GENERATE_COVERAGE"
  log "  Verbose Output: $VERBOSE"
  log ""
}

# Check prerequisites
check_prerequisites() {
  log "${YELLOW}Checking prerequisites...${NC}"
  
  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    log "${RED}Error: Node.js is not installed${NC}"
    exit 1
  fi
  
  # Check if npm is installed
  if ! command -v npm &> /dev/null; then
    log "${RED}Error: npm is not installed${NC}"
    exit 1
  fi
  
  # Check if Jest is available
  if ! npm list jest &> /dev/null; then
    log "${RED}Error: Jest is not installed. Run 'npm install' first.${NC}"
    exit 1
  fi
  
  log "${GREEN}✓ Prerequisites check passed${NC}"
  log ""
}

# Run unit tests
run_unit_tests() {
  if [ "$RUN_UNIT" = true ]; then
    log "${YELLOW}Running unit tests...${NC}"
    
    local jest_args="--testPathPattern=error-handling.test.ts"
    
    if [ "$VERBOSE" = true ]; then
      jest_args="$jest_args --verbose"
    fi
    
    if [ "$GENERATE_COVERAGE" = true ]; then
      jest_args="$jest_args --coverage --coverageDirectory=$COVERAGE_DIR/unit"
    fi
    
    if npm test -- $jest_args; then
      log "${GREEN}✓ Unit tests passed${NC}"
    else
      log "${RED}✗ Unit tests failed${NC}"
      return 1
    fi
    log ""
  fi
}

# Run integration tests
run_integration_tests() {
  if [ "$RUN_INTEGRATION" = true ]; then
    log "${YELLOW}Running integration tests...${NC}"
    
    local jest_args="--testPathPattern=integration-tests.ts --testTimeout=60000"
    
    if [ "$VERBOSE" = true ]; then
      jest_args="$jest_args --verbose"
    fi
    
    if [ "$GENERATE_COVERAGE" = true ]; then
      jest_args="$jest_args --coverage --coverageDirectory=$COVERAGE_DIR/integration"
    fi
    
    if npm test -- $jest_args; then
      log "${GREEN}✓ Integration tests passed${NC}"
    else
      log "${RED}✗ Integration tests failed${NC}"
      return 1
    fi
    log ""
  fi
}

# Run performance tests
run_performance_tests() {
  if [ "$RUN_PERFORMANCE" = true ]; then
    log "${YELLOW}Running performance tests...${NC}"
    
    # Performance test configuration
    local performance_config='{
      "errorHandlingThreshold": 100,
      "recoveryTimeThreshold": 5000,
      "concurrentErrorLimit": 100,
      "memoryUsageLimit": "500MB"
    }'
    
    echo "$performance_config" > test-results/performance-config.json
    
    local jest_args="--testNamePattern=\"Performance\" --testTimeout=120000"
    
    if [ "$VERBOSE" = true ]; then
      jest_args="$jest_args --verbose"
    fi
    
    if npm test -- $jest_args; then
      log "${GREEN}✓ Performance tests passed${NC}"
    else
      log "${RED}✗ Performance tests failed${NC}"
      return 1
    fi
    log ""
  fi
}

# Run chaos engineering tests
run_chaos_tests() {
  log "${YELLOW}Running chaos engineering tests...${NC}"
  
  # Simulate various failure scenarios
  local chaos_scenarios=(
    "network_partition"
    "memory_exhaustion"
    "cpu_spike"
    "disk_full"
    "service_crash"
  )
  
  for scenario in "${chaos_scenarios[@]}"; do
    log "  Testing scenario: $scenario"
    
    # Create chaos test configuration
    cat > test-results/chaos-$scenario.json << EOF
{
  "scenario": "$scenario",
  "duration": 30,
  "intensity": "medium",
  "recovery_expected": true
}
EOF
    
    # Run scenario-specific test
    if npm test -- --testNamePattern="chaos.*$scenario" --testTimeout=60000; then
      log "${GREEN}    ✓ Chaos scenario '$scenario' handled correctly${NC}"
    else
      log "${RED}    ✗ Chaos scenario '$scenario' failed${NC}"
    fi
  done
  
  log ""
}

# Validate error handling documentation
validate_documentation() {
  log "${YELLOW}Validating error handling documentation...${NC}"
  
  local doc_files=(
    "docs/error-handling/ERROR_HANDLING_GUIDE.md"
    "docs/error-handling/TROUBLESHOOTING.md"
    "docs/error-handling/RECOVERY_PROCEDURES.md"
  )
  
  for doc_file in "${doc_files[@]}"; do
    if [ -f "$doc_file" ]; then
      log "${GREEN}  ✓ Found: $doc_file${NC}"
    else
      log "${RED}  ✗ Missing: $doc_file${NC}"
    fi
  done
  
  # Check if documentation is up to date
  local last_code_change=$(find src/core/error-handling -name "*.ts" -type f -exec stat -c %Y {} \; | sort -n | tail -1)
  local last_doc_change=$(find docs/error-handling -name "*.md" -type f -exec stat -c %Y {} \; | sort -n | tail -1 2>/dev/null || echo 0)
  
  if [ "$last_doc_change" -lt "$last_code_change" ]; then
    log "${YELLOW}  ⚠ Documentation may be outdated${NC}"
  else
    log "${GREEN}  ✓ Documentation appears up to date${NC}"
  fi
  
  log ""
}

# Generate test report
generate_test_report() {
  log "${YELLOW}Generating test report...${NC}"
  
  local report_file="test-results/error-handling-report-$(date +%Y%m%d-%H%M%S).html"
  
  cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>Error Handling Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        .pass { color: green; }
        .fail { color: red; }
        .warn { color: orange; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Error Handling Test Report</h1>
        <p>Generated: $(date)</p>
        <p>Test Configuration: Unit=$RUN_UNIT, Integration=$RUN_INTEGRATION, Performance=$RUN_PERFORMANCE</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <ul>
            <li>Unit Tests: $([ "$RUN_UNIT" = true ] && echo "Executed" || echo "Skipped")</li>
            <li>Integration Tests: $([ "$RUN_INTEGRATION" = true ] && echo "Executed" || echo "Skipped")</li>
            <li>Performance Tests: $([ "$RUN_PERFORMANCE" = true ] && echo "Executed" || echo "Skipped")</li>
            <li>Coverage Report: $([ "$GENERATE_COVERAGE" = true ] && echo "Generated" || echo "Not Generated")</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Test Log</h2>
        <pre>$(cat "$LOG_FILE")</pre>
    </div>
</body>
</html>
EOF
  
  log "${GREEN}✓ Test report generated: $report_file${NC}"
  log ""
}

# Cleanup function
cleanup() {
  log "${YELLOW}Cleaning up test artifacts...${NC}"
  
  # Remove temporary files
  rm -f test-results/performance-config.json
  rm -f test-results/chaos-*.json
  
  # Archive old test results (keep last 10)
  if [ -d "test-results" ]; then
    cd test-results
    ls -t error-handling-*.log 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    ls -t error-handling-report-*.html 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    cd ..
  fi
  
  log "${GREEN}✓ Cleanup completed${NC}"
}

# Main execution
main() {
  print_header
  
  # Trap cleanup on exit
  trap cleanup EXIT
  
  check_prerequisites
  
  local exit_code=0
  
  # Run tests
  run_unit_tests || exit_code=1
  run_integration_tests || exit_code=1
  run_performance_tests || exit_code=1
  
  # Additional validations
  validate_documentation
  
  # Generate reports
  if [ "$GENERATE_COVERAGE" = true ]; then
    log "${YELLOW}Coverage reports generated in: $COVERAGE_DIR${NC}"
  fi
  
  generate_test_report
  
  # Final summary
  if [ $exit_code -eq 0 ]; then
    log "${GREEN}=============================================${NC}"
    log "${GREEN}  ALL ERROR HANDLING TESTS PASSED! ✓      ${NC}"
    log "${GREEN}=============================================${NC}"
  else
    log "${RED}=============================================${NC}"
    log "${RED}  SOME ERROR HANDLING TESTS FAILED! ✗     ${NC}"
    log "${RED}=============================================${NC}"
  fi
  
  exit $exit_code
}

# Run main function
main "$@"