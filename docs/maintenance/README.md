# Maintenance Guide

## Overview

This comprehensive maintenance guide ensures optimal performance, security, and reliability of the AI Crypto Trading Agent through systematic maintenance procedures, monitoring, and preventive measures.

## Maintenance Philosophy

The AI Crypto Trading Agent requires proactive maintenance to:
- **Preserve Capital**: Prevent system failures that could impact trading
- **Maintain Performance**: Ensure optimal execution speed and accuracy
- **Ensure Security**: Keep security measures current and effective
- **Maximize Uptime**: Achieve 99.9% availability target
- **Optimize Profits**: Maintain peak system performance for trading

## Maintenance Schedule

### Real-Time Monitoring (Continuous)

**Automated Monitoring Systems:**
```bash
# System health monitoring (every 5 minutes)
*/5 * * * * /usr/local/bin/system-monitor.sh

# Trading performance monitoring (every minute)
* * * * * /usr/local/bin/trading-monitor.sh

# Security monitoring (continuous)
# Handled by security services

# Network connectivity monitoring (every 2 minutes)
*/2 * * * * /usr/local/bin/network-monitor.sh
```

**Key Metrics Monitored:**
- CPU usage and temperature
- Memory utilization
- Disk space and I/O performance
- Network connectivity and latency
- Trading system performance
- Security events and threats
- API response times
- Database performance

### Daily Maintenance (Automated)

**Daily Tasks (02:00 AM):**
```bash
#!/bin/bash
# /usr/local/bin/daily-maintenance.sh

set -euo pipefail

LOG_FILE="/var/log/maintenance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

log "🔧 Starting daily maintenance..."

# 1. System Health Check
log "📊 Performing system health check..."
/usr/local/bin/health-check.sh >> "$LOG_FILE" 2>&1

# 2. Log Rotation and Cleanup
log "📋 Rotating logs..."
pm2 flush
find /opt/ai-crypto-trading/logs -name "*.log" -mtime +7 -delete
find /tmp -name "ai-crypto-*" -mtime +1 -delete

# 3. Database Maintenance
log "💾 Database maintenance..."
sqlite3 /opt/ai-crypto-trading/data/trading.db "PRAGMA optimize;"

# 4. Performance Metrics Collection
log "⚡ Collecting performance metrics..."
/usr/local/bin/collect-metrics.sh

# 5. Security Status Check
log "🔒 Security status check..."
fail2ban-client status | tee -a "$LOG_FILE"
ufw status | tee -a "$LOG_FILE"

# 6. Backup Configuration
log "💾 Creating daily backup..."
/usr/local/bin/create-backup.sh daily

# 7. System Updates Check
log "📦 Checking for system updates..."
apt list --upgradable 2>/dev/null | tee -a "$LOG_FILE"

# 8. Trading Performance Summary
log "💰 Trading performance summary..."
/usr/local/bin/trading-summary.sh daily

log "✅ Daily maintenance completed successfully"
```

### Weekly Maintenance (Sundays, 01:00 AM)

**Weekly Tasks:**
```bash
#!/bin/bash
# /usr/local/bin/weekly-maintenance.sh

set -euo pipefail

LOG_FILE="/var/log/maintenance.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

log "🔧 Starting weekly maintenance..."

# 1. Full System Backup
log "💾 Creating full system backup..."
/usr/local/bin/create-backup.sh full

# 2. Database Optimization
log "💾 Database optimization..."
cd /opt/ai-crypto-trading
sqlite3 data/trading.db "VACUUM;"
sqlite3 data/trading.db "ANALYZE;"
sqlite3 data/trading.db "PRAGMA integrity_check;" | tee -a "$LOG_FILE"

# 3. System Package Updates
log "📦 Updating system packages..."
apt update && apt upgrade -y | tee -a "$LOG_FILE"

# 4. Security Scan
log "🔒 Performing security scan..."
/usr/local/bin/security-scan.sh

# 5. Performance Analysis
log "⚡ Performance analysis..."
/usr/local/bin/performance-analysis.sh weekly

# 6. Log Analysis
log "📊 Log analysis..."
/usr/local/bin/analyze-logs.sh weekly

# 7. Cleanup Old Files
log "🧹 Cleaning up old files..."
find /opt/ai-crypto-trading/backups -name "*.tar.gz" -mtime +30 -delete
find /var/log -name "*.log.*" -mtime +30 -delete

# 8. Trading Strategy Review
log "📈 Trading strategy review..."
/usr/local/bin/strategy-review.sh

# 9. System Optimization
log "🚀 System optimization..."
/usr/local/bin/optimize-system.sh

log "✅ Weekly maintenance completed successfully"
```

