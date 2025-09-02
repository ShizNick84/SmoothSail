#!/bin/bash

# =============================================================================
# LOG MONITORING SCRIPT WITH VISUAL INDICATORS
# =============================================================================
# 
# This script monitors logs for errors, patterns, and system health issues
# with rich visual indicators and emoji-based status reporting.
# 
# Features:
# - Real-time log monitoring with visual indicators
# - Error pattern detection and alerting
# - System health checks with emoji status
# - Automated notification delivery
# - Performance threshold monitoring
# 
# @author AI Crypto Trading System
# @version 1.0.0
# =============================================================================

set -euo pipefail

# Configuration
INSTALL_DIR="/opt/trading-agent"
LOG_DIR="$INSTALL_DIR/logs"
ALERT_DIR="$INSTALL_DIR/alerts"
NOTIFICATION_SCRIPT="$INSTALL_DIR/scripts/send-notification.sh"
STATUS_FILE="/tmp/trading-agent-status"
HEALTH_FILE="/tmp/trading-agent-health"

# Colors and emojis for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Emoji indicators
SUCCESS="✅"
ERROR="❌"
WARNING="⚠️"
INFO="ℹ️"
MONITOR="👁️"
ALERT="🚨"
TRADING="📊"
NETWORK="🌐"
DATABASE="🗄️"
SECURITY="🔒"
PERFORMANCE="⚡"

# Create necessary directories
mkdir -p "$ALERT_DIR"

# Logging function
log_with_emoji() {
    local emoji="$1"
    local level="$2"
    local message="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "ERROR")   echo -e "${RED}${emoji} [$timestamp] ERROR: $message${NC}" ;;
        "WARN")    echo -e "${YELLOW}${emoji} [$timestamp] WARN: $message${NC}" ;;
        "INFO")    echo -e "${BLUE}${emoji} [$timestamp] INFO: $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}${emoji} [$timestamp] SUCCESS: $message${NC}" ;;
        *)         echo -e "${emoji} [$timestamp] $level: $message" ;;
    esac
    
    # Also log to system journal
    logger -t trading-agent-monitor "$emoji $level: $message"
}

# Function to check log file for patterns
check_log_patterns() {
    local log_file="$1"
    local pattern="$2"
    local description="$3"
    local emoji="$4"
    local alert_level="$5"
    
    if [ ! -f "$log_file" ]; then
        return 0
    fi
    
    local count=$(grep -c "$pattern" "$log_file" 2>/dev/null || echo 0)
    
    if [ "$count" -gt 0 ]; then
        log_with_emoji "$emoji" "$alert_level" "$description: $count occurrences in $(basename "$log_file")"
        
        # Create alert file
        echo "$emoji $description: $count occurrences" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        
        # Get recent examples
        echo "Recent examples:" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        grep "$pattern" "$log_file" | tail -3 >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        echo "---" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        
        return 1
    fi
    
    return 0
}

# Function to monitor trading logs
monitor_trading_logs() {
    log_with_emoji "$TRADING" "INFO" "Monitoring trading logs..."
    
    local alerts=0
    local today=$(date +%Y-%m-%d)
    
    # Check for trading errors
    if check_log_patterns "$LOG_DIR/trading/trading-$today.log" "ERROR\|FAILED\|REJECTED" "Trading errors detected" "$ERROR" "ERROR"; then
        ((alerts++))
    fi
    
    # Check for connection issues
    if check_log_patterns "$LOG_DIR/trading/trading-$today.log" "DISCONNECTED\|TIMEOUT\|CONNECTION_FAILED" "Connection issues in trading" "$NETWORK" "WARN"; then
        ((alerts++))
    fi
    
    # Check for insufficient balance
    if check_log_patterns "$LOG_DIR/trading/trading-$today.log" "INSUFFICIENT_BALANCE\|BALANCE_TOO_LOW" "Balance issues detected" "$WARNING" "WARN"; then
        ((alerts++))
    fi
    
    # Check for successful trades
    local trades=$(grep -c "BUY operation\|SELL operation" "$LOG_DIR/trading/trading-$today.log" 2>/dev/null || echo 0)
    if [ "$trades" -gt 0 ]; then
        log_with_emoji "$SUCCESS" "INFO" "Trading activity: $trades operations today"
    fi
    
    return $alerts
}

# Function to monitor application logs
monitor_application_logs() {
    log_with_emoji "$MONITOR" "INFO" "Monitoring application logs..."
    
    local alerts=0
    local today=$(date +%Y-%m-%d)
    
    # Check for application errors
    if check_log_patterns "$LOG_DIR/application-$today.log" "ERROR\|FATAL\|CRITICAL" "Application errors detected" "$ERROR" "ERROR"; then
        ((alerts++))
    fi
    
    # Check for memory warnings
    if check_log_patterns "$LOG_DIR/application-$today.log" "Memory.*warning\|OutOfMemory\|ENOMEM" "Memory issues detected" "$WARNING" "WARN"; then
        ((alerts++))
    fi
    
    # Check for API rate limiting
    if check_log_patterns "$LOG_DIR/application-$today.log" "RATE_LIMIT\|429\|Too Many Requests" "API rate limiting detected" "$WARNING" "WARN"; then
        ((alerts++))
    fi
    
    return $alerts
}

