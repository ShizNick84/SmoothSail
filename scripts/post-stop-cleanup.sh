#!/bin/bash

# Trading Agent Post-Stop Cleanup Script
# Performs cleanup tasks after the trading agent stops

set -euo pipefail

LOG_FILE="/var/log/trading-agent/cleanup.log"
PID_FILE="/var/run/trading-agent.pid"
TEMP_DIR="/tmp/trading-agent"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [CLEANUP] $1" | tee -a "$LOG_FILE"
}

# Clean up temporary files
cleanup_temp_files() {
    log "🧹 Cleaning up temporary files..."
    
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log "✅ Removed temporary directory: $TEMP_DIR"
    fi
    
    # Clean up any leftover lock files
    find /opt/trading-agent -name "*.lock" -type f -delete 2>/dev/null || true
    log "✅ Removed lock files"
}

# Clean up PID file
cleanup_pid_file() {
    if [ -f "$PID_FILE" ]; then
        rm -f "$PID_FILE"
        log "✅ Removed PID file: $PID_FILE"
    fi
}

# Archive current logs
archive_logs() {
    local log_dir="/var/log/trading-agent"
    local archive_dir="$log_dir/archive"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    
    mkdir -p "$archive_dir"
    
    # Archive current session logs
    if [ -f "$log_dir/app.log" ]; then
        cp "$log_dir/app.log" "$archive_dir/app_${timestamp}.log"
        log "✅ Archived application log"
    fi
}

# Send shutdown notification
send_shutdown_notification() {
    log "📢 Sending shutdown notification..."
    
    # This would integrate with the notification system
    # For now, just log the event
    log "🛑 Trading agent shutdown completed at $(date)"
}

# Main cleanup function
main() {
    log "Starting post-stop cleanup for trading agent..."
    
    cleanup_temp_files
    cleanup_pid_file
    archive_logs
    send_shutdown_notification
    
    log "✅ Post-stop cleanup completed successfully"
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"