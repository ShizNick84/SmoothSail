#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - PRODUCTION LOGGING SETUP
# =============================================================================
# 
# This script configures production-grade logging and monitoring for the
# AI crypto trading agent on Intel NUC Ubuntu deployment.
# 
# Features:
# - Configures log rotation with proper retention policies
# - Sets up centralized logging with structured formats
# - Configures system monitoring and alerting thresholds
# - Implements performance metrics collection
# - Sets up automated backup and recovery procedures
# 
# @author AI Crypto Trading System
# @version 1.0.0
# @license PROPRIETARY
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="/var/log/trading-agent"
BACKUP_DIR="/var/backups/trading-agent"
CONFIG_DIR="/etc/trading-agent"
SYSTEMD_DIR="/etc/systemd/system"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    log_info "📁 Creating logging and monitoring directories..."
    
    # Create log directories with proper permissions
    mkdir -p "$LOG_DIR"/{application,audit,security,trading,performance,system}
    mkdir -p "$BACKUP_DIR"/{logs,config,data}
    mkdir -p "$CONFIG_DIR"/{logging,monitoring,backup}
    
    # Set proper ownership and permissions
    chown -R trading:trading "$LOG_DIR"
    chown -R trading:trading "$BACKUP_DIR"
    chown -R root:trading "$CONFIG_DIR"
    
    chmod 750 "$LOG_DIR"
    chmod 750 "$BACKUP_DIR"
    chmod 755 "$CONFIG_DIR"
    
    # Set specific permissions for sensitive log directories
    chmod 700 "$LOG_DIR/security"
    chmod 700 "$LOG_DIR/audit"
    
    log_info "✅ Directories created successfully"
}