# Function to monitor security logs
monitor_security_logs() {
    log_with_emoji "$SECURITY" "INFO" "Monitoring security logs..."
    
    local alerts=0
    local today=$(date +%Y-%m-%d)
    
    # Check for security violations
    if check_log_patterns "$LOG_DIR/security/security-$today.log" "UNAUTHORIZED\|VIOLATION\|BREACH" "Security violations detected" "$ALERT" "ERROR"; then
        ((alerts++))
    fi
    
    # Check for suspicious activity
    if check_log_patterns "$LOG_DIR/security/security-$today.log" "SUSPICIOUS\|ANOMALY\|UNUSUAL" "Suspicious activity detected" "$WARNING" "WARN"; then
        ((alerts++))
    fi
    
    # Check for failed authentication
    if check_log_patterns "$LOG_DIR/security/security-$today.log" "AUTH_FAILED\|LOGIN_FAILED\|INVALID_TOKEN" "Authentication failures detected" "$WARNING" "WARN"; then
        ((alerts++))
    fi
    
    return $alerts
}

# Function to monitor system performance
monitor_performance() {
    log_with_emoji "$PERFORMANCE" "INFO" "Monitoring system performance..."
    
    local alerts=0
    
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d'%' -f1)
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        log_with_emoji "$WARNING" "WARN" "High CPU usage: ${cpu_usage}%"
        echo "⚡ High CPU usage: ${cpu_usage}%" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    elif (( $(echo "$cpu_usage > 90" | bc -l) )); then
        log_with_emoji "$ERROR" "ERROR" "Critical CPU usage: ${cpu_usage}%"
        echo "🚨 Critical CPU usage: ${cpu_usage}%" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    else
        log_with_emoji "$SUCCESS" "INFO" "CPU usage normal: ${cpu_usage}%"
    fi
    
    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$mem_usage > 85" | bc -l) )); then
        log_with_emoji "$WARNING" "WARN" "High memory usage: ${mem_usage}%"
        echo "🧠 High memory usage: ${mem_usage}%" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    elif (( $(echo "$mem_usage > 95" | bc -l) )); then
        log_with_emoji "$ERROR" "ERROR" "Critical memory usage: ${mem_usage}%"
        echo "🚨 Critical memory usage: ${mem_usage}%" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    else
        log_with_emoji "$SUCCESS" "INFO" "Memory usage normal: ${mem_usage}%"
    fi
    
    # Check disk usage
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 85 ]; then
        log_with_emoji "$WARNING" "WARN" "High disk usage: ${disk_usage}%"
        echo "💽 High disk usage: ${disk_usage}%" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    elif [ "$disk_usage" -gt 95 ]; then
        log_with_emoji "$ERROR" "ERROR" "Critical disk usage: ${disk_usage}%"
        echo "🚨 Critical disk usage: ${disk_usage}%" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    else
        log_with_emoji "$SUCCESS" "INFO" "Disk usage normal: ${disk_usage}%"
    fi
    
    return $alerts
}

# Function to check service status
check_service_status() {
    log_with_emoji "$MONITOR" "INFO" "Checking service status..."
    
    local alerts=0
    local services=("trading-agent" "ssh-tunnel" "trading-dashboard")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service"; then
            log_with_emoji "$SUCCESS" "INFO" "Service $service is running"
        else
            log_with_emoji "$ERROR" "ERROR" "Service $service is not running"
            echo "🛑 Service $service is down" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
            ((alerts++))
        fi
    done
    
    return $alerts
}

# Function to check network connectivity
check_network_connectivity() {
    log_with_emoji "$NETWORK" "INFO" "Checking network connectivity..."
    
    local alerts=0
    
    # Check SSH tunnel
    if pgrep -f "ssh.*oracle" > /dev/null; then
        log_with_emoji "$SUCCESS" "INFO" "SSH tunnel is active"
    else
        log_with_emoji "$ERROR" "ERROR" "SSH tunnel is not active"
        echo "🚇 SSH tunnel is down" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    fi
    
    # Check API connectivity (through tunnel)
    if curl -s --max-time 10 http://localhost:8443/api/v4/spot/time > /dev/null 2>&1; then
        log_with_emoji "$SUCCESS" "INFO" "Gate.io API accessible through tunnel"
    else
        log_with_emoji "$WARNING" "WARN" "Gate.io API not accessible through tunnel"
        echo "🌐 API connectivity issue" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    fi
    
    # Check database connectivity
    if sudo -u trading psql -d trading_agent -c "SELECT 1;" > /dev/null 2>&1; then
        log_with_emoji "$SUCCESS" "INFO" "Database connection OK"
    else
        log_with_emoji "$ERROR" "ERROR" "Database connection failed"
        echo "🗄️ Database connection issue" >> "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        ((alerts++))
    fi
    
    return $alerts
}

