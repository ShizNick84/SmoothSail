#!/bin/bash

# Setup Performance Monitoring for Intel NUC Trading System
# Configures automated performance logging and monitoring

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_LOGGER="$SCRIPT_DIR/performance-logger.sh"
LOG_FILE="/var/log/trading-agent/performance-setup.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

status_ok() {
    echo -e "${GREEN}✅ $1${NC}"
    log "OK: $1"
}

status_error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR: $1"
}

status_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Install required dependencies
install_dependencies() {
    status_info "Installing performance monitoring dependencies..."
    
    # Update package list
    apt-get update -qq
    
    # Install required packages
    local packages=("jq" "iostat" "sysstat" "bc" "netcat-openbsd")
    local missing_packages=()
    
    for package in "${packages[@]}"; do
        if ! dpkg -l | grep -q "^ii  $package "; then
            missing_packages+=("$package")
        fi
    done
    
    if [ ${#missing_packages[@]} -gt 0 ]; then
        status_info "Installing missing packages: ${missing_packages[*]}"
        apt-get install -y "${missing_packages[@]}"
        status_ok "Dependencies installed"
    else
        status_ok "All dependencies already installed"
    fi
}

# Create systemd service for performance monitoring
create_performance_service() {
    status_info "Creating performance monitoring systemd service..."
    
    # Create performance monitoring service
    cat > /etc/systemd/system/trading-performance.service << EOF
[Unit]
Description=Intel NUC Trading System Performance Monitor
After=network.target postgresql.service trading-agent.service

[Service]
Type=simple
User=root
WorkingDirectory=$SCRIPT_DIR
ExecStart=$PERF_LOGGER continuous
Restart=always
RestartSec=30
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Create performance dashboard service
    cat > /etc/systemd/system/trading-performance-dashboard.service << EOF
[Unit]
Description=Trading Performance Dashboard Update
After=trading-performance.service

[Service]
Type=oneshot
User=root
WorkingDirectory=$SCRIPT_DIR
ExecStart=$PERF_LOGGER collect
StandardOutput=journal
StandardError=journal
EOF
    
    # Create timer for dashboard updates
    cat > /etc/systemd/system/trading-performance-dashboard.timer << EOF
[Unit]
Description=Update Trading Performance Dashboard Every 5 Minutes
Requires=trading-performance-dashboard.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    # Reload systemd
    systemctl daemon-reload
    
    status_ok "Performance monitoring services created"
}

# Setup log rotation for performance logs
setup_log_rotation() {
    status_info "Setting up log rotation for performance logs..."
    
    cat > /etc/logrotate.d/trading-performance << 'EOF'
/var/log/trading-agent/performance/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        # Send HUP signal to performance logger if running
        pkill -HUP -f "performance-logger.sh" || true
    endscript
}
EOF
    
    status_ok "Log rotation configured"
}

# Create performance monitoring cron jobs
create_cron_jobs() {
    status_info "Creating performance monitoring cron jobs..."
    
    # Create wrapper script for cron
    local wrapper_script="/usr/local/bin/trading-performance-wrapper.sh"
    cat > "$wrapper_script" << EOF
#!/bin/bash
# Performance monitoring wrapper for cron

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Run performance collection
"$PERF_LOGGER" collect >/dev/null 2>&1

# Check for alerts and send notifications if needed
ALERT_SCRIPT="$SCRIPT_DIR/alert-system.sh"
METRICS_FILE="/var/log/trading-agent/performance/metrics.json"

if [ -f "\$METRICS_FILE" ] && [ -x "\$ALERT_SCRIPT" ]; then
    # Check system health
    HEALTH=\$(jq -r '.system_health.overall_status' "\$METRICS_FILE" 2>/dev/null || echo "UNKNOWN")
    
    if [ "\$HEALTH" = "DEGRADED" ]; then
        # Get specific issues
        CPU_USAGE=\$(jq -r '.hardware.cpu.usage_percent' "\$METRICS_FILE" 2>/dev/null || echo "0")
        MEMORY_USAGE=\$(jq -r '.hardware.memory.usage_percent' "\$METRICS_FILE" 2>/dev/null || echo "0")
        TUNNEL_STATUS=\$(jq -r '.network.ssh_tunnel.status' "\$METRICS_FILE" 2>/dev/null || echo "UNKNOWN")
        
        MESSAGE="⚠️ System performance alert detected:
        
🖥️ CPU Usage: \${CPU_USAGE}%
💾 Memory Usage: \${MEMORY_USAGE}%
🌐 SSH Tunnel: \$TUNNEL_STATUS

Please check the system performance dashboard for details."
        
        echo "\$MESSAGE" | "\$ALERT_SCRIPT" >/dev/null 2>&1 || true
    fi
fi
EOF
    
    chmod +x "$wrapper_script"
    
    # Add cron job for performance monitoring (every 5 minutes)
    (crontab -l 2>/dev/null || echo "") | grep -v "trading-performance-wrapper" | crontab -
    (crontab -l 2>/dev/null; echo "*/5 * * * * $wrapper_script") | crontab -
    
    status_ok "Performance monitoring cron jobs created"
}

# Setup performance alerting thresholds
setup_alerting() {
    status_info "Setting up performance alerting..."
    
    # Create alerting configuration file
    local alert_config="/etc/trading-agent/performance-alerts.conf"
    mkdir -p "$(dirname "$alert_config")"
    
    cat > "$alert_config" << 'EOF'
# Performance Alerting Configuration
# Thresholds for triggering alerts

# Hardware thresholds
CPU_ALERT_THRESHOLD=85
MEMORY_ALERT_THRESHOLD=90
TEMP_ALERT_THRESHOLD=80
LOAD_ALERT_THRESHOLD=4.0

# Network thresholds
NETWORK_LATENCY_ALERT=200
API_RESPONSE_ALERT=500
TUNNEL_DOWN_ALERT=true

# Database thresholds
DB_CONNECTION_ALERT=1000
DB_SIZE_ALERT=1073741824  # 1GB

# Trading application thresholds
TRADING_MEMORY_ALERT=500  # MB
TRADING_CPU_ALERT=50      # %

# Alert frequency (minutes between same alert type)
ALERT_FREQUENCY=30
EOF
    
    status_ok "Performance alerting configured"
}

# Create performance monitoring dashboard script
create_dashboard_script() {
    status_info "Creating performance dashboard script..."
    
    local dashboard_script="/usr/local/bin/trading-performance-dashboard"
    cat > "$dashboard_script" << EOF
#!/bin/bash
# Trading Performance Dashboard

PERF_LOGGER="$PERF_LOGGER"

case "\${1:-dashboard}" in
    "dashboard"|"show")
        "\$PERF_LOGGER" dashboard
        ;;
    "json")
        "\$PERF_LOGGER" json
        ;;
    "logs")
        "\$PERF_LOGGER" logs
        ;;
    "collect")
        "\$PERF_LOGGER" collect
        echo "Performance data collected"
        ;;
    "status")
        echo "Performance Monitoring Status:"
        echo "=============================="
        
        # Check if services are running
        if systemctl is-active --quiet trading-performance 2>/dev/null; then
            echo "✅ Performance monitoring service: RUNNING"
        else
            echo "❌ Performance monitoring service: STOPPED"
        fi
        
        if systemctl is-enabled --quiet trading-performance-dashboard.timer 2>/dev/null; then
            echo "✅ Dashboard update timer: ENABLED"
        else
            echo "❌ Dashboard update timer: DISABLED"
        fi
        
        # Check cron jobs
        if crontab -l 2>/dev/null | grep -q "trading-performance-wrapper"; then
            echo "✅ Performance cron job: ACTIVE"
        else
            echo "❌ Performance cron job: MISSING"
        fi
        
        # Show recent metrics
        echo ""
        echo "Recent Performance Data:"
        if [ -f "/var/log/trading-agent/performance/metrics.json" ]; then
            echo "  Last update: \$(jq -r '.timestamp' /var/log/trading-agent/performance/metrics.json 2>/dev/null || echo 'Unknown')"
            echo "  System health: \$(jq -r '.system_health.overall_status' /var/log/trading-agent/performance/metrics.json 2>/dev/null || echo 'Unknown')"
        else
            echo "  No performance data available"
        fi
        ;;
    *)
        echo "Usage: \$0 [dashboard|json|logs|collect|status]"
        echo ""
        echo "Options:"
        echo "  dashboard - Show performance dashboard (default)"
        echo "  json      - Output metrics in JSON format"
        echo "  logs      - Show recent performance logs"
        echo "  collect   - Collect performance data once"
        echo "  status    - Show monitoring system status"
        ;;
