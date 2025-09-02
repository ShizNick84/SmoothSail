#!/bin/bash

# AI Crypto Trading Agent - Startup Sequence Testing Script
# Tests service startup order and dependencies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"
TEST_LOG="/tmp/startup-test-$(date +%Y%m%d_%H%M%S).log"
SERVICES=("ssh-tunnel" "trading-agent" "trading-dashboard")

# Test counters
TESTS_TOTAL=0
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print colored output
print_test_header() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting: $1" >> "$TEST_LOG"
}

print_test_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - INFO: $1" >> "$TEST_LOG"
}

print_test_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - PASS: $1" >> "$TEST_LOG"
    ((TESTS_PASSED++))
}

print_test_failure() {
    echo -e "${RED}[FAIL]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - FAIL: $1" >> "$TEST_LOG"
    ((TESTS_FAILED++))
}

print_test_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARN: $1" >> "$TEST_LOG"
}

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TESTS_TOTAL++))
    print_test_info "Running: $test_name"
    
    if eval "$test_command" &>> "$TEST_LOG"; then
        print_test_success "$test_name"
        return 0
    else
        print_test_failure "$test_name"
        return 1
    fi
}

# Test service enablement
test_service_enablement() {
    print_test_header "Testing Service Enablement"
    
    for service in "${SERVICES[@]}"; do
        # Enable service
        if systemctl enable "$service" &>> "$TEST_LOG"; then
            print_test_success "Service $service enabled"
        else
            print_test_failure "Failed to enable service $service"
        fi
        
        # Check if enabled
        run_test "Service $service is enabled" "systemctl is-enabled $service"
    done
}

# Test service dependencies
test_service_dependencies() {
    print_test_header "Testing Service Dependencies"
    
    # Check SSH tunnel has no dependencies (should start first)
    run_test "SSH tunnel has minimal dependencies" "systemctl show ssh-tunnel --property=After | grep -v 'trading-agent\\|trading-dashboard'"
    
    # Check trading agent depends on SSH tunnel
    run_test "Trading agent depends on SSH tunnel" "systemctl show trading-agent --property=After | grep -q ssh-tunnel"
    run_test "Trading agent requires SSH tunnel" "systemctl show trading-agent --property=Requires | grep -q ssh-tunnel"
    
    # Check dashboard depends on trading agent
    run_test "Dashboard depends on trading agent" "systemctl show trading-dashboard --property=After | grep -q trading-agent"
    run_test "Dashboard requires trading agent" "systemctl show trading-dashboard --property=Requires | grep -q trading-agent"
}

# Test startup order simulation
test_startup_order_simulation() {
    print_test_header "Testing Startup Order Simulation"
    
    print_test_info "Simulating service startup order..."
    
    # Stop all services first
    for service in "${SERVICES[@]}"; do
        systemctl stop "$service" 2>/dev/null || true
    done
    
    sleep 2
    
    # Test individual service startup (dry run)
    print_test_info "Testing SSH tunnel startup (first in sequence)..."
    if systemctl start ssh-tunnel --dry-run &>> "$TEST_LOG"; then
        print_test_success "SSH tunnel can start independently"
    else
        print_test_failure "SSH tunnel startup simulation failed"
    fi
    
    print_test_info "Testing trading agent startup (depends on SSH tunnel)..."
    if systemctl start trading-agent --dry-run &>> "$TEST_LOG"; then
        print_test_success "Trading agent startup simulation passed"
    else
        print_test_failure "Trading agent startup simulation failed"
    fi
    
    print_test_info "Testing dashboard startup (depends on trading agent)..."
    if systemctl start trading-dashboard --dry-run &>> "$TEST_LOG"; then
        print_test_success "Dashboard startup simulation passed"
    else
        print_test_failure "Dashboard startup simulation failed"
    fi
}

