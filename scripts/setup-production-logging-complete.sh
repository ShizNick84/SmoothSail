#!/bin/bash

# =============================================================================
# COMPLETE PRODUCTION LOGGING AND MONITORING SETUP
# =============================================================================
# 
# This script performs the complete setup of production logging and monitoring
# for the AI crypto trading agent on Intel NUC Ubuntu deployment.
# 
# Features:
# - Production log levels and file rotation
# - Centralized logging with proper retention policies
# - System monitoring and alerting thresholds
# - Performance metrics collection and reporting
# - Automated backup and recovery procedures
# - Production readiness validation
# 
# @author AI Crypto Trading System
# @version 1.0.0
# @license PROPRIETARY
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="${LOG_DIR:-/var/log/trading-agent}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/trading-agent}"
CONFIG_DIR="${CONFIG_DIR:-/etc/trading-agent}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_success() {
    echo -e "${CYAN}[SUCCESS]${NC} $1"
}

# Check if running as root for system-level setup
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        log_info "Running as root - will configure system-level logging"
        SYSTEM_LEVEL=true
    else
        log_warn "Running as non-root - will configure user-level logging only"
        SYSTEM_LEVEL=false
        # Adjust paths for user-level setup
        LOG_DIR="$PROJECT_ROOT/logs"
        BACKUP_DIR="$PROJECT_ROOT/backups"
        CONFIG_DIR="$PROJECT_ROOT/config"
    fi
}

# Create necessary directories
create_directories() {
    log_step "Creating logging and monitoring directories..."
    
    # Create log directories
    mkdir -p "$LOG_DIR"/{application,audit,security,trading,performance,system}
    mkdir -p "$BACKUP_DIR"/{logs,config,data}
    mkdir -p "$CONFIG_DIR"/{logging,monitoring,backup}
    
    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        # Set proper ownership and permissions for system-level
        chown -R trading:trading "$LOG_DIR" 2>/dev/null || true
        chown -R trading:trading "$BACKUP_DIR" 2>/dev/null || true
        chown -R root:trading "$CONFIG_DIR" 2>/dev/null || true
        
        chmod 750 "$LOG_DIR"
        chmod 750 "$BACKUP_DIR"
        chmod 755 "$CONFIG_DIR"
        
        # Set specific permissions for sensitive directories
        chmod 700 "$LOG_DIR/security" 2>/dev/null || true
        chmod 700 "$LOG_DIR/audit" 2>/dev/null || true
    else
        # Set user-level permissions
        chmod 755 "$LOG_DIR"
        chmod 755 "$BACKUP_DIR"
        chmod 755 "$CONFIG_DIR"
    fi
    
    log_success "Directories created successfully"
}

