#!/bin/bash

# SSH Tunnel Status Script for Intel NUC
# This script checks the status of the SSH tunnel

set -e

# Load environment variables if .env file exists
if [[ -f "/opt/trading-agent/.env" ]]; then
    source /opt/trading-agent/.env
fi

# Configuration
PID_FILE="/var/run/ssh-tunnel.pid"
LOG_FILE="/var/log/trading-agent/ssh-tunnel.log"
SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-"8443"}
SSH_TUNNEL_BIND_ADDRESS=${SSH_TUNNEL_BIND_ADDRESS:-"127.0.0.1"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check process status
check_process_status() {
    if [[ ! -f "$PID_FILE" ]]; then
        print_error "PID file not found: $PID_FILE"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if ps -p "$pid" > /dev/null 2>&1; then
        print_success "SSH tunnel process is running (PID: $pid)"
        
        # Get process details
        local process_info=$(ps -p "$pid" -o pid,ppid,cmd --no-headers)
        print_status "Process details: $process_info"
        
        # Get process start time
        local start_time=$(ps -p "$pid" -o lstart --no-headers)
        print_status "Started: $start_time"
        
        return 0
    else
        print_error "SSH tunnel process is not running (stale PID: $pid)"
        return 1
    fi
}

# Function to check port status
check_port_status() {
    print_status "Checking port $SSH_TUNNEL_LOCAL_PORT..."
    
    if netstat -tuln | grep -q ":$SSH_TUNNEL_LOCAL_PORT "; then
        print_success "Port $SSH_TUNNEL_LOCAL_PORT is listening"
        
        # Show which process is using the port
        local port_info=$(netstat -tulnp 2>/dev/null | grep ":$SSH_TUNNEL_LOCAL_PORT " || echo "Permission denied to show process info")
        print_status "Port details: $port_info"
        
        return 0
    else
        print_error "Port $SSH_TUNNEL_LOCAL_PORT is not listening"
        return 1
    fi
}

# Function to test tunnel connectivity
test_tunnel_connectivity() {
    print_status "Testing tunnel connectivity..."
    
    # Test basic connection
    if timeout 10 bash -c "echo >/dev/tcp/$SSH_TUNNEL_BIND_ADDRESS/$SSH_TUNNEL_LOCAL_PORT" 2>/dev/null; then
        print_success "Tunnel is accepting connections"
    else
        print_error "Tunnel is not accepting connections"
        return 1
    fi
    
    # Test HTTP connectivity (may fail if remote doesn't support HTTP)
    if curl -s --connect-timeout 5 "http://$SSH_TUNNEL_BIND_ADDRESS:$SSH_TUNNEL_LOCAL_PORT" > /dev/null 2>&1; then
        print_success "HTTP connectivity through tunnel is working"
    else
        print_warning "HTTP test failed (this may be normal if remote service doesn't support basic HTTP)"
    fi
    
    return 0
}

# Function to show recent log entries
show_recent_logs() {
    print_status "Recent log entries:"
    
    if [[ -f "$LOG_FILE" ]]; then
        echo "----------------------------------------"
        tail -n 20 "$LOG_FILE" | while IFS= read -r line; do
            # Color code log levels
            if [[ $line == *"[ERROR]"* ]]; then
                echo -e "${RED}$line${NC}"
            elif [[ $line == *"[WARNING]"* ]]; then
                echo -e "${YELLOW}$line${NC}"
            elif [[ $line == *"[SUCCESS]"* ]]; then
                echo -e "${GREEN}$line${NC}"
            else
                echo "$line"
            fi
        done
        echo "----------------------------------------"
    else
        print_warning "Log file not found: $LOG_FILE"
    fi
}

# Function to show system service status
show_service_status() {
    print_status "SSH tunnel service status:"
    
    if systemctl is-active --quiet ssh-tunnel 2>/dev/null; then
        print_success "ssh-tunnel service is active"
    else
        print_error "ssh-tunnel service is not active"
    fi
    
    if systemctl is-enabled --quiet ssh-tunnel 2>/dev/null; then
        print_success "ssh-tunnel service is enabled"
    else
        print_warning "ssh-tunnel service is not enabled"
    fi
    
    # Show detailed service status
    echo "----------------------------------------"
    systemctl status ssh-tunnel --no-pager -l 2>/dev/null || print_warning "Could not get service status"
    echo "----------------------------------------"
}

# Function to show network statistics
show_network_stats() {
    print_status "Network statistics:"
    
    # Show SSH connections
    local ssh_connections=$(netstat -tn 2>/dev/null | grep :22 | wc -l)
    print_status "Active SSH connections: $ssh_connections"
    
    # Show tunnel connections
    local tunnel_connections=$(netstat -tn 2>/dev/null | grep ":$SSH_TUNNEL_LOCAL_PORT" | wc -l)
    print_status "Active tunnel connections: $tunnel_connections"
    
    # Show listening ports
    print_status "Listening ports related to tunnel:"
    netstat -tuln 2>/dev/null | grep -E "(:22|:$SSH_TUNNEL_LOCAL_PORT)" || print_warning "No related ports found"
}

# Function to perform comprehensive health check
health_check() {
    print_status "Performing comprehensive health check..."
    echo "========================================"
    
    local checks_passed=0
    local total_checks=4
    
    # Check 1: Process status
    if check_process_status; then
        ((checks_passed++))
    fi
    echo ""
    
    # Check 2: Port status
    if check_port_status; then
        ((checks_passed++))
    fi
    echo ""
    
    # Check 3: Connectivity test
    if test_tunnel_connectivity; then
        ((checks_passed++))
    fi
    echo ""
    
    # Check 4: Service status
    show_service_status
    if systemctl is-active --quiet ssh-tunnel 2>/dev/null; then
        ((checks_passed++))
    fi
    echo ""
    
    # Summary
    echo "========================================"
    print_status "Health check summary: $checks_passed/$total_checks checks passed"
    
    if [[ $checks_passed -eq $total_checks ]]; then
        print_success "SSH tunnel is healthy and operational"
        return 0
    elif [[ $checks_passed -ge 2 ]]; then
        print_warning "SSH tunnel has some issues but may be functional"
        return 1
    else
        print_error "SSH tunnel has significant issues"
        return 2
    fi
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -s, --status     Show basic tunnel status (default)"
    echo "  -h, --health     Perform comprehensive health check"
    echo "  -l, --logs       Show recent log entries"
    echo "  -n, --network    Show network statistics"
    echo "  -a, --all        Show all information"
    echo "  --help           Show this help message"
    echo ""
}

# Main execution
main() {
    local option="${1:-status}"
    
    case $option in
        -s|--status|status)
            print_status "SSH Tunnel Status Check"
            echo "========================================"
            check_process_status
            echo ""
            check_port_status
            echo ""
            show_service_status
            ;;
        -h|--health|health)
            health_check
            ;;
        -l|--logs|logs)
            show_recent_logs
            ;;
        -n|--network|network)
            show_network_stats
            ;;
        -a|--all|all)
            print_status "Complete SSH Tunnel Status Report"
            echo "========================================"
            health_check
            echo ""
            show_network_stats
            echo ""
            show_recent_logs
            ;;
        --help)
            show_usage
            ;;
        *)
            print_error "Unknown option: $option"
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"