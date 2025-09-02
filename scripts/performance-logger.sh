#!/bin/bash

# Performance Logger for Intel NUC Trading System
# Comprehensive logging of hardware, network, and application performance

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PERF_LOG_DIR="/var/log/trading-agent/performance"
METRICS_FILE="$PERF_LOG_DIR/metrics.json"
HARDWARE_LOG="$PERF_LOG_DIR/hardware.log"
NETWORK_LOG="$PERF_LOG_DIR/network.log"
TRADING_LOG="$PERF_LOG_DIR/trading.log"
DATABASE_LOG="$PERF_LOG_DIR/database.log"

# Thresholds for alerts
CPU_ALERT_THRESHOLD=85
MEMORY_ALERT_THRESHOLD=90
TEMP_ALERT_THRESHOLD=80
NETWORK_LATENCY_ALERT=200  # milliseconds
DB_QUERY_ALERT=1000        # milliseconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize logging
init_logging() {
    mkdir -p "$PERF_LOG_DIR"
    
    # Create log files if they don't exist
    touch "$HARDWARE_LOG" "$NETWORK_LOG" "$TRADING_LOG" "$DATABASE_LOG"
    
    # Set up log rotation
    cat > /etc/logrotate.d/trading-performance << 'EOF'
/var/log/trading-agent/performance/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
}

# Log with timestamp and emoji
log_perf() {
    local log_file="$1"
    local level="$2"
    local message="$3"
    local emoji="$4"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $emoji [$level] $message" >> "$log_file"
}

# Get Intel NUC hardware performance
get_hardware_performance() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # CPU usage and frequency
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    local cpu_freq=$(cat /proc/cpuinfo | grep "cpu MHz" | head -1 | awk '{print $4}' || echo "0")
    
    # Memory usage
    local mem_info=$(free -m)
    local total_mem=$(echo "$mem_info" | grep Mem | awk '{print $2}')
    local used_mem=$(echo "$mem_info" | grep Mem | awk '{print $3}')
    local available_mem=$(echo "$mem_info" | grep Mem | awk '{print $7}')
    local mem_usage=$((used_mem * 100 / total_mem))
    
    # CPU temperature
    local cpu_temp="N/A"
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        cpu_temp=$(($(cat /sys/class/thermal/thermal_zone0/temp) / 1000))
    elif command -v sensors >/dev/null 2>&1; then
        cpu_temp=$(sensors 2>/dev/null | grep -i "core\|cpu" | head -1 | grep -o '[0-9]\+\.[0-9]\+' | head -1 | cut -d'.' -f1 || echo "N/A")
    fi
    
    # Load average
    local load_avg=$(cat /proc/loadavg | awk '{print $1","$2","$3}')
    
    # Disk I/O
    local disk_io=$(iostat -d 1 2 2>/dev/null | tail -n +4 | head -1 | awk '{print $3","$4}' || echo "0,0")
    
    # Network interface stats
    local interface=$(ip route | grep default | awk '{print $5}' | head -1)
    local rx_bytes=0
    local tx_bytes=0
    if [ -n "$interface" ] && [ -f "/sys/class/net/$interface/statistics/rx_bytes" ]; then
        rx_bytes=$(cat "/sys/class/net/$interface/statistics/rx_bytes")
        tx_bytes=$(cat "/sys/class/net/$interface/statistics/tx_bytes")
    fi
    
    # Log hardware performance
    log_perf "$HARDWARE_LOG" "INFO" "CPU: ${cpu_usage}% @ ${cpu_freq}MHz, Temp: ${cpu_temp}°C, Memory: ${mem_usage}% (${used_mem}MB/${total_mem}MB), Load: $load_avg" "🖥️"
    
    # Check for alerts
    if [ "${cpu_usage%.*}" -gt "$CPU_ALERT_THRESHOLD" ]; then
        log_perf "$HARDWARE_LOG" "ALERT" "High CPU usage: ${cpu_usage}%" "🔥"
    fi
    
    if [ "$mem_usage" -gt "$MEMORY_ALERT_THRESHOLD" ]; then
        log_perf "$HARDWARE_LOG" "ALERT" "High memory usage: ${mem_usage}%" "💾"
    fi
    
    if [ "$cpu_temp" != "N/A" ] && [ "$cpu_temp" -gt "$TEMP_ALERT_THRESHOLD" ]; then
        log_perf "$HARDWARE_LOG" "ALERT" "High CPU temperature: ${cpu_temp}°C" "🌡️"
    fi
    
    # Return JSON data
    cat << EOF
{
  "timestamp": "$timestamp",
  "cpu": {
    "usage_percent": $cpu_usage,
    "frequency_mhz": $cpu_freq,
    "temperature_celsius": "$cpu_temp"
  },
  "memory": {
    "usage_percent": $mem_usage,
    "total_mb": $total_mem,
    "used_mb": $used_mem,
    "available_mb": $available_mem
  },
  "load_average": {
    "1min": $(echo "$load_avg" | cut -d',' -f1),
    "5min": $(echo "$load_avg" | cut -d',' -f2),
    "15min": $(echo "$load_avg" | cut -d',' -f3)
  },
  "disk_io": {
    "read_kb_s": $(echo "$disk_io" | cut -d',' -f1),
    "write_kb_s": $(echo "$disk_io" | cut -d',' -f2)
  },
  "network": {
    "interface": "$interface",
    "rx_bytes": $rx_bytes,
    "tx_bytes": $tx_bytes
  }
}
EOF
}