# Configure logrotate for application logs
configure_logrotate() {
    log_info "🔄 Configuring log rotation..."
    
    cat > /etc/logrotate.d/trading-agent << 'EOF'
# AI Crypto Trading Agent Log Rotation Configuration
# Rotates logs daily with compression and proper retention

/var/log/trading-agent/application/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

/var/log/trading-agent/trading/*.log {
    daily
    rotate 90
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

/var/log/trading-agent/security/*.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    create 600 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

/var/log/trading-agent/audit/*.log {
    daily
    rotate 365
    compress
    delaycompress
    missingok
    notifempty
    create 600 trading trading
    postrotate
        systemctl reload trading-agent || true
    endscript
}

/var/log/trading-agent/performance/*.log {
    hourly
    rotate 168
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
}

/var/log/trading-agent/system/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
}
EOF

    # Test logrotate configuration
    if logrotate -d /etc/logrotate.d/trading-agent > /dev/null 2>&1; then
        log_info "✅ Logrotate configuration validated"
    else
        log_error "❌ Logrotate configuration validation failed"
        exit 1
    fi
}

# Configure rsyslog for centralized logging
configure_rsyslog() {
    log_info "📊 Configuring centralized logging..."
    
    cat > /etc/rsyslog.d/50-trading-agent.conf << 'EOF'
# AI Crypto Trading Agent Centralized Logging Configuration

# Create separate log files for different components
$template TradingAgentFormat,"%timegenerated% %HOSTNAME% %syslogtag% %msg%\n"

# Application logs
:programname, isequal, "trading-agent" /var/log/trading-agent/application/app.log;TradingAgentFormat
& stop

# Trading-specific logs
:programname, isequal, "trading-engine" /var/log/trading-agent/trading/trading.log;TradingAgentFormat
& stop

# Security logs
:programname, isequal, "trading-security" /var/log/trading-agent/security/security.log;TradingAgentFormat
& stop

# Performance logs
:programname, isequal, "trading-performance" /var/log/trading-agent/performance/performance.log;TradingAgentFormat
& stop

# System monitoring logs
:programname, isequal, "trading-monitor" /var/log/trading-agent/system/monitor.log;TradingAgentFormat
& stop
EOF

    # Restart rsyslog to apply configuration
    systemctl restart rsyslog
    log_info "✅ Centralized logging configured"
}

# Configure journald for systemd service logs
configure_journald() {
    log_info "📋 Configuring systemd journal logging..."
    
    # Create journald configuration for trading agent
    mkdir -p /etc/systemd/journald.conf.d
    
    cat > /etc/systemd/journald.conf.d/trading-agent.conf << 'EOF'
# AI Crypto Trading Agent Journal Configuration

[Journal]
# Store logs persistently
Storage=persistent

# Set maximum journal size (1GB)
SystemMaxUse=1G

# Keep logs for 30 days
MaxRetentionSec=30d

# Compress logs older than 1 day
Compress=yes

# Forward to syslog for centralized logging
ForwardToSyslog=yes

# Rate limiting for high-volume logs
RateLimitInterval=30s
RateLimitBurst=10000
EOF

    # Restart systemd-journald
    systemctl restart systemd-journald
    log_info "✅ Journal logging configured"
}

# Setup performance metrics collection
setup_performance_monitoring() {
    log_info "📈 Setting up performance metrics collection..."
    
    # Create performance monitoring script
    cat > /usr/local/bin/trading-performance-monitor << 'EOF'
#!/bin/bash

# AI Crypto Trading Agent Performance Monitor
# Collects system performance metrics for monitoring

LOG_FILE="/var/log/trading-agent/performance/metrics.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Collect CPU metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
CPU_TEMP=$(sensors | grep "Core 0" | awk '{print $3}' | sed 's/+//;s/°C//' || echo "N/A")

# Collect memory metrics
MEMORY_INFO=$(free -m | grep "Mem:")
MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')
MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
MEMORY_PERCENT=$(echo "scale=2; $MEMORY_USED * 100 / $MEMORY_TOTAL" | bc)

# Collect disk metrics
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
DISK_IOPS=$(iostat -x 1 1 | tail -n +4 | awk 'NR==2 {print $4+$5}' || echo "0")

# Collect network metrics
NETWORK_RX=$(cat /proc/net/dev | grep eth0 | awk '{print $2}' || echo "0")
NETWORK_TX=$(cat /proc/net/dev | grep eth0 | awk '{print $10}' || echo "0")

# Collect trading process metrics
TRADING_PID=$(pgrep -f "trading-agent" | head -1)
if [ -n "$TRADING_PID" ]; then
    TRADING_CPU=$(ps -p $TRADING_PID -o %cpu --no-headers | tr -d ' ')
    TRADING_MEM=$(ps -p $TRADING_PID -o %mem --no-headers | tr -d ' ')
    TRADING_RSS=$(ps -p $TRADING_PID -o rss --no-headers | tr -d ' ')
else
    TRADING_CPU="0"
    TRADING_MEM="0"
    TRADING_RSS="0"
fi

# Log metrics in JSON format
echo "{\"timestamp\":\"$TIMESTAMP\",\"system\":{\"cpu_usage\":$CPU_USAGE,\"cpu_temp\":\"$CPU_TEMP\",\"memory_percent\":$MEMORY_PERCENT,\"memory_used_mb\":$MEMORY_USED,\"memory_total_mb\":$MEMORY_TOTAL,\"disk_usage_percent\":$DISK_USAGE,\"disk_iops\":$DISK_IOPS,\"network_rx\":$NETWORK_RX,\"network_tx\":$NETWORK_TX},\"trading_process\":{\"cpu_percent\":$TRADING_CPU,\"memory_percent\":$TRADING_MEM,\"memory_rss_kb\":$TRADING_RSS}}" >> "$LOG_FILE"
EOF

    chmod +x /usr/local/bin/trading-performance-monitor
    
    # Create systemd timer for performance monitoring
    cat > "$SYSTEMD_DIR/trading-performance-monitor.service" << 'EOF'
[Unit]
Description=Trading Agent Performance Monitor
After=network.target

[Service]
Type=oneshot
User=trading
ExecStart=/usr/local/bin/trading-performance-monitor
StandardOutput=journal
StandardError=journal
EOF

    cat > "$SYSTEMD_DIR/trading-performance-monitor.timer" << 'EOF'
[Unit]
Description=Run Trading Agent Performance Monitor every minute
Requires=trading-performance-monitor.service

[Timer]
OnCalendar=*:*:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Enable and start the timer
    systemctl daemon-reload
    systemctl enable trading-performance-monitor.timer
    systemctl start trading-performance-monitor.timer
    
    log_info "✅ Performance monitoring configured"
}

# Setup system monitoring and alerting
setup_system_monitoring() {
    log_info "🚨 Setting up system monitoring and alerting..."
    
    # Create system health check script
    cat > /usr/local/bin/trading-health-check << 'EOF'
#!/bin/bash

# AI Crypto Trading Agent Health Check
# Monitors system health and generates alerts

LOG_FILE="/var/log/trading-agent/system/health.log"
ALERT_FILE="/var/log/trading-agent/system/alerts.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
TEMP_THRESHOLD=75

# Check CPU usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d. -f1)
if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
    echo "[$TIMESTAMP] ALERT: High CPU usage: ${CPU_USAGE}%" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High CPU usage: ${CPU_USAGE}%"
fi

# Check memory usage
MEMORY_PERCENT=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
if [ "$MEMORY_PERCENT" -gt "$MEMORY_THRESHOLD" ]; then
    echo "[$TIMESTAMP] ALERT: High memory usage: ${MEMORY_PERCENT}%" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High memory usage: ${MEMORY_PERCENT}%"
fi

# Check disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    echo "[$TIMESTAMP] ALERT: High disk usage: ${DISK_USAGE}%" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High disk usage: ${DISK_USAGE}%"
fi

# Check CPU temperature
CPU_TEMP=$(sensors | grep "Core 0" | awk '{print $3}' | sed 's/+//;s/°C//' | cut -d. -f1 2>/dev/null || echo "0")
if [ "$CPU_TEMP" -gt "$TEMP_THRESHOLD" ] && [ "$CPU_TEMP" -ne "0" ]; then
    echo "[$TIMESTAMP] ALERT: High CPU temperature: ${CPU_TEMP}°C" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "High CPU temperature: ${CPU_TEMP}°C"
fi

# Check trading agent process
if ! pgrep -f "trading-agent" > /dev/null; then
    echo "[$TIMESTAMP] CRITICAL: Trading agent process not running" >> "$ALERT_FILE"
    logger -p local0.error -t trading-monitor "Trading agent process not running"
fi

# Check SSH tunnel
if ! pgrep -f "ssh.*oracle" > /dev/null; then
    echo "[$TIMESTAMP] WARNING: SSH tunnel not detected" >> "$ALERT_FILE"
    logger -p local0.warning -t trading-monitor "SSH tunnel not detected"
fi

# Log health status
echo "[$TIMESTAMP] Health check completed - CPU: ${CPU_USAGE}%, Memory: ${MEMORY_PERCENT}%, Disk: ${DISK_USAGE}%, Temp: ${CPU_TEMP}°C" >> "$LOG_FILE"
EOF

    chmod +x /usr/local/bin/trading-health-check
    
    # Create systemd timer for health monitoring
    cat > "$SYSTEMD_DIR/trading-health-check.service" << 'EOF'
[Unit]
Description=Trading Agent Health Check
After=network.target

[Service]
Type=oneshot
User=trading
ExecStart=/usr/local/bin/trading-health-check
StandardOutput=journal
StandardError=journal
EOF

    cat > "$SYSTEMD_DIR/trading-health-check.timer" << 'EOF'
[Unit]
Description=Run Trading Agent Health Check every 5 minutes
Requires=trading-health-check.service

[Timer]
OnCalendar=*:*/5:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Enable and start the timer
    systemctl daemon-reload
    systemctl enable trading-health-check.timer
    systemctl start trading-health-check.timer
    
    log_info "✅ System monitoring configured"
}