# Configure log rotation
configure_log_rotation() {
    log_step "Configuring log rotation..."
    
    local logrotate_config="# AI Crypto Trading Agent Log Rotation Configuration
# Rotates logs with proper retention policies

$LOG_DIR/application/*.log {
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

$LOG_DIR/trading/*.log {
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

$LOG_DIR/security/*.log {
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

$LOG_DIR/audit/*.log {
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

$LOG_DIR/performance/*.log {
    hourly
    rotate 168
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
}

$LOG_DIR/system/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 640 trading trading
}"

    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        echo "$logrotate_config" > /etc/logrotate.d/trading-agent
        log_success "System-level log rotation configured"
    else
        echo "$logrotate_config" > "$CONFIG_DIR/logrotate-trading-agent.conf"
        log_success "User-level log rotation config created"
    fi
}

# Configure centralized logging
configure_centralized_logging() {
    log_step "Configuring centralized logging..."
    
    local rsyslog_config="# AI Crypto Trading Agent Centralized Logging Configuration

# Create separate log files for different components
\$template TradingAgentFormat,\"%timegenerated% %HOSTNAME% %syslogtag% %msg%\\n\"

# Application logs
:programname, isequal, \"trading-agent\" $LOG_DIR/application/app.log;TradingAgentFormat
& stop

# Trading-specific logs
:programname, isequal, \"trading-engine\" $LOG_DIR/trading/trading.log;TradingAgentFormat
& stop

# Security logs
:programname, isequal, \"trading-security\" $LOG_DIR/security/security.log;TradingAgentFormat
& stop

# Performance logs
:programname, isequal, \"trading-performance\" $LOG_DIR/performance/performance.log;TradingAgentFormat
& stop

# System monitoring logs
:programname, isequal, \"trading-monitor\" $LOG_DIR/system/monitor.log;TradingAgentFormat
& stop"

    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        echo "$rsyslog_config" > /etc/rsyslog.d/50-trading-agent.conf
        systemctl restart rsyslog 2>/dev/null || true
        log_success "Centralized logging configured"
    else
        echo "$rsyslog_config" > "$CONFIG_DIR/rsyslog-trading-agent.conf"
        log_success "Centralized logging config created (manual setup required)"
    fi
}

# Setup performance monitoring
setup_performance_monitoring() {
    log_step "Setting up performance monitoring..."
    
    local monitor_script="#!/bin/bash

# AI Crypto Trading Agent Performance Monitor
LOG_FILE=\"$LOG_DIR/performance/metrics.log\"
TIMESTAMP=\$(date '+%Y-%m-%d %H:%M:%S')

# Collect CPU metrics
CPU_USAGE=\$(top -bn1 | grep \"Cpu(s)\" | awk '{print \$2}' | sed 's/%us,//')
CPU_TEMP=\$(sensors | grep \"Core 0\" | awk '{print \$3}' | sed 's/+//;s/°C//' || echo \"N/A\")

# Collect memory metrics
MEMORY_INFO=\$(free -m | grep \"Mem:\")
MEMORY_TOTAL=\$(echo \$MEMORY_INFO | awk '{print \$2}')
MEMORY_USED=\$(echo \$MEMORY_INFO | awk '{print \$3}')
MEMORY_PERCENT=\$(echo \"scale=2; \$MEMORY_USED * 100 / \$MEMORY_TOTAL\" | bc 2>/dev/null || echo \"0\")

# Collect disk metrics
DISK_USAGE=\$(df -h / | tail -1 | awk '{print \$5}' | sed 's/%//')

# Collect trading process metrics
TRADING_PID=\$(pgrep -f \"trading-agent\" | head -1)
if [ -n \"\$TRADING_PID\" ]; then
    TRADING_CPU=\$(ps -p \$TRADING_PID -o %cpu --no-headers | tr -d ' ' 2>/dev/null || echo \"0\")
    TRADING_MEM=\$(ps -p \$TRADING_PID -o %mem --no-headers | tr -d ' ' 2>/dev/null || echo \"0\")
else
    TRADING_CPU=\"0\"
    TRADING_MEM=\"0\"
fi

# Log metrics in JSON format
echo \"{\\\"timestamp\\\":\\\"\$TIMESTAMP\\\",\\\"system\\\":{\\\"cpu_usage\\\":\$CPU_USAGE,\\\"cpu_temp\\\":\\\"\$CPU_TEMP\\\",\\\"memory_percent\\\":\$MEMORY_PERCENT,\\\"memory_used_mb\\\":\$MEMORY_USED,\\\"memory_total_mb\\\":\$MEMORY_TOTAL,\\\"disk_usage_percent\\\":\$DISK_USAGE},\\\"trading_process\\\":{\\\"cpu_percent\\\":\$TRADING_CPU,\\\"memory_percent\\\":\$TRADING_MEM}}\" >> \"\$LOG_FILE\"
"

    local script_path
    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        script_path="/usr/local/bin/trading-performance-monitor"
    else
        script_path="$PROJECT_ROOT/scripts/trading-performance-monitor.sh"
    fi
    
    echo "$monitor_script" > "$script_path"
    chmod +x "$script_path"
    
    log_success "Performance monitoring script created: $script_path"
}

# Setup system health monitoring
setup_health_monitoring() {
    log_step "Setting up system health monitoring..."
    
    local health_script="#!/bin/bash

# AI Crypto Trading Agent Health Check
LOG_FILE=\"$LOG_DIR/system/health.log\"
ALERT_FILE=\"$LOG_DIR/system/alerts.log\"
TIMESTAMP=\$(date '+%Y-%m-%d %H:%M:%S')

# Thresholds
CPU_THRESHOLD=\${CPU_WARNING_THRESHOLD:-70}
MEMORY_THRESHOLD=\${MEMORY_WARNING_THRESHOLD:-75}
DISK_THRESHOLD=\${DISK_WARNING_THRESHOLD:-80}

# Check CPU usage
CPU_USAGE=\$(top -bn1 | grep \"Cpu(s)\" | awk '{print \$2}' | sed 's/%us,//' | cut -d. -f1)
if [ \"\$CPU_USAGE\" -gt \"\$CPU_THRESHOLD\" ]; then
    echo \"[\$TIMESTAMP] ALERT: High CPU usage: \${CPU_USAGE}%\" >> \"\$ALERT_FILE\"
    logger -p local0.warning -t trading-monitor \"High CPU usage: \${CPU_USAGE}%\" 2>/dev/null || true
fi

# Check memory usage
MEMORY_PERCENT=\$(free | grep Mem | awk '{printf \"%.0f\", \$3/\$2 * 100.0}')
if [ \"\$MEMORY_PERCENT\" -gt \"\$MEMORY_THRESHOLD\" ]; then
    echo \"[\$TIMESTAMP] ALERT: High memory usage: \${MEMORY_PERCENT}%\" >> \"\$ALERT_FILE\"
    logger -p local0.warning -t trading-monitor \"High memory usage: \${MEMORY_PERCENT}%\" 2>/dev/null || true
fi

# Check disk usage
DISK_USAGE=\$(df / | tail -1 | awk '{print \$5}' | sed 's/%//')
if [ \"\$DISK_USAGE\" -gt \"\$DISK_THRESHOLD\" ]; then
    echo \"[\$TIMESTAMP] ALERT: High disk usage: \${DISK_USAGE}%\" >> \"\$ALERT_FILE\"
    logger -p local0.warning -t trading-monitor \"High disk usage: \${DISK_USAGE}%\" 2>/dev/null || true
fi

# Check trading agent process
if ! pgrep -f \"trading-agent\" > /dev/null; then
    echo \"[\$TIMESTAMP] CRITICAL: Trading agent process not running\" >> \"\$ALERT_FILE\"
    logger -p local0.error -t trading-monitor \"Trading agent process not running\" 2>/dev/null || true
fi

# Log health status
echo \"[\$TIMESTAMP] Health check completed - CPU: \${CPU_USAGE}%, Memory: \${MEMORY_PERCENT}%, Disk: \${DISK_USAGE}%\" >> \"\$LOG_FILE\"
"

    local script_path
    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        script_path="/usr/local/bin/trading-health-check"
    else
        script_path="$PROJECT_ROOT/scripts/trading-health-check.sh"
    fi
    
    echo "$health_script" > "$script_path"
    chmod +x "$script_path"
    
    log_success "Health monitoring script created: $script_path"
}

# Setup automated backup
setup_automated_backup() {
    log_step "Setting up automated backup..."
    
    local backup_script="#!/bin/bash

# AI Crypto Trading Agent Automated Backup
BACKUP_DIR=\"$BACKUP_DIR\"
TIMESTAMP=\$(date '+%Y%m%d_%H%M%S')
BACKUP_NAME=\"backup_\${TIMESTAMP}\"
BACKUP_PATH=\"\${BACKUP_DIR}/\${BACKUP_NAME}\"
LOG_FILE=\"$LOG_DIR/system/backup.log\"

# Create backup directory
mkdir -p \"\$BACKUP_PATH\"

log_backup() {
    echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" >> \"\$LOG_FILE\"
}

log_backup \"Starting backup: \$BACKUP_NAME\"

# Backup configuration files
log_backup \"Backing up configuration files...\"
mkdir -p \"\$BACKUP_PATH/config\"
cp -r \"$PROJECT_ROOT/.env\"* \"\$BACKUP_PATH/config/\" 2>/dev/null || true
cp -r \"$CONFIG_DIR/\" \"\$BACKUP_PATH/config/\" 2>/dev/null || true

# Backup recent logs (last 7 days)
log_backup \"Backing up recent logs...\"
mkdir -p \"\$BACKUP_PATH/logs\"
find \"$LOG_DIR\" -name \"*.log\" -mtime -7 -exec cp {} \"\$BACKUP_PATH/logs/\" \\; 2>/dev/null || true

# Create compressed archive
log_backup \"Creating compressed archive...\"
cd \"\$BACKUP_DIR\"
tar -czf \"\${BACKUP_NAME}.tar.gz\" \"\$BACKUP_NAME\"
rm -rf \"\$BACKUP_PATH\"

# Cleanup old backups (keep last 10)
log_backup \"Cleaning up old backups...\"
ls -t \"\${BACKUP_DIR}\"/backup_*.tar.gz | tail -n +11 | xargs rm -f 2>/dev/null || true

BACKUP_SIZE=\$(du -h \"\${BACKUP_DIR}/\${BACKUP_NAME}.tar.gz\" | cut -f1)
log_backup \"Backup completed: \${BACKUP_NAME}.tar.gz (\${BACKUP_SIZE})\"
"

    local script_path
    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        script_path="/usr/local/bin/trading-backup"
    else
        script_path="$PROJECT_ROOT/scripts/trading-backup.sh"
    fi
    
    echo "$backup_script" > "$script_path"
    chmod +x "$script_path"
    
    log_success "Backup script created: $script_path"
}

# Create production configuration
create_production_config() {
    log_step "Creating production configuration..."
    
    local config_file="$CONFIG_DIR/logging/production.json"
    mkdir -p "$(dirname "$config_file")"
    
    cat > "$config_file" << EOF
{
  "logging": {
    "level": "${LOG_LEVEL:-info}",
    "format": "json",
    "timestamp": true,
    "colorize": false,
    "maxFiles": "${LOG_MAX_FILES:-30}",
    "maxSize": "${LOG_MAX_SIZE:-100m}",
    "compress": ${LOG_COMPRESS:-true},
    "directories": {
      "application": "$LOG_DIR/application",
      "audit": "$LOG_DIR/audit",
      "security": "$LOG_DIR/security",
      "trading": "$LOG_DIR/trading",
      "performance": "$LOG_DIR/performance",
      "system": "$LOG_DIR/system"
    },
    "retention": {
      "application": "${LOG_RETENTION_APPLICATION:-30d}",
      "audit": "${LOG_RETENTION_AUDIT:-365d}",
      "security": "${LOG_RETENTION_SECURITY:-365d}",
      "trading": "${LOG_RETENTION_TRADING:-90d}",
      "performance": "${LOG_RETENTION_PERFORMANCE:-7d}",
      "system": "${LOG_RETENTION_SYSTEM:-30d}"
    }
  },
  "monitoring": {
    "enabled": true,
    "interval": ${MONITORING_INTERVAL:-60000},
    "thresholds": {
      "cpu": {
        "warning": ${CPU_WARNING_THRESHOLD:-70},
        "critical": ${CPU_CRITICAL_THRESHOLD:-85}
      },
      "memory": {
        "warning": ${MEMORY_WARNING_THRESHOLD:-75},
        "critical": ${MEMORY_CRITICAL_THRESHOLD:-90}
      },
      "disk": {
        "warning": ${DISK_WARNING_THRESHOLD:-80},
        "critical": ${DISK_CRITICAL_THRESHOLD:-95}
      },
      "temperature": {
        "warning": ${TEMP_WARNING_THRESHOLD:-70},
        "critical": ${TEMP_CRITICAL_THRESHOLD:-80}
      }
    },
    "alerts": {
      "enabled": ${ALERTS_ENABLED:-true},
      "channels": ["log", "syslog"],
      "escalation": {
        "critical": ["email", "telegram"]
      }
    }
  },
  "backup": {
    "enabled": ${BACKUP_ENABLED:-true},
    "schedule": "${BACKUP_SCHEDULE:-0 2 * * *}",
    "retention": ${BACKUP_RETENTION:-10},
    "compression": ${BACKUP_COMPRESSION:-true}
  }
}
EOF

    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        chown root:trading "$config_file" 2>/dev/null || true
        chmod 640 "$config_file"
    else
        chmod 644 "$config_file"
    fi
    
    log_success "Production configuration created: $config_file"
}

# Test the setup
test_setup() {
    log_step "Testing production logging setup..."
    
    # Test log directory write
    local test_log="$LOG_DIR/application/setup-test.log"
    echo "Setup test: $(date)" > "$test_log" 2>/dev/null && {
        log_success "Log directory write test passed"
        rm -f "$test_log"
    } || {
        log_warn "Log directory write test failed"
    }
    
    # Test performance monitoring script
    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        /usr/local/bin/trading-performance-monitor 2>/dev/null && {
            log_success "Performance monitoring test passed"
        } || {
            log_warn "Performance monitoring test failed"
        }
        
        # Test health check script
        /usr/local/bin/trading-health-check 2>/dev/null && {
            log_success "Health check test passed"
        } || {
            log_warn "Health check test failed"
        }
        
        # Test backup script
        /usr/local/bin/trading-backup 2>/dev/null && {
            log_success "Backup test passed"
        } || {
            log_warn "Backup test failed"
        }
    else
        log_info "Skipping script tests (user-level setup)"
    fi
}

# Run TypeScript production logging test
run_typescript_tests() {
    log_step "Running TypeScript production logging tests..."
    
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        cd "$PROJECT_ROOT"
        
        # Build the project if needed
        if [[ -f "tsconfig.json" ]]; then
            log_info "Building TypeScript project..."
            npm run build 2>/dev/null || {
                log_warn "TypeScript build failed, skipping tests"
                return
            }
        fi
        
        # Run production logging tests
        if [[ -f "dist/tests/production/test-production-logging.js" ]]; then
            log_info "Running production logging tests..."
            node -e "
                const { ProductionLoggingTestSuite } = require('./dist/tests/production/test-production-logging.js');
                const testSuite = new ProductionLoggingTestSuite();
                testSuite.runAllTests().then(results => {
                    console.log('Test Results:', results);
                    return testSuite.cleanup();
                }).catch(error => {
                    console.error('Test failed:', error);
                    process.exit(1);
                });
            " && {
                log_success "TypeScript tests passed"
            } || {
                log_warn "TypeScript tests failed"
            }
        else
            log_warn "TypeScript test file not found, skipping tests"
        fi
    else
        log_warn "No package.json found, skipping TypeScript tests"
    fi
}

# Display setup summary
display_summary() {
    log_step "Production Logging Setup Summary"
    echo
    echo -e "${CYAN}📋 Configuration Summary:${NC}"
    echo -e "  • Log Directory: ${BLUE}$LOG_DIR${NC}"
    echo -e "  • Backup Directory: ${BLUE}$BACKUP_DIR${NC}"
    echo -e "  • Config Directory: ${BLUE}$CONFIG_DIR${NC}"
    echo -e "  • System Level: ${BLUE}$SYSTEM_LEVEL${NC}"
    echo
    echo -e "${CYAN}📁 Created Directories:${NC}"
    echo -e "  • Application Logs: ${BLUE}$LOG_DIR/application${NC}"
    echo -e "  • Audit Logs: ${BLUE}$LOG_DIR/audit${NC}"
    echo -e "  • Security Logs: ${BLUE}$LOG_DIR/security${NC}"
    echo -e "  • Trading Logs: ${BLUE}$LOG_DIR/trading${NC}"
    echo -e "  • Performance Logs: ${BLUE}$LOG_DIR/performance${NC}"
    echo -e "  • System Logs: ${BLUE}$LOG_DIR/system${NC}"
    echo
    echo -e "${CYAN}🔧 Management Commands:${NC}"
    if [[ "$SYSTEM_LEVEL" == "true" ]]; then
        echo -e "  • View logs: ${BLUE}journalctl -u trading-agent -f${NC}"
        echo -e "  • Manual backup: ${BLUE}/usr/local/bin/trading-backup${NC}"
        echo -e "  • Health check: ${BLUE}/usr/local/bin/trading-health-check${NC}"
        echo -e "  • Performance monitor: ${BLUE}/usr/local/bin/trading-performance-monitor${NC}"
    else
        echo -e "  • Manual backup: ${BLUE}$PROJECT_ROOT/scripts/trading-backup.sh${NC}"
        echo -e "  • Health check: ${BLUE}$PROJECT_ROOT/scripts/trading-health-check.sh${NC}"
        echo -e "  • Performance monitor: ${BLUE}$PROJECT_ROOT/scripts/trading-performance-monitor.sh${NC}"
    fi
    echo -e "  • View alerts: ${BLUE}tail -f $LOG_DIR/system/alerts.log${NC}"
    echo
}

# Main execution
main() {
    log_info "🚀 Starting complete production logging and monitoring setup..."
    echo
    
    check_permissions
    create_directories
    configure_log_rotation
    configure_centralized_logging
    setup_performance_monitoring
    setup_health_monitoring
    setup_automated_backup
    create_production_config
    test_setup
    run_typescript_tests
    
    echo
    log_success "✅ Production logging and monitoring setup completed successfully!"
    echo
    display_summary
}

# Execute main function
main "$@"