# Test service restart behavior
test_service_restart_behavior() {
    print_test_header "Testing Service Restart Behavior"
    
    for service in "${SERVICES[@]}"; do
        # Check restart policy
        run_test "$service has restart=always policy" "systemctl show $service --property=Restart | grep -q 'Restart=always'"
        
        # Check restart delay
        restart_sec=$(systemctl show "$service" --property=RestartSec --value)
        if [[ -n "$restart_sec" && "$restart_sec" != "0" ]]; then
            print_test_success "$service has restart delay configured: ${restart_sec}s"
        else
            print_test_warning "$service has no restart delay configured"
        fi
        
        # Check start limit
        run_test "$service has start limit configured" "systemctl show $service --property=StartLimitBurst --value | grep -v '^0$'"
    done
}

# Test service user and permissions
test_service_user_permissions() {
    print_test_header "Testing Service User and Permissions"
    
    for service in "${SERVICES[@]}"; do
        # Check service runs as trading user
        run_test "$service runs as trading user" "systemctl show $service --property=User --value | grep -q '^trading$'"
        
        # Check working directory
        run_test "$service has correct working directory" "systemctl show $service --property=WorkingDirectory --value | grep -q '/opt/trading-agent'"
    done
    
    # Test trading user can access required files
    run_test "Trading user can read SSH key" "sudo -u $TRADING_USER test -r /opt/trading-agent/keys/oracle_key"
    run_test "Trading user can write to logs" "sudo -u $TRADING_USER test -w /opt/trading-agent/logs"
    run_test "Trading user can write to system logs" "sudo -u $TRADING_USER test -w /var/log/trading-agent"
}

# Test environment configuration
test_environment_configuration() {
    print_test_header "Testing Environment Configuration"
    
    # Check if .env file exists (should be created during application deployment)
    if [[ -f "/opt/trading-agent/.env" ]]; then
        run_test ".env file exists" "test -f /opt/trading-agent/.env"
        run_test ".env file readable by trading user" "sudo -u $TRADING_USER test -r /opt/trading-agent/.env"
        
        # Check environment file is referenced in services
        for service in "${SERVICES[@]}"; do
            if systemctl show "$service" --property=EnvironmentFiles | grep -q "/opt/trading-agent/.env"; then
                print_test_success "$service references .env file"
            else
                print_test_warning "$service does not reference .env file"
            fi
        done
    else
        print_test_warning ".env file not found - this is expected before application deployment"
        print_test_info "Services will use default environment variables"
    fi
    
    # Test NODE_ENV is set to production
    for service in "${SERVICES[@]}"; do
        run_test "$service has NODE_ENV=production" "systemctl show $service --property=Environment | grep -q 'NODE_ENV=production'"
    done
}

# Test logging configuration
test_logging_configuration() {
    print_test_header "Testing Logging Configuration"
    
    for service in "${SERVICES[@]}"; do
        # Check journal logging
        run_test "$service logs to systemd journal" "systemctl show $service --property=StandardOutput --value | grep -q 'journal'"
        run_test "$service errors to systemd journal" "systemctl show $service --property=StandardError --value | grep -q 'journal'"
        
        # Check syslog identifier
        syslog_id=$(systemctl show "$service" --property=SyslogIdentifier --value)
        if [[ -n "$syslog_id" ]]; then
            print_test_success "$service has syslog identifier: $syslog_id"
        else
            print_test_warning "$service has no syslog identifier"
        fi
    done
    
    # Test log directory permissions
    run_test "Log directory writable by trading user" "sudo -u $TRADING_USER test -w /var/log/trading-agent"
}

# Test security settings
test_security_settings() {
    print_test_header "Testing Security Settings"
    
    for service in "${SERVICES[@]}"; do
        # Check NoNewPrivileges
        run_test "$service has NoNewPrivileges=true" "systemctl show $service --property=NoNewPrivileges --value | grep -q 'yes'"
        
        # Check PrivateTmp
        run_test "$service has PrivateTmp=true" "systemctl show $service --property=PrivateTmp --value | grep -q 'yes'"
        
        # Check ProtectSystem
        protect_system=$(systemctl show "$service" --property=ProtectSystem --value)
        if [[ "$protect_system" == "strict" || "$protect_system" == "yes" ]]; then
            print_test_success "$service has ProtectSystem enabled: $protect_system"
        else
            print_test_warning "$service has ProtectSystem disabled or not configured"
        fi
    done
}

