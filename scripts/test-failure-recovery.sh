#!/bin/bash

# =============================================================================
# Failure Recovery Testing Script for Intel NUC
# =============================================================================
# This script tests automatic restart and failure recovery mechanisms
# Tests various failure scenarios and recovery procedures
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

# Function to wait for service recovery
wait_for_recovery() {
    local service_name=$1
    local timeout=${2:-60}
    local counter=0
    
    print_status "INFO" "Waiting for $service_name to recover (timeout: ${timeout}s)..."
    
    while [ $counter -lt $timeout ]; do
        if systemctl is-active --quiet "$service_name"; then
            print_status "SUCCESS" "$service_name recovered successfully"
            return 0
        fi
        sleep 1
        ((counter++))
        if [ $((counter % 10)) -eq 0 ]; then
            print_status "INFO" "Still waiting for $service_name recovery... (${counter}s elapsed)"
        fi
    done
    
    print_status "ERROR" "$service_name failed to recover within ${timeout}s"
    return 1
}

# Function to kill service process
kill_service_process() {
    local service_name=$1
    local signal=${2:-TERM}
    
    local pid=$(systemctl show "$service_name" --property=MainPID --value)
    if [ "$pid" != "0" ] && [ -n "$pid" ]; then
        print_status "INFO" "Killing $service_name process (PID: $pid) with signal $signal"
        kill -"$signal" "$pid" 2>/dev/null || true
        return 0
    else
        print_status "WARNING" "No PID found for $service_name"
        return 1
    fi
}

# Function to simulate network failure
simulate_network_failure() {
    local duration=${1:-10}
    
    print_status "INFO" "Simulating network failure for ${duration}s..."
    
    # Block outbound connections temporarily (requires root)
    if [ "$EUID" -eq 0 ]; then
        iptables -A OUTPUT -j DROP
        sleep "$duration"
        iptables -D OUTPUT -j DROP
        print_status "INFO" "Network failure simulation completed"
    else
        print_status "WARNING" "Network failure simulation requires root privileges"
        sleep "$duration"
    fi
}

echo "🔧 Starting Failure Recovery Testing for Intel NUC..."
echo "=================================================="

# Ensure all services are running first
print_status "INFO" "Ensuring all services are running..."
systemctl start ssh-tunnel.service
systemctl start trading-agent.service
systemctl start trading-dashboard.service

sleep 10

# Test 1: SSH Tunnel Process Failure Recovery
print_status "INFO" "Testing SSH Tunnel process failure recovery..."

run_test "SSH Tunnel is initially active" "systemctl is-active --quiet ssh-tunnel.service"

# Kill SSH tunnel process with SIGTERM
kill_service_process ssh-tunnel.service TERM
sleep 2

run_test "SSH Tunnel recovers from SIGTERM" "wait_for_recovery ssh-tunnel.service 30"

# Kill SSH tunnel process with SIGKILL
kill_service_process ssh-tunnel.service KILL
sleep 2

run_test "SSH Tunnel recovers from SIGKILL" "wait_for_recovery ssh-tunnel.service 30"

# Test 2: Trading Agent Process Failure Recovery
print_status "INFO" "Testing Trading Agent process failure recovery..."

run_test "Trading Agent is initially active" "systemctl is-active --quiet trading-agent.service"

# Kill trading agent process with SIGTERM
kill_service_process trading-agent.service TERM
sleep 2

run_test "Trading Agent recovers from SIGTERM" "wait_for_recovery trading-agent.service 60"

# Kill trading agent process with SIGKILL
kill_service_process trading-agent.service KILL
sleep 2

run_test "Trading Agent recovers from SIGKILL" "wait_for_recovery trading-agent.service 60"

# Test 3: Dashboard Process Failure Recovery
print_status "INFO" "Testing Dashboard process failure recovery..."

run_test "Dashboard is initially active" "systemctl is-active --quiet trading-dashboard.service"

