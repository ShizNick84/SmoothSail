#!/bin/bash

# Backup Script for Intel NUC Trading System
# Creates comprehensive backups of configuration, data, and logs

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE_DIR="/opt/trading-agent/backups"
LOG_FILE="/var/log/trading-agent/backup.log"
RETENTION_DAYS=30
MAX_BACKUPS=10

# Paths to backup
TRADING_AGENT_DIR="/opt/trading-agent"
CONFIG_DIRS=("/etc/systemd/system" "/etc/nginx" "/etc/postgresql")
LOG_DIRS=("/var/log/trading-agent" "/var/log/postgresql")
DATABASE_NAME="trading_agent"

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

# Create backup directory structure
create_backup_structure() {
    local backup_date="$1"
    local backup_dir="$BACKUP_BASE_DIR/$backup_date"
    
    mkdir -p "$backup_dir"/{config,data,logs,database,scripts}
    echo "$backup_dir"
}

# Backup application files and configuration
backup_application() {
    local backup_dir="$1"
    
    status_info "Backing up application files..."
    
    # Backup main application directory (excluding node_modules and logs)
    if [ -d "$TRADING_AGENT_DIR" ]; then
        tar -czf "$backup_dir/config/trading-agent-app.tar.gz" \
            --exclude="node_modules" \
            --exclude="logs" \
            --exclude="backups" \
            --exclude="*.log" \
            -C "$(dirname "$TRADING_AGENT_DIR")" \
            "$(basename "$TRADING_AGENT_DIR")" 2>/dev/null
        
        status_ok "Application files backed up"
    else
        status_error "Trading agent directory not found: $TRADING_AGENT_DIR"
    fi
    
    # Backup environment configuration
    if [ -f "$TRADING_AGENT_DIR/.env" ]; then
        cp "$TRADING_AGENT_DIR/.env" "$backup_dir/config/env-backup"
        status_ok "Environment configuration backed up"
    fi
    
    # Backup SSH keys
    if [ -d "$TRADING_AGENT_DIR/keys" ]; then
        cp -r "$TRADING_AGENT_DIR/keys" "$backup_dir/config/"
        status_ok "SSH keys backed up"
    fi
}

