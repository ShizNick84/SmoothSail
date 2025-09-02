#!/bin/bash

# =============================================================================
# SETUP LOGGING CONFIGURATION FOR INTEL NUC DEPLOYMENT
# =============================================================================
# 
# This script configures comprehensive logging for the AI Crypto Trading Agent
# on Intel NUC Ubuntu deployment with rich formatting and rotation.
# 
# Features:
# - Logrotate configuration for all log types
# - systemd journal optimization
# - Log directory structure creation
# - Permissions and security setup
# - Backup directory configuration
# 
# @author AI Crypto Trading System
# @version 1.0.0
# =============================================================================

set -euo pipefail

# Configuration variables
TRADING_USER="trading"
TRADING_GROUP="trading"
INSTALL_DIR="/opt/trading-agent"
LOG_DIR="$INSTALL_DIR/logs"
BACKUP_DIR="$INSTALL_DIR/backups"
SYSTEMD_DIR="/etc/systemd/system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Create trading user if it doesn't exist
create_trading_user() {
    log_info "Creating trading user and group..."
    
    if ! getent group "$TRADING_GROUP" > /dev/null 2>&1; then
        groupadd "$TRADING_GROUP"
        log_success "Created group: $TRADING_GROUP"
    else
        log_info "Group $TRADING_GROUP already exists"
    fi
    
    if ! getent passwd "$TRADING_USER" > /dev/null 2>&1; then
        useradd -r -g "$TRADING_GROUP" -d "$INSTALL_DIR" -s /bin/bash "$TRADING_USER"
        log_success "Created user: $TRADING_USER"
    else
        log_info "User $TRADING_USER already exists"
    fi
}

# Create log directory structure
create_log_directories() {
    log_info "Creating log directory structure..."
    
    # Main log directories
    mkdir -p "$LOG_DIR"/{audit,security,trading,performance,tunnel,dashboard}
    
    # Backup directories
    mkdir -p "$BACKUP_DIR"/{logs,audit,security}
    
    # Set ownership and permissions
    chown -R "$TRADING_USER:$TRADING_GROUP" "$LOG_DIR"
    chown -R "$TRADING_USER:$TRADING_GROUP" "$BACKUP_DIR"
    
    # Set directory permissions
    chmod 750 "$LOG_DIR"
    chmod 700 "$LOG_DIR/audit"
    chmod 700 "$LOG_DIR/security"
    chmod 750 "$LOG_DIR/trading"
    chmod 750 "$LOG_DIR/performance"
    chmod 750 "$LOG_DIR/tunnel"
    chmod 750 "$LOG_DIR/dashboard"
    
    # Set backup directory permissions
    chmod 750 "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR/audit"
    chmod 700 "$BACKUP_DIR/security"
    chmod 750 "$BACKUP_DIR/logs"
    
    log_success "Log directories created with proper permissions"
}

# Install logrotate configuration
install_logrotate_config() {
    log_info "Installing logrotate configuration..."
    
    # Copy logrotate configuration
    cp "$INSTALL_DIR/scripts/logrotate-trading-agent.conf" /etc/logrotate.d/trading-agent
    
    # Set proper permissions
    chmod 644 /etc/logrotate.d/trading-agent
    chown root:root /etc/logrotate.d/trading-agent
    
    # Test logrotate configuration
    if logrotate -d /etc/logrotate.d/trading-agent > /dev/null 2>&1; then
        log_success "Logrotate configuration installed and validated"
    else
        log_error "Logrotate configuration validation failed"
        return 1
    fi
}

# Configure systemd journal
configure_systemd_journal() {
    log_info "Configuring systemd journal..."
    
    # Create journal configuration directory
    mkdir -p /etc/systemd/journald.conf.d
    
    # Copy journal configuration
    cp "$INSTALL_DIR/systemd/journald-trading-agent.conf" /etc/systemd/journald.conf.d/trading-agent.conf
    
    # Set proper permissions
    chmod 644 /etc/systemd/journald.conf.d/trading-agent.conf
    chown root:root /etc/systemd/journald.conf.d/trading-agent.conf
    
    # Restart systemd-journald to apply changes
    systemctl restart systemd-journald
    
    log_success "systemd journal configured"
}

# Create audit hash generation script
create_audit_hash_script() {
    log_info "Creating audit log integrity script..."
    
    cat > "$INSTALL_DIR/scripts/generate-audit-hash.sh" << 'EOF'
#!/bin/bash
# Generate integrity hashes for audit logs

AUDIT_DIR="/opt/trading-agent/logs/audit"
HASH_FILE="/opt/trading-agent/logs/audit/integrity.sha256"

# Generate hashes for all audit log files
find "$AUDIT_DIR" -name "audit-*.log*" -type f | while read -r file; do
    sha256sum "$file" >> "$HASH_FILE.tmp"
done

# Move temporary file to final location
if [ -f "$HASH_FILE.tmp" ]; then
    mv "$HASH_FILE.tmp" "$HASH_FILE"
    chmod 600 "$HASH_FILE"
    chown trading:trading "$HASH_FILE"
fi
EOF
    
    chmod +x "$INSTALL_DIR/scripts/generate-audit-hash.sh"
    chown "$TRADING_USER:$TRADING_GROUP" "$INSTALL_DIR/scripts/generate-audit-hash.sh"
    
    log_success "Audit hash generation script created"
}

