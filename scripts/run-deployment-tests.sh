#!/bin/bash

# AI Crypto Trading Agent - Complete Deployment Test Runner
# Runs all deployment and startup tests for Intel NUC deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_RESULTS_DIR="/tmp/deployment-test-results-$(date +%Y%m%d_%H%M%S)"
OVERALL_LOG="$TEST_RESULTS_DIR/overall-test-results.log"

# Test scripts
DEPLOYMENT_TEST="$SCRIPT_DIR/test-deployment.sh"
STARTUP_TEST="$SCRIPT_DIR/test-startup-sequence.sh"
TUNNEL_TEST="$SCRIPT_DIR/test-ssh-tunnel-connectivity.sh"

# Test results
TOTAL_TEST_SUITES=0
PASSED_TEST_SUITES=0
FAILED_TEST_SUITES=0

# Function to print colored output
print_header() {
    echo -e "\n${BOLD}${CYAN}$1${NC}"
    echo -e "${CYAN}$(printf '=%.0s' {1..60})${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_failure() {
    echo -e "${RED}[FAILURE]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to run a test suite
run_test_suite() {
    local suite_name="$1"
    local test_script="$2"
    local suite_log="$TEST_RESULTS_DIR/${suite_name,,}-results.log"
    
    ((TOTAL_TEST_SUITES++))
    
    print_header "Running $suite_name"
    print_info "Test script: $test_script"
    print_info "Results log: $suite_log"
    
    echo "=== $suite_name Test Suite ===" >> "$OVERALL_LOG"
    echo "Started at: $(date)" >> "$OVERALL_LOG"
    echo "Script: $test_script" >> "$OVERALL_LOG"
    echo "" >> "$OVERALL_LOG"
    
    if [[ ! -f "$test_script" ]]; then
        print_failure "$suite_name test script not found: $test_script"
        echo "RESULT: SCRIPT NOT FOUND" >> "$OVERALL_LOG"
        ((FAILED_TEST_SUITES++))
        return 1
    fi
    
    if [[ ! -x "$test_script" ]]; then
        print_warning "Making test script executable: $test_script"
        chmod +x "$test_script"
    fi
    
    print_info "Executing $suite_name tests..."
    
    # Run the test script and capture output
    if "$test_script" > "$suite_log" 2>&1; then
        print_success "$suite_name tests PASSED"
        echo "RESULT: PASSED" >> "$OVERALL_LOG"
        ((PASSED_TEST_SUITES++))
        
        # Extract summary from test log
        if grep -q "Test Summary" "$suite_log"; then
            echo "Summary:" >> "$OVERALL_LOG"
            grep -A 10 "Test Summary" "$suite_log" | head -10 >> "$OVERALL_LOG"
        fi
        
        return 0
    else
        print_failure "$suite_name tests FAILED"
        echo "RESULT: FAILED" >> "$OVERALL_LOG"
        ((FAILED_TEST_SUITES++))
        
        # Show last few lines of error output
        print_info "Last 10 lines of error output:"
        tail -10 "$suite_log" | while read line; do
            echo -e "${RED}  $line${NC}"
        done
        
        # Extract summary from test log
        if grep -q "Test Summary" "$suite_log"; then
            echo "Summary:" >> "$OVERALL_LOG"
            grep -A 10 "Test Summary" "$suite_log" | head -10 >> "$OVERALL_LOG"
        fi
        
        return 1
    fi
    
    echo "" >> "$OVERALL_LOG"
}

# Function to create test results directory
setup_test_environment() {
    print_header "Setting Up Test Environment"
    
    # Create results directory
    mkdir -p "$TEST_RESULTS_DIR"
    print_success "Created test results directory: $TEST_RESULTS_DIR"
    
    # Initialize overall log
    echo "=== AI Crypto Trading Agent - Complete Deployment Test Results ===" > "$OVERALL_LOG"
    echo "Test started at: $(date)" >> "$OVERALL_LOG"
    echo "Test results directory: $TEST_RESULTS_DIR" >> "$OVERALL_LOG"
    echo "" >> "$OVERALL_LOG"
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        print_failure "This script must be run as root (use sudo)"
        exit 1
    fi
    
    print_success "Test environment setup complete"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local prereq_failed=0
    
    # Check if deployment has been run
    if [[ ! -d "/opt/trading-agent" ]]; then
        print_failure "Trading agent directory not found. Run deployment script first."
        ((prereq_failed++))
    else
        print_success "Trading agent directory exists"
    fi
    
    # Check if trading user exists
    if ! id "trading" &>/dev/null; then
        print_failure "Trading user not found. Run deployment script first."
        ((prereq_failed++))
    else
        print_success "Trading user exists"
    fi
    
    # Check if systemd services exist
    local services=("ssh-tunnel" "trading-agent" "trading-dashboard")
    for service in "${services[@]}"; do
        if [[ ! -f "/etc/systemd/system/$service.service" ]]; then
            print_failure "Service file not found: $service.service"
            ((prereq_failed++))
        else
            print_success "Service file exists: $service.service"
        fi
    done
    
    # Check if PostgreSQL is running
    if ! systemctl is-active postgresql &>/dev/null; then
        print_warning "PostgreSQL is not running. Some tests may fail."
    else
        print_success "PostgreSQL is running"
    fi
    
    if [[ $prereq_failed -gt 0 ]]; then
        print_failure "Prerequisites check failed. Please run the deployment script first:"
        print_info "sudo ./scripts/deploy-ubuntu-nuc.sh"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Function to generate test report
generate_test_report() {
    print_header "Generating Test Report"
    
    local report_file="$TEST_RESULTS_DIR/deployment-test-report.md"
    
    cat > "$report_file" << EOF
# AI Crypto Trading Agent - Deployment Test Report

**Test Date:** $(date)  
**Test Environment:** Intel NUC Ubuntu Deployment  
**Test Results Directory:** $TEST_RESULTS_DIR

## Test Summary

- **Total Test Suites:** $TOTAL_TEST_SUITES
- **Passed:** $PASSED_TEST_SUITES
- **Failed:** $FAILED_TEST_SUITES
- **Success Rate:** $(( PASSED_TEST_SUITES * 100 / TOTAL_TEST_SUITES ))%

## Test Suites

### 1. System Deployment Tests
**Script:** \`test-deployment.sh\`  
**Status:** $([ -f "$TEST_RESULTS_DIR/system_deployment-results.log" ] && (grep -q "All deployment tests passed" "$TEST_RESULTS_DIR/system_deployment-results.log" && echo "✅ PASSED" || echo "❌ FAILED") || echo "❓ NOT RUN")  
**Log:** \`system_deployment-results.log\`

Tests system dependencies, user setup, directory structure, SSH keys, database configuration, systemd services, security settings, and monitoring scripts.

### 2. Startup Sequence Tests
**Script:** \`test-startup-sequence.sh\`  
**Status:** $([ -f "$TEST_RESULTS_DIR/startup_sequence-results.log" ] && (grep -q "All startup sequence tests passed" "$TEST_RESULTS_DIR/startup_sequence-results.log" && echo "✅ PASSED" || echo "❌ FAILED") || echo "❓ NOT RUN")  
**Log:** \`startup_sequence-results.log\`

Tests service enablement, dependencies, startup order, restart behavior, user permissions, environment configuration, logging, security settings, and resource limits.

### 3. SSH Tunnel Connectivity Tests
**Script:** \`test-ssh-tunnel-connectivity.sh\`  
**Status:** $([ -f "$TEST_RESULTS_DIR/ssh_tunnel_connectivity-results.log" ] && (grep -q "All SSH tunnel connectivity tests passed" "$TEST_RESULTS_DIR/ssh_tunnel_connectivity-results.log" && echo "✅ PASSED" || echo "❌ FAILED") || echo "❓ NOT RUN")  
**Log:** \`ssh_tunnel_connectivity-results.log\`

Tests SSH prerequisites, Oracle Cloud connectivity, tunnel establishment, API access through tunnel, and health monitoring.

## Detailed Results

EOF

    # Add detailed results for each test suite
    for log_file in "$TEST_RESULTS_DIR"/*-results.log; do
        if [[ -f "$log_file" ]]; then
            local suite_name=$(basename "$log_file" -results.log | tr '_' ' ' | sed 's/\b\w/\U&/g')
            echo "### $suite_name" >> "$report_file"
            echo '```' >> "$report_file"
            if grep -q "Test Summary" "$log_file"; then
                grep -A 20 "Test Summary" "$log_file" | head -20 >> "$report_file"
            else
                tail -20 "$log_file" >> "$report_file"
            fi
            echo '```' >> "$report_file"
            echo "" >> "$report_file"
        fi
    done
    
    # Add recommendations
    cat >> "$report_file" << EOF

## Recommendations

EOF

    if [[ $FAILED_TEST_SUITES -eq 0 ]]; then
        cat >> "$report_file" << EOF
✅ **All tests passed!** The system is ready for application deployment.

### Next Steps:
1. Deploy application code to \`/opt/trading-agent\`
2. Create and configure \`.env\` file
3. Install npm dependencies: \`npm install\`
4. Build application: \`npm run build\`
5. Start services: \`systemctl start ssh-tunnel trading-agent trading-dashboard\`
6. Perform end-to-end testing with actual trading functionality
EOF
    else
        cat >> "$report_file" << EOF
❌ **Some tests failed.** Please address the following issues:

1. Review failed test logs in the results directory
2. Fix configuration or deployment issues
3. Re-run specific test suites after fixes
4. Ensure all prerequisites are met before proceeding

### Common Issues:
- SSH key not properly configured for Oracle Cloud access
- Network connectivity issues
- Service configuration errors
- Permission or ownership problems
EOF
    fi
    
    print_success "Test report generated: $report_file"
}

# Function to display final results
display_final_results() {
    print_header "Final Test Results"
    
    echo -e "${BOLD}Test Suites Summary:${NC}"
    echo -e "Total: ${BLUE}$TOTAL_TEST_SUITES${NC}"
    echo -e "Passed: ${GREEN}$PASSED_TEST_SUITES${NC}"
    echo -e "Failed: ${RED}$FAILED_TEST_SUITES${NC}"
    echo -e "Success Rate: ${BLUE}$(( PASSED_TEST_SUITES * 100 / TOTAL_TEST_SUITES ))%${NC}"
    echo ""
    
    echo -e "${BOLD}Test Results Location:${NC}"
    echo -e "Directory: ${CYAN}$TEST_RESULTS_DIR${NC}"
    echo -e "Overall Log: ${CYAN}$OVERALL_LOG${NC}"
    echo -e "Report: ${CYAN}$TEST_RESULTS_DIR/deployment-test-report.md${NC}"
    echo ""
    
    if [[ $FAILED_TEST_SUITES -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}🎉 ALL DEPLOYMENT TESTS PASSED! 🎉${NC}"
        echo -e "${GREEN}The Intel NUC deployment is ready for application code.${NC}"
        echo ""
        echo -e "${YELLOW}Next Steps:${NC}"
        echo -e "1. Deploy your application code to /opt/trading-agent"
        echo -e "2. Configure .env file with your API keys and settings"
        echo -e "3. Install dependencies: ${CYAN}cd /opt/trading-agent && npm install${NC}"
        echo -e "4. Build application: ${CYAN}npm run build${NC}"
        echo -e "5. Start services: ${CYAN}sudo systemctl start ssh-tunnel trading-agent trading-dashboard${NC}"
        echo -e "6. Enable auto-start: ${CYAN}sudo systemctl enable ssh-tunnel trading-agent trading-dashboard${NC}"
        echo -e "7. Test end-to-end functionality"
        
        exit 0
    else
        echo -e "${RED}${BOLD}❌ SOME DEPLOYMENT TESTS FAILED ❌${NC}"
        echo -e "${RED}Please review the failed tests and fix issues before proceeding.${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo -e "1. Check individual test logs in: ${CYAN}$TEST_RESULTS_DIR${NC}"
        echo -e "2. Review the test report: ${CYAN}$TEST_RESULTS_DIR/deployment-test-report.md${NC}"
        echo -e "3. Fix identified issues"
        echo -e "4. Re-run specific tests or this complete test suite"
        
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BOLD}${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          AI Crypto Trading Agent - Deployment Testing       ║"
    echo "║                    Intel NUC Ubuntu Setup                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    setup_test_environment
    check_prerequisites
    
    print_info "Starting comprehensive deployment testing..."
    echo ""
    
    # Run test suites
    run_test_suite "System Deployment" "$DEPLOYMENT_TEST"
    run_test_suite "Startup Sequence" "$STARTUP_TEST"
    run_test_suite "SSH Tunnel Connectivity" "$TUNNEL_TEST"
    
    # Generate report and display results
    generate_test_report
    display_final_results
}

# Handle script interruption
trap 'echo -e "\n${YELLOW}Test execution interrupted. Partial results available in: $TEST_RESULTS_DIR${NC}"; exit 130' INT TERM

# Run main function
main "$@"