#!/bin/bash

# SSH Tunnel Manager Script
# Provides manual control and monitoring of the SSH tunnel service

set -euo pipefail

SERVICE_NAME="ssh-tunnel"
LOG_FILE="/var/log/trading-agent/tunnel-manager.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [TUNNEL-MANAGER] $1" | tee -a "$LOG_FILE"
}

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
    log "$message"
}

# Check service status
check_status() {
    print_status $BLUE "🔍 Checking SSH tunnel service status..."
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_status $GREEN "✅ SSH tunnel service is running"
    else
        print_status $RED "❌ SSH tunnel service is not running"
    fi
    
    if systemctl is-enabled --quiet $SERVICE_NAME; then
        print_status $GREEN "✅ SSH tunnel service is enabled (auto-start)"
    else
        print_status $YELLOW "⚠️  SSH tunnel service is not enabled"
    fi
    
    # Show detailed status
    echo -e "\n${BLUE}📊 Detailed Service Status:${NC}"
    systemctl status $SERVICE_NAME --no-pager -l
}

# Start the tunnel service
start_tunnel() {
    print_status $BLUE "🚀 Starting SSH tunnel service..."
    
    if systemctl start $SERVICE_NAME; then
        print_status $GREEN "✅ SSH tunnel service started successfully"
        sleep 3
        /opt/trading-agent/scripts/tunnel-health-check.sh
    else
        print_status $RED "❌ Failed to start SSH tunnel service"
        exit 1
    fi
}

# Stop the tunnel service
stop_tunnel() {
    print_status $BLUE "🛑 Stopping SSH tunnel service..."
    
    if systemctl stop $SERVICE_NAME; then
        print_status $GREEN "✅ SSH tunnel service stopped successfully"
    else
        print_status $RED "❌ Failed to stop SSH tunnel service"
        exit 1
    fi
}

# Restart the tunnel service
restart_tunnel() {
    print_status $BLUE "🔄 Restarting SSH tunnel service..."
    
    if systemctl restart $SERVICE_NAME; then
        print_status $GREEN "✅ SSH tunnel service restarted successfully"
        sleep 3
        /opt/trading-agent/scripts/tunnel-health-check.sh
    else
        print_status $RED "❌ Failed to restart SSH tunnel service"
        exit 1
    fi
}

# Enable auto-start
enable_tunnel() {
    print_status $BLUE "⚡ Enabling SSH tunnel service auto-start..."
    
    if systemctl enable $SERVICE_NAME; then
        print_status $GREEN "✅ SSH tunnel service enabled for auto-start"
    else
        print_status $RED "❌ Failed to enable SSH tunnel service"
        exit 1
    fi
}

# Disable auto-start
disable_tunnel() {
    print_status $YELLOW "⏸️  Disabling SSH tunnel service auto-start..."
    
    if systemctl disable $SERVICE_NAME; then
        print_status $YELLOW "⚠️  SSH tunnel service disabled (no auto-start)"
    else
        print_status $RED "❌ Failed to disable SSH tunnel service"
        exit 1
    fi
}

# Show logs
show_logs() {
    local lines=${1:-50}
    print_status $BLUE "📋 Showing last $lines lines of SSH tunnel logs..."
    echo ""
    journalctl -u $SERVICE_NAME -n $lines --no-pager
}

# Follow logs in real-time
follow_logs() {
    print_status $BLUE "📋 Following SSH tunnel logs (Ctrl+C to exit)..."
    echo ""
    journalctl -u $SERVICE_NAME -f
}

# Test tunnel connectivity
test_tunnel() {
    print_status $BLUE "🧪 Testing SSH tunnel connectivity..."
    /opt/trading-agent/scripts/tunnel-health-check.sh
}

# Show usage
show_usage() {
    echo -e "${BLUE}SSH Tunnel Manager${NC}"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|enable|disable|logs|follow|test|help}"
    echo ""
    echo "Commands:"
    echo "  start    - Start the SSH tunnel service"
    echo "  stop     - Stop the SSH tunnel service"
    echo "  restart  - Restart the SSH tunnel service"
    echo "  status   - Show service status and health"
    echo "  enable   - Enable auto-start on boot"
    echo "  disable  - Disable auto-start on boot"
    echo "  logs     - Show recent logs (default: 50 lines)"
    echo "  follow   - Follow logs in real-time"
    echo "  test     - Test tunnel connectivity"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 logs 100    - Show last 100 log lines"
    echo "  $0 status      - Check current status"
    echo "  $0 test        - Test tunnel health"
}

# Main function
main() {
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-help}" in
        start)
            start_tunnel
            ;;
        stop)
            stop_tunnel
            ;;
        restart)
            restart_tunnel
            ;;
        status)
            check_status
            ;;
        enable)
            enable_tunnel
            ;;
        disable)
            disable_tunnel
            ;;
        logs)
            show_logs "${2:-50}"
            ;;
        follow)
            follow_logs
            ;;
        test)
            test_tunnel
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_status $RED "❌ Unknown command: $1"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"