### Monthly Maintenance (First Sunday, Manual)

**Monthly Tasks Checklist:**
- [ ] Hardware inspection and cleaning
- [ ] Security configuration review
- [ ] Performance benchmarking
- [ ] Trading strategy optimization
- [ ] Disaster recovery testing
- [ ] Documentation updates
- [ ] Capacity planning review
- [ ] Vendor security updates

## Maintenance Scripts

### System Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
TEMP_THRESHOLD=75

# Counters
CHECKS_PASSED=0
CHECKS_WARNING=0
CHECKS_FAILED=0

pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((CHECKS_WARNING++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

echo -e "${BLUE}🔍 AI Crypto Trading Agent - System Health Check${NC}"
echo "=================================================="

# System Resources
info "Checking system resources..."

# CPU Usage
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
if (( $(echo "$CPU_USAGE < $CPU_THRESHOLD" | bc -l) )); then
    pass "CPU Usage: ${CPU_USAGE}%"
else
    warn "CPU Usage: ${CPU_USAGE}% (threshold: ${CPU_THRESHOLD}%)"
fi

# CPU Temperature
if command -v sensors &> /dev/null; then
    CPU_TEMP=$(sensors | grep "Core 0" | awk '{print $3}' | sed 's/+//;s/°C//' | head -1)
    if [[ -n "$CPU_TEMP" ]]; then
        if (( $(echo "$CPU_TEMP < $TEMP_THRESHOLD" | bc -l) )); then
            pass "CPU Temperature: ${CPU_TEMP}°C"
        else
            warn "CPU Temperature: ${CPU_TEMP}°C (threshold: ${TEMP_THRESHOLD}°C)"
        fi
    fi
fi

# Memory Usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
if (( $(echo "$MEM_USAGE < $MEMORY_THRESHOLD" | bc -l) )); then
    pass "Memory Usage: ${MEM_USAGE}%"
else
    warn "Memory Usage: ${MEM_USAGE}% (threshold: ${MEMORY_THRESHOLD}%)"
fi

# Disk Usage
DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')
if [[ $DISK_USAGE -lt $DISK_THRESHOLD ]]; then
    pass "Disk Usage: ${DISK_USAGE}%"
else
    warn "Disk Usage: ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)"
fi

# Load Average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_CORES=$(nproc)
LOAD_PER_CORE=$(echo "scale=2; $LOAD_AVG / $CPU_CORES" | bc -l)

if (( $(echo "$LOAD_PER_CORE < 0.8" | bc -l) )); then
    pass "Load Average: $LOAD_AVG (${LOAD_PER_CORE} per core)"
else
    warn "Load Average: $LOAD_AVG (${LOAD_PER_CORE} per core)"
fi

# Services Status
info "Checking services..."

# PM2 Services
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null || echo "")
    if [[ -z "$PM2_STATUS" ]]; then
        pass "PM2 Services: All online"
    else
        fail "PM2 Services: Issues detected - $PM2_STATUS"
    fi
else
    warn "PM2 not installed"
fi

# SSH Tunnel
if pgrep -f "ssh.*168.138.104.117" > /dev/null; then
    pass "SSH Tunnel: Active"
else
    fail "SSH Tunnel: Not active"
fi

# Network Connectivity
info "Checking network connectivity..."

# Internet Connectivity
if ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
    pass "Internet: Connected"
else
    fail "Internet: Disconnected"
fi

# Oracle Free Tier
if ping -c 1 -W 5 168.138.104.117 &> /dev/null; then
    pass "Oracle Free Tier: Reachable"
else
    fail "Oracle Free Tier: Unreachable"
fi

# Gate.io API
if curl -s -f --max-time 10 https://api.gateio.ws/api/v4/spot/currencies > /dev/null; then
    pass "Gate.io API: Accessible"
else
    fail "Gate.io API: Inaccessible"
fi

# Application Health
info "Checking application health..."

# API Endpoint
if curl -s -f --max-time 10 http://localhost:3001/api/v1/health > /dev/null; then
    pass "Trading API: Healthy"
else
    fail "Trading API: Unhealthy"
fi

# Dashboard
if curl -s -f --max-time 10 http://localhost:3002 > /dev/null; then
    pass "Dashboard: Accessible"
else
    warn "Dashboard: Inaccessible"
fi

# Database
if sqlite3 /opt/ai-crypto-trading/data/trading.db "SELECT 1;" &> /dev/null; then
    pass "Database: Accessible"
    DB_SIZE=$(du -h /opt/ai-crypto-trading/data/trading.db | cut -f1)
    info "Database Size: $DB_SIZE"
else
    fail "Database: Inaccessible"
fi

# Security Status
info "Checking security status..."

# Firewall
if ufw status | grep -q "Status: active"; then
    pass "UFW Firewall: Active"
else
    warn "UFW Firewall: Inactive"
fi

# Fail2Ban
if systemctl is-active --quiet fail2ban; then
    pass "Fail2Ban: Active"
    BANNED_IPS=$(fail2ban-client status sshd 2>/dev/null | grep "Banned IP list" | wc -w)
    if [[ $BANNED_IPS -gt 3 ]]; then
        info "Banned IPs: $((BANNED_IPS - 4))"
    fi
else
    warn "Fail2Ban: Inactive"
fi

# SSL Certificates (if applicable)
if [[ -f "/etc/ssl/certs/trading-agent.crt" ]]; then
    CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/ssl/certs/trading-agent.crt | cut -d= -f2)
    DAYS_TO_EXPIRY=$(( ($(date -d "$CERT_EXPIRY" +%s) - $(date +%s)) / 86400 ))
    if [[ $DAYS_TO_EXPIRY -gt 30 ]]; then
        pass "SSL Certificate: Valid ($DAYS_TO_EXPIRY days remaining)"
    else
        warn "SSL Certificate: Expires soon ($DAYS_TO_EXPIRY days remaining)"
    fi
