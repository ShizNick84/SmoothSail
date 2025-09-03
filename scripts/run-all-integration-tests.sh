#!/bin/bash

# =============================================================================
# Comprehensive Integration Test Runner for Intel NUC
# =============================================================================
# This script runs all integration tests for the Intel NUC deployment
# Tests service integration, failure recovery, and system reboot scenarios
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "HEADER")
            echo -e "${PURPLE}🚀 $message${NC}"
            ;;
        "SECTION")
            echo -e "${CYAN}📋 $message${NC}"
            ;;
    esac
}

# Test suite counters
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local script_path=$2
    local args=${3:-""}
    
    ((TOTAL_SUITES++))
    
    print_status "HEADER" "Running Test Suite: $suite_name"
    echo "=================================================="
    
    if [ ! -f "$script_path" ]; then
        print_status "ERROR" "Test script not found: $script_path"
        ((FAILED_SUITES++))
        return 1
    fi
    
    # Make script executable
    chmod +x "$script_path" 2>/dev/null || true
    
    # Run the test suite
    if bash "$script_path" $args; then
        print_status "SUCCESS" "Test Suite PASSED: $suite_name"
        ((PASSED_SUITES++))
        return 0
    else
        print_status "ERROR" "Test Suite FAILED: $suite_name"
        ((FAILED_SUITES++))
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status "SECTION" "Checking Prerequisites"
    echo "=================================================="
    
    local prereq_errors=0
    
    # Check if running as root or with sudo access
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        print_status "WARNING" "Some tests may require sudo access"
    fi
    
    # Check required commands
    local required_commands=("systemctl" "journalctl" "netstat" "curl" "ps" "kill")
    
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            print_status "SUCCESS" "$cmd is available"
        else
            print_status "ERROR" "$cmd is not available"
            ((prereq_errors++))
        fi
    done
    
    # Check if systemd services exist
    local services=("ssh-tunnel.service" "trading-agent.service" "trading-dashboard.service")
    
    for service in "${services[@]}"; do
        if systemctl list-unit-files | grep -q "$service"; then
            print_status "SUCCESS" "$service is installed"
        else
            print_status "ERROR" "$service is not installed"
            ((prereq_errors++))
        fi
    done
    
    # Check if application files exist
    if [ -f "/opt/trading-agent/dist/main.js" ]; then
        print_status "SUCCESS" "Application is built"
    else
        print_status "WARNING" "Application may not be built (dist/main.js not found)"
    fi
    
    if [ -f "/opt/trading-agent/.env" ]; then
        print_status "SUCCESS" "Environment configuration exists"
    else
        print_status "WARNING" "Environment configuration not found (.env file)"
    fi
    
    echo ""
    
    if [ $prereq_errors -gt 0 ]; then
        print_status "ERROR" "$prereq_errors prerequisite errors found"
        return 1
    else
        print_status "SUCCESS" "All prerequisites satisfied"
        return 0
    fi
}

# Function to generate test report
generate_test_report() {
    local report_file="/tmp/integration_test_report_$(date +%Y%m%d_%H%M%S).txt"
    
    print_status "INFO" "Generating test report: $report_file"
    
    cat > "$report_file" << EOF
Intel NUC Integration Test Report
=================================
Date: $(date)
System: $(uname -a)
User: $(whoami)

Test Suite Summary:
------------------
Total Suites: $TOTAL_SUITES
Passed Suites: $PASSED_SUITES
Failed Suites: $FAILED_SUITES
Success Rate: $(( PASSED_SUITES * 100 / TOTAL_SUITES ))%

Service Status:
--------------
SSH Tunnel: $(systemctl is-active ssh-tunnel.service 2>/dev/null || echo "not available")
Trading Agent: $(systemctl is-active trading-agent.service 2>/dev/null || echo "not available")
Dashboard: $(systemctl is-active trading-dashboard.service 2>/dev/null || echo "not available")

System Information:
------------------
Uptime: $(uptime)
Memory: $(free -h | grep Mem)
Disk: $(df -h / | tail -1)

Recent Service Logs:
-------------------
SSH Tunnel (last 5 lines):
$(journalctl -u ssh-tunnel.service --no-pager -n 5 2>/dev/null || echo "No logs available")

Trading Agent (last 5 lines):
$(journalctl -u trading-agent.service --no-pager -n 5 2>/dev/null || echo "No logs available")

Dashboard (last 5 lines):
$(journalctl -u trading-dashboard.service --no-pager -n 5 2>/dev/null || echo "No logs available")

Test Execution Details:
----------------------
EOF
    
    # Add detailed test results if available
    if [ -f "/tmp/test_results.log" ]; then
        echo "Detailed Results:" >> "$report_file"
        cat "/tmp/test_results.log" >> "$report_file"
    fi
    
    print_status "SUCCESS" "Test report generated: $report_file"
}

