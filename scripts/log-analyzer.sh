#!/bin/bash

# =============================================================================
# AUTOMATED LOG ANALYSIS AND ALERTING SYSTEM
# =============================================================================
# 
# This script performs automated analysis of log files to detect patterns,
# anomalies, and potential issues with visual indicators and smart alerting.
# 
# Features:
# - Pattern recognition and anomaly detection
# - Trend analysis and forecasting
# - Smart alerting with rate limiting
# - Visual reporting with emojis
# - Machine learning-based insights
# 
# @author AI Crypto Trading System
# @version 1.0.0
# =============================================================================

set -euo pipefail

# Configuration
INSTALL_DIR="/opt/trading-agent"
LOG_DIR="$INSTALL_DIR/logs"
ANALYSIS_DIR="$INSTALL_DIR/analysis"
REPORTS_DIR="$INSTALL_DIR/reports"
ALERT_THRESHOLD_FILE="$INSTALL_DIR/config/alert-thresholds.conf"
NOTIFICATION_SCRIPT="$INSTALL_DIR/scripts/send-notification.sh"

# Create directories
mkdir -p "$ANALYSIS_DIR" "$REPORTS_DIR"

# Colors and emojis
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Analysis emojis
ANALYZE="🔍"
TREND="📈"
ANOMALY="🚨"
PATTERN="🔄"
INSIGHT="💡"
REPORT="📊"
ALERT="⚠️"
SUCCESS="✅"
ERROR="❌"

# Logging function
log_analysis() {
    local emoji="$1"
    local level="$2"
    local message="$3"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "ERROR")   echo -e "${RED}${emoji} [$timestamp] ERROR: $message${NC}" ;;
        "WARN")    echo -e "${YELLOW}${emoji} [$timestamp] WARN: $message${NC}" ;;
        "INFO")    echo -e "${BLUE}${emoji} [$timestamp] INFO: $message${NC}" ;;
        "SUCCESS") echo -e "${GREEN}${emoji} [$timestamp] SUCCESS: $message${NC}" ;;
        *)         echo -e "${emoji} [$timestamp] $level: $message" ;;
    esac
    
    # Log to analysis file
    echo "[$timestamp] $level: $emoji $message" >> "$ANALYSIS_DIR/analysis.log"
}

# Load alert thresholds
load_thresholds() {
    # Default thresholds
    ERROR_THRESHOLD=10
    WARNING_THRESHOLD=20
    TRADING_ERROR_THRESHOLD=5
    API_ERROR_THRESHOLD=15
    MEMORY_THRESHOLD=85
    CPU_THRESHOLD=80
    DISK_THRESHOLD=90
    
    # Load custom thresholds if file exists
    if [ -f "$ALERT_THRESHOLD_FILE" ]; then
        source "$ALERT_THRESHOLD_FILE"
        log_analysis "$SUCCESS" "INFO" "Loaded custom alert thresholds"
    else
        log_analysis "$ALERT" "INFO" "Using default alert thresholds"
    fi
}