fi

# Summary
echo
echo "=============================================="
echo "              HEALTH CHECK SUMMARY"
echo "=============================================="
echo -e "${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
echo -e "${RED}Checks Failed: $CHECKS_FAILED${NC}"
echo

if [[ $CHECKS_FAILED -eq 0 ]]; then
    if [[ $CHECKS_WARNING -eq 0 ]]; then
        echo -e "${GREEN}🎉 System is healthy and operating optimally!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  System is operational but has warnings${NC}"
        exit 1
    fi
else
    echo -e "${RED}🚨 System has critical issues that need attention${NC}"
    exit 2
fi
```

### Performance Analysis Script

```bash
#!/bin/bash
# /usr/local/bin/performance-analysis.sh

set -euo pipefail

PERIOD="${1:-daily}"
LOG_FILE="/var/log/performance-analysis.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

log() {
    echo "[$DATE] $1" | tee -a "$LOG_FILE"
}

log "📊 Starting performance analysis ($PERIOD)..."

# System Performance Metrics
log "💻 System Performance:"

# CPU Performance
CPU_USAGE_AVG=$(sar -u 1 60 | grep "Average" | awk '{print $3}')
log "Average CPU Usage: ${CPU_USAGE_AVG}%"

# Memory Performance
MEM_USAGE_AVG=$(sar -r 1 60 | grep "Average" | awk '{printf("%.1f", $4/$3 * 100.0)}')
log "Average Memory Usage: ${MEM_USAGE_AVG}%"

# Disk I/O Performance
if command -v iostat &> /dev/null; then
    DISK_UTIL=$(iostat -x 1 60 | grep "avg-cpu" -A 20 | tail -1 | awk '{print $10}')
    log "Average Disk Utilization: ${DISK_UTIL}%"
fi

# Network Performance
if command -v vnstat &> /dev/null; then
    NETWORK_USAGE=$(vnstat -i eth0 --json | jq -r '.interfaces[0].traffic.day[0].tx + .interfaces[0].traffic.day[0].rx')
    log "Network Usage Today: ${NETWORK_USAGE} bytes"
