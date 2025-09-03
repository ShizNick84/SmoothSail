#!/bin/bash

# =============================================================================
# Service Integration Testing Script for Intel NUC
# =============================================================================
# This script tests the systemd service startup sequence and dependencies
# Tests: ssh-tunnel → trading-agent → dashboard
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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
    esac
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    ((TESTS_TOTAL++))
    print_status "INFO" "Running test: $test_name"
    
    if eval "$test_command"; then
        print_status "SUCCESS" "Test passed: $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_status "ERROR" "Test failed: $test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to wait for service to be active
wait_for_service() {
    local service_name=$1
    local timeout=${2:-60}
    local counter=0
    
    print_status "INFO" "Waiting for $service_name to become active (timeout: ${timeout}s)..."
    
    while [ $counter -lt $timeout ]; do
        if systemctl is-active --quiet "$service_name"; then
            print_status "SUCCESS" "$service_name is active"
            return 0
        fi
        sleep 1
        ((counter++))
        if [ $((counter % 10)) -eq 0 ]; then
            print_status "INFO" "Still waiting for $service_name... (${counter}s elapsed)"
        fi
    done
    
    print_status "ERROR" "$service_name failed to become active within ${timeout}s"
    return 1
}

# Function to check service status
check_service_status() {
    local service_name=$1
    
    if systemctl is-active --quiet "$service_name"; then
        print_status "SUCCESS" "$service_name is active"
        return 0
    else
        print_status "ERROR" "$service_name is not active"
        print_status "INFO" "Service status: $(systemctl is-active $service_name)"
        return 1
    fi
}

# Function to test service dependency
test_service_dependency() {
    local dependent_service=$1
    local dependency_service=$2
    
    print_status "INFO" "Testing dependency: $dependent_service depends on $dependency_service"
    
    # Check if dependency is listed in service file
    if systemctl show "$dependent_service" --property=After | grep -q "$dependency_service"; then
        print_status "SUCCESS" "$dependent_service correctly depends on $dependency_service"
        return 0
    else
        print_status "ERROR" "$dependent_service does not depend on $dependency_service"
        return 1
    fi
}

# Function to test port availability
test_port() {
    local port=$1
    local service_name=$2
    
    if netstat -tuln | grep -q ":$port "; then
        print_status "SUCCESS" "Port $port is open for $service_name"
        return 0
    else
        print_status "ERROR" "Port $port is not open for $service_name"
        return 1
    fi
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        print_status "SUCCESS" "HTTP endpoint $url returned status $expected_status"
        return 0
    else
        local actual_status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
        print_status "ERROR" "HTTP endpoint $url returned status $actual_status, expected $expected_status"
        return 1
    fi
}

echo "🧪 Starting Service Integration Testing for Intel NUC..."
echo "=================================================="

# Stop all services first to ensure clean test
print_status "INFO" "Stopping all services for clean test..."
systemctl stop trading-dashboard.service 2>/dev/null || true
systemctl stop trading-agent.service 2>/dev/null || true
systemctl stop ssh-tunnel.service 2>/dev/null || true

sleep 5

# Test 1: Service Installation
print_status "INFO" "Testing service installation..."
run_test "SSH Tunnel service exists" "systemctl list-unit-files | grep -q ssh-tunnel.service"
run_test "Trading Agent service exists" "systemctl list-unit-files | grep -q trading-agent.service"
run_test "Dashboard service exists" "systemctl list-unit-files | grep -q trading-dashboard.service"

# Test 2: Service Dependencies
print_status "INFO" "Testing service dependencies..."
run_test "Trading Agent depends on SSH Tunnel" "test_service_dependency trading-agent.service ssh-tunnel.service"
run_test "Dashboard depends on Trading Agent" "test_service_dependency trading-dashboard.service trading-agent.service"

# Test 3: SSH Tunnel Service Startup
print_status "INFO" "Testing SSH Tunnel service startup..."
systemctl start ssh-tunnel.service
run_test "SSH Tunnel service starts" "wait_for_service ssh-tunnel.service 30"
run_test "SSH Tunnel service is active" "check_service_status ssh-tunnel.service"

# Wait for SSH tunnel to establish
print_status "INFO" "Waiting for SSH tunnel to establish connection..."
sleep 10

# Test SSH tunnel connectivity
run_test "SSH tunnel port is open" "test_port 8443 'SSH Tunnel'"

# Test 4: Trading Agent Service Startup
print_status "INFO" "Testing Trading Agent service startup..."
systemctl start trading-agent.service
run_test "Trading Agent service starts" "wait_for_service trading-agent.service 60"
run_test "Trading Agent service is active" "check_service_status trading-agent.service"

# Wait for trading agent to initialize
print_status "INFO" "Waiting for Trading Agent to initialize..."
sleep 15

# Test trading agent port
run_test "Trading Agent port is open" "test_port 3001 'Trading Agent'"

# Test 5: Dashboard Service Startup
print_status "INFO" "Testing Dashboard service startup..."
systemctl start trading-dashboard.service
run_test "Dashboard service starts" "wait_for_service trading-dashboard.service 30"
run_test "Dashboard service is active" "check_service_status trading-dashboard.service"