# Function to cleanup after tests
cleanup_after_tests() {
    print_status "INFO" "Performing post-test cleanup..."
    
    # Remove temporary files
    rm -f /tmp/test_results.log
    rm -f /tmp/reboot_test_marker
    
    # Ensure all services are in expected state
    print_status "INFO" "Ensuring services are in expected state..."
    
    # Start all services if they're not running
    for service in ssh-tunnel.service trading-agent.service trading-dashboard.service; do
        if ! systemctl is-active --quiet "$service"; then
            print_status "INFO" "Starting $service..."
            systemctl start "$service" || true
        fi
    done
    
    print_status "SUCCESS" "Cleanup completed"
}

# Main execution
echo ""
print_status "HEADER" "Intel NUC Integration Test Suite"
echo "=================================================="
echo "This comprehensive test suite will validate:"
echo "• Service installation and configuration"
echo "• Service startup sequence and dependencies"
echo "• Failure recovery mechanisms"
echo "• System reboot and auto-start functionality"
echo ""

# Parse command line arguments
SKIP_PREREQ=false
SKIP_REBOOT=false
ACTUAL_REBOOT=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-prereq)
            SKIP_PREREQ=true
            shift
            ;;
        --skip-reboot)
            SKIP_REBOOT=true
            shift
            ;;
        --actual-reboot)
            ACTUAL_REBOOT=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --skip-prereq    Skip prerequisite checks"
            echo "  --skip-reboot    Skip reboot testing"
            echo "  --actual-reboot  Perform actual system reboot (WARNING!)"
            echo "  --verbose        Enable verbose output"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            print_status "ERROR" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Start logging
exec > >(tee /tmp/test_results.log)
exec 2>&1

print_status "INFO" "Test execution started at $(date)"

# Check prerequisites
if [ "$SKIP_PREREQ" = false ]; then
    if ! check_prerequisites; then
        print_status "ERROR" "Prerequisites not met. Use --skip-prereq to bypass."
        exit 1
    fi
else
    print_status "WARNING" "Skipping prerequisite checks"
fi

echo ""

# Test Suite 1: Environment Validation
run_test_suite "Environment Validation" "./scripts/validate-production-env.sh"

echo ""

# Test Suite 2: Service Integration Testing
run_test_suite "Service Integration" "./scripts/test-service-integration.sh"

echo ""

# Test Suite 3: Failure Recovery Testing
run_test_suite "Failure Recovery" "./scripts/test-failure-recovery.sh"

echo ""

# Test Suite 4: System Reboot Testing
if [ "$SKIP_REBOOT" = false ]; then
    if [ "$ACTUAL_REBOOT" = true ]; then
        print_status "WARNING" "ACTUAL REBOOT WILL BE PERFORMED!"
        print_status "WARNING" "Make sure you can access the system after reboot!"
        run_test_suite "System Reboot (ACTUAL)" "./scripts/test-system-reboot.sh" "--actual-reboot"
    else
        run_test_suite "System Reboot (Simulated)" "./scripts/test-system-reboot.sh" "--simulate"
    fi
else
    print_status "WARNING" "Skipping reboot testing"
fi

echo ""

# Final Results
print_status "HEADER" "Integration Test Results Summary"
echo "=================================================="
print_status "INFO" "Total Test Suites: $TOTAL_SUITES"
print_status "INFO" "Passed: $PASSED_SUITES"
print_status "INFO" "Failed: $FAILED_SUITES"

if [ $FAILED_SUITES -eq 0 ]; then
    print_status "SUCCESS" "🎉 ALL INTEGRATION TESTS PASSED!"
    print_status "SUCCESS" "Intel NUC deployment is ready for production!"
    SUCCESS_RATE=100
else
    print_status "ERROR" "❌ $FAILED_SUITES test suite(s) failed"
    print_status "WARNING" "Review failed tests before production deployment"
    SUCCESS_RATE=$(( PASSED_SUITES * 100 / TOTAL_SUITES ))
fi

print_status "INFO" "Success Rate: ${SUCCESS_RATE}%"

# Generate test report
generate_test_report

# Cleanup
cleanup_after_tests

echo ""
print_status "INFO" "Integration testing completed at $(date)"

# Exit with appropriate code
if [ $FAILED_SUITES -eq 0 ]; then
    exit 0
else
    exit 1
fi