esac
EOF
    
    chmod +x "$dashboard_script"
    status_ok "Performance dashboard script created"
}

# Test performance monitoring system
test_monitoring_system() {
    status_info "Testing performance monitoring system..."
    
    # Test performance logger
    if [ -x "$PERF_LOGGER" ]; then
        if "$PERF_LOGGER" collect >/dev/null 2>&1; then
            status_ok "Performance logger test passed"
        else
            status_error "Performance logger test failed"
            return 1
        fi
    else
        status_error "Performance logger not found or not executable"
        return 1
    fi
    
    # Test JSON output
    if "$PERF_LOGGER" json >/dev/null 2>&1; then
        status_ok "JSON output test passed"
    else
        status_error "JSON output test failed"
    fi
    
    # Test dashboard
    if "$PERF_LOGGER" dashboard >/dev/null 2>&1; then
        status_ok "Dashboard test passed"
    else
        status_error "Dashboard test failed"
    fi
    
    return 0
}

# Enable performance monitoring
enable_monitoring() {
    status_info "Enabling performance monitoring services..."
    
    # Enable and start systemd services
    systemctl enable trading-performance.service
    systemctl enable trading-performance-dashboard.timer
    
    systemctl start trading-performance.service
    systemctl start trading-performance-dashboard.timer
    
    # Verify services are running
    sleep 2
    
    if systemctl is-active --quiet trading-performance; then
        status_ok "Performance monitoring service started"
    else
        status_error "Failed to start performance monitoring service"
    fi
    
    if systemctl is-active --quiet trading-performance-dashboard.timer; then
        status_ok "Dashboard update timer started"
    else
        status_error "Failed to start dashboard update timer"
    fi
}