# Test network performance and SSH tunnel
test_network_performance() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Test internet connectivity
    local internet_latency=$(ping -c 3 8.8.8.8 2>/dev/null | tail -1 | awk -F'/' '{print $5}' || echo "999")
    
    # Test SSH tunnel connectivity
    local tunnel_status="DOWN"
    local tunnel_latency="999"
    if pgrep -f "ssh.*oracle" >/dev/null; then
        tunnel_status="UP"
        # Test tunnel latency by connecting to local tunnel port
        tunnel_latency=$(timeout 5 bash -c "time echo '' | nc localhost 8443" 2>&1 | grep real | awk '{print $2}' | sed 's/0m//;s/s//' | awk '{print $1*1000}' || echo "999")
    fi
    
    # Test Gate.io API response time
    local api_response_time="999"
    local api_status="FAIL"
    if [ "$tunnel_status" = "UP" ]; then
        local start_time=$(date +%s%3N)
        if curl -s --connect-timeout 5 --max-time 10 http://localhost:8443/api/v4/spot/currencies >/dev/null 2>&1; then
            local end_time=$(date +%s%3N)
            api_response_time=$((end_time - start_time))
            api_status="OK"
        fi
    fi
    
    # Log network performance
    log_perf "$NETWORK_LOG" "INFO" "Internet: ${internet_latency}ms, Tunnel: $tunnel_status (${tunnel_latency}ms), API: $api_status (${api_response_time}ms)" "🌐"
    
    # Check for alerts
    if [ "${internet_latency%.*}" -gt "$NETWORK_LATENCY_ALERT" ]; then
        log_perf "$NETWORK_LOG" "ALERT" "High internet latency: ${internet_latency}ms" "⚠️"
    fi
    
    if [ "$tunnel_status" = "DOWN" ]; then
        log_perf "$NETWORK_LOG" "ALERT" "SSH tunnel is down" "🚨"
    fi
    
    if [ "${api_response_time}" -gt "$NETWORK_LATENCY_ALERT" ]; then
        log_perf "$NETWORK_LOG" "ALERT" "High API response time: ${api_response_time}ms" "🐌"
    fi
    
    echo "$internet_latency,$tunnel_status,$tunnel_latency,$api_response_time,$api_status"
}

# Monitor database performance
monitor_database_performance() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if ! systemctl is-active --quiet postgresql; then
        log_perf "$DATABASE_LOG" "ERROR" "PostgreSQL service is not running" "❌"
        echo "0,0,0,DOWN"
        return
    fi
    
    # Test database connection time
    local start_time=$(date +%s%3N)
    local connection_test=$(sudo -u postgres psql -d trading_agent -c "SELECT 1;" 2>/dev/null || echo "FAIL")
    local end_time=$(date +%s%3N)
    local connection_time=$((end_time - start_time))
    
    # Get database statistics
    local db_stats=$(sudo -u postgres psql -d trading_agent -t -c "
        SELECT 
            pg_database_size('trading_agent') as db_size,
            (SELECT count(*) FROM pg_stat_activity WHERE datname='trading_agent') as connections,
            (SELECT sum(calls) FROM pg_stat_user_functions) as function_calls
    " 2>/dev/null || echo "0|0|0")
    
    local db_size=$(echo "$db_stats" | awk -F'|' '{print $1}' | tr -d ' ')
    local connections=$(echo "$db_stats" | awk -F'|' '{print $2}' | tr -d ' ')
    local function_calls=$(echo "$db_stats" | awk -F'|' '{print $3}' | tr -d ' ')
    
    # Log database performance
    if [ "$connection_test" != "FAIL" ]; then
        log_perf "$DATABASE_LOG" "INFO" "Connection: ${connection_time}ms, Size: ${db_size} bytes, Connections: $connections" "🗄️"
        
        if [ "$connection_time" -gt "$DB_QUERY_ALERT" ]; then
            log_perf "$DATABASE_LOG" "ALERT" "Slow database connection: ${connection_time}ms" "🐌"
        fi
    else
        log_perf "$DATABASE_LOG" "ERROR" "Database connection failed" "❌"
    fi
    
    echo "$connection_time,$db_size,$connections,UP"
}