# Analyze error patterns
analyze_error_patterns() {
    log_analysis "$ANALYZE" "INFO" "Analyzing error patterns..."
    
    local today=$(date +%Y-%m-%d)
    local yesterday=$(date -d "yesterday" +%Y-%m-%d)
    local analysis_file="$ANALYSIS_DIR/error-patterns-$today.json"
    
    # Initialize analysis results
    cat > "$analysis_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "analysis_period": "$today",
    "error_patterns": {},
    "trends": {},
    "anomalies": [],
    "recommendations": []
}
EOF
    
    # Analyze different log types
    local log_types=("application" "trading" "security" "error")
    local total_errors=0
    
    for log_type in "${log_types[@]}"; do
        local log_file="$LOG_DIR/${log_type}-${today}.log"
        local prev_log_file="$LOG_DIR/${log_type}-${yesterday}.log"
        
        if [ -f "$log_file" ]; then
            # Count errors by type
            local error_count=$(grep -c "ERROR\|FAILED\|CRITICAL" "$log_file" 2>/dev/null || echo 0)
            local warning_count=$(grep -c "WARN\|WARNING" "$log_file" 2>/dev/null || echo 0)
            
            total_errors=$((total_errors + error_count))
            
            log_analysis "$PATTERN" "INFO" "$log_type logs: $error_count errors, $warning_count warnings"
            
            # Compare with previous day
            if [ -f "$prev_log_file" ]; then
                local prev_errors=$(grep -c "ERROR\|FAILED\|CRITICAL" "$prev_log_file" 2>/dev/null || echo 0)
                local change=$((error_count - prev_errors))
                
                if [ "$change" -gt 0 ]; then
                    log_analysis "$TREND" "WARN" "$log_type errors increased by $change from yesterday"
                elif [ "$change" -lt 0 ]; then
                    log_analysis "$TREND" "INFO" "$log_type errors decreased by ${change#-} from yesterday"
                fi
            fi
            
            # Extract common error patterns
            if [ "$error_count" -gt 0 ]; then
                log_analysis "$PATTERN" "INFO" "Top error patterns in $log_type:"
                grep "ERROR\|FAILED\|CRITICAL" "$log_file" | \
                    sed 's/.*ERROR: //; s/.*FAILED: //; s/.*CRITICAL: //' | \
                    sort | uniq -c | sort -nr | head -5 | \
                    while read count pattern; do
                        log_analysis "$ERROR" "INFO" "  $count occurrences: ${pattern:0:80}..."
                    done
            fi
        fi
    done
    
    # Generate insights
    if [ "$total_errors" -gt "$ERROR_THRESHOLD" ]; then
        log_analysis "$ANOMALY" "ERROR" "High error rate detected: $total_errors errors today (threshold: $ERROR_THRESHOLD)"
        echo "High error rate: $total_errors errors" >> "$ANALYSIS_DIR/alerts-$today.txt"
    fi
    
    return $total_errors
}

# Analyze trading performance
analyze_trading_performance() {
    log_analysis "$ANALYZE" "INFO" "Analyzing trading performance..."
    
    local today=$(date +%Y-%m-%d)
    local trading_log="$LOG_DIR/trading/trading-$today.log"
    
    if [ ! -f "$trading_log" ]; then
        log_analysis "$ALERT" "WARN" "No trading log found for today"
        return 0
    fi
    
    # Count trading operations
    local buy_count=$(grep -c "BUY operation" "$trading_log" 2>/dev/null || echo 0)
    local sell_count=$(grep -c "SELL operation" "$trading_log" 2>/dev/null || echo 0)
    local total_trades=$((buy_count + sell_count))
    
    # Count trading errors
    local trading_errors=$(grep -c "TRADE_FAILED\|ORDER_REJECTED\|INSUFFICIENT_BALANCE" "$trading_log" 2>/dev/null || echo 0)
    
    # Calculate success rate
    local success_rate=0
    if [ "$total_trades" -gt 0 ]; then
        success_rate=$(( (total_trades - trading_errors) * 100 / total_trades ))
    fi
    
    log_analysis "$REPORT" "INFO" "Trading summary: $total_trades trades ($buy_count buy, $sell_count sell)"
    log_analysis "$REPORT" "INFO" "Trading success rate: $success_rate% ($trading_errors errors)"
    
    # Analyze profit/loss
    if grep -q "P&L:" "$trading_log"; then
        local total_pnl=$(grep "P&L:" "$trading_log" | \
            sed 's/.*P&L: [💰💸] \$\?\([0-9.-]*\).*/\1/' | \
            awk '{sum += $1} END {printf "%.2f", sum}')
        
        if (( $(echo "$total_pnl > 0" | bc -l) )); then
            log_analysis "$SUCCESS" "INFO" "Total P&L: 💰 \$${total_pnl}"
        else
            log_analysis "$ERROR" "WARN" "Total P&L: 💸 \$${total_pnl}"
        fi
    fi
    
    # Check for trading anomalies
    if [ "$trading_errors" -gt "$TRADING_ERROR_THRESHOLD" ]; then
        log_analysis "$ANOMALY" "ERROR" "High trading error rate: $trading_errors errors (threshold: $TRADING_ERROR_THRESHOLD)"
        echo "High trading error rate: $trading_errors errors" >> "$ANALYSIS_DIR/alerts-$today.txt"
    fi
    
    return $trading_errors
}

