#!/bin/bash

# =============================================================================
# System Reboot Testing Script for Intel NUC
# =============================================================================
# This script tests system reboot and auto-start functionality
# WARNING: This script will reboot the system if run with --actual-reboot
# =============================================================================

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

# Function to create reboot test marker
create_reboot_marker() {
    local test_id=$(date +%s)
    echo "$test_id" > /tmp/reboot_test_marker
    echo "$(date)" >> /tmp/reboot_test_marker
    echo "Reboot test initiated" >> /tmp/reboot_test_marker
    print_status "INFO" "Created reboot test marker: $test_id"
}

# Function to check if this is post-reboot
check_post_reboot() {
    if [ -f "/tmp/reboot_test_marker" ]; then
        print_status "INFO" "Post-reboot test detected"
        return 0
    else
        return 1
    fi
}

# Function to run pre-reboot tests
run_pre_reboot_tests() {
    print_status "INFO" "Running pre-reboot tests..."
    
    # Check service enable status
    print_status "INFO" "Checking service enable status..."
    
    if systemctl is-enabled ssh-tunnel.service >/dev/null 2>&1; then
        print_status "SUCCESS" "SSH Tunnel service is enabled for auto-start"
    else
        print_status "ERROR" "SSH Tunnel service is not enabled"
        return 1
    fi
    
    if systemctl is-enabled trading-agent.service >/dev/null 2>&1; then
        print_status "SUCCESS" "Trading Agent service is enabled for auto-start"
    else
        print_status "ERROR" "Trading Agent service is not enabled"
        return 1
    fi
    
    if systemctl is-enabled trading-dashboard.service >/dev/null 2>&1; then
        print_status "SUCCESS" "Dashboard service is enabled for auto-start"
    else
        print_status "ERROR" "Dashboard service is not enabled"
        return 1
    fi
    
    # Check service dependencies
    print_status "INFO" "Checking service dependencies..."
    
    # Check if trading-agent depends on ssh-tunnel
    if systemctl show trading-agent.service --property=After | grep -q ssh-tunnel.service; then
        print_status "SUCCESS" "Trading Agent correctly depends on SSH Tunnel"
    else
        print_status "ERROR" "Trading Agent does not depend on SSH Tunnel"
        return 1
    fi
    
    # Check if dashboard depends on trading-agent
    if systemctl show trading-dashboard.service --property=After | grep -q trading-agent.service; then
        print_status "SUCCESS" "Dashboard correctly depends on Trading Agent"
    else
        print_status "ERROR" "Dashboard does not depend on Trading Agent"
        return 1
    fi
    
    # Check current service status
    print_status "INFO" "Current service status:"
    print_status "INFO" "SSH Tunnel: $(systemctl is-active ssh-tunnel.service)"
    print_status "INFO" "Trading Agent: $(systemctl is-active trading-agent.service)"
    print_status "INFO" "Dashboard: $(systemctl is-active trading-dashboard.service)"
    
    return 0
}

# Function to run post-reboot tests
run_post_reboot_tests() {
    print_status "INFO" "Running post-reboot tests..."
    
    # Wait for system to fully boot
    print_status "INFO" "Waiting for system to fully initialize..."
    sleep 30
    
    local tests_passed=0
    local tests_total=6
    
    # Test 1: SSH Tunnel auto-start
    print_status "INFO" "Testing SSH Tunnel auto-start..."
    local ssh_status=$(systemctl is-active ssh-tunnel.service)
    if [ "$ssh_status" = "active" ]; then
        print_status "SUCCESS" "SSH Tunnel started automatically after reboot"
        ((tests_passed++))
    else
        print_status "ERROR" "SSH Tunnel failed to start automatically (status: $ssh_status)"
    fi
    
    # Test 2: Trading Agent auto-start
    print_status "INFO" "Testing Trading Agent auto-start..."
    local agent_status=$(systemctl is-active trading-agent.service)
    if [ "$agent_status" = "active" ]; then
        print_status "SUCCESS" "Trading Agent started automatically after reboot"
        ((tests_passed++))
    else
        print_status "ERROR" "Trading Agent failed to start automatically (status: $agent_status)"
    fi
    
    # Test 3: Dashboard auto-start
    print_status "INFO" "Testing Dashboard auto-start..."
    local dashboard_status=$(systemctl is-active trading-dashboard.service)
    if [ "$dashboard_status" = "active" ]; then
        print_status "SUCCESS" "Dashboard started automatically after reboot"
        ((tests_passed++))
    else
        print_status "ERROR" "Dashboard failed to start automatically (status: $dashboard_status)"
    fi
    
    # Test 4: SSH Tunnel connectivity
    print_status "INFO" "Testing SSH Tunnel connectivity..."
    sleep 10  # Wait for tunnel to establish
    if netstat -tuln | grep -q ":8443 "; then
        print_status "SUCCESS" "SSH Tunnel is listening on port 8443"
        ((tests_passed++))
    else
        print_status "ERROR" "SSH Tunnel is not listening on port 8443"
    fi
    
    # Test 5: Trading Agent API
    print_status "INFO" "Testing Trading Agent API..."
    if netstat -tuln | grep -q ":3001 "; then
        print_status "SUCCESS" "Trading Agent is listening on port 3001"
        ((tests_passed++))
    else
        print_status "ERROR" "Trading Agent is not listening on port 3001"
    fi
    
    # Test 6: Dashboard HTTP
    print_status "INFO" "Testing Dashboard HTTP..."
    if netstat -tuln | grep -q ":3000 "; then
        print_status "SUCCESS" "Dashboard is listening on port 3000"
        ((tests_passed++))
    else
        print_status "ERROR" "Dashboard is not listening on port 3000"
    fi
    
    # Additional connectivity tests
    print_status "INFO" "Testing HTTP endpoints..."
    
    # Test dashboard HTTP endpoint
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
        print_status "SUCCESS" "Dashboard HTTP endpoint is responding"
    else
        print_status "WARNING" "Dashboard HTTP endpoint is not responding (may still be initializing)"
    fi
    
    # Check service logs for errors
    print_status "INFO" "Checking service logs for errors..."
    
    # Check SSH tunnel logs
    if journalctl -u ssh-tunnel.service --since "5 minutes ago" | grep -qi error; then
        print_status "WARNING" "SSH Tunnel logs contain errors"
    else
        print_status "SUCCESS" "SSH Tunnel logs are clean"
    fi
    
    # Check trading agent logs
    if journalctl -u trading-agent.service --since "5 minutes ago" | grep -qi error; then
        print_status "WARNING" "Trading Agent logs contain errors"
    else
        print_status "SUCCESS" "Trading Agent logs are clean"
    fi
    
    # Check dashboard logs
    if journalctl -u trading-dashboard.service --since "5 minutes ago" | grep -qi error; then
        print_status "WARNING" "Dashboard logs contain errors"
    else
        print_status "SUCCESS" "Dashboard logs are clean"
    fi
    
    # Test summary
    print_status "INFO" "Post-reboot test results: $tests_passed/$tests_total tests passed"
    
    if [ $tests_passed -eq $tests_total ]; then
        print_status "SUCCESS" "All post-reboot tests passed! System auto-start is working correctly."
        return 0
    else
        print_status "ERROR" "Some post-reboot tests failed. Auto-start may have issues."
        return 1
    fi
}