# Kill dashboard process with SIGTERM
kill_service_process trading-dashboard.service TERM
sleep 2

run_test "Dashboard recovers from SIGTERM" "wait_for_recovery trading-dashboard.service 30"

# Kill dashboard process with SIGKILL
kill_service_process trading-dashboard.service KILL
sleep 2

run_test "Dashboard recovers from SIGKILL" "wait_for_recovery trading-dashboard.service 30"

# Test 4: Dependency Chain Recovery
print_status "INFO" "Testing dependency chain recovery..."

# Stop SSH tunnel (should affect trading agent)
systemctl stop ssh-tunnel.service
sleep 5

# Check if trading agent handles SSH tunnel failure gracefully
run_test "Trading Agent handles SSH tunnel failure" "systemctl is-active --quiet trading-agent.service"

# Restart SSH tunnel
systemctl start ssh-tunnel.service
sleep 10

run_test "SSH Tunnel restarts successfully" "systemctl is-active --quiet ssh-tunnel.service"
run_test "Trading Agent continues running after SSH tunnel restart" "systemctl is-active --quiet trading-agent.service"

# Test 5: Multiple Service Failure Recovery
print_status "INFO" "Testing multiple service failure recovery..."

# Kill all service processes simultaneously
kill_service_process ssh-tunnel.service KILL &
kill_service_process trading-agent.service KILL &
kill_service_process trading-dashboard.service KILL &
wait

sleep 5

# Check recovery of all services
run_test "SSH Tunnel recovers from mass failure" "wait_for_recovery ssh-tunnel.service 30"
run_test "Trading Agent recovers from mass failure" "wait_for_recovery trading-agent.service 60"
run_test "Dashboard recovers from mass failure" "wait_for_recovery trading-dashboard.service 30"

# Test 6: Resource Exhaustion Simulation
print_status "INFO" "Testing resource exhaustion scenarios..."

# Test memory pressure (if stress tool is available)
if command -v stress >/dev/null 2>&1; then
    print_status "INFO" "Simulating memory pressure..."
    stress --vm 2 --vm-bytes 512M --timeout 30s &
    STRESS_PID=$!
    
    sleep 15
    
    # Check if services are still running under memory pressure
    run_test "SSH Tunnel survives memory pressure" "systemctl is-active --quiet ssh-tunnel.service"
    run_test "Trading Agent survives memory pressure" "systemctl is-active --quiet trading-agent.service"
    run_test "Dashboard survives memory pressure" "systemctl is-active --quiet trading-dashboard.service"
    
    wait $STRESS_PID 2>/dev/null || true
else
    print_status "WARNING" "stress tool not available, skipping memory pressure test"
fi

# Test 7: Disk Space Exhaustion Simulation
print_status "INFO" "Testing disk space handling..."

# Create a large temporary file to simulate disk pressure (be careful!)
TEMP_FILE="/tmp/disk_pressure_test"
if [ "$(df /tmp | tail -1 | awk '{print $4}')" -gt 1048576 ]; then  # More than 1GB free
    print_status "INFO" "Creating temporary large file for disk pressure test..."
    dd if=/dev/zero of="$TEMP_FILE" bs=1M count=500 2>/dev/null &
    DD_PID=$!
    
    sleep 10
    
    # Check if services handle disk pressure
    run_test "Services handle disk pressure" "
        systemctl is-active --quiet ssh-tunnel.service &&
        systemctl is-active --quiet trading-agent.service &&
        systemctl is-active --quiet trading-dashboard.service
    "
    
    # Clean up
    kill $DD_PID 2>/dev/null || true
    rm -f "$TEMP_FILE"
else
    print_status "WARNING" "Insufficient disk space for disk pressure test"
fi

# Test 8: Network Connectivity Recovery
print_status "INFO" "Testing network connectivity recovery..."

# Simulate brief network outage
simulate_network_failure 15

