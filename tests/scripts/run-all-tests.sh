#!/bin/bash
# run-all-tests.sh - Execute comprehensive test suite

set -e

echo "🧪 AI Crypto Trading Agent - Comprehensive Test Suite"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run test category
run_test_category() {
    local category=$1
    local description=$2
    
    echo -e "\n${BLUE}📋 Running $description...${NC}"
    
    if npm run test:$category; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        ((FAILED_TESTS++))
    fi
    ((TOTAL_TESTS++))
}

# Setup test environment
echo -e "${YELLOW}🔧 Setting up test environment...${NC}"
npm run test:setup

# Run test categories
run_test_category "unit" "Unit Tests"
run_test_category "integration" "Integration Tests"
run_test_category "performance" "Performance Tests"
run_test_category "security" "Security Tests"
run_test_category "e2e" "End-to-End Tests"

# Generate coverage report
echo -e "\n${BLUE}📊 Generating coverage report...${NC}"
npm run test:coverage

# Generate test report
echo -e "\n${BLUE}📄 Generating test report...${NC}"
./tests/scripts/generate-reports.sh

# Summary
echo -e "\n${BLUE}📈 Test Summary${NC}"
echo "=============="
echo -e "Total Test Categories: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}💥 Some tests failed. Please review the output above.${NC}"
    exit 1
fi