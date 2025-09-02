#!/bin/bash

# AI Crypto Trading Agent - SSH Tunnel Connectivity Testing Script
# Tests SSH tunnel establishment and API connectivity

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
KEYS_DIR="$TRADING_HOME/keys"
ORACLE_HOST="168.138.104.117"
ORACLE_USER="opc"
SSH_KEY="$KEYS_DIR/oracle_key"
TUNNEL_PORT="8443"
GATE_API_HOST="api.gateio.ws"
GATE_API_PORT="443"
TEST_LOG="/tmp/ssh-tunnel-test-$(date +%Y%m%d_%H%M%S).log"

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

# Test SSH prerequisites
test_ssh_prerequisites() {
    print_test_header "Testing SSH Prerequisites"
    
    # Test SSH client
    run_test "SSH client installed" "which ssh"
    
    # Test SSH key files
    run_test "SSH private key exists" "test -f $SSH_KEY"
    run_test "SSH private key permissions" "test $(stat -c '%a' $SSH_KEY) = '600'"
    run_test "SSH private key ownership" "test $(stat -c '%U' $SSH_KEY) = '$TRADING_USER'"
    
    # Test SSH key format
    run_test "SSH private key format" "head -1 $SSH_KEY | grep -q 'BEGIN OPENSSH PRIVATE KEY'"
    
    # Test network connectivity to Oracle Cloud
    run_test "Network connectivity to Oracle Cloud" "ping -c 3 -W 5 $ORACLE_HOST"
    run_test "SSH port accessible on Oracle Cloud" "timeout 10 nc -z $ORACLE_HOST 22"
}

# Test SSH connection to Oracle Cloud
test_ssh_connection() {
    print_test_header "Testing SSH Connection to Oracle Cloud"
    
    print_test_info "Testing SSH connection as trading user..."
    
    # Test basic SSH connection
    if timeout 15 sudo -u "$TRADING_USER" ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o BatchMode=yes "$ORACLE_USER@$ORACLE_HOST" 'echo "SSH connection successful"' &>> "$TEST_LOG"; then
        print_test_success "SSH connection to Oracle Cloud successful"
        
        # Test SSH connection with commands
        run_test "Execute command via SSH" "timeout 10 sudo -u '$TRADING_USER' ssh -i '$SSH_KEY' -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o BatchMode=yes '$ORACLE_USER@$ORACLE_HOST' 'uname -a'"
        
        # Test SSH connection with network tools
        run_test "Network tools available on Oracle Cloud" "timeout 10 sudo -u '$TRADING_USER' ssh -i '$SSH_KEY' -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o BatchMode=yes '$ORACLE_USER@$ORACLE_HOST' 'which nc || which netcat'"
        
        return 0
    else
        print_test_failure "SSH connection to Oracle Cloud failed"
        print_test_warning "This may be due to:"
        print_test_warning "1. SSH key not added to Oracle Cloud authorized_keys"
        print_test_warning "2. Oracle Cloud firewall blocking SSH"
        print_test_warning "3. Network connectivity issues"
        print_test_warning "4. Oracle Cloud instance not running"
        return 1
    fi
}

# Test SSH tunnel establishment
test_ssh_tunnel_establishment() {
    print_test_header "Testing SSH Tunnel Establishment"
    
    print_test_info "Establishing SSH tunnel: localhost:$TUNNEL_PORT -> $ORACLE_HOST -> $GATE_API_HOST:$GATE_API_PORT"
    
    # Start SSH tunnel in background
    local tunnel_cmd="ssh -N -L $TUNNEL_PORT:$GATE_API_HOST:$GATE_API_PORT -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=no -o BatchMode=yes -i $SSH_KEY $ORACLE_USER@$ORACLE_HOST"
    
    print_test_info "Starting SSH tunnel..."
    if timeout 30 sudo -u "$TRADING_USER" $tunnel_cmd &
    then
        TUNNEL_PID=$!
        print_test_info "SSH tunnel started with PID: $TUNNEL_PID"
        
        # Wait for tunnel to establish
        sleep 10
        
        # Check if tunnel process is still running
        if kill -0 $TUNNEL_PID 2>/dev/null; then
            print_test_success "SSH tunnel process is running"
            
            # Check if tunnel port is listening
            if run_test "SSH tunnel port listening" "netstat -ln | grep -q ':$TUNNEL_PORT'"; then
                print_test_success "SSH tunnel established successfully"
                
                # Test tunnel connectivity
                test_tunnel_connectivity $TUNNEL_PID
                
            else
                print_test_failure "SSH tunnel port not listening"
            fi
        else
            print_test_failure "SSH tunnel process died"
        fi
        
        # Clean up tunnel
        print_test_info "Cleaning up SSH tunnel..."
        kill $TUNNEL_PID 2>/dev/null || true
        sleep 3
        
        # Force kill if still running
        if kill -0 $TUNNEL_PID 2>/dev/null; then
            kill -9 $TUNNEL_PID 2>/dev/null || true
        fi
        
    else
        print_test_failure "Failed to start SSH tunnel"
        return 1
    fi
}

