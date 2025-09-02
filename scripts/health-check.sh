#!/bin/bash

# Health Check Script for Intel NUC Trading System
# Monitors system resources, services, and trading components

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/trading-agent/health-check.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
ALERT_THRESHOLD_TEMP=75

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Status indicators with emojis
status_ok() {
    echo -e "${GREEN}✅ $1${NC}"
    log "OK: $1"
}

status_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

status_error() {
    echo -e "${RED}❌ $1${NC}"
    log "ERROR: $1"
}

status_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Check system resources
check_system_resources() {
    status_info "Checking system resources..."
    
    # CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    CPU_USAGE_INT=${CPU_USAGE%.*}
    
    if [ "$CPU_USAGE_INT" -gt "$ALERT_THRESHOLD_CPU" ]; then
        status_warning "High CPU usage: ${CPU_USAGE}%"
    else
        status_ok "CPU usage: ${CPU_USAGE}%"
    fi
    
    # Memory usage
    MEMORY_INFO=$(free | grep Mem)
    TOTAL_MEM=$(echo $MEMORY_INFO | awk '{print $2}')
    USED_MEM=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_USAGE=$((USED_MEM * 100 / TOTAL_MEM))
    
    if [ "$MEMORY_USAGE" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
        status_warning "High memory usage: ${MEMORY_USAGE}%"
    else
        status_ok "Memory usage: ${MEMORY_USAGE}%"
    fi
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
        status_warning "High disk usage: ${DISK_USAGE}%"
    else
        status_ok "Disk usage: ${DISK_USAGE}%"
    fi
}

# Check Intel NUC specific hardware
check_hardware() {
    status_info "Checking Intel NUC hardware..."
    
    # CPU temperature (if sensors available)
    if command -v sensors >/dev/null 2>&1; then
        TEMP_OUTPUT=$(sensors 2>/dev/null || echo "")
        if [ -n "$TEMP_OUTPUT" ]; then
            # Extract CPU temperature
            CPU_TEMP=$(echo "$TEMP_OUTPUT" | grep -i "core\|cpu" | head -1 | grep -o '[0-9]\+\.[0-9]\+°C' | head -1 | sed 's/°C//')
            if [ -n "$CPU_TEMP" ]; then
                TEMP_INT=${CPU_TEMP%.*}
                if [ "$TEMP_INT" -gt "$ALERT_THRESHOLD_TEMP" ]; then
                    status_warning "High CPU temperature: ${CPU_TEMP}°C"
                else
                    status_ok "CPU temperature: ${CPU_TEMP}°C"
                fi
            fi
        else
            status_info "Temperature sensors not available"
        fi
    else
        status_info "lm-sensors not installed - temperature monitoring unavailable"
    fi
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    status_ok "Load average (1min): $LOAD_AVG"
    
    # Uptime
    UPTIME=$(uptime -p)
    status_ok "System uptime: $UPTIME"
}

# Check systemd services
check_services() {
    status_info "Checking systemd services..."
    
    SERVICES=("ssh-tunnel" "trading-agent" "trading-dashboard" "postgresql")
    
    for service in "${SERVICES[@]}"; do
        if systemctl is-active --quiet "$service"; then
            status_ok "Service $service is running"
        else
            status_error "Service $service is not running"
        fi
        
        if systemctl is-enabled --quiet "$service" 2>/dev/null; then
            status_ok "Service $service is enabled"
        else
            status_warning "Service $service is not enabled"
        fi
    done
}

# Check network connectivity
check_network() {
    status_info "Checking network connectivity..."
    
    # Check internet connectivity
    if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        status_ok "Internet connectivity available"
    else
        status_error "No internet connectivity"
    fi
    
    # Check SSH tunnel status
    if pgrep -f "ssh.*oracle" >/dev/null; then
        status_ok "SSH tunnel process is running"
    else
        status_error "SSH tunnel process not found"
    fi
    
    # Check if tunnel port is listening
    if netstat -ln | grep -q ":8443"; then
        status_ok "SSH tunnel port 8443 is listening"
    else
        status_error "SSH tunnel port 8443 not listening"
    fi
    
    # Test API connectivity through tunnel
    if curl -s --connect-timeout 5 http://localhost:8443/api/v4/spot/currencies >/dev/null 2>&1; then
        status_ok "Gate.io API accessible through tunnel"
    else
        status_warning "Gate.io API not accessible through tunnel"
    fi
}

# Check database connectivity
check_database() {
    status_info "Checking database connectivity..."
    
    # Check if PostgreSQL is running
    if systemctl is-active --quiet postgresql; then
        status_ok "PostgreSQL service is running"
        
        # Test database connection
        if sudo -u postgres psql -c '\l' >/dev/null 2>&1; then
            status_ok "Database connection successful"
        else
            status_error "Cannot connect to database"
        fi
    else
        status_error "PostgreSQL service is not running"
    fi
}

# Check log files and disk space
check_logs() {
    status_info "Checking log files..."
    
    LOG_DIRS=("/var/log/trading-agent" "/var/log/postgresql")
    
    for log_dir in "${LOG_DIRS[@]}"; do
        if [ -d "$log_dir" ]; then
            LOG_SIZE=$(du -sh "$log_dir" 2>/dev/null | awk '{print $1}')
            status_ok "Log directory $log_dir size: $LOG_SIZE"
        else
            status_warning "Log directory $log_dir does not exist"
        fi
    done
}

# Generate summary report
generate_summary() {
    status_info "Health check completed at $(date)"
    echo ""
    echo "=== SYSTEM SUMMARY ==="
    echo "🖥️  System: $(uname -n) ($(uname -m))"
    echo "🐧 OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")"
    echo "⏰ Check time: $(date)"
    echo "📊 CPU: ${CPU_USAGE}% | Memory: ${MEMORY_USAGE}% | Disk: ${DISK_USAGE}%"
    echo "🌡️  Temperature: ${CPU_TEMP:-"N/A"}°C"
    echo "⚡ Load: $LOAD_AVG"
    echo "🕐 Uptime: $UPTIME"
    echo ""
}

# Main execution
main() {
    echo "🔍 Intel NUC Trading System Health Check"
    echo "========================================"
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    check_system_resources
    echo ""
    check_hardware
    echo ""
    check_services
    echo ""
    check_network
    echo ""
    check_database
    echo ""
    check_logs
    echo ""
    generate_summary
}

# Run main function
main "$@"