# Create log monitoring script
create_log_monitoring_script() {
    log_info "Creating log monitoring script..."
    
    cat > "$INSTALL_DIR/scripts/monitor-logs.sh" << 'EOF'
#!/bin/bash
# Monitor logs for errors and alerts

LOG_DIR="/opt/trading-agent/logs"
ALERT_FILE="/tmp/trading-agent-alerts"
NOTIFICATION_SCRIPT="/opt/trading-agent/scripts/send-notification.sh"

# Function to check for errors in logs
check_errors() {
    local log_file="$1"
    local error_count
    
    if [ -f "$log_file" ]; then
        error_count=$(grep -c "ERROR\|CRITICAL\|FATAL" "$log_file" 2>/dev/null || echo 0)
        if [ "$error_count" -gt 0 ]; then
            echo "🚨 Found $error_count errors in $log_file" >> "$ALERT_FILE"
        fi
    fi
}

# Function to check system health from logs
check_system_health() {
    local health_issues=0
    
    # Check for connection issues
    if grep -q "DISCONNECTED\|TIMEOUT\|CONNECTION_FAILED" "$LOG_DIR"/application-*.log 2>/dev/null; then
        echo "🔌 Connection issues detected" >> "$ALERT_FILE"
        ((health_issues++))
    fi
    
    # Check for trading errors
    if grep -q "TRADE_FAILED\|ORDER_REJECTED\|INSUFFICIENT_BALANCE" "$LOG_DIR"/trading/trading-*.log 2>/dev/null; then
        echo "📉 Trading issues detected" >> "$ALERT_FILE"
        ((health_issues++))
    fi
    
    # Check for security events
    if grep -q "UNAUTHORIZED\|SUSPICIOUS\|SECURITY_VIOLATION" "$LOG_DIR"/security/security-*.log 2>/dev/null; then
        echo "🔒 Security issues detected" >> "$ALERT_FILE"
        ((health_issues++))
    fi
    
    return $health_issues
}

# Main monitoring logic
main() {
    # Clear previous alerts
    > "$ALERT_FILE"
    
    # Check recent log files for errors
    find "$LOG_DIR" -name "*.log" -mtime -1 | while read -r log_file; do
        check_errors "$log_file"
    done
    
    # Check system health
    if ! check_system_health; then
        echo "⚠️ System health issues detected" >> "$ALERT_FILE"
    fi
    
    # Send notifications if alerts exist
    if [ -s "$ALERT_FILE" ]; then
        if [ -x "$NOTIFICATION_SCRIPT" ]; then
            "$NOTIFICATION_SCRIPT" "Log Monitor Alert" "$(cat "$ALERT_FILE")"
        fi
        
        # Log the alert
        logger -t trading-agent "Log monitoring detected issues: $(cat "$ALERT_FILE" | tr '\n' ' ')"
    fi
}

# Run main function
main
EOF
    
    chmod +x "$INSTALL_DIR/scripts/monitor-logs.sh"
    chown "$TRADING_USER:$TRADING_GROUP" "$INSTALL_DIR/scripts/monitor-logs.sh"
    
    log_success "Log monitoring script created"
}