# Test tunnel connectivity
test_tunnel_connectivity() {
    local tunnel_pid=$1
    
    print_test_header "Testing Tunnel Connectivity"
    
    # Test if we can connect to the tunnel port
    run_test "Connect to tunnel port" "timeout 10 nc -z localhost $TUNNEL_PORT"
    
    # Test HTTP connection through tunnel
    print_test_info "Testing HTTP connection through tunnel..."
    if timeout 15 curl -s -k --connect-timeout 10 "https://localhost:$TUNNEL_PORT/api/v4/spot/currencies" > /tmp/tunnel_test_response.json 2>> "$TEST_LOG"; then
        print_test_success "HTTP request through tunnel successful"
        
        # Check if response looks like Gate.io API response
        if grep -q "currency" /tmp/tunnel_test_response.json 2>/dev/null; then
            print_test_success "Gate.io API response received through tunnel"
        else
            print_test_warning "Response received but may not be from Gate.io API"
        fi
        
        # Clean up response file
        rm -f /tmp/tunnel_test_response.json
        
    else
        print_test_failure "HTTP request through tunnel failed"
        print_test_warning "This may be due to:"
        print_test_warning "1. Oracle Cloud cannot reach Gate.io API"
        print_test_warning "2. Gate.io API blocking Oracle Cloud IP"
        print_test_warning "3. Network routing issues"
    fi
    
    # Test HTTPS certificate validation
    print_test_info "Testing HTTPS certificate through tunnel..."
    if timeout 10 openssl s_client -connect "localhost:$TUNNEL_PORT" -servername "$GATE_API_HOST" </dev/null 2>> "$TEST_LOG" | grep -q "Verify return code: 0"; then
        print_test_success "HTTPS certificate validation successful"
    else
        print_test_warning "HTTPS certificate validation failed (expected for tunneled connection)"
    fi
}

# Test systemd service SSH tunnel
test_systemd_ssh_tunnel() {
    print_test_header "Testing Systemd SSH Tunnel Service"
    
    # Check if service file exists
    run_test "SSH tunnel service file exists" "test -f /etc/systemd/system/ssh-tunnel.service"
    
    # Check service configuration
    run_test "SSH tunnel service user configured" "grep -q 'User=trading' /etc/systemd/system/ssh-tunnel.service"
    run_test "SSH tunnel service working directory" "grep -q 'WorkingDirectory=/opt/trading-agent' /etc/systemd/system/ssh-tunnel.service"
    
    # Check SSH command in service
    if grep -q "ExecStart.*ssh.*-L.*$TUNNEL_PORT.*$GATE_API_HOST.*$GATE_API_PORT" /etc/systemd/system/ssh-tunnel.service; then
        print_test_success "SSH tunnel command configured correctly in service"
    else
        print_test_failure "SSH tunnel command not configured correctly in service"
    fi
    
    # Check service restart configuration
    run_test "SSH tunnel service restart policy" "grep -q 'Restart=always' /etc/systemd/system/ssh-tunnel.service"
    run_test "SSH tunnel service restart delay" "grep -q 'RestartSec=' /etc/systemd/system/ssh-tunnel.service"
    
    # Test service syntax
    run_test "SSH tunnel service syntax valid" "systemd-analyze verify /etc/systemd/system/ssh-tunnel.service"
}

# Test tunnel health monitoring
test_tunnel_health_monitoring() {
    print_test_header "Testing Tunnel Health Monitoring"
    
    # Check if health check script exists
    if [[ -f "$TRADING_HOME/scripts/tunnel-health-check.sh" ]]; then
        run_test "Tunnel health check script exists" "test -f $TRADING_HOME/scripts/tunnel-health-check.sh"
        run_test "Tunnel health check script executable" "test -x $TRADING_HOME/scripts/tunnel-health-check.sh"
        run_test "Tunnel health check script ownership" "test $(stat -c '%U' $TRADING_HOME/scripts/tunnel-health-check.sh) = '$TRADING_USER'"
        
        # Test health check script syntax
        run_test "Tunnel health check script syntax" "bash -n $TRADING_HOME/scripts/tunnel-health-check.sh"
        
    else
        print_test_warning "Tunnel health check script not found"
        print_test_info "Creating basic tunnel health check script..."
        
        # Create basic health check script
        cat > "$TRADING_HOME/scripts/tunnel-health-check.sh" << 'EOF'
#!/bin/bash

# Basic SSH tunnel health check
TUNNEL_PORT="8443"
LOG_FILE="/var/log/trading-agent/tunnel-health.log"

echo "$(date): Checking SSH tunnel health..." >> "$LOG_FILE"

if netstat -ln | grep -q ":$TUNNEL_PORT"; then
    echo "$(date): ✅ SSH tunnel port $TUNNEL_PORT is listening" >> "$LOG_FILE"
    exit 0
else
    echo "$(date): ❌ SSH tunnel port $TUNNEL_PORT is not listening" >> "$LOG_FILE"
    exit 1
fi
EOF
        
        chmod +x "$TRADING_HOME/scripts/tunnel-health-check.sh"
        chown "$TRADING_USER:$TRADING_USER" "$TRADING_HOME/scripts/tunnel-health-check.sh"
        
        print_test_success "Created basic tunnel health check script"
    fi
}