# Function to generate status report
generate_status_report() {
    local total_alerts="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$STATUS_FILE" << EOF
🏥 TRADING AGENT HEALTH STATUS - $timestamp
================================================

System Status: $([ "$total_alerts" -eq 0 ] && echo "✅ HEALTHY" || echo "⚠️ ISSUES DETECTED ($total_alerts alerts)")

Services:
$(systemctl is-active trading-agent > /dev/null 2>&1 && echo "✅ Trading Agent: Running" || echo "❌ Trading Agent: Stopped")
$(systemctl is-active ssh-tunnel > /dev/null 2>&1 && echo "✅ SSH Tunnel: Running" || echo "❌ SSH Tunnel: Stopped")
$(systemctl is-active trading-dashboard > /dev/null 2>&1 && echo "✅ Dashboard: Running" || echo "❌ Dashboard: Stopped")

Performance:
⚡ CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
🧠 Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
💽 Disk: $(df -h / | awk 'NR==2 {print $5}')

Network:
$(pgrep -f "ssh.*oracle" > /dev/null && echo "✅ SSH Tunnel: Active" || echo "❌ SSH Tunnel: Inactive")
$(curl -s --max-time 5 http://localhost:8443/api/v4/spot/time > /dev/null 2>&1 && echo "✅ API: Accessible" || echo "⚠️ API: Issues")
$(sudo -u trading psql -d trading_agent -c "SELECT 1;" > /dev/null 2>&1 && echo "✅ Database: Connected" || echo "❌ Database: Issues")

Recent Activity:
📊 Trades Today: $(grep -c "BUY operation\|SELL operation" "$LOG_DIR/trading/trading-$(date +%Y-%m-%d).log" 2>/dev/null || echo 0)
❌ Errors Today: $(grep -c "ERROR\|FAILED" "$LOG_DIR"/*-$(date +%Y-%m-%d).log 2>/dev/null || echo 0)

Last Updated: $timestamp
EOF

    # Display status report
    cat "$STATUS_FILE"
}

# Function to send alerts if necessary
send_alerts() {
    local total_alerts="$1"
    
    if [ "$total_alerts" -gt 0 ] && [ -f "$ALERT_DIR/$(date +%Y%m%d)-alerts.log" ]; then
        local alert_summary="🚨 Trading Agent Alert Summary - $(date '+%Y-%m-%d %H:%M:%S')"
        alert_summary+="\n\nTotal Issues: $total_alerts"
        alert_summary+="\n\nDetails:\n$(cat "$ALERT_DIR/$(date +%Y%m%d)-alerts.log" | tail -20)"
        
        # Send notification if script exists
        if [ -x "$NOTIFICATION_SCRIPT" ]; then
            echo -e "$alert_summary" | "$NOTIFICATION_SCRIPT" "Trading Agent Monitoring Alert" -
        fi
        
        # Log to system
        logger -t trading-agent-monitor "ALERT: $total_alerts issues detected"
    fi
}

# Function to cleanup old alert files
cleanup_old_alerts() {
    # Remove alert files older than 7 days
    find "$ALERT_DIR" -name "*-alerts.log" -mtime +7 -delete 2>/dev/null || true
}

# Main monitoring function
main() {
    log_with_emoji "$MONITOR" "INFO" "Starting log monitoring cycle..."
    
    local total_alerts=0
    
    # Monitor different log types
    monitor_trading_logs || ((total_alerts += $?))
    monitor_application_logs || ((total_alerts += $?))
    monitor_security_logs || ((total_alerts += $?))
    
    # Check system health
    monitor_performance || ((total_alerts += $?))
    check_service_status || ((total_alerts += $?))
    check_network_connectivity || ((total_alerts += $?))
    
    # Generate status report
    generate_status_report "$total_alerts"
    
    # Send alerts if necessary
    send_alerts "$total_alerts"
    
    # Cleanup old files
    cleanup_old_alerts
    
    if [ "$total_alerts" -eq 0 ]; then
        log_with_emoji "$SUCCESS" "SUCCESS" "Monitoring cycle completed - All systems healthy"
    else
        log_with_emoji "$WARNING" "WARN" "Monitoring cycle completed - $total_alerts issues detected"
    fi
    
    return $total_alerts
}

# Handle script arguments
case "${1:-monitor}" in
    "monitor")
        main
        ;;
    "status")
        if [ -f "$STATUS_FILE" ]; then
            cat "$STATUS_FILE"
        else
            echo "❌ No status file found. Run monitoring first."
            exit 1
        fi
        ;;
    "alerts")
        if [ -f "$ALERT_DIR/$(date +%Y%m%d)-alerts.log" ]; then
            echo "🚨 Today's Alerts:"
            cat "$ALERT_DIR/$(date +%Y%m%d)-alerts.log"
        else
            echo "✅ No alerts today"
        fi
        ;;
    "help")
        echo "Usage: $0 [monitor|status|alerts|help]"
        echo "  monitor - Run full monitoring cycle (default)"
        echo "  status  - Show current system status"
        echo "  alerts  - Show today's alerts"
        echo "  help    - Show this help message"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac