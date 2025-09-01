#!/bin/bash

# AI Crypto Trading Agent - Troubleshooting Script
# Automated diagnostics and issue resolution

set -euo pipefail

ISSUE_TYPE="${1:-all}"
LOG_FILE="/tmp/troubleshoot-$(date +%Y%m%d_%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
ISSUES_FOUND=0
ISSUES_FIXED=0

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"; ((ISSUES_FOUND++)); }
fixed() { echo -e "${GREEN}🔧 FIXED: $1${NC}" | tee -a "$LOG_FILE"; ((ISSUES_FIXED++)); }

show_banner() {
    echo -e "${BLUE}🔧 AI CRYPTO TRADING AGENT TROUBLESHOOTER 🔍${NC}"
    echo "=================================================="
}

# Check startup issues
troubleshoot_startup() {
    log "🚀 Diagnosing startup issues..."
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | sed 's/v//')
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)
        if [[ $MAJOR_VERSION -ge 18 ]]; then
            success "Node.js version: $NODE_VERSION"
        else
            error "Node.js version too old: $NODE_VERSION (need 18+)"
        fi
    else
        error "Node.js not installed"
    fi
    
    # Check dependencies
    if [[ -d "node_modules" ]]; then
        success "Dependencies installed"
    else
        error "Dependencies not installed"
        log "Installing dependencies..."
        if npm install; then
            fixed "Dependencies installed"
        fi
    fi
    
    # Check PM2
    if command -v pm2 &> /dev/null; then
        PM2_STATUS=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name=="ai-crypto-trading") | .pm2_env.status' 2>/dev/null || echo "not_found")
        if [[ "$PM2_STATUS" == "online" ]]; then
            success "PM2 service running"
        else
            error "PM2 service not running"
            if pm2 start ecosystem.config.js; then
                fixed "PM2 service started"
            fi
        fi
    else
        error "PM2 not installed"
    fi
}

# Check network issues
troubleshoot_network() {
    log "🌐 Diagnosing network issues..."
    
    # Internet connectivity
    if ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
        success "Internet connectivity OK"
    else
        error "No internet connectivity"
    fi
    
    # Oracle connectivity
    ORACLE_HOST="${ORACLE_HOST:-168.138.104.117}"
    if ping -c 1 -W 5 "$ORACLE_HOST" &> /dev/null; then
        success "Oracle Free Tier reachable"
    else
        error "Oracle Free Tier unreachable"
    fi
    
    # SSH tunnel
    if pgrep -f "ssh.*$ORACLE_HOST" > /dev/null; then
        success "SSH tunnel active"
    else
        error "SSH tunnel not active"
    fi
    
    # Gate.io API
    if curl -s -f --max-time 10 https://api.gateio.ws/api/v4/spot/currencies > /dev/null; then
        success "Gate.io API accessible"
    else
        error "Gate.io API inaccessible"
    fi
}

# Check database issues
troubleshoot_database() {
    log "💾 Diagnosing database issues..."
    
    DB_PATH="data/trading.db"
    
    if [[ -f "$DB_PATH" ]]; then
        success "Database file exists"
        
        if sqlite3 "$DB_PATH" "SELECT 1;" &> /dev/null; then
            success "Database accessible"
            
            # Check integrity
            INTEGRITY=$(sqlite3 "$DB_PATH" "PRAGMA integrity_check;" 2>/dev/null || echo "error")
            if [[ "$INTEGRITY" == "ok" ]]; then
                success "Database integrity OK"
            else
                error "Database integrity check failed"
            fi
        else
            error "Database not accessible"
        fi
    else
        error "Database file not found"
        if [[ ! -d "data" ]]; then
            mkdir -p data
            fixed "Data directory created"
        fi
    fi
}

# Check performance issues
troubleshoot_performance() {
    log "⚡ Diagnosing performance issues..."
    
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    MEM_USAGE=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    DISK_USAGE=$(df -h / | awk 'NR==2{printf "%s", $5}' | sed 's/%//')
    
    log "Resources: CPU: ${CPU_USAGE}%, Memory: ${MEM_USAGE}%, Disk: ${DISK_USAGE}%"
    
    if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
        error "High CPU usage: ${CPU_USAGE}%"
    else
        success "CPU usage normal"
    fi
    
    if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
        error "High memory usage: ${MEM_USAGE}%"
    else
        success "Memory usage normal"
    fi
    
    if [[ $DISK_USAGE -gt 90 ]]; then
        error "High disk usage: ${DISK_USAGE}%"
        # Cleanup
        find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null || true
        pm2 flush 2>/dev/null || true
        fixed "Disk cleanup completed"
    else
        success "Disk usage normal"
    fi
}

# Main function
main() {
    show_banner
    log "Starting troubleshooting: $ISSUE_TYPE"
    
    case "$ISSUE_TYPE" in
        "startup") troubleshoot_startup ;;
        "network") troubleshoot_network ;;
        "database") troubleshoot_database ;;
        "performance") troubleshoot_performance ;;
        "all"|*)
            troubleshoot_startup
            troubleshoot_network
            troubleshoot_database
            troubleshoot_performance
            ;;
    esac
    
    echo
    echo "=============================================="
    echo "         TROUBLESHOOTING SUMMARY"
    echo "=============================================="
    echo -e "${BLUE}Issues Found: $ISSUES_FOUND${NC}"
    echo -e "${GREEN}Issues Fixed: $ISSUES_FIXED${NC}"
    echo -e "${BLUE}Log file: $LOG_FILE${NC}"
    
    if [[ $ISSUES_FOUND -eq 0 ]]; then
        echo -e "${GREEN}🎉 No issues detected!${NC}"
        exit 0
    elif [[ $ISSUES_FIXED -eq $ISSUES_FOUND ]]; then
        echo -e "${GREEN}✅ All issues fixed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Some issues need manual attention${NC}"
        exit 1
    fi
}

main "$@"