# Monitor trading application performance
monitor_trading_performance() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check if trading agent is running
    local trading_pid=$(pgrep -f "trading-agent" | head -1 || echo "")
    local trading_status="DOWN"
    local memory_usage=0
    local cpu_usage=0
    
    if [ -n "$trading_pid" ]; then
        trading_status="UP"
        
        # Get process memory and CPU usage
        local proc_stats=$(ps -p "$trading_pid" -o %mem,%cpu --no-headers 2>/dev/null || echo "0.0 0.0")
        memory_usage=$(echo "$proc_stats" | awk '{print $1}')
        cpu_usage=$(echo "$proc_stats" | awk '{print $2}')
        
        # Check for recent trading activity (if log file exists)
        local recent_trades=0
        local trading_log_file="/var/log/trading-agent/app.log"
        if [ -f "$trading_log_file" ]; then
            recent_trades=$(grep -c "TRADE\|ORDER" "$trading_log_file" 2>/dev/null | tail -100 | wc -l || echo "0")
        fi
        
        log_perf "$TRADING_LOG" "INFO" "Status: $trading_status, PID: $trading_pid, Memory: ${memory_usage}%, CPU: ${cpu_usage}%, Recent trades: $recent_trades" "📈"
    else
        log_perf "$TRADING_LOG" "ERROR" "Trading agent is not running" "❌"
    fi
    
    echo "$trading_status,$trading_pid,$memory_usage,$cpu_usage"
}

# Generate comprehensive performance report
generate_performance_report() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Collect all performance data
    local hardware_data=$(get_hardware_performance)
    local network_data=$(test_network_performance)
    local database_data=$(monitor_database_performance)
    local trading_data=$(monitor_trading_performance)
    
    # Parse network data
    IFS=',' read -r internet_latency tunnel_status tunnel_latency api_response_time api_status <<< "$network_data"
    
    # Parse database data
    IFS=',' read -r db_connection_time db_size db_connections db_status <<< "$database_data"
    
    # Parse trading data
    IFS=',' read -r trading_status trading_pid trading_memory trading_cpu <<< "$trading_data"
    
    # Create comprehensive JSON report
    cat > "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "hostname": "$(hostname)",
  "hardware": $hardware_data,
  "network": {
    "internet_latency_ms": $internet_latency,
    "ssh_tunnel": {
      "status": "$tunnel_status",
      "latency_ms": $tunnel_latency
    },
    "api": {
      "status": "$api_status",
      "response_time_ms": $api_response_time
    }
  },
  "database": {
    "status": "$db_status",
    "connection_time_ms": $db_connection_time,
    "size_bytes": $db_size,
    "active_connections": $db_connections
  },
  "trading_application": {
    "status": "$trading_status",
    "pid": "$trading_pid",
    "memory_usage_percent": $trading_memory,
    "cpu_usage_percent": $trading_cpu
  },
  "system_health": {
    "overall_status": "$([ "$tunnel_status" = "UP" ] && [ "$db_status" = "UP" ] && [ "$trading_status" = "UP" ] && echo "HEALTHY" || echo "DEGRADED")"
  }
}
EOF
}