# Wait for dashboard to start
print_status "INFO" "Waiting for Dashboard to start..."
sleep 10

# Test dashboard port and HTTP endpoint
run_test "Dashboard port is open" "test_port 3000 'Dashboard'"
run_test "Dashboard HTTP endpoint responds" "test_http_endpoint http://localhost:3000"

# Test 6: Service Restart Testing
print_status "INFO" "Testing service restart functionality..."

# Test SSH tunnel restart
systemctl restart ssh-tunnel.service
run_test "SSH Tunnel restarts successfully" "wait_for_service ssh-tunnel.service 30"

# Test trading agent restart
systemctl restart trading-agent.service
run_test "Trading Agent restarts successfully" "wait_for_service trading-agent.service 60"

# Test dashboard restart
systemctl restart trading-dashboard.service
run_test "Dashboard restarts successfully" "wait_for_service trading-dashboard.service 30"

# Test 7: Service Stop/Start Sequence
print_status "INFO" "Testing service stop/start sequence..."

# Stop services in reverse order
systemctl stop trading-dashboard.service
systemctl stop trading-agent.service
systemctl stop ssh-tunnel.service

sleep 5

# Start services in correct order
systemctl start ssh-tunnel.service
run_test "SSH Tunnel starts after stop" "wait_for_service ssh-tunnel.service 30"

systemctl start trading-agent.service
run_test "Trading Agent starts after SSH Tunnel" "wait_for_service trading-agent.service 60"

systemctl start trading-dashboard.service
run_test "Dashboard starts after Trading Agent" "wait_for_service trading-dashboard.service 30"

# Test 8: Failure Recovery Testing
print_status "INFO" "Testing failure recovery..."

# Kill SSH tunnel process and test auto-restart
SSH_PID=$(systemctl show ssh-tunnel.service --property=MainPID --value)
if [ "$SSH_PID" != "0" ] && [ -n "$SSH_PID" ]; then
    kill -9 "$SSH_PID" 2>/dev/null || true
    sleep 5
    run_test "SSH Tunnel auto-restarts after failure" "wait_for_service ssh-tunnel.service 30"
fi

# Test 9: Log File Creation
print_status "INFO" "Testing log file creation..."
run_test "SSH Tunnel logs exist" "journalctl -u ssh-tunnel.service --no-pager -n 1 >/dev/null 2>&1"
run_test "Trading Agent logs exist" "journalctl -u trading-agent.service --no-pager -n 1 >/dev/null 2>&1"
run_test "Dashboard logs exist" "journalctl -u trading-dashboard.service --no-pager -n 1 >/dev/null 2>&1"

# Test 10: Service Enable Status
print_status "INFO" "Testing service enable status..."
run_test "SSH Tunnel service is enabled" "systemctl is-enabled ssh-tunnel.service >/dev/null 2>&1"
run_test "Trading Agent service is enabled" "systemctl is-enabled trading-agent.service >/dev/null 2>&1"
run_test "Dashboard service is enabled" "systemctl is-enabled trading-dashboard.service >/dev/null 2>&1"

# Test 11: System Reboot Simulation (if requested)
if [ "$1" = "--test-reboot" ]; then
    print_status "INFO" "Testing system reboot simulation..."
    print_status "WARNING" "This will stop all services and test auto-start"
    
    # Stop all services
    systemctl stop trading-dashboard.service
    systemctl stop trading-agent.service
    systemctl stop ssh-tunnel.service
    
    sleep 5
    
    # Simulate system startup by starting services
    print_status "INFO" "Simulating system startup..."
    
    # Services should start automatically, but we'll trigger them manually for testing
    systemctl start ssh-tunnel.service
    systemctl start trading-agent.service
    systemctl start trading-dashboard.service
    
    run_test "All services start after reboot simulation" "
        wait_for_service ssh-tunnel.service 30 && 
        wait_for_service trading-agent.service 60 && 
        wait_for_service trading-dashboard.service 30
    "
fi

# Final Status Check
print_status "INFO" "Final service status check..."
print_status "INFO" "SSH Tunnel: $(systemctl is-active ssh-tunnel.service)"
print_status "INFO" "Trading Agent: $(systemctl is-active trading-agent.service)"
print_status "INFO" "Dashboard: $(systemctl is-active trading-dashboard.service)"

# Test Summary
echo ""
echo "=================================================="
print_status "INFO" "Service Integration Test Summary"
echo "=================================================="
print_status "INFO" "Total Tests: $TESTS_TOTAL"
print_status "INFO" "Tests Passed: $TESTS_PASSED"
print_status "INFO" "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    print_status "SUCCESS" "All service integration tests passed! 🎉"
    print_status "SUCCESS" "Services are ready for production deployment."
    exit 0
else
    print_status "ERROR" "$TESTS_FAILED tests failed. Please review and fix issues."
    print_status "INFO" "Check service logs with: journalctl -u SERVICE_NAME -f"
    exit 1
fi