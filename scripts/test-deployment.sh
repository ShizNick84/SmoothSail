#!/bin/bash

# AI Crypto Trading Agent - Deployment Testing Script
# Tests complete Intel NUC deployment and startup functionality

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test configuration
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"
LOG_DIR="/var/log/trading-agent"
SERVICE_DIR="/etc/systemd/system"
KEYS_DIR="$TRADING_HOME/keys"
TEST_LOG="/tmp/deployment-test-$(date +%Y%m%d_%H%M%S).log"

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

# Test 1: System Dependencies
test_system_dependencies() {
    print_test_header "Testing System Dependencies"
    
    # Test Node.js installation
    run_test "Node.js version check" "node --version | grep -E 'v1[8-9]|v[2-9][0-9]'"
    run_test "npm version check" "npm --version"
    
    # Test PostgreSQL installation
    run_test "PostgreSQL service status" "systemctl is-active postgresql"
    run_test "PostgreSQL version check" "sudo -u postgres psql --version"
    
    # Test system packages
    run_test "curl installation" "which curl"
    run_test "git installation" "which git"
    run_test "ssh client installation" "which ssh"
    run_test "ufw firewall installation" "which ufw"
    run_test "fail2ban installation" "which fail2ban-client"
    
    # Test global npm packages
    run_test "TypeScript global installation" "which tsc"
    run_test "ts-node global installation" "which ts-node"
}

# Test 2: User and Directory Structure
test_user_and_directories() {
    print_test_header "Testing User and Directory Structure"
    
    # Test trading user
    run_test "Trading user exists" "id $TRADING_USER"
    run_test "Trading user home directory" "test -d $TRADING_HOME"
    
    # Test directory structure
    run_test "Config directory exists" "test -d $TRADING_HOME/config"
    run_test "Logs directory exists" "test -d $TRADING_HOME/logs"
    run_test "Scripts directory exists" "test -d $TRADING_HOME/scripts"
    run_test "Keys directory exists" "test -d $KEYS_DIR"
    run_test "Backups directory exists" "test -d $TRADING_HOME/backups"
    run_test "System log directory exists" "test -d $LOG_DIR"
    
    # Test permissions
    run_test "Trading home ownership" "test $(stat -c '%U' $TRADING_HOME) = '$TRADING_USER'"
    run_test "Keys directory permissions" "test $(stat -c '%a' $KEYS_DIR) = '700'"
    run_test "Log directory ownership" "test $(stat -c '%U' $LOG_DIR) = '$TRADING_USER'"
}

# Test 3: SSH Keys Configuration
test_ssh_keys() {
    print_test_header "Testing SSH Keys Configuration"
    
    # Test SSH key files
    run_test "Private SSH key exists" "test -f $KEYS_DIR/oracle_key"
    run_test "Public SSH key exists" "test -f $KEYS_DIR/oracle_key.pub"
    run_test "Private key permissions" "test $(stat -c '%a' $KEYS_DIR/oracle_key) = '600'"
    run_test "Public key permissions" "test $(stat -c '%a' $KEYS_DIR/oracle_key.pub) = '644'"
    run_test "SSH key ownership" "test $(stat -c '%U' $KEYS_DIR/oracle_key) = '$TRADING_USER'"
    
    # Test SSH key format
    run_test "Private key format" "head -1 $KEYS_DIR/oracle_key | grep -q 'BEGIN OPENSSH PRIVATE KEY'"
    run_test "Public key format" "head -1 $KEYS_DIR/oracle_key.pub | grep -q '^ssh-rsa'"
}

# Test 4: Database Configuration
test_database_configuration() {
    print_test_header "Testing Database Configuration"
    
    # Test PostgreSQL service
    run_test "PostgreSQL is running" "systemctl is-active postgresql"
    run_test "PostgreSQL is enabled" "systemctl is-enabled postgresql"
    
    # Test database and user
    run_test "Trading database exists" "sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw trading_agent"
    run_test "Trading user exists in PostgreSQL" "sudo -u postgres psql -t -c \"SELECT 1 FROM pg_roles WHERE rolname='$TRADING_USER'\" | grep -q 1"
    
    # Test database connection
    run_test "Database connection test" "PGPASSWORD='trading_secure_password_2024' psql -h localhost -U $TRADING_USER -d trading_agent -c 'SELECT 1;'"
}

