#!/bin/bash

# Setup Automated Backup Scheduling for Intel NUC Trading System
# Configures cron jobs and systemd timers for automated backups

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"
LOG_FILE="/var/log/trading-agent/backup-schedule.log"

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

# Create systemd timer for backups
create_systemd_timer() {
    status_info "Creating systemd timer for automated backups..."
    
    # Create backup service file
    cat > /etc/systemd/system/trading-backup.service << EOF
[Unit]
Description=Intel NUC Trading System Backup
After=network.target postgresql.service

[Service]
Type=oneshot
User=root
WorkingDirectory=$SCRIPT_DIR
ExecStart=$BACKUP_SCRIPT
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
    
    # Create backup timer file
    cat > /etc/systemd/system/trading-backup.timer << EOF
[Unit]
Description=Run Intel NUC Trading System Backup Daily
Requires=trading-backup.service

[Timer]
OnCalendar=daily
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
EOF
    
    # Reload systemd and enable timer
    systemctl daemon-reload
    systemctl enable trading-backup.timer
    systemctl start trading-backup.timer
    
    status_ok "systemd backup timer created and enabled"
}

# Create cron job for backups
create_cron_job() {
    local schedule="$1"
    
    status_info "Creating cron job for automated backups..."
    
    # Create backup wrapper script
    local wrapper_script="/usr/local/bin/trading-backup-wrapper.sh"
    cat > "$wrapper_script" << EOF
#!/bin/bash
# Backup wrapper script for cron execution

# Set PATH for cron environment
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

# Log start
echo "\$(date): Starting automated backup" >> "$LOG_FILE"

# Run backup
if "$BACKUP_SCRIPT"; then
    echo "\$(date): Automated backup completed successfully" >> "$LOG_FILE"
else
    echo "\$(date): Automated backup failed" >> "$LOG_FILE"
fi
EOF
    
    chmod +x "$wrapper_script"
    
    # Add cron job
    (crontab -l 2>/dev/null || echo "") | grep -v "trading-backup-wrapper" | crontab -
    (crontab -l 2>/dev/null; echo "$schedule $wrapper_script") | crontab -
    
    status_ok "Cron job created with schedule: $schedule"
}

# Setup log rotation for backup logs
setup_log_rotation() {
    status_info "Setting up log rotation for backup logs..."
    
    cat > /etc/logrotate.d/trading-backup << EOF
/var/log/trading-agent/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        # Restart rsyslog if it's running
        if systemctl is-active --quiet rsyslog; then
            systemctl reload rsyslog
        fi
    endscript
}
EOF
    
    status_ok "Log rotation configured"
}

# Test backup system
test_backup_system() {
    status_info "Testing backup system..."
    
    if [ -x "$BACKUP_SCRIPT" ]; then
        status_ok "Backup script is executable"
    else
        status_error "Backup script is not executable or not found"
        return 1
    fi
    
    # Test backup script (dry run would be ideal, but we'll just check dependencies)
    local missing_deps=()
    
    command -v tar >/dev/null || missing_deps+=("tar")
    command -v gzip >/dev/null || missing_deps+=("gzip")
    command -v pg_dump >/dev/null || missing_deps+=("postgresql-client")
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        status_error "Missing dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    status_ok "All backup dependencies are available"
    
    # Check backup directory permissions
    local backup_dir="/opt/trading-agent/backups"
    if [ ! -d "$backup_dir" ]; then
        mkdir -p "$backup_dir"
        status_ok "Created backup directory: $backup_dir"
    fi
    
    if [ -w "$backup_dir" ]; then
        status_ok "Backup directory is writable"
    else
        status_error "Backup directory is not writable: $backup_dir"
        return 1
    fi
    
    return 0
}

# Show current backup schedule
show_schedule() {
    status_info "Current backup schedule:"
    
    # Check systemd timer
    if systemctl is-enabled --quiet trading-backup.timer 2>/dev/null; then
        echo "📅 systemd timer: ENABLED"
        systemctl list-timers trading-backup.timer --no-pager 2>/dev/null || true
    else
        echo "📅 systemd timer: DISABLED"
    fi
    
    # Check cron jobs
    local cron_jobs=$(crontab -l 2>/dev/null | grep "trading-backup" || echo "")
    if [ -n "$cron_jobs" ]; then
        echo "⏰ Cron jobs:"
        echo "$cron_jobs"
    else
        echo "⏰ Cron jobs: NONE"
    fi
    
    # Show recent backup history
    echo ""
    echo "📂 Recent backups:"
    find /opt/trading-agent/backups -maxdepth 1 -type d -name "backup-*" 2>/dev/null | sort -r | head -5 | while read backup; do
        local backup_name=$(basename "$backup")
        local backup_size=$(du -sh "$backup" 2>/dev/null | cut -f1)
        local backup_date=$(stat -c %y "$backup" 2>/dev/null | cut -d' ' -f1)
        echo "  $backup_name ($backup_size) - $backup_date"
    done || echo "  No backups found"
}

# Remove backup schedule
remove_schedule() {
    status_info "Removing backup schedule..."
    
    # Remove systemd timer
    if systemctl is-enabled --quiet trading-backup.timer 2>/dev/null; then
        systemctl stop trading-backup.timer
        systemctl disable trading-backup.timer
        rm -f /etc/systemd/system/trading-backup.timer
        rm -f /etc/systemd/system/trading-backup.service
        systemctl daemon-reload
        status_ok "systemd timer removed"
    fi
    
    # Remove cron jobs
    (crontab -l 2>/dev/null || echo "") | grep -v "trading-backup" | crontab -
    rm -f /usr/local/bin/trading-backup-wrapper.sh
    status_ok "Cron jobs removed"
    
    # Remove log rotation
    rm -f /etc/logrotate.d/trading-backup
    status_ok "Log rotation removed"
}

# Main function
main() {
    echo "⏰ Intel NUC Trading System Backup Scheduler"
    echo "============================================="
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-}" in
        "systemd")
            create_systemd_timer
            setup_log_rotation
            test_backup_system
            status_ok "systemd backup schedule configured"
            ;;
        "cron")
            local schedule="${2:-0 2 * * *}"  # Default: 2 AM daily
            create_cron_job "$schedule"
            setup_log_rotation
            test_backup_system
            status_ok "Cron backup schedule configured"
            ;;
        "both")
            create_systemd_timer
            create_cron_job "${2:-0 3 * * *}"  # Default: 3 AM daily for cron
            setup_log_rotation
            test_backup_system
            status_ok "Both systemd and cron backup schedules configured"
            ;;
        "test")
            test_backup_system
            ;;
        "status")
            show_schedule
            ;;
        "remove")
            remove_schedule
            ;;
        *)
            echo "Usage: $0 [systemd|cron [schedule]|both [cron-schedule]|test|status|remove]"
            echo ""
            echo "Options:"
            echo "  systemd              - Setup systemd timer (daily with random delay)"
            echo "  cron [schedule]      - Setup cron job (default: 0 2 * * * - 2 AM daily)"
            echo "  both [cron-schedule] - Setup both systemd and cron"
            echo "  test                 - Test backup system"
            echo "  status               - Show current schedule"
            echo "  remove               - Remove all backup schedules"
            echo ""
            echo "Cron schedule format: 'minute hour day month weekday'"
            echo "Examples:"
            echo "  $0 systemd                    # systemd timer"
            echo "  $0 cron '0 2 * * *'          # Daily at 2 AM"
            echo "  $0 cron '0 */6 * * *'        # Every 6 hours"
            echo "  $0 both '0 3 * * *'          # systemd + cron at 3 AM"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"