# Disable performance monitoring
disable_monitoring() {
    status_info "Disabling performance monitoring..."
    
    # Stop and disable services
    systemctl stop trading-performance.service 2>/dev/null || true
    systemctl stop trading-performance-dashboard.timer 2>/dev/null || true
    systemctl disable trading-performance.service 2>/dev/null || true
    systemctl disable trading-performance-dashboard.timer 2>/dev/null || true
    
    # Remove cron jobs
    (crontab -l 2>/dev/null || echo "") | grep -v "trading-performance-wrapper" | crontab -
    
    status_ok "Performance monitoring disabled"
}

# Show monitoring status
show_status() {
    echo "📊 Performance Monitoring Status"
    echo "================================="
    
    # Service status
    if systemctl is-active --quiet trading-performance 2>/dev/null; then
        echo "✅ Monitoring Service: RUNNING"
    else
        echo "❌ Monitoring Service: STOPPED"
    fi
    
    if systemctl is-enabled --quiet trading-performance-dashboard.timer 2>/dev/null; then
        echo "✅ Dashboard Timer: ENABLED"
        systemctl list-timers trading-performance-dashboard.timer --no-pager 2>/dev/null || true
    else
        echo "❌ Dashboard Timer: DISABLED"
    fi
    
    # Cron status
    if crontab -l 2>/dev/null | grep -q "trading-performance-wrapper"; then
        echo "✅ Cron Job: ACTIVE"
    else
        echo "❌ Cron Job: MISSING"
    fi
    
    # Log files
    echo ""
    echo "📁 Log Files:"
    local log_dir="/var/log/trading-agent/performance"
    if [ -d "$log_dir" ]; then
        ls -la "$log_dir" 2>/dev/null || echo "  No log files found"
    else
        echo "  Log directory not found"
    fi
    
    # Recent performance data
    echo ""
    echo "📈 Recent Performance:"
    if [ -f "/var/log/trading-agent/performance/metrics.json" ]; then
        local metrics_file="/var/log/trading-agent/performance/metrics.json"
        echo "  Last Update: $(jq -r '.timestamp' "$metrics_file" 2>/dev/null || echo 'Unknown')"
        echo "  System Health: $(jq -r '.system_health.overall_status' "$metrics_file" 2>/dev/null || echo 'Unknown')"
        echo "  CPU Usage: $(jq -r '.hardware.cpu.usage_percent' "$metrics_file" 2>/dev/null || echo 'Unknown')%"
        echo "  Memory Usage: $(jq -r '.hardware.memory.usage_percent' "$metrics_file" 2>/dev/null || echo 'Unknown')%"
    else
        echo "  No performance data available"
    fi
}

# Main function
main() {
    echo "⚙️  Intel NUC Performance Monitoring Setup"
    echo "=========================================="
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-setup}" in
        "setup")
            install_dependencies
            create_performance_service
            setup_log_rotation
            create_cron_jobs
            setup_alerting
            create_dashboard_script
            test_monitoring_system
            enable_monitoring
            status_ok "Performance monitoring setup completed"
            echo ""
            echo "📋 Next Steps:"
            echo "  • Run 'trading-performance-dashboard' to view performance data"
            echo "  • Check logs in /var/log/trading-agent/performance/"
            echo "  • Use 'systemctl status trading-performance' to check service status"
            ;;
        "enable")
            enable_monitoring
            ;;
        "disable")
            disable_monitoring
            ;;
        "test")
            test_monitoring_system
            ;;
        "status")
            show_status
            ;;
        "remove")
            disable_monitoring
            rm -f /etc/systemd/system/trading-performance*.service
            rm -f /etc/systemd/system/trading-performance*.timer
            rm -f /usr/local/bin/trading-performance-*
            rm -f /etc/logrotate.d/trading-performance
            systemctl daemon-reload
            status_ok "Performance monitoring removed"
            ;;
        *)
            echo "Usage: $0 [setup|enable|disable|test|status|remove]"
            echo ""
            echo "Options:"
            echo "  setup   - Complete performance monitoring setup (default)"
            echo "  enable  - Enable monitoring services"
            echo "  disable - Disable monitoring services"
            echo "  test    - Test monitoring system"
            echo "  status  - Show monitoring status"
            echo "  remove  - Remove monitoring system completely"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"