# Setup automated backup procedures
setup_automated_backup() {
    log_info "💾 Setting up automated backup procedures..."
    
    # Create backup script
    cat > /usr/local/bin/trading-backup << 'EOF'
#!/bin/bash

# AI Crypto Trading Agent Automated Backup
# Creates compressed backups of configuration, logs, and data

BACKUP_DIR="/var/backups/trading-agent"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME="backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"
LOG_FILE="/var/log/trading-agent/system/backup.log"

# Create backup directory
mkdir -p "$BACKUP_PATH"

log_backup() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

log_backup "Starting backup: $BACKUP_NAME"

# Backup configuration files
log_backup "Backing up configuration files..."
mkdir -p "$BACKUP_PATH/config"
cp -r /opt/trading-agent/.env* "$BACKUP_PATH/config/" 2>/dev/null || true
cp -r /etc/trading-agent/ "$BACKUP_PATH/config/" 2>/dev/null || true
cp -r /etc/systemd/system/trading-* "$BACKUP_PATH/config/" 2>/dev/null || true

# Backup application logs (last 7 days)
log_backup "Backing up recent logs..."
mkdir -p "$BACKUP_PATH/logs"
find /var/log/trading-agent -name "*.log" -mtime -7 -exec cp {} "$BACKUP_PATH/logs/" \; 2>/dev/null || true

# Backup trading data
log_backup "Backing up trading data..."
mkdir -p "$BACKUP_PATH/data"
cp -r /opt/trading-agent/data/ "$BACKUP_PATH/data/" 2>/dev/null || true

# Backup SSH keys
log_backup "Backing up SSH keys..."
mkdir -p "$BACKUP_PATH/keys"
cp -r /opt/trading-agent/keys/ "$BACKUP_PATH/keys/" 2>/dev/null || true

# Create compressed archive
log_backup "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_PATH"

# Set proper permissions
chown trading:trading "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
chmod 600 "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"

# Cleanup old backups (keep last 10)
log_backup "Cleaning up old backups..."
ls -t "${BACKUP_DIR}"/backup_*.tar.gz | tail -n +11 | xargs rm -f 2>/dev/null || true

BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log_backup "Backup completed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

# Log to syslog
logger -p local0.info -t trading-backup "Backup completed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"
EOF

    chmod +x /usr/local/bin/trading-backup
    
    # Create systemd timer for automated backups
    cat > "$SYSTEMD_DIR/trading-backup.service" << 'EOF'
[Unit]
Description=Trading Agent Automated Backup
After=network.target

[Service]
Type=oneshot
User=root
ExecStart=/usr/local/bin/trading-backup
StandardOutput=journal
StandardError=journal
EOF

    cat > "$SYSTEMD_DIR/trading-backup.timer" << 'EOF'
[Unit]
Description=Run Trading Agent Backup daily at 2 AM
Requires=trading-backup.service

[Timer]
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Enable and start the timer
    systemctl daemon-reload
    systemctl enable trading-backup.timer
    systemctl start trading-backup.timer
    
    log_info "✅ Automated backup configured"
}

