#!/bin/bash

# Alert System Script for Intel NUC Trading System
# Sends alerts via Telegram and Email

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="/opt/trading-agent/.env"
LOG_FILE="/var/log/trading-agent/alerts.log"

# Load environment variables if config exists
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
fi

# Default values if not set in environment
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
EMAIL_FROM="${EMAIL_FROM:-}"
EMAIL_TO="${EMAIL_TO:-}"
EMAIL_PASSWORD="${EMAIL_PASSWORD:-}"
EMAIL_HOST="${EMAIL_HOST:-smtp.gmail.com}"
EMAIL_PORT="${EMAIL_PORT:-587}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging function
log_alert() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Send Telegram notification
send_telegram() {
    local message="$1"
    local priority="${2:-normal}"
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
        log_alert "Telegram not configured - skipping notification"
        return 1
    fi
    
    # Add emoji based on priority
    case "$priority" in
        "critical")
            message="🚨 CRITICAL ALERT 🚨\n$message"
            ;;
        "warning")
            message="⚠️ WARNING ⚠️\n$message"
            ;;
        "info")
            message="ℹ️ INFO ℹ️\n$message"
            ;;
        *)
            message="📢 ALERT 📢\n$message"
            ;;
    esac
    
    # Add system info
    message="$message\n\n🖥️ System: $(hostname)\n⏰ Time: $(date)"
    
    # Send via Telegram API
    local response=$(curl -s -X POST \
        "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_CHAT_ID" \
        -d "text=$message" \
        -d "parse_mode=HTML" \
        --connect-timeout 10 \
        --max-time 30 2>/dev/null || echo "")
    
    if echo "$response" | grep -q '"ok":true'; then
        log_alert "Telegram notification sent successfully"
        return 0
    else
        log_alert "Failed to send Telegram notification: $response"
        return 1
    fi
}

# Send email notification
send_email() {
    local subject="$1"
    local message="$2"
    local priority="${3:-normal}"
    
    if [ -z "$EMAIL_FROM" ] || [ -z "$EMAIL_TO" ] || [ -z "$EMAIL_PASSWORD" ]; then
        log_alert "Email not configured - skipping notification"
        return 1
    fi
    
    # Create HTML email content
    local html_message=$(cat << EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; }
        .critical { border-left: 5px solid #ff4444; background-color: #ffe6e6; }
        .warning { border-left: 5px solid #ffaa00; background-color: #fff3e0; }
        .info { border-left: 5px solid #0088cc; background-color: #e6f3ff; }
        .content { margin: 15px 0; padding: 15px; border-radius: 5px; }
        .footer { font-size: 12px; color: #666; margin-top: 20px; }
        pre { background-color: #f5f5f5; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h2>🤖 Intel NUC Trading System Alert</h2>
        <p><strong>System:</strong> $(hostname)</p>
        <p><strong>Time:</strong> $(date)</p>
        <p><strong>Priority:</strong> $(echo "$priority" | tr '[:lower:]' '[:upper:]')</p>
    </div>
    
    <div class="content $priority">
        <h3>Alert Details</h3>
        <pre>$message</pre>
    </div>
    
    <div class="footer">
        <p>This alert was generated automatically by the Intel NUC Trading System monitoring.</p>
        <p>Please check the system status and take appropriate action if necessary.</p>
    </div>
</body>
</html>
EOF
)
    
    # Create temporary file for email content
    local temp_file=$(mktemp)
    cat > "$temp_file" << EOF
To: $EMAIL_TO
From: $EMAIL_FROM
Subject: [Trading Alert] $subject
Content-Type: text/html; charset=UTF-8

$html_message
EOF
    
    # Send email using curl and SMTP
    local smtp_response=$(curl -s --url "smtps://$EMAIL_HOST:$EMAIL_PORT" \
        --ssl-reqd \
        --mail-from "$EMAIL_FROM" \
        --mail-rcpt "$EMAIL_TO" \
        --upload-file "$temp_file" \
        --user "$EMAIL_FROM:$EMAIL_PASSWORD" \
        --connect-timeout 10 \
        --max-time 30 2>&1 || echo "FAILED")
    
    # Clean up
    rm -f "$temp_file"
    
    if [[ "$smtp_response" != *"FAILED"* ]]; then
        log_alert "Email notification sent successfully"
        return 0
    else
        log_alert "Failed to send email notification: $smtp_response"
        return 1
    fi
}

# Send alert via all configured channels
send_alert() {
    local subject="$1"
    local message="$2"
    local priority="${3:-normal}"
    
    log_alert "Sending $priority alert: $subject"
    
    local telegram_success=false
    local email_success=false
    
    # Try Telegram
    if send_telegram "$subject\n\n$message" "$priority"; then
        telegram_success=true
    fi
    
    # Try Email
    if send_email "$subject" "$message" "$priority"; then
        email_success=true
    fi
    
    # Log results
    if $telegram_success || $email_success; then
        log_alert "Alert sent successfully via at least one channel"
        return 0
    else
        log_alert "Failed to send alert via any channel"
        return 1
    fi
}

# Test notification system
test_notifications() {
    echo -e "${YELLOW}Testing notification system...${NC}"
    
    local test_subject="Test Alert from Intel NUC Trading System"
    local test_message="This is a test notification to verify the alert system is working correctly.

System Information:
- Hostname: $(hostname)
- OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")
- Uptime: $(uptime -p)
- Time: $(date)

If you receive this message, the notification system is functioning properly! 🎉"
    
    if send_alert "$test_subject" "$test_message" "info"; then
        echo -e "${GREEN}✅ Test notification sent successfully${NC}"
    else
        echo -e "${RED}❌ Test notification failed${NC}"
        return 1
    fi
}

# Main function
main() {
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-}" in
        "test")
            test_notifications
            ;;
        "send")
            if [ $# -lt 3 ]; then
                echo "Usage: $0 send <subject> <message> [priority]"
                echo "Priority: critical, warning, info, normal (default)"
                exit 1
            fi
            send_alert "$2" "$3" "${4:-normal}"
            ;;
        *)
            # Read from stdin if no arguments
            if [ -t 0 ]; then
                echo "Usage: $0 [test|send]"
                echo "  test                           - Send test notification"
                echo "  send <subject> <message> [pri] - Send alert with subject and message"
                echo "  (no args)                      - Read message from stdin"
                exit 1
            else
                # Read message from stdin
                local stdin_message=$(cat)
                send_alert "System Alert" "$stdin_message" "warning"
            fi
            ;;
    esac
}

# Run main function
main "$@"