# Test 5: Systemd Services
test_systemd_services() {
    print_test_header "Testing Systemd Services"
    
    # Test service files exist
    run_test "SSH tunnel service file exists" "test -f $SERVICE_DIR/ssh-tunnel.service"
    run_test "Trading agent service file exists" "test -f $SERVICE_DIR/trading-agent.service"
    run_test "Dashboard service file exists" "test -f $SERVICE_DIR/trading-dashboard.service"
    
    # Test service file syntax
    run_test "SSH tunnel service syntax" "systemd-analyze verify $SERVICE_DIR/ssh-tunnel.service"
    run_test "Trading agent service syntax" "systemd-analyze verify $SERVICE_DIR/trading-agent.service"
    run_test "Dashboard service syntax" "systemd-analyze verify $SERVICE_DIR/trading-dashboard.service"
    
    # Test systemd daemon reload
    run_test "Systemd daemon reload" "systemctl daemon-reload"
    
    # Test service recognition
    run_test "SSH tunnel service recognized" "systemctl status ssh-tunnel --no-pager -l"
    run_test "Trading agent service recognized" "systemctl status trading-agent --no-pager -l"
    run_test "Dashboard service recognized" "systemctl status trading-dashboard --no-pager -l"
}

# Test 6: Security Configuration
test_security_configuration() {
    print_test_header "Testing Security Configuration"
    
    # Test UFW firewall
    run_test "UFW is active" "ufw status | grep -q 'Status: active'"
    run_test "SSH access allowed" "ufw status | grep -q '22/tcp'"
    run_test "Dashboard access configured" "ufw status | grep -q '3000'"
    
    # Test fail2ban
    run_test "fail2ban is running" "systemctl is-active fail2ban"
    run_test "fail2ban SSH jail active" "fail2ban-client status sshd"
    
    # Test log rotation
    run_test "Trading agent logrotate config exists" "test -f /etc/logrotate.d/trading-agent"
}

# Test 7: Scripts and Monitoring
test_scripts_and_monitoring() {
    print_test_header "Testing Scripts and Monitoring"
    
    # Test script files
    run_test "Health check script exists" "test -f $TRADING_HOME/scripts/health-check.sh"
    run_test "Backup script exists" "test -f $TRADING_HOME/scripts/backup.sh"
    run_test "Health check script executable" "test -x $TRADING_HOME/scripts/health-check.sh"
    run_test "Backup script executable" "test -x $TRADING_HOME/scripts/backup.sh"
    
    # Test script ownership
    run_test "Health check script ownership" "test $(stat -c '%U' $TRADING_HOME/scripts/health-check.sh) = '$TRADING_USER'"
    run_test "Backup script ownership" "test $(stat -c '%U' $TRADING_HOME/scripts/backup.sh) = '$TRADING_USER'"
    
    # Test cron jobs
    run_test "Health check cron job exists" "crontab -u $TRADING_USER -l | grep -q 'health-check.sh'"
    run_test "Backup cron job exists" "crontab -u $TRADING_USER -l | grep -q 'backup.sh'"
}

# Test 8: SSH Tunnel Connectivity (if Oracle Cloud is accessible)
test_ssh_tunnel_connectivity() {
    print_test_header "Testing SSH Tunnel Connectivity"
    
    # Test SSH connection to Oracle Cloud (without tunnel)
    if run_test "SSH connection to Oracle Cloud" "timeout 10 sudo -u $TRADING_USER ssh -i $KEYS_DIR/oracle_key -o ConnectTimeout=5 -o StrictHostKeyChecking=no opc@168.138.104.117 'echo \"SSH connection successful\"'"; then
        print_test_info "Oracle Cloud SSH connection successful"
        
        # Test tunnel establishment (brief test)
        print_test_info "Testing SSH tunnel establishment..."
        if timeout 15 sudo -u $TRADING_USER ssh -N -L 8443:api.gateio.ws:443 -i $KEYS_DIR/oracle_key -o ConnectTimeout=5 -o StrictHostKeyChecking=no opc@168.138.104.117 &
        then
            TUNNEL_PID=$!
            sleep 5
            
            # Test if tunnel port is listening
            if run_test "SSH tunnel port listening" "netstat -ln | grep -q ':8443'"; then
                print_test_success "SSH tunnel established successfully"
            else
                print_test_failure "SSH tunnel port not listening"
            fi
            
            # Clean up tunnel
            kill $TUNNEL_PID 2>/dev/null || true
            sleep 2
        else
            print_test_failure "SSH tunnel establishment failed"
        fi
    else
        print_test_warning "Oracle Cloud SSH connection failed - skipping tunnel tests"
        print_test_warning "This may be expected if Oracle Cloud is not accessible from this network"
    fi
}