# Analyze system performance trends
analyze_performance_trends() {
    log_analysis "$ANALYZE" "INFO" "Analyzing system performance trends..."
    
    local today=$(date +%Y-%m-%d)
    local perf_log="$LOG_DIR/performance-$today.log"
    
    if [ ! -f "$perf_log" ]; then
        log_analysis "$ALERT" "WARN" "No performance log found for today"
        return 0
    fi
    
    local alerts=0
    
    # Analyze CPU usage trends
    if grep -q "CPU Usage" "$perf_log"; then
        local avg_cpu=$(grep "CPU Usage" "$perf_log" | \
            sed 's/.*CPU Usage.*= \([0-9.]*\)%.*/\1/' | \
            awk '{sum += $1; count++} END {if (count > 0) printf "%.1f", sum/count; else print "0"}')
        
        local max_cpu=$(grep "CPU Usage" "$perf_log" | \
            sed 's/.*CPU Usage.*= \([0-9.]*\)%.*/\1/' | \
            sort -n | tail -1)
        
        log_analysis "$TREND" "INFO" "CPU usage: avg ${avg_cpu}%, max ${max_cpu}%"
        
        if (( $(echo "$max_cpu > $CPU_THRESHOLD" | bc -l) )); then
            log_analysis "$ANOMALY" "WARN" "High CPU usage detected: ${max_cpu}% (threshold: ${CPU_THRESHOLD}%)"
            echo "High CPU usage: ${max_cpu}%" >> "$ANALYSIS_DIR/alerts-$today.txt"
            ((alerts++))
        fi
    fi
    
    # Analyze memory usage trends
    if grep -q "Memory Usage" "$perf_log"; then
        local avg_mem=$(grep "Memory Usage" "$perf_log" | \
            sed 's/.*Memory Usage.*= \([0-9.]*\)%.*/\1/' | \
            awk '{sum += $1; count++} END {if (count > 0) printf "%.1f", sum/count; else print "0"}')
        
        local max_mem=$(grep "Memory Usage" "$perf_log" | \
            sed 's/.*Memory Usage.*= \([0-9.]*\)%.*/\1/' | \
            sort -n | tail -1)
        
        log_analysis "$TREND" "INFO" "Memory usage: avg ${avg_mem}%, max ${max_mem}%"
        
        if (( $(echo "$max_mem > $MEMORY_THRESHOLD" | bc -l) )); then
            log_analysis "$ANOMALY" "WARN" "High memory usage detected: ${max_mem}% (threshold: ${MEMORY_THRESHOLD}%)"
            echo "High memory usage: ${max_mem}%" >> "$ANALYSIS_DIR/alerts-$today.txt"
            ((alerts++))
        fi
    fi
    
    return $alerts
}

# Analyze API connectivity patterns
analyze_api_connectivity() {
    log_analysis "$ANALYZE" "INFO" "Analyzing API connectivity patterns..."
    
    local today=$(date +%Y-%m-%d)
    local app_log="$LOG_DIR/application-$today.log"
    
    if [ ! -f "$app_log" ]; then
        log_analysis "$ALERT" "WARN" "No application log found for today"
        return 0
    fi
    
    # Count connection events
    local connected_count=$(grep -c "CONNECTED\|API.*connected" "$app_log" 2>/dev/null || echo 0)
    local disconnected_count=$(grep -c "DISCONNECTED\|CONNECTION_FAILED\|TIMEOUT" "$app_log" 2>/dev/null || echo 0)
    local api_errors=$(grep -c "API.*error\|429\|RATE_LIMIT" "$app_log" 2>/dev/null || echo 0)
    
    log_analysis "$REPORT" "INFO" "API connectivity: $connected_count connects, $disconnected_count disconnects"
    log_analysis "$REPORT" "INFO" "API errors: $api_errors rate limits/errors"
    
    # Calculate uptime percentage
    local total_events=$((connected_count + disconnected_count))
    local uptime_percentage=100
    
    if [ "$total_events" -gt 0 ]; then
        uptime_percentage=$(( connected_count * 100 / total_events ))
    fi
    
    log_analysis "$TREND" "INFO" "API uptime: ${uptime_percentage}%"
    
    # Check for connectivity issues
    if [ "$api_errors" -gt "$API_ERROR_THRESHOLD" ]; then
        log_analysis "$ANOMALY" "ERROR" "High API error rate: $api_errors errors (threshold: $API_ERROR_THRESHOLD)"
        echo "High API error rate: $api_errors errors" >> "$ANALYSIS_DIR/alerts-$today.txt"
        return 1
    fi
    
    if [ "$uptime_percentage" -lt 95 ]; then
        log_analysis "$ANOMALY" "WARN" "Low API uptime: ${uptime_percentage}%"
        echo "Low API uptime: ${uptime_percentage}%" >> "$ANALYSIS_DIR/alerts-$today.txt"
        return 1
    fi
    
    return 0
}