# Function to simulate reboot (stop and start services)
simulate_reboot() {
    print_status "INFO" "Simulating system reboot (stopping and starting services)..."
    
    # Stop all services
    print_status "INFO" "Stopping all services..."
    systemctl stop trading-dashboard.service
    systemctl stop trading-agent.service
    systemctl stop ssh-tunnel.service
    
    # Wait a moment
    sleep 5
    
    # Verify services are stopped
    print_status "INFO" "Verifying services are stopped..."
    print_status "INFO" "SSH Tunnel: $(systemctl is-active ssh-tunnel.service)"
    print_status "INFO" "Trading Agent: $(systemctl is-active trading-agent.service)"
    print_status "INFO" "Dashboard: $(systemctl is-active trading-dashboard.service)"
    
    # Simulate boot delay
    print_status "INFO" "Simulating boot delay..."
    sleep 10
    
    # Start services in dependency order (simulating systemd auto-start)
    print_status "INFO" "Starting services in dependency order..."
    
    systemctl start ssh-tunnel.service
    sleep 10
    
    systemctl start trading-agent.service
    sleep 15
    
    systemctl start trading-dashboard.service
    sleep 10
    
    # Run post-reboot tests
    run_post_reboot_tests
}

# Main script logic
echo "🔄 System Reboot Testing for Intel NUC"
echo "=================================================="

# Check if this is a post-reboot execution
if check_post_reboot; then
    print_status "INFO" "This appears to be a post-reboot execution"
    
    # Read reboot marker
    if [ -f "/tmp/reboot_test_marker" ]; then
        print_status "INFO" "Reboot test marker contents:"
        cat /tmp/reboot_test_marker
        echo ""
    fi
    
    # Run post-reboot tests
    if run_post_reboot_tests; then
        print_status "SUCCESS" "Post-reboot tests completed successfully"
        rm -f /tmp/reboot_test_marker
        exit 0
    else
        print_status "ERROR" "Post-reboot tests failed"
        rm -f /tmp/reboot_test_marker
        exit 1
    fi
fi

# Check command line arguments
if [ "$1" = "--actual-reboot" ]; then
    print_status "WARNING" "ACTUAL REBOOT MODE SELECTED"
    print_status "WARNING" "This will reboot the system in 10 seconds!"
    print_status "INFO" "Press Ctrl+C to cancel..."
    
    for i in {10..1}; do
        echo -n "$i... "
        sleep 1
    done
    echo ""
    
    # Run pre-reboot tests
    if ! run_pre_reboot_tests; then
        print_status "ERROR" "Pre-reboot tests failed. Aborting reboot."
        exit 1
    fi
    
    # Create reboot marker
    create_reboot_marker
    
    # Schedule post-reboot test
    cat > /tmp/post_reboot_test.sh << 'EOF'
#!/bin/bash
sleep 60  # Wait for system to fully boot
/opt/trading-agent/scripts/test-system-reboot.sh
EOF
    chmod +x /tmp/post_reboot_test.sh
    
    # Add to crontab for execution after reboot
    (crontab -l 2>/dev/null; echo "@reboot /tmp/post_reboot_test.sh") | crontab -
    
    print_status "INFO" "Initiating system reboot..."
    sudo reboot
    
elif [ "$1" = "--simulate" ] || [ "$1" = "" ]; then
    print_status "INFO" "SIMULATION MODE (no actual reboot)"
    
    # Run pre-reboot tests
    if ! run_pre_reboot_tests; then
        print_status "ERROR" "Pre-reboot tests failed."
        exit 1
    fi
    
    # Simulate reboot
    simulate_reboot
    
else
    print_status "ERROR" "Invalid argument: $1"
    print_status "INFO" "Usage: $0 [--simulate|--actual-reboot]"
    print_status "INFO" "  --simulate      Simulate reboot by stopping/starting services (default)"
    print_status "INFO" "  --actual-reboot Actually reboot the system (WARNING: WILL REBOOT!)"
    exit 1
fi