# Backup system configuration
backup_system_config() {
    local backup_dir="$1"
    
    status_info "Backing up system configuration..."
    
    # Backup systemd service files
    for config_dir in "${CONFIG_DIRS[@]}"; do
        if [ -d "$config_dir" ]; then
            local dir_name=$(basename "$config_dir")
            mkdir -p "$backup_dir/config/$dir_name"
            
            # Copy relevant files
            case "$config_dir" in
                "/etc/systemd/system")
                    cp "$config_dir"/trading-*.service "$backup_dir/config/$dir_name/" 2>/dev/null || true
                    cp "$config_dir"/ssh-tunnel.service "$backup_dir/config/$dir_name/" 2>/dev/null || true
                    ;;
                *)
                    cp -r "$config_dir"/* "$backup_dir/config/$dir_name/" 2>/dev/null || true
                    ;;
            esac
            
            status_ok "Configuration from $config_dir backed up"
        fi
    done
    
    # Backup crontab
    crontab -l > "$backup_dir/config/crontab-backup" 2>/dev/null || echo "No crontab found"
    
    # Backup important system files
    cp /etc/hosts "$backup_dir/config/" 2>/dev/null || true
    cp /etc/hostname "$backup_dir/config/" 2>/dev/null || true
    
    status_ok "System configuration backed up"
}

# Backup database
backup_database() {
    local backup_dir="$1"
    
    status_info "Backing up PostgreSQL database..."
    
    if systemctl is-active --quiet postgresql; then
        # Create database dump
        sudo -u postgres pg_dump "$DATABASE_NAME" > "$backup_dir/database/trading_agent.sql" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            # Compress the dump
            gzip "$backup_dir/database/trading_agent.sql"
            status_ok "Database backed up and compressed"
        else
            status_error "Database backup failed"
        fi
        
        # Backup database configuration
        sudo -u postgres pg_dumpall --globals-only > "$backup_dir/database/globals.sql" 2>/dev/null
        gzip "$backup_dir/database/globals.sql"
        
    else
        status_error "PostgreSQL service is not running"
    fi
}

# Backup logs
backup_logs() {
    local backup_dir="$1"
    
    status_info "Backing up log files..."
    
    for log_dir in "${LOG_DIRS[@]}"; do
        if [ -d "$log_dir" ]; then
            local dir_name=$(basename "$log_dir")
            mkdir -p "$backup_dir/logs/$dir_name"
            
            # Copy recent log files (last 7 days)
            find "$log_dir" -name "*.log" -mtime -7 -exec cp {} "$backup_dir/logs/$dir_name/" \; 2>/dev/null || true
            
            status_ok "Logs from $log_dir backed up"
        fi
    done
    
    # Backup systemd journal for trading services
    journalctl -u trading-agent --since "7 days ago" > "$backup_dir/logs/trading-agent-journal.log" 2>/dev/null || true
    journalctl -u ssh-tunnel --since "7 days ago" > "$backup_dir/logs/ssh-tunnel-journal.log" 2>/dev/null || true
    journalctl -u trading-dashboard --since "7 days ago" > "$backup_dir/logs/trading-dashboard-journal.log" 2>/dev/null || true
    
    status_ok "Systemd journal logs backed up"
}

# Backup scripts
backup_scripts() {
    local backup_dir="$1"
    
    status_info "Backing up scripts..."
    
    # Backup all scripts from the scripts directory
    if [ -d "$SCRIPT_DIR" ]; then
        cp -r "$SCRIPT_DIR"/* "$backup_dir/scripts/" 2>/dev/null || true
        status_ok "Scripts backed up"
    fi
}

# Create backup manifest
create_manifest() {
    local backup_dir="$1"
    local backup_date="$2"
    
    cat > "$backup_dir/MANIFEST.txt" << EOF
Intel NUC Trading System Backup
===============================

Backup Date: $backup_date
System: $(hostname)
OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")
Backup Script Version: 1.0

Contents:
---------
config/
  ├── trading-agent-app.tar.gz    - Main application files
  ├── env-backup                  - Environment configuration
  ├── keys/                       - SSH keys and certificates
  ├── systemd/                    - systemd service files
  ├── crontab-backup              - User crontab
  └── system files                - hosts, hostname, etc.

database/
  ├── trading_agent.sql.gz        - Main database dump
  └── globals.sql.gz              - PostgreSQL global settings

logs/
  ├── trading-agent/              - Application logs
  ├── postgresql/                 - Database logs
  └── *-journal.log               - systemd journal logs

scripts/
  └── *.sh                        - All backup and management scripts

data/
  └── (application data files)

Backup Size: $(du -sh "$backup_dir" | cut -f1)
Files Count: $(find "$backup_dir" -type f | wc -l)

To restore from this backup, use the restore.sh script with this backup directory.
EOF

    status_ok "Backup manifest created"
}

# Clean old backups
cleanup_old_backups() {
    status_info "Cleaning up old backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "backup-*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Keep only the most recent backups if we exceed the maximum
    local backup_count=$(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "backup-*" | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local excess=$((backup_count - MAX_BACKUPS))
        find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "backup-*" -printf '%T@ %p\n' | sort -n | head -n "$excess" | cut -d' ' -f2- | xargs rm -rf
        status_ok "Removed $excess old backups"
    fi
    
    status_ok "Backup cleanup completed"
}

# Verify backup integrity
verify_backup() {
    local backup_dir="$1"
    
    status_info "Verifying backup integrity..."
    
    local errors=0
    
    # Check if main files exist
    [ -f "$backup_dir/config/trading-agent-app.tar.gz" ] || { status_error "Application backup missing"; ((errors++)); }
    [ -f "$backup_dir/database/trading_agent.sql.gz" ] || { status_error "Database backup missing"; ((errors++)); }
    [ -f "$backup_dir/MANIFEST.txt" ] || { status_error "Manifest missing"; ((errors++)); }
    
    # Test archive integrity
    if [ -f "$backup_dir/config/trading-agent-app.tar.gz" ]; then
        tar -tzf "$backup_dir/config/trading-agent-app.tar.gz" >/dev/null 2>&1 || { status_error "Application archive corrupted"; ((errors++)); }
    fi
    
    if [ -f "$backup_dir/database/trading_agent.sql.gz" ]; then
        gunzip -t "$backup_dir/database/trading_agent.sql.gz" 2>/dev/null || { status_error "Database backup corrupted"; ((errors++)); }
    fi
    
    if [ "$errors" -eq 0 ]; then
        status_ok "Backup verification passed"
        return 0
    else
        status_error "Backup verification failed with $errors errors"
        return 1
    fi
}

# Send backup notification
send_notification() {
    local backup_dir="$1"
    local success="$2"
    
    local alert_script="$SCRIPT_DIR/alert-system.sh"
    
    if [ -x "$alert_script" ]; then
        local backup_size=$(du -sh "$backup_dir" | cut -f1)
        local file_count=$(find "$backup_dir" -type f | wc -l)
        
        if [ "$success" = "true" ]; then
            local message="✅ Backup completed successfully!

📁 Backup Location: $backup_dir
📊 Backup Size: $backup_size
📄 Files Backed Up: $file_count
⏰ Completion Time: $(date)

Components backed up:
• Application files and configuration
• PostgreSQL database
• System configuration files
• Log files (last 7 days)
• Scripts and utilities

The backup has been verified and is ready for use."
            
            "$alert_script" send "Backup Completed Successfully" "$message" "info"
        else
            local message="❌ Backup failed!

⚠️ The backup process encountered errors and may be incomplete.
Please check the backup logs for details: $LOG_FILE

Attempted backup location: $backup_dir
Time: $(date)

Please investigate and retry the backup process."
            
            "$alert_script" send "Backup Failed" "$message" "warning"
        fi
    fi
}

# Main backup function
main() {
    local backup_date=$(date '+%Y%m%d-%H%M%S')
    local backup_name="backup-$backup_date"
    
    echo "🗄️  Intel NUC Trading System Backup"
    echo "===================================="
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$BACKUP_BASE_DIR"
    
    log "Starting backup process: $backup_name"
    
    # Create backup directory structure
    local backup_dir=$(create_backup_structure "$backup_name")
    status_info "Created backup directory: $backup_dir"
    
    # Perform backup operations
    backup_application "$backup_dir"
    backup_system_config "$backup_dir"
    backup_database "$backup_dir"
    backup_logs "$backup_dir"
    backup_scripts "$backup_dir"
    
    # Create manifest
    create_manifest "$backup_dir" "$backup_date"
    
    # Verify backup
    if verify_backup "$backup_dir"; then
        status_ok "Backup completed successfully: $backup_dir"
        log "Backup completed successfully: $backup_dir"
        
        # Clean up old backups
        cleanup_old_backups
        
        # Send success notification
        send_notification "$backup_dir" "true"
        
        echo ""
        echo "📋 Backup Summary:"
        echo "  Location: $backup_dir"
        echo "  Size: $(du -sh "$backup_dir" | cut -f1)"
        echo "  Files: $(find "$backup_dir" -type f | wc -l)"
        echo ""
        
        return 0
    else
        status_error "Backup verification failed"
        log "Backup verification failed: $backup_dir"
        
        # Send failure notification
        send_notification "$backup_dir" "false"
        
        return 1
    fi
}

# Handle command line arguments
case "${1:-backup}" in
    "backup")
        main
        ;;
    "list")
        echo "Available backups:"
        ls -la "$BACKUP_BASE_DIR" 2>/dev/null | grep "backup-" || echo "No backups found"
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    "verify")
        if [ -z "${2:-}" ]; then
            echo "Usage: $0 verify <backup-directory>"
            exit 1
        fi
        verify_backup "$2"
        ;;
    *)
        echo "Usage: $0 [backup|list|cleanup|verify <dir>]"
        echo "  backup  - Create new backup (default)"
        echo "  list    - List available backups"
        echo "  cleanup - Remove old backups"
        echo "  verify  - Verify backup integrity"
        exit 1
        ;;
esac