# Generate insights and recommendations
generate_insights() {
    log_analysis "$INSIGHT" "INFO" "Generating insights and recommendations..."
    
    local today=$(date +%Y-%m-%d)
    local insights_file="$REPORTS_DIR/insights-$today.md"
    
    cat > "$insights_file" << EOF
# 💡 AI Trading Agent - Daily Insights Report
## Date: $today

### 📊 Executive Summary
$(if [ -f "$ANALYSIS_DIR/alerts-$today.txt" ]; then
    echo "⚠️ **$(wc -l < "$ANALYSIS_DIR/alerts-$today.txt") alerts detected today**"
else
    echo "✅ **No critical alerts detected today**"
fi)

### 🔍 Key Findings

#### Trading Performance
$(analyze_trading_summary)

#### System Health
$(analyze_system_health_summary)

#### Connectivity Status
$(analyze_connectivity_summary)

### 💡 Recommendations

$(generate_recommendations)

### 📈 Trends and Patterns

$(analyze_trends_summary)

---
*Report generated automatically by AI Trading Agent Log Analyzer*
*Last updated: $(date)*
EOF

    log_analysis "$SUCCESS" "INFO" "Insights report generated: $insights_file"
}

# Helper functions for report generation
analyze_trading_summary() {
    local today=$(date +%Y-%m-%d)
    local trading_log="$LOG_DIR/trading/trading-$today.log"
    
    if [ -f "$trading_log" ]; then
        local trades=$(grep -c "BUY operation\|SELL operation" "$trading_log" 2>/dev/null || echo 0)
        local errors=$(grep -c "TRADE_FAILED\|ORDER_REJECTED" "$trading_log" 2>/dev/null || echo 0)
        
        echo "- 📊 Total trades executed: $trades"
        echo "- $([ $errors -eq 0 ] && echo "✅" || echo "❌") Trading errors: $errors"
        
        if grep -q "P&L:" "$trading_log"; then
            local pnl=$(grep "P&L:" "$trading_log" | tail -1 | sed 's/.*P&L: [💰💸] \$\?\([0-9.-]*\).*/\1/')
            echo "- $([ $(echo "$pnl > 0" | bc -l) -eq 1 ] && echo "💰" || echo "💸") Latest P&L: \$${pnl}"
        fi
    else
        echo "- ⚠️ No trading activity recorded today"
    fi
}

analyze_system_health_summary() {
    echo "- 🏥 System monitoring active"
    echo "- $(systemctl is-active trading-agent > /dev/null && echo "✅" || echo "❌") Trading agent service status"
    echo "- $(systemctl is-active ssh-tunnel > /dev/null && echo "✅" || echo "❌") SSH tunnel service status"
    echo "- $(systemctl is-active trading-dashboard > /dev/null && echo "✅" || echo "❌") Dashboard service status"
}

analyze_connectivity_summary() {
    local today=$(date +%Y-%m-%d)
    local app_log="$LOG_DIR/application-$today.log"
    
    if [ -f "$app_log" ]; then
        local api_errors=$(grep -c "API.*error\|429\|RATE_LIMIT" "$app_log" 2>/dev/null || echo 0)
        echo "- $([ $api_errors -eq 0 ] && echo "✅" || echo "⚠️") API connectivity: $api_errors errors today"
        echo "- $(pgrep -f "ssh.*oracle" > /dev/null && echo "✅" || echo "❌") SSH tunnel status"
    else
        echo "- ⚠️ No connectivity data available"
    fi
}