fi

# Application Performance
log "🚀 Application Performance:"

# API Response Times
API_RESPONSE_TIME=$(grep "API_RESPONSE_TIME" /opt/ai-crypto-trading/logs/*.log | \
    tail -1000 | awk '{print $NF}' | \
    awk '{sum+=$1; count++} END {if(count>0) printf "%.2f", sum/count}')
log "Average API Response Time: ${API_RESPONSE_TIME}ms"

# Trading Performance
TRADES_COUNT=$(grep "TRADE_EXECUTED" /opt/ai-crypto-trading/logs/*.log | \
    grep "$(date +%Y-%m-%d)" | wc -l)
log "Trades Executed Today: $TRADES_COUNT"

# Database Performance
DB_SIZE=$(du -h /opt/ai-crypto-trading/data/trading.db | cut -f1)
log "Database Size: $DB_SIZE"

# Query Performance Test
QUERY_TIME=$(time sqlite3 /opt/ai-crypto-trading/data/trading.db "SELECT COUNT(*) FROM trades;" 2>&1 | \
    grep "real" | awk '{print $2}')
log "Database Query Time: $QUERY_TIME"

# Memory Usage by Process
log "📊 Top Memory Consumers:"
ps aux --sort=-%mem | head -6 | tail -5 | while read line; do
    log "  $line"
done

# Recommendations
log "💡 Performance Recommendations:"

if (( $(echo "$CPU_USAGE_AVG > 70" | bc -l) )); then
    log "  - Consider CPU optimization or scaling"
fi

if (( $(echo "$MEM_USAGE_AVG > 80" | bc -l) )); then
    log "  - Consider memory optimization or upgrade"
fi

if [[ $(echo "$DB_SIZE" | sed 's/[^0-9]//g') -gt 1000 ]]; then
    log "  - Consider database archiving or optimization"
fi

log "✅ Performance analysis completed"
```

### Backup Management Script

```bash
#!/bin/bash
# /usr/local/bin/create-backup.sh

set -euo pipefail

BACKUP_TYPE="${1:-daily}"
BACKUP_DIR="/opt/ai-crypto-trading/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "💾 Starting $BACKUP_TYPE backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

case "$BACKUP_TYPE" in
    "daily")
        # Daily backup - configuration and critical data only
        BACKUP_FILE="$BACKUP_DIR/daily-backup-$DATE.tar.gz"
        
        log "Creating daily backup: $BACKUP_FILE"
        
        tar -czf "$BACKUP_FILE" \
            --exclude=node_modules \
            --exclude=logs \
            --exclude=backups \
            -C /opt/ai-crypto-trading \
            .env \
            config/ \
            data/trading.db \
            ecosystem.config.js \
            package.json \
            2>/dev/null || true
        
        # Keep only last 7 daily backups
        find "$BACKUP_DIR" -name "daily-backup-*.tar.gz" -mtime +7 -delete
        ;;
        
    "full")
        # Full backup - entire application
        BACKUP_FILE="$BACKUP_DIR/full-backup-$DATE.tar.gz"
        
        log "Creating full backup: $BACKUP_FILE"
        
        tar -czf "$BACKUP_FILE" \
            --exclude=node_modules \
            --exclude=logs \
            --exclude=backups \
            -C /opt/ai-crypto-trading \
            . \
            2>/dev/null || true
        
        # Keep only last 4 full backups
        find "$BACKUP_DIR" -name "full-backup-*.tar.gz" -mtime +28 -delete
        ;;
        
    "system")
        # System backup - system configuration
        BACKUP_FILE="$BACKUP_DIR/system-backup-$DATE.tar.gz"
        
        log "Creating system backup: $BACKUP_FILE"
        
        tar -czf "$BACKUP_FILE" \
            /etc/ssh/sshd_config \
            /etc/ufw/ \
            /etc/fail2ban/ \
            /etc/systemd/system/ai-crypto-trading.service \
            /etc/crontab \
            /var/spool/cron/crontabs/ \
            ~/.ssh/ \
            2>/dev/null || true
        
        # Keep only last 12 system backups
        find "$BACKUP_DIR" -name "system-backup-*.tar.gz" -mtime +84 -delete
        ;;
esac

# Verify backup
if [[ -f "$BACKUP_FILE" ]]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "✅ Backup created successfully: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Test backup integrity
    if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
        log "✅ Backup integrity verified"
    else
        log "❌ Backup integrity check failed"
        exit 1
    fi
else
    log "❌ Backup creation failed"
    exit 1
fi

# Cleanup old backups based on retention policy
log "🧹 Cleaning up old backups..."
DELETED_COUNT=$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime +90 -delete -print | wc -l)
if [[ $DELETED_COUNT -gt 0 ]]; then
    log "Deleted $DELETED_COUNT old backup files"
fi

log "✅ Backup process completed"
```

## Monitoring and Alerting

### System Monitoring Dashboard

Create a comprehensive monitoring dashboard that displays:

1. **System Health Indicators**
   - CPU usage and temperature
   - Memory utilization
   - Disk space and I/O
   - Network connectivity

2. **Trading Performance Metrics**
   - Active trades and positions
   - Daily/weekly P&L
   - Strategy performance
   - Risk metrics

3. **Security Status**
   - Failed login attempts
   - Firewall status
   - SSL certificate expiry
   - Security scan results

4. **Application Metrics**
   - API response times
   - Database performance
   - Error rates
   - Uptime statistics

### Alert Configuration

```bash
# /usr/local/bin/send-alert.sh
#!/bin/bash

ALERT_TYPE="$1"
ALERT_MESSAGE="$2"
SEVERITY="${3:-MEDIUM}"

# Email notification
if [[ -n "${EMAIL_ALERTS:-}" ]]; then
    echo "$ALERT_MESSAGE" | mail -s "[$SEVERITY] AI Trading Agent Alert: $ALERT_TYPE" "$EMAIL_ALERTS"
fi

# Telegram notification
if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]] && [[ -n "${TELEGRAM_CHAT_ID:-}" ]]; then
    curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d chat_id="$TELEGRAM_CHAT_ID" \
        -d text="🚨 [$SEVERITY] $ALERT_TYPE: $ALERT_MESSAGE"
fi

# Log alert
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$SEVERITY] $ALERT_TYPE: $ALERT_MESSAGE" >> /var/log/alerts.log
```

## Disaster Recovery

### Recovery Procedures

1. **System Failure Recovery**
   ```bash
   # Stop all services
   pm2 stop all
   
   # Restore from latest backup
   LATEST_BACKUP=$(ls -t /opt/ai-crypto-trading/backups/full-backup-*.tar.gz | head -1)
   tar -xzf "$LATEST_BACKUP" -C /opt/ai-crypto-trading/
   
   # Restart services
   pm2 start ecosystem.config.js
   ```

2. **Database Corruption Recovery**
   ```bash
   # Stop application
   pm2 stop all
   
   # Backup corrupted database
   cp data/trading.db data/trading.db.corrupted
   
   # Restore from backup
   LATEST_DB_BACKUP=$(ls -t backups/*backup*.tar.gz | head -1)
   tar -xzf "$LATEST_DB_BACKUP" data/trading.db
   
   # Restart application
   pm2 start all
   ```

3. **Network Connectivity Recovery**
   ```bash
   # Reset network interfaces
   sudo systemctl restart networking
   
   # Restart SSH tunnel
   pm2 restart ssh-tunnel
   
   # Verify connectivity
   npm run test:connectivity
   ```

## Best Practices

### Maintenance Best Practices

1. **Always backup before changes**
2. **Test in staging environment first**
3. **Monitor system during maintenance**
4. **Document all changes**
5. **Verify system health after maintenance**
6. **Keep maintenance windows short**
7. **Have rollback procedures ready**

### Security Maintenance

1. **Regular security updates**
2. **Monitor security logs daily**
3. **Review access logs weekly**
4. **Update SSL certificates before expiry**
5. **Rotate API keys quarterly**
6. **Audit user access monthly**

### Performance Maintenance

1. **Monitor resource usage trends**
2. **Optimize database queries regularly**
3. **Clean up old logs and data**
4. **Update dependencies regularly**
5. **Benchmark performance monthly**
6. **Capacity planning quarterly**

This comprehensive maintenance guide ensures the AI Crypto Trading Agent operates at peak performance with maximum uptime and security.