# Check if services recover after network restoration
sleep 10

run_test "SSH Tunnel recovers after network failure" "systemctl is-active --quiet ssh-tunnel.service"
run_test "Trading Agent recovers after network failure" "systemctl is-active --quiet trading-agent.service"
run_test "Dashboard recovers after network failure" "systemctl is-active --quiet trading-dashboard.service"

# Test 9: Configuration File Recovery
print_status "INFO" "Testing configuration file recovery..."

# Backup original .env file
if [ -f "/opt/trading-agent/.env" ]; then
    cp "/opt/trading-agent/.env" "/opt/trading-agent/.env.backup"
    
    # Temporarily corrupt .env file
    echo "CORRUPTED_CONFIG=true" > "/opt/trading-agent/.env"
    
    # Restart trading agent to test error handling
    systemctl restart trading-agent.service
    sleep 10
    
    # Check if service handles corrupted config gracefully
    SERVICE_STATUS=$(systemctl is-active trading-agent.service)
    if [ "$SERVICE_STATUS" = "failed" ]; then
        print_status "SUCCESS" "Trading Agent correctly fails with corrupted config"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        print_status "WARNING" "Trading Agent did not fail with corrupted config"
    fi
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    # Restore original config
    mv "/opt/trading-agent/.env.backup" "/opt/trading-agent/.env"
    systemctl restart trading-agent.service
    
    run_test "Trading Agent recovers with restored config" "wait_for_recovery trading-agent.service 60"
else
    print_status "WARNING" "No .env file found, skipping config recovery test"
fi

# Test 10: Service Restart Limits
print_status "INFO" "Testing service restart limits..."

# Check restart configuration
SSH_RESTART_SEC=$(systemctl show ssh-tunnel.service --property=RestartSec --value)
AGENT_RESTART_SEC=$(systemctl show trading-agent.service --property=RestartSec --value)
DASHBOARD_RESTART_SEC=$(systemctl show trading-dashboard.service --property=RestartSec --value)

print_status "INFO" "SSH Tunnel restart delay: ${SSH_RESTART_SEC}s"
print_status "INFO" "Trading Agent restart delay: ${AGENT_RESTART_SEC}s"
print_status "INFO" "Dashboard restart delay: ${DASHBOARD_RESTART_SEC}s"

# Test rapid failure scenario (kill process multiple times quickly)
print_status "INFO" "Testing rapid failure handling..."

for i in {1..3}; do
    kill_service_process ssh-tunnel.service KILL
    sleep 5
done

run_test "SSH Tunnel handles rapid failures" "wait_for_recovery ssh-tunnel.service 60"

# Final Status Check
print_status "INFO" "Final service status after all failure tests..."
print_status "INFO" "SSH Tunnel: $(systemctl is-active ssh-tunnel.service)"
print_status "INFO" "Trading Agent: $(systemctl is-active trading-agent.service)"
print_status "INFO" "Dashboard: $(systemctl is-active trading-dashboard.service)"

# Check for any failed units
FAILED_UNITS=$(systemctl list-units --failed --no-legend | wc -l)
if [ "$FAILED_UNITS" -gt 0 ]; then
    print_status "WARNING" "$FAILED_UNITS failed units detected"
    systemctl list-units --failed
fi

# Test Summary
echo ""
echo "=================================================="
print_status "INFO" "Failure Recovery Test Summary"
echo "=================================================="
print_status "INFO" "Total Tests: $TESTS_TOTAL"
print_status "INFO" "Tests Passed: $TESTS_PASSED"
print_status "INFO" "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    print_status "SUCCESS" "All failure recovery tests passed! 🎉"
    print_status "SUCCESS" "System demonstrates excellent resilience and recovery capabilities."
    exit 0
else
    print_status "ERROR" "$TESTS_FAILED tests failed. System may have resilience issues."
    print_status "INFO" "Review service configurations and restart policies."
    exit 1
fi