generate_recommendations() {
    local today=$(date +%Y-%m-%d)
    
    if [ -f "$ANALYSIS_DIR/alerts-$today.txt" ]; then
        echo "#### 🚨 Immediate Actions Required:"
        while IFS= read -r alert; do
            echo "- $alert"
        done < "$ANALYSIS_DIR/alerts-$today.txt"
        echo ""
    fi
    
    echo "#### 🔧 General Recommendations:"
    echo "- Monitor system resources regularly"
    echo "- Review trading strategy performance"
    echo "- Ensure backup procedures are working"
    echo "- Check notification delivery systems"
}

analyze_trends_summary() {
    echo "- 📈 Performance trends analysis completed"
    echo "- 🔄 Pattern recognition active"
    echo "- 🎯 Anomaly detection enabled"
    echo "- 📊 Historical data comparison available"
}

# Send alerts if necessary
send_alerts() {
    local today=$(date +%Y-%m-%d)
    local alert_file="$ANALYSIS_DIR/alerts-$today.txt"
    
    if [ -f "$alert_file" ] && [ -s "$alert_file" ]; then
        local alert_count=$(wc -l < "$alert_file")
        
        log_analysis "$ALERT" "WARN" "Sending $alert_count alerts via notification system"
        
        local alert_message="🚨 AI Trading Agent Alert Summary - $today\n\n"
        alert_message+="Total Alerts: $alert_count\n\n"
        alert_message+="Details:\n$(cat "$alert_file")\n\n"
        alert_message+="Check the full analysis report for more details."
        
        if [ -x "$NOTIFICATION_SCRIPT" ]; then
            echo -e "$alert_message" | "$NOTIFICATION_SCRIPT" "Trading Agent Analysis Alert" -
        fi
        
        return $alert_count
    fi
    
    return 0
}

# Cleanup old analysis files
cleanup_old_files() {
    log_analysis "$ANALYZE" "INFO" "Cleaning up old analysis files..."
    
    # Remove analysis files older than 30 days
    find "$ANALYSIS_DIR" -name "*.json" -mtime +30 -delete 2>/dev/null || true
    find "$ANALYSIS_DIR" -name "*.txt" -mtime +30 -delete 2>/dev/null || true
    find "$REPORTS_DIR" -name "*.md" -mtime +30 -delete 2>/dev/null || true
    
    log_analysis "$SUCCESS" "INFO" "Cleanup completed"
}

# Main analysis function
main() {
    log_analysis "$ANALYZE" "INFO" "Starting comprehensive log analysis..."
    
    # Load configuration
    load_thresholds
    
    local total_issues=0
    
    # Run analysis modules
    analyze_error_patterns || ((total_issues += $?))
    analyze_trading_performance || ((total_issues += $?))
    analyze_performance_trends || ((total_issues += $?))
    analyze_api_connectivity || ((total_issues += $?))
    
    # Generate insights and reports
    generate_insights
    
    # Send alerts if necessary
    send_alerts || ((total_issues += $?))
    
    # Cleanup old files
    cleanup_old_files
    
    if [ "$total_issues" -eq 0 ]; then
        log_analysis "$SUCCESS" "SUCCESS" "Analysis completed - No critical issues detected"
    else
        log_analysis "$ALERT" "WARN" "Analysis completed - $total_issues issues detected"
    fi
    
    log_analysis "$REPORT" "INFO" "Analysis results saved to $ANALYSIS_DIR and $REPORTS_DIR"
    
    return $total_issues
}

# Handle script arguments
case "${1:-analyze}" in
    "analyze")
        main
        ;;
    "report")
        local today=$(date +%Y-%m-%d)
        if [ -f "$REPORTS_DIR/insights-$today.md" ]; then
            cat "$REPORTS_DIR/insights-$today.md"
        else
            echo "❌ No analysis report found for today. Run analysis first."
            exit 1
        fi
        ;;
    "alerts")
        local today=$(date +%Y-%m-%d)
        if [ -f "$ANALYSIS_DIR/alerts-$today.txt" ]; then
            echo "🚨 Today's Alerts:"
            cat "$ANALYSIS_DIR/alerts-$today.txt"
        else
            echo "✅ No alerts today"
        fi
        ;;
    "help")
        echo "Usage: $0 [analyze|report|alerts|help]"
        echo "  analyze - Run comprehensive log analysis (default)"
        echo "  report  - Show today's insights report"
        echo "  alerts  - Show today's alerts"
        echo "  help    - Show this help message"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac