#!/bin/bash

# Restore Script for Intel NUC Trading System
# Restores system from backup created by backup.sh

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE_DIR="/opt/trading-agent/backups"
LOG_FILE="/var/log/trading-agent/restore.log"
TRADING_AGENT_DIR="/opt/trading-agent"

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

status_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    log "WARNING: $1"
}

status_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
    log "INFO: $1"
}

# Verify backup directory
verify_backup_directory() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        status_error "Backup directory does not exist: $backup_dir"
        return 1
    fi
    
    if [ ! -f "$backup_dir/MANIFEST.txt" ]; then
        status_error "Backup manifest not found - invalid backup"
        return 1
    fi
    
    # Check essential files
    local missing_files=()
    [ ! -f "$backup_dir/config/trading-agent-app.tar.gz" ] && missing_files+=("application files")
    [ ! -f "$backup_dir/database/trading_agent.sql.gz" ] && missing_files+=("database dump")
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        status_error "Missing essential backup files: ${missing_files[*]}"
        return 1
    fi
    
    status_ok "Backup directory verified"
    return 0
}

# Stop services before restore
stop_services() {
    status_info "Stopping services..."
    
    local services=("trading-dashboard" "trading-agent" "ssh-tunnel")
    
    for service in "${services[@]}"; do
        if systemctl is-active --quiet "$service" 2>/dev/null; then
            systemctl stop "$service"
            status_ok "Stopped $service"
        else
            status_info "Service $service was not running"
        fi
    done
}

# Start services after restore
start_services() {
    status_info "Starting services..."
    
    local services=("ssh-tunnel" "trading-agent" "trading-dashboard")
    
    for service in "${services[@]}"; do
        if systemctl is-enabled --quiet "$service" 2>/dev/null; then
            systemctl start "$service"
            sleep 2
            if systemctl is-active --quiet "$service"; then
                status_ok "Started $service"
            else
                status_error "Failed to start $service"
            fi
        else
            status_warning "Service $service is not enabled"
        fi
    done
}