# Create production environment configuration
create_production_config() {
    log_info "⚙️ Creating production environment configuration..."
    
    # Create logging configuration
    cat > "$CONFIG_DIR/logging/production.json" << 'EOF'
{
  "logging": {
    "level": "info",
    "format": "json",
    "timestamp": true,
    "colorize": false,
    "maxFiles": 30,
    "maxSize": "100m",
    "compress": true,
    "directories": {
      "application": "/var/log/trading-agent/application",
      "audit": "/var/log/trading-agent/audit",
      "security": "/var/log/trading-agent/security",
      "trading": "/var/log/trading-agent/trading",
      "performance": "/var/log/trading-agent/performance",
      "system": "/var/log/trading-agent/system"
    },
    "retention": {
      "application": "30d",
      "audit": "365d",
      "security": "365d",
      "trading": "90d",
      "performance": "7d",
      "system": "30d"
    }
  },
  "monitoring": {
    "enabled": true,
    "interval": 60000,
    "thresholds": {
      "cpu": {
        "warning": 70,
        "critical": 85
      },
      "memory": {
        "warning": 75,
        "critical": 90
      },
      "disk": {
        "warning": 80,
        "critical": 95
      },
      "temperature": {
        "warning": 70,
        "critical": 80
      }
    },
    "alerts": {
      "enabled": true,
      "channels": ["log", "syslog"],
      "escalation": {
        "critical": ["email", "telegram"]
      }
    }
  },
  "backup": {
    "enabled": true,
    "schedule": "0 2 * * *",
    "retention": 10,
    "compression": true,
    "encryption": false,
    "includes": [
      "config",
      "logs",
      "data",
      "keys"
    ]
  }
}
EOF

    # Set proper permissions
    chown root:trading "$CONFIG_DIR/logging/production.json"
    chmod 640 "$CONFIG_DIR/logging/production.json"
    
    log_info "✅ Production configuration created"
}