# Test resource limits
test_resource_limits() {
    print_test_header "Testing Resource Limits"
    
    for service in "${SERVICES[@]}"; do
        # Check memory limits
        memory_max=$(systemctl show "$service" --property=MemoryMax --value)
        if [[ "$memory_max" != "infinity" && -n "$memory_max" ]]; then
            print_test_success "$service has memory limit: $memory_max"
        else
            print_test_warning "$service has no memory limit configured"
        fi
        
        # Check CPU limits
        cpu_quota=$(systemctl show "$service" --property=CPUQuotaPerSecUSec --value)
        if [[ "$cpu_quota" != "infinity" && -n "$cpu_quota" ]]; then
            print_test_success "$service has CPU quota configured"
        else
            print_test_warning "$service has no CPU quota configured"
        fi
    done
}

# Test post-reboot simulation
test_post_reboot_simulation() {
    print_test_header "Testing Post-Reboot Simulation"
    
    print_test_info "Simulating system boot sequence..."
    
    # Disable all services first
    for service in "${SERVICES[@]}"; do
        systemctl disable "$service" 2>/dev/null || true
    done
    
    # Re-enable services
    for service in "${SERVICES[@]}"; do
        systemctl enable "$service"
    done
    
    # Check multi-user.target wants our services
    for service in "${SERVICES[@]}"; do
        run_test "$service linked to multi-user.target" "systemctl list-dependencies multi-user.target | grep -q $service"
    done
    
    print_test_warning "Actual reboot test requires manual system restart"
    print_test_info "After reboot, services should start automatically in this order:"
    print_test_info "1. ssh-tunnel.service"
    print_test_info "2. trading-agent.service (after ssh-tunnel)"
    print_test_info "3. trading-dashboard.service (after trading-agent)"
}

# Main test execution
main() {
    echo -e "${CYAN}🔄 AI Crypto Trading Agent - Startup Sequence Testing${NC}"
    echo -e "${CYAN}=====================================================${NC}"
    echo "Test started at: $(date)"
    echo "Test log: $TEST_LOG"
    echo ""
    
    # Initialize test log
    echo "=== AI Crypto Trading Agent Startup Sequence Test ===" > "$TEST_LOG"
    echo "Test started at: $(date)" >> "$TEST_LOG"
    echo "" >> "$TEST_LOG"
    
    # Run all tests
    test_service_enablement
    test_service_dependencies
    test_startup_order_simulation
    test_service_restart_behavior
    test_service_user_permissions
    test_environment_configuration
    test_logging_configuration
    test_security_settings
    test_resource_limits
    test_post_reboot_simulation
    
    # Print test summary
    echo ""
    echo -e "${CYAN}=== Test Summary ===${NC}"
    echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Success Rate: ${BLUE}$(( TESTS_PASSED * 100 / TESTS_TOTAL ))%${NC}"
    echo ""
    echo "Detailed test log: $TEST_LOG"
    
    # Final status
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All startup sequence tests passed!${NC}"
        echo -e "${GREEN}Services are properly configured for automatic startup.${NC}"
        echo ""
        echo -e "${YELLOW}Next steps:${NC}"
        echo -e "1. Deploy application code to /opt/trading-agent"
        echo -e "2. Create .env configuration file"
        echo -e "3. Build application (npm install && npm run build)"
        echo -e "4. Test actual service startup"
        echo -e "5. Perform system reboot test"
        exit 0
    else
        echo -e "${RED}❌ Some startup sequence tests failed.${NC}"
        echo -e "${YELLOW}Please review the issues above before proceeding.${NC}"
        echo -e "${YELLOW}Check the detailed log: $TEST_LOG${NC}"
        exit 1
    fi
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Run main function
main "$@"