# Display performance dashboard
display_dashboard() {
    if [ ! -f "$METRICS_FILE" ]; then
        echo "No performance data available. Run with 'collect' first."
        return 1
    fi
    
    local data=$(cat "$METRICS_FILE")
    
    echo -e "${BLUE}📊 Intel NUC Trading System Performance Dashboard${NC}"
    echo "=================================================="
    echo "⏰ Last Update: $(echo "$data" | jq -r '.timestamp')"
    echo ""
    
    # Hardware status
    echo -e "${GREEN}🖥️  Hardware Performance${NC}"
    echo "  CPU: $(echo "$data" | jq -r '.hardware.cpu.usage_percent')% @ $(echo "$data" | jq -r '.hardware.cpu.frequency_mhz')MHz"
    echo "  Temperature: $(echo "$data" | jq -r '.hardware.cpu.temperature_celsius')°C"
    echo "  Memory: $(echo "$data" | jq -r '.hardware.memory.usage_percent')% ($(echo "$data" | jq -r '.hardware.memory.used_mb')MB/$(echo "$data" | jq -r '.hardware.memory.total_mb')MB)"
    echo "  Load: $(echo "$data" | jq -r '.hardware.load_average."1min"') (1m)"
    echo ""
    
    # Network status
    echo -e "${GREEN}🌐 Network Performance${NC}"
    echo "  Internet Latency: $(echo "$data" | jq -r '.network.internet_latency_ms')ms"
    echo "  SSH Tunnel: $(echo "$data" | jq -r '.network.ssh_tunnel.status') ($(echo "$data" | jq -r '.network.ssh_tunnel.latency_ms')ms)"
    echo "  API Response: $(echo "$data" | jq -r '.network.api.status') ($(echo "$data" | jq -r '.network.api.response_time_ms')ms)"
    echo ""
    
    # Database status
    echo -e "${GREEN}🗄️  Database Performance${NC}"
    echo "  Status: $(echo "$data" | jq -r '.database.status')"
    echo "  Connection Time: $(echo "$data" | jq -r '.database.connection_time_ms')ms"
    echo "  Size: $(echo "$data" | jq -r '.database.size_bytes' | numfmt --to=iec)"
    echo "  Active Connections: $(echo "$data" | jq -r '.database.active_connections')"
    echo ""
    
    # Trading application status
    echo -e "${GREEN}📈 Trading Application${NC}"
    echo "  Status: $(echo "$data" | jq -r '.trading_application.status')"
    echo "  PID: $(echo "$data" | jq -r '.trading_application.pid')"
    echo "  Memory Usage: $(echo "$data" | jq -r '.trading_application.memory_usage_percent')%"
    echo "  CPU Usage: $(echo "$data" | jq -r '.trading_application.cpu_usage_percent')%"
    echo ""
    
    # Overall health
    local health=$(echo "$data" | jq -r '.system_health.overall_status')
    if [ "$health" = "HEALTHY" ]; then
        echo -e "${GREEN}✅ System Health: $health${NC}"
    else
        echo -e "${YELLOW}⚠️  System Health: $health${NC}"
    fi
}

# Main function
main() {
    case "${1:-collect}" in
        "collect")
            init_logging
            generate_performance_report
            echo "Performance data collected and logged"
            ;;
        "dashboard")
            display_dashboard
            ;;
        "continuous")
            echo "Starting continuous performance monitoring (Ctrl+C to stop)..."
            init_logging
            while true; do
                generate_performance_report
                sleep 60
            done
            ;;
        "json")
            if [ -f "$METRICS_FILE" ]; then
                cat "$METRICS_FILE"
            else
                echo "No performance data available"
                exit 1
            fi
            ;;
        "logs")
            echo "Recent performance logs:"
            echo "========================"
            echo ""
            echo "Hardware:"
            tail -10 "$HARDWARE_LOG" 2>/dev/null || echo "No hardware logs"
            echo ""
            echo "Network:"
            tail -10 "$NETWORK_LOG" 2>/dev/null || echo "No network logs"
            echo ""
            echo "Database:"
            tail -10 "$DATABASE_LOG" 2>/dev/null || echo "No database logs"
            echo ""
            echo "Trading:"
            tail -10 "$TRADING_LOG" 2>/dev/null || echo "No trading logs"
            ;;
        *)
            echo "Usage: $0 [collect|dashboard|continuous|json|logs]"
            echo ""
            echo "Options:"
            echo "  collect    - Collect performance data once (default)"
            echo "  dashboard  - Display performance dashboard"
            echo "  continuous - Run continuous monitoring"
            echo "  json       - Output latest metrics in JSON format"
            echo "  logs       - Show recent performance logs"
            exit 1
            ;;
    esac
}

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
    echo "Warning: jq not installed - JSON processing may not work"
fi

# Run main function
main "$@"