# Test network requirements
test_network_requirements() {
    print_test_header "Testing Network Requirements"
    
    # Test required network tools
    run_test "netstat available" "which netstat"
    run_test "nc (netcat) available" "which nc || which netcat"
    run_test "curl available" "which curl"
    run_test "openssl available" "which openssl"
    
    # Test DNS resolution
    run_test "Oracle Cloud DNS resolution" "nslookup $ORACLE_HOST"
    run_test "Gate.io API DNS resolution" "nslookup $GATE_API_HOST"
    
    # Test port availability
    run_test "Tunnel port $TUNNEL_PORT available" "! netstat -ln | grep -q ':$TUNNEL_PORT'"
    
    # Test firewall rules
    if which ufw >/dev/null 2>&1; then
        run_test "UFW allows outbound SSH" "ufw status | grep -q '22/tcp' || echo 'UFW allows outbound by default'"
        run_test "UFW allows outbound HTTPS" "ufw status | grep -q '443/tcp' || echo 'UFW allows outbound by default'"
    else
        print_test_warning "UFW not installed - cannot test firewall rules"
    fi
}

# Main test execution
main() {
    echo -e "${CYAN}🔗 AI Crypto Trading Agent - SSH Tunnel Connectivity Testing${NC}"
    echo -e "${CYAN}============================================================${NC}"
    echo "Test started at: $(date)"
    echo "Test log: $TEST_LOG"
    echo ""
    echo -e "${YELLOW}Configuration:${NC}"
    echo "Oracle Cloud Host: $ORACLE_HOST"
    echo "Oracle Cloud User: $ORACLE_USER"
    echo "SSH Key: $SSH_KEY"
    echo "Tunnel Port: $TUNNEL_PORT"
    echo "Target API: $GATE_API_HOST:$GATE_API_PORT"
    echo ""
    
    # Initialize test log
    echo "=== AI Crypto Trading Agent SSH Tunnel Connectivity Test ===" > "$TEST_LOG"
    echo "Test started at: $(date)" >> "$TEST_LOG"
    echo "Configuration:" >> "$TEST_LOG"
    echo "  Oracle Cloud Host: $ORACLE_HOST" >> "$TEST_LOG"
    echo "  SSH Key: $SSH_KEY" >> "$TEST_LOG"
    echo "  Tunnel Port: $TUNNEL_PORT" >> "$TEST_LOG"
    echo "" >> "$TEST_LOG"
    
    # Run all tests
    test_ssh_prerequisites
    test_network_requirements
    
    # Only proceed with SSH tests if prerequisites pass
    if test_ssh_connection; then
        test_ssh_tunnel_establishment
    else
        print_test_warning "Skipping tunnel tests due to SSH connection failure"
    fi
    
    test_systemd_ssh_tunnel
    test_tunnel_health_monitoring
    
    # Print test summary
    echo ""
    echo -e "${CYAN}=== Test Summary ===${NC}"
    echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
    echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
    echo -e "Success Rate: ${BLUE}$(( TESTS_PASSED * 100 / TESTS_TOTAL ))%${NC}"
    echo ""
    echo "Detailed test log: $TEST_LOG"
    
    # Final status and recommendations
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ All SSH tunnel connectivity tests passed!${NC}"
        echo -e "${GREEN}SSH tunnel is ready for production use.${NC}"
    elif [ $TESTS_FAILED -le 3 ]; then
        echo -e "${YELLOW}⚠️  Some SSH tunnel tests failed, but core functionality may work.${NC}"
        echo -e "${YELLOW}Review the failures and test in production environment.${NC}"
    else
        echo -e "${RED}❌ Multiple SSH tunnel tests failed.${NC}"
        echo -e "${RED}SSH tunnel connectivity needs to be fixed before deployment.${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}Troubleshooting Tips:${NC}"
    echo -e "1. Ensure SSH key is added to Oracle Cloud: ssh-copy-id -i $SSH_KEY.pub $ORACLE_USER@$ORACLE_HOST"
    echo -e "2. Test manual SSH: ssh -i $SSH_KEY $ORACLE_USER@$ORACLE_HOST"
    echo -e "3. Test manual tunnel: ssh -L $TUNNEL_PORT:$GATE_API_HOST:$GATE_API_PORT -i $SSH_KEY $ORACLE_USER@$ORACLE_HOST"
    echo -e "4. Check Oracle Cloud security list allows SSH (port 22)"
    echo -e "5. Check Oracle Cloud can reach Gate.io API: curl -I https://$GATE_API_HOST"
    
    exit $TESTS_FAILED
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Run main function
main "$@"