# Test 9: Service Startup Simulation
test_service_startup_simulation() {
    print_test_header "Testing Service Startup Simulation"
    
    print_test_info "Note: This test simulates service startup without actually starting services"
    print_test_info "Actual service testing should be done with application code deployed"
    
    # Test service enable (dry run)
    run_test "SSH tunnel service can be enabled" "systemctl enable ssh-tunnel --dry-run"
    run_test "Trading agent service can be enabled" "systemctl enable trading-agent --dry-run"
    run_test "Dashboard service can be enabled" "systemctl enable trading-dashboard --dry-run"
    
    # Test service dependencies
    run_test "Trading agent depends on SSH tunnel" "grep -q 'Requires=ssh-tunnel.service' $SERVICE_DIR/trading-agent.service"
    run_test "Dashboard depends on trading agent" "grep -q 'Requires=trading-agent.service' $SERVICE_DIR/trading-dashboard.service"
    
    # Test service user configuration
    run_test "SSH tunnel runs as trading user" "grep -q 'User=trading' $SERVICE_DIR/ssh-tunnel.service"
    run_test "Trading agent runs as trading user" "grep -q 'User=trading' $SERVICE_DIR/trading-agent.service"
    run_test "Dashboard runs as trading user" "grep -q 'User=trading' $SERVICE_DIR/trading-dashboard.service"
}

# Test 10: System Reboot Simulation
test_system_reboot_simulation() {
    print_test_header "Testing System Reboot Simulation"
    
    print_test_info "Testing auto-start configuration (simulation)"
    
    # Test if services are configured for auto-start
    run_test "SSH tunnel auto-start target" "grep -q 'WantedBy=multi-user.target' $SERVICE_DIR/ssh-tunnel.service"
    run_test "Trading agent auto-start target" "grep -q 'WantedBy=multi-user.target' $SERVICE_DIR/trading-agent.service"
    run_test "Dashboard auto-start target" "grep -q 'WantedBy=multi-user.target' $SERVICE_DIR/trading-dashboard.service"
    
    # Test service restart configuration
    run_test "SSH tunnel restart policy" "grep -q 'Restart=always' $SERVICE_DIR/ssh-tunnel.service"
    run_test "Trading agent restart policy" "grep -q 'Restart=always' $SERVICE_DIR/trading-agent.service"
    run_test "Dashboard restart policy" "grep -q 'Restart=always' $SERVICE_DIR/trading-dashboard.service"
    
    print_test_warning "Actual reboot testing requires manual system restart"
    print_test_warning "After reboot, verify services start automatically with:"
    print_test_warning "  sudo systemctl status ssh-tunnel trading-agent trading-dashboard"
}

# Main test execution
main() {
    echo -e "${CYAN}🚀 AI Crypto Trading Agent - Deployment Testing${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo "Test started at: $(date)"
    echo "Test log: $TEST_LOG"
    echo ""
    
    # Initialize test log
    echo "=== AI Crypto Trading Agent Deployment Test ===" > "$TEST_LOG"
    echo "Test started at: $(date)" >> "$TEST_LOG"
    echo "" >> "$TEST_LOG"
    
    # Run all tests
    test_system_dependencies
    test_user_and_directories
    test_ssh_keys
    test_database_configuration
    test_systemd_services
    test_security_configuration
    test_scripts_and_monitoring
    test_ssh_tunnel_connectivity
    test_service_startup_simulation
    test_system_reboot_simulation
    
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
        echo -e "${GREEN}✅ All deployment tests passed!${NC}"
        echo -e "${GREEN}System is ready for application deployment.${NC}"
        exit 0
    else
        echo -e "${RED}❌ Some tests failed. Please review the issues above.${NC}"
        echo -e "${YELLOW}Check the detailed log for more information: $TEST_LOG${NC}"
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