# Create log analysis script
create_log_analysis_script() {
    log_info "Creating log analysis script..."
    
    cat > "$INSTALL_DIR/scripts/analyze-logs.sh" << 'EOF'
#!/bin/bash
# Analyze logs and generate reports

LOG_DIR="/opt/trading-agent/logs"
REPORT_DIR="/opt/trading-agent/reports"
DATE=$(date +%Y-%m-%d)

# Create reports directory
mkdir -p "$REPORT_DIR"

# Function to generate trading summary
generate_trading_summary() {
    local report_file="$REPORT_DIR/trading-summary-$DATE.txt"
    
    echo "📊 TRADING SUMMARY - $DATE" > "$report_file"
    echo "=================================" >> "$report_file"
    echo "" >> "$report_file"
    
    # Count trades
    local buy_count=$(grep -c "BUY operation" "$LOG_DIR"/trading/trading-*.log 2>/dev/null || echo 0)
    local sell_count=$(grep -c "SELL operation" "$LOG_DIR"/trading/trading-*.log 2>/dev/null || echo 0)
    
    echo "📈 Buy Orders: $buy_count" >> "$report_file"
    echo "📉 Sell Orders: $sell_count" >> "$report_file"
    echo "🔄 Total Trades: $((buy_count + sell_count))" >> "$report_file"
    echo "" >> "$report_file"
    
    # Profit/Loss summary
    if grep -q "P&L:" "$LOG_DIR"/trading/trading-*.log 2>/dev/null; then
        echo "💰 PROFIT/LOSS SUMMARY:" >> "$report_file"
        grep "P&L:" "$LOG_DIR"/trading/trading-*.log | tail -10 >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Recent errors
    local error_count=$(grep -c "ERROR\|FAILED" "$LOG_DIR"/trading/trading-*.log 2>/dev/null || echo 0)
    echo "❌ Trading Errors: $error_count" >> "$report_file"
    
    if [ "$error_count" -gt 0 ]; then
        echo "" >> "$report_file"
        echo "Recent Errors:" >> "$report_file"
        grep "ERROR\|FAILED" "$LOG_DIR"/trading/trading-*.log | tail -5 >> "$report_file"
    fi
    
    echo "Report generated: $report_file"
}

# Function to generate system health report
generate_system_health_report() {
    local report_file="$REPORT_DIR/system-health-$DATE.txt"
    
    echo "🏥 SYSTEM HEALTH REPORT - $DATE" > "$report_file"
    echo "====================================" >> "$report_file"
    echo "" >> "$report_file"
    
    # Connection status
    echo "🔗 CONNECTION STATUS:" >> "$report_file"
    if grep -q "CONNECTED" "$LOG_DIR"/application-*.log 2>/dev/null; then
        echo "✅ API connections active" >> "$report_file"
    else
        echo "❌ Connection issues detected" >> "$report_file"
    fi
    echo "" >> "$report_file"
    
    # Performance metrics
    echo "⚡ PERFORMANCE METRICS:" >> "$report_file"
    if grep -q "Performance metric" "$LOG_DIR"/performance-*.log 2>/dev/null; then
        grep "Performance metric" "$LOG_DIR"/performance-*.log | tail -10 >> "$report_file"
    else
        echo "No performance data available" >> "$report_file"
    fi
    echo "" >> "$report_file"
    
    # Security events
    local security_events=$(grep -c "Security event" "$LOG_DIR"/security/security-*.log 2>/dev/null || echo 0)
    echo "🔒 Security Events: $security_events" >> "$report_file"
    
    echo "Report generated: $report_file"
}

# Main function
main() {
    echo "🔍 Generating log analysis reports..."
    
    generate_trading_summary
    generate_system_health_report
    
    # Set proper permissions
    chown -R trading:trading "$REPORT_DIR"
    chmod -R 640 "$REPORT_DIR"/*.txt
    
    echo "✅ Log analysis complete"
}

# Run main function
main
EOF
    
    chmod +x "$INSTALL_DIR/scripts/analyze-logs.sh"
    chown "$TRADING_USER:$TRADING_GROUP" "$INSTALL_DIR/scripts/analyze-logs.sh"
    
    log_success "Log analysis script created"
}

# Setup cron jobs for log management
setup_cron_jobs() {
    log_info "Setting up cron jobs for log management..."
    
    # Create cron job for log monitoring (every 15 minutes)
    cat > /tmp/trading-agent-cron << EOF
# AI Crypto Trading Agent log management cron jobs
*/15 * * * * $INSTALL_DIR/scripts/monitor-logs.sh
0 2 * * * $INSTALL_DIR/scripts/analyze-logs.sh
0 3 * * * $INSTALL_DIR/scripts/generate-audit-hash.sh
EOF
    
    # Install cron jobs for trading user
    sudo -u "$TRADING_USER" crontab /tmp/trading-agent-cron
    rm /tmp/trading-agent-cron
    
    log_success "Cron jobs configured for log management"
}

# Test logging configuration
test_logging_config() {
    log_info "Testing logging configuration..."
    
    # Test log directory permissions
    if sudo -u "$TRADING_USER" touch "$LOG_DIR/test.log"; then
        rm "$LOG_DIR/test.log"
        log_success "Log directory permissions OK"
    else
        log_error "Log directory permission test failed"
        return 1
    fi
    
    # Test logrotate configuration
    if logrotate -d /etc/logrotate.d/trading-agent > /dev/null 2>&1; then
        log_success "Logrotate configuration test passed"
    else
        log_error "Logrotate configuration test failed"
        return 1
    fi
    
    # Test journal configuration
    if journalctl --verify > /dev/null 2>&1; then
        log_success "Journal configuration test passed"
    else
        log_warning "Journal verification had warnings (this may be normal)"
    fi
}

# Main installation function
main() {
    log_info "🚀 Starting logging configuration setup..."
    
    check_root
    create_trading_user
    create_log_directories
    install_logrotate_config
    configure_systemd_journal
    create_audit_hash_script
    create_log_monitoring_script
    create_log_analysis_script
    setup_cron_jobs
    test_logging_config
    
    log_success "✅ Logging configuration setup complete!"
    echo ""
    echo "📋 Summary:"
    echo "  - Log directories created: $LOG_DIR"
    echo "  - Backup directories created: $BACKUP_DIR"
    echo "  - Logrotate configured: /etc/logrotate.d/trading-agent"
    echo "  - systemd journal optimized"
    echo "  - Log monitoring scripts installed"
    echo "  - Cron jobs configured for automated management"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Start the trading agent services"
    echo "  2. Monitor logs in $LOG_DIR"
    echo "  3. Check reports in $INSTALL_DIR/reports"
    echo "  4. Review cron job output for automated monitoring"
}

# Run main function
main "$@"