# Test logging and monitoring setup
test_logging_monitoring() {
    log_info "🧪 Testing logging and monitoring setup..."
    
    # Test log rotation
    if logrotate -f /etc/logrotate.d/trading-agent > /dev/null 2>&1; then
        log_info "✅ Log rotation test passed"
    else
        log_warn "⚠️ Log rotation test failed"
    fi
    
    # Test performance monitoring
    if /usr/local/bin/trading-performance-monitor; then
        log_info "✅ Performance monitoring test passed"
    else
        log_warn "⚠️ Performance monitoring test failed"
    fi
    
    # Test health check
    if /usr/local/bin/trading-health-check; then
        log_info "✅ Health check test passed"
    else
        log_warn "⚠️ Health check test failed"
    fi
    
    # Test backup
    if /usr/local/bin/trading-backup; then
        log_info "✅ Backup test passed"
    else
        log_warn "⚠️ Backup test failed"
    fi
    
    # Check systemd timers
    if systemctl is-active --quiet trading-performance-monitor.timer; then
        log_info "✅ Performance monitoring timer active"
    else
        log_warn "⚠️ Performance monitoring timer not active"
    fi
    
    if systemctl is-active --quiet trading-health-check.timer; then
        log_info "✅ Health check timer active"
    else
        log_warn "⚠️ Health check timer not active"
    fi
    
    if systemctl is-active --quiet trading-backup.timer; then
        log_info "✅ Backup timer active"
    else
        log_warn "⚠️ Backup timer not active"
    fi
}

# Main execution
main() {
    log_info "🚀 Starting production logging and monitoring setup..."
    
    check_root
    create_directories
    configure_logrotate
    configure_rsyslog
    configure_journald
    setup_performance_monitoring
    setup_system_monitoring
    setup_automated_backup
    create_production_config
    test_logging_monitoring
    
    log_info "✅ Production logging and monitoring setup completed successfully!"
    log_info ""
    log_info "📋 Summary:"
    log_info "  • Log rotation configured with proper retention policies"
    log_info "  • Centralized logging setup with rsyslog and journald"
    log_info "  • Performance metrics collection every minute"
    log_info "  • System health monitoring every 5 minutes"
    log_info "  • Automated daily backups at 2 AM"
    log_info "  • Production configuration files created"
    log_info ""
    log_info "📁 Important directories:"
    log_info "  • Logs: $LOG_DIR"
    log_info "  • Backups: $BACKUP_DIR"
    log_info "  • Config: $CONFIG_DIR"
    log_info ""
    log_info "🔧 Management commands:"
    log_info "  • View logs: journalctl -u trading-agent -f"
    log_info "  • Check health: systemctl status trading-health-check.timer"
    log_info "  • Manual backup: /usr/local/bin/trading-backup"
    log_info "  • View alerts: tail -f $LOG_DIR/system/alerts.log"
}

# Execute main function
main "$@"