# Restore application files
restore_application() {
    local backup_dir="$1"
    
    status_info "Restoring application files..."
    
    # Create backup of current installation
    if [ -d "$TRADING_AGENT_DIR" ]; then
        local current_backup="/tmp/trading-agent-current-$(date +%s)"
        mv "$TRADING_AGENT_DIR" "$current_backup"
        status_info "Current installation backed up to: $current_backup"
    fi
    
    # Extract application files
    mkdir -p "$(dirname "$TRADING_AGENT_DIR")"
    tar -xzf "$backup_dir/config/trading-agent-app.tar.gz" -C "$(dirname "$TRADING_AGENT_DIR")"
    
    if [ $? -eq 0 ]; then
        status_ok "Application files restored"
    else
        status_error "Failed to restore application files"
        return 1
    fi
    
    # Restore environment configuration
    if [ -f "$backup_dir/config/env-backup" ]; then
        cp "$backup_dir/config/env-backup" "$TRADING_AGENT_DIR/.env"
        status_ok "Environment configuration restored"
    fi
    
    # Restore SSH keys
    if [ -d "$backup_dir/config/keys" ]; then
        cp -r "$backup_dir/config/keys" "$TRADING_AGENT_DIR/"
        chmod 600 "$TRADING_AGENT_DIR/keys"/*
        status_ok "SSH keys restored"
    fi
    
    # Set proper ownership
    chown -R trading:trading "$TRADING_AGENT_DIR" 2>/dev/null || true
}

# Restore system configuration
restore_system_config() {
    local backup_dir="$1"
    
    status_info "Restoring system configuration..."
    
    # Restore systemd service files
    if [ -d "$backup_dir/config/systemd" ]; then
        cp "$backup_dir/config/systemd"/*.service /etc/systemd/system/ 2>/dev/null || true
        systemctl daemon-reload
        status_ok "systemd service files restored"
    fi
    
    # Restore crontab
    if [ -f "$backup_dir/config/crontab-backup" ] && [ -s "$backup_dir/config/crontab-backup" ]; then
        crontab "$backup_dir/config/crontab-backup"
        status_ok "Crontab restored"
    fi
    
    # Restore system files
    [ -f "$backup_dir/config/hosts" ] && cp "$backup_dir/config/hosts" /etc/hosts
    [ -f "$backup_dir/config/hostname" ] && cp "$backup_dir/config/hostname" /etc/hostname
    
    status_ok "System configuration restored"
}

# Restore database
restore_database() {
    local backup_dir="$1"
    local force_restore="${2:-false}"
    
    status_info "Restoring database..."
    
    if ! systemctl is-active --quiet postgresql; then
        systemctl start postgresql
        sleep 3
    fi
    
    # Check if database exists
    local db_exists=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w trading_agent | wc -l)
    
    if [ "$db_exists" -gt 0 ] && [ "$force_restore" != "true" ]; then
        status_warning "Database already exists. Use --force to overwrite"
        read -p "Do you want to overwrite the existing database? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            status_info "Database restore skipped"
            return 0
        fi
    fi
    
    # Drop existing database if it exists
    if [ "$db_exists" -gt 0 ]; then
        sudo -u postgres dropdb trading_agent 2>/dev/null || true
        status_info "Existing database dropped"
    fi
    
    # Create new database
    sudo -u postgres createdb trading_agent
    
    # Restore database from backup
    gunzip -c "$backup_dir/database/trading_agent.sql.gz" | sudo -u postgres psql trading_agent
    
    if [ $? -eq 0 ]; then
        status_ok "Database restored successfully"
    else
        status_error "Database restore failed"
        return 1
    fi
    
    # Restore global settings if available
    if [ -f "$backup_dir/database/globals.sql.gz" ]; then
        gunzip -c "$backup_dir/database/globals.sql.gz" | sudo -u postgres psql postgres
        status_ok "Database global settings restored"
    fi
}

# Restore scripts
restore_scripts() {
    local backup_dir="$1"
    
    status_info "Restoring scripts..."
    
    if [ -d "$backup_dir/scripts" ]; then
        cp -r "$backup_dir/scripts"/* "$SCRIPT_DIR/" 2>/dev/null || true
        chmod +x "$SCRIPT_DIR"/*.sh
        status_ok "Scripts restored"
    fi
}

# Verify restored system
verify_restore() {
    status_info "Verifying restored system..."
    
    local errors=0
    
    # Check if application directory exists
    [ -d "$TRADING_AGENT_DIR" ] || { status_error "Application directory missing"; ((errors++)); }
    
    # Check if environment file exists
    [ -f "$TRADING_AGENT_DIR/.env" ] || { status_error "Environment file missing"; ((errors++)); }
    
    # Check if database exists
    local db_exists=$(sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -w trading_agent | wc -l)
    [ "$db_exists" -gt 0 ] || { status_error "Database not found"; ((errors++)); }
    
    # Check systemd services
    local services=("ssh-tunnel" "trading-agent" "trading-dashboard")
    for service in "${services[@]}"; do
        [ -f "/etc/systemd/system/$service.service" ] || { status_error "Service file missing: $service"; ((errors++)); }
    done
    
    if [ "$errors" -eq 0 ]; then
        status_ok "System verification passed"
        return 0
    else
        status_error "System verification failed with $errors errors"
        return 1
    fi
}

# Show restore summary
show_summary() {
    local backup_dir="$1"
    
    echo ""
    echo "📋 Restore Summary"
    echo "=================="
    echo "  Backup Source: $backup_dir"
    echo "  Restore Time: $(date)"
    echo "  System: $(hostname)"
    echo ""
    
    if [ -f "$backup_dir/MANIFEST.txt" ]; then
        echo "📄 Backup Manifest:"
        head -10 "$backup_dir/MANIFEST.txt"
        echo ""
    fi
    
    echo "🔧 Next Steps:"
    echo "  1. Verify service configuration"
    echo "  2. Test application functionality"
    echo "  3. Check log files for any issues"
    echo "  4. Update any changed passwords or tokens"
    echo ""
}

# Send restore notification
send_notification() {
    local backup_dir="$1"
    local success="$2"
    
    local alert_script="$SCRIPT_DIR/alert-system.sh"
    
    if [ -x "$alert_script" ]; then
        if [ "$success" = "true" ]; then
            local message="✅ System restore completed successfully!

📁 Restored from: $backup_dir
⏰ Completion Time: $(date)
🖥️ System: $(hostname)

Components restored:
• Application files and configuration
• PostgreSQL database
• System configuration files
• Scripts and utilities

The system has been verified and services are starting.
Please verify functionality and check logs for any issues."
            
            "$alert_script" send "System Restore Completed" "$message" "info"
        else
            local message="❌ System restore failed!

⚠️ The restore process encountered errors and may be incomplete.
Please check the restore logs for details: $LOG_FILE

Attempted restore from: $backup_dir
Time: $(date)

Please investigate and retry the restore process or restore manually."
            
            "$alert_script" send "System Restore Failed" "$message" "critical"
        fi
    fi
}

# Interactive backup selection
select_backup() {
    echo "Available backups:"
    echo "=================="
    
    local backups=($(find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r))
    
    if [ ${#backups[@]} -eq 0 ]; then
        status_error "No backups found in $BACKUP_BASE_DIR"
        exit 1
    fi
    
    local i=1
    for backup in "${backups[@]}"; do
        local backup_name=$(basename "$backup")
        local backup_date=$(echo "$backup_name" | sed 's/backup-//' | sed 's/-/ /')
        local backup_size=$(du -sh "$backup" 2>/dev/null | cut -f1)
        echo "  $i) $backup_name ($backup_size) - $backup_date"
        ((i++))
    done
    
    echo ""
    read -p "Select backup to restore (1-${#backups[@]}): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[1-9][0-9]*$ ]] && [ "$REPLY" -le "${#backups[@]}" ]; then
        local selected_backup="${backups[$((REPLY-1))]}"
        echo "$selected_backup"
    else
        status_error "Invalid selection"
        exit 1
    fi
}

# Main restore function
main() {
    local backup_dir="$1"
    local force_restore="${2:-false}"
    
    echo "🔄 Intel NUC Trading System Restore"
    echo "===================================="
    
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "Starting restore process from: $backup_dir"
    
    # Verify backup
    if ! verify_backup_directory "$backup_dir"; then
        exit 1
    fi
    
    # Show backup info
    if [ -f "$backup_dir/MANIFEST.txt" ]; then
        echo ""
        echo "📄 Backup Information:"
        head -15 "$backup_dir/MANIFEST.txt"
        echo ""
    fi
    
    # Confirm restore
    if [ "$force_restore" != "true" ]; then
        read -p "Are you sure you want to restore from this backup? This will overwrite current system! (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            status_info "Restore cancelled by user"
            exit 0
        fi
    fi
    
    # Stop services
    stop_services
    
    # Perform restore operations
    restore_application "$backup_dir"
    restore_system_config "$backup_dir"
    restore_database "$backup_dir" "$force_restore"
    restore_scripts "$backup_dir"
    
    # Verify restore
    if verify_restore; then
        status_ok "Restore completed successfully"
        log "Restore completed successfully from: $backup_dir"
        
        # Start services
        start_services
        
        # Show summary
        show_summary "$backup_dir"
        
        # Send success notification
        send_notification "$backup_dir" "true"
        
        return 0
    else
        status_error "Restore verification failed"
        log "Restore verification failed from: $backup_dir"
        
        # Send failure notification
        send_notification "$backup_dir" "false"
        
        return 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "")
        # Interactive mode - select backup
        backup_dir=$(select_backup)
        main "$backup_dir"
        ;;
    "--list")
        echo "Available backups:"
        find "$BACKUP_BASE_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r | while read backup; do
            local backup_name=$(basename "$backup")
            local backup_size=$(du -sh "$backup" 2>/dev/null | cut -f1)
            echo "  $backup_name ($backup_size)"
        done
        ;;
    "--force")
        if [ -z "${2:-}" ]; then
            backup_dir=$(select_backup)
        else
            backup_dir="$2"
        fi
        main "$backup_dir" "true"
        ;;
    *)
        if [ -d "$1" ]; then
            main "$1"
        else
            echo "Usage: $0 [backup-directory|--list|--force [backup-directory]]"
            echo ""
            echo "Options:"
            echo "  (no args)           - Interactive backup selection"
            echo "  backup-directory    - Restore from specific backup"
            echo "  --list              - List available backups"
            echo "  --force [dir]       - Force restore without confirmation"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive mode"
            echo "  $0 /opt/trading-agent/backups/backup-20240101-120000"
            echo "  $0 --force                            # Force with selection"
            echo "  $0 --list                             # List backups"
            exit 1
        fi
        ;;
esac