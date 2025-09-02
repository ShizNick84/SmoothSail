#!/bin/bash

# Service Manager Script
# Centralized management for all trading agent services

set -euo pipefail

SERVICES=("ssh-tunnel" "trading-agent" "trading-dashboard")
LOG_FILE="/var/log/trading-agent/service-manager.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [SERVICE-MANAGER] $1" | tee -a "$LOG_FILE"
}

# Print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
    log "$message"
}

# Check status of all services
check_all_status() {
    print_status $BLUE "🔍 Checking status of all trading agent services..."
    echo ""
    
    for service in "${SERVICES[@]}"; do
        print_status $PURPLE "📋 Service: $service"
        
        if systemctl is-active --quiet "$service"; then
            print_status $GREEN "  ✅ Status: Running"
        else
            print_status $RED "  ❌ Status: Stopped"
        fi
        
        if systemctl is-enabled --quiet "$service"; then
            print_status $GREEN "  ✅ Auto-start: Enabled"
        else
            print_status $YELLOW "  ⚠️  Auto-start: Disabled"
        fi
        
        echo ""
    done
    
    # Show service dependencies
    print_status $BLUE "🔗 Service Dependencies:"
    echo "  ssh-tunnel → trading-agent → trading-dashboard"
    echo ""
}

# Start all services in correct order
start_all() {
    print_status $BLUE "🚀 Starting all trading agent services..."
    
    for service in "${SERVICES[@]}"; do
        print_status $BLUE "Starting $service..."
        
        if systemctl start "$service"; then
            print_status $GREEN "✅ $service started successfully"
            
            # Wait a bit between services for proper startup
            if [ "$service" != "trading-dashboard" ]; then
                sleep 5
            fi
        else
            print_status $RED "❌ Failed to start $service"
            return 1
        fi
    done
    
    print_status $GREEN "🎉 All services started successfully"
    
    # Run health checks
    sleep 10
    print_status $BLUE "🔍 Running health checks..."
    /opt/trading-agent/scripts/tunnel-health-check.sh
    /opt/trading-agent/scripts/trading-health-check.sh
    /opt/trading-agent/scripts/dashboard-health-check.sh
}

# Stop all services in reverse order
stop_all() {
    print_status $BLUE "🛑 Stopping all trading agent services..."
    
    # Reverse the array for proper shutdown order
    local reversed_services=()
    for ((i=${#SERVICES[@]}-1; i>=0; i--)); do
        reversed_services+=("${SERVICES[i]}")
    done
    
    for service in "${reversed_services[@]}"; do
        print_status $BLUE "Stopping $service..."
        
        if systemctl stop "$service"; then
            print_status $GREEN "✅ $service stopped successfully"
        else
            print_status $RED "❌ Failed to stop $service"
        fi
    done
    
    print_status $GREEN "🛑 All services stopped"
}

# Restart all services
restart_all() {
    print_status $BLUE "🔄 Restarting all trading agent services..."
    
    stop_all
    sleep 5
    start_all
}

# Enable all services for auto-start
enable_all() {
    print_status $BLUE "⚡ Enabling auto-start for all services..."
    
    for service in "${SERVICES[@]}"; do
        if systemctl enable "$service"; then
            print_status $GREEN "✅ $service enabled for auto-start"
        else
            print_status $RED "❌ Failed to enable $service"
        fi
    done
    
    print_status $GREEN "⚡ All services enabled for auto-start"
}

# Disable all services auto-start
disable_all() {
    print_status $YELLOW "⏸️  Disabling auto-start for all services..."
    
    for service in "${SERVICES[@]}"; do
        if systemctl disable "$service"; then
            print_status $YELLOW "⚠️  $service disabled (no auto-start)"
        else
            print_status $RED "❌ Failed to disable $service"
        fi
    done
    
    print_status $YELLOW "⏸️  All services disabled (no auto-start)"
}

# Show logs for all services
show_logs() {
    local lines=${1:-50}
    print_status $BLUE "📋 Showing logs for all services (last $lines lines)..."
    
    for service in "${SERVICES[@]}"; do
        echo ""
        print_status $PURPLE "📋 Logs for $service:"
        journalctl -u "$service" -n "$lines" --no-pager
        echo ""
    done
}

# Follow logs for all services
follow_logs() {
    print_status $BLUE "📋 Following logs for all services (Ctrl+C to exit)..."
    echo ""
    
    # Use journalctl to follow multiple services
    journalctl -u ssh-tunnel -u trading-agent -u trading-dashboard -f
}

# Run health checks for all services
health_check() {
    print_status $BLUE "🏥 Running health checks for all services..."
    echo ""
    
    local health_scripts=(
        "/opt/trading-agent/scripts/tunnel-health-check.sh"
        "/opt/trading-agent/scripts/trading-health-check.sh"
        "/opt/trading-agent/scripts/dashboard-health-check.sh"
    )
    
    local healthy_services=0
    
    for script in "${health_scripts[@]}"; do
        if [ -x "$script" ]; then
            if "$script"; then
                ((healthy_services++))
            fi
        else
            print_status $YELLOW "⚠️  Health check script not found or not executable: $script"
        fi
        echo ""
    done
    
    print_status $BLUE "🏥 Health check summary: $healthy_services/${#health_scripts[@]} services healthy"
}

# Install all service files
install_services() {
    print_status $BLUE "📦 Installing systemd service files..."
    
    local service_files=(
        "/opt/trading-agent/systemd/ssh-tunnel.service"
        "/opt/trading-agent/systemd/trading-agent.service"
        "/opt/trading-agent/systemd/trading-dashboard.service"
    )
    
    for service_file in "${service_files[@]}"; do
        local service_name=$(basename "$service_file")
        
        if [ -f "$service_file" ]; then
            cp "$service_file" "/etc/systemd/system/"
            print_status $GREEN "✅ Installed $service_name"
        else
            print_status $RED "❌ Service file not found: $service_file"
        fi
    done
    
    # Reload systemd
    systemctl daemon-reload
    print_status $GREEN "✅ Systemd daemon reloaded"
    
    print_status $GREEN "📦 Service installation completed"
}

# Show usage
show_usage() {
    echo -e "${BLUE}Trading Agent Service Manager${NC}"
    echo ""
    echo "Usage: $0 {start|stop|restart|status|enable|disable|logs|follow|health|install|help}"
    echo ""
    echo "Commands:"
    echo "  start    - Start all services in correct order"
    echo "  stop     - Stop all services in reverse order"
    echo "  restart  - Restart all services"
    echo "  status   - Show status of all services"
    echo "  enable   - Enable auto-start for all services"
    echo "  disable  - Disable auto-start for all services"
    echo "  logs     - Show recent logs for all services"
    echo "  follow   - Follow logs in real-time"
    echo "  health   - Run health checks for all services"
    echo "  install  - Install systemd service files"
    echo "  help     - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 logs 100    - Show last 100 log lines"
    echo "  $0 status      - Check all service status"
    echo "  $0 health      - Run health checks"
}

# Main function
main() {
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-help}" in
        start)
            start_all
            ;;
        stop)
            stop_all
            ;;
        restart)
            restart_all
            ;;
        status)
            check_all_status
            ;;
        enable)
            enable_all
            ;;
        disable)
            disable_all
            ;;
        logs)
            show_logs "${2:-50}"
            ;;
        follow)
            follow_logs
            ;;
        health)
            health_check
            ;;
        install)
            install_services
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