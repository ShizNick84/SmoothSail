#!/bin/bash

# Intel NUC Hardware Monitoring Script
# Monitors CPU, memory, temperature, and system performance

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/trading-agent/nuc-monitor.log"
METRICS_FILE="/var/log/trading-agent/nuc-metrics.json"
ALERT_SCRIPT="$SCRIPT_DIR/alert-system.sh"

# Thresholds
CPU_ALERT_THRESHOLD=85
MEMORY_ALERT_THRESHOLD=90
TEMP_ALERT_THRESHOLD=80
LOAD_ALERT_THRESHOLD=4.0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log_metric() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Get CPU usage
get_cpu_usage() {
    # Get CPU usage from /proc/stat
    cpu_line=$(head -n1 /proc/stat)
    cpu_times=($cpu_line)
    
    idle_time=${cpu_times[4]}
    total_time=0
    for time in "${cpu_times[@]:1}"; do
        total_time=$((total_time + time))
    done
    
    # Calculate usage percentage
    if [ -f /tmp/cpu_prev_total ] && [ -f /tmp/cpu_prev_idle ]; then
        prev_total=$(cat /tmp/cpu_prev_total)
        prev_idle=$(cat /tmp/cpu_prev_idle)
        
        total_diff=$((total_time - prev_total))
        idle_diff=$((idle_time - prev_idle))
        
        if [ $total_diff -gt 0 ]; then
            cpu_usage=$(( (total_diff - idle_diff) * 100 / total_diff ))
        else
            cpu_usage=0
        fi
    else
        cpu_usage=0
    fi
    
    # Store current values for next calculation
    echo $total_time > /tmp/cpu_prev_total
    echo $idle_time > /tmp/cpu_prev_idle
    
    echo $cpu_usage
}

# Get memory usage
get_memory_usage() {
    local mem_info=$(cat /proc/meminfo)
    local total_mem=$(echo "$mem_info" | grep MemTotal | awk '{print $2}')
    local available_mem=$(echo "$mem_info" | grep MemAvailable | awk '{print $2}')
    local used_mem=$((total_mem - available_mem))
    local mem_usage=$((used_mem * 100 / total_mem))
    
    echo "$mem_usage,$total_mem,$used_mem,$available_mem"
}

# Get CPU temperature
get_cpu_temperature() {
    local temp="N/A"
    
    # Try different temperature sources
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        local temp_raw=$(cat /sys/class/thermal/thermal_zone0/temp)
        temp=$((temp_raw / 1000))
    elif command -v sensors >/dev/null 2>&1; then
        local sensors_output=$(sensors 2>/dev/null || echo "")
        if [ -n "$sensors_output" ]; then
            temp=$(echo "$sensors_output" | grep -i "core\|cpu" | head -1 | grep -o '[0-9]\+\.[0-9]\+' | head -1)
            temp=${temp%.*}
        fi
    fi
    
    echo "$temp"
}

# Get load average
get_load_average() {
    local load_avg=$(cat /proc/loadavg | awk '{print $1","$2","$3}')
    echo "$load_avg"
}

# Get disk usage
get_disk_usage() {
    local disk_info=$(df -h / | tail -1)
    local disk_usage=$(echo "$disk_info" | awk '{print $5}' | sed 's/%//')
    local disk_total=$(echo "$disk_info" | awk '{print $2}')
    local disk_used=$(echo "$disk_info" | awk '{print $3}')
    local disk_available=$(echo "$disk_info" | awk '{print $4}')
    
    echo "$disk_usage,$disk_total,$disk_used,$disk_available"
}

# Get network statistics
get_network_stats() {
    local interface=$(ip route | grep default | awk '{print $5}' | head -1)
    if [ -n "$interface" ] && [ -f "/sys/class/net/$interface/statistics/rx_bytes" ]; then
        local rx_bytes=$(cat "/sys/class/net/$interface/statistics/rx_bytes")
        local tx_bytes=$(cat "/sys/class/net/$interface/statistics/tx_bytes")
        echo "$rx_bytes,$tx_bytes,$interface"
    else
        echo "0,0,unknown"
    fi
}

# Get process information
get_process_info() {
    local trading_pid=$(pgrep -f "trading-agent" | head -1 || echo "")
    local tunnel_pid=$(pgrep -f "ssh.*oracle" | head -1 || echo "")
    local dashboard_pid=$(pgrep -f "dashboard" | head -1 || echo "")
    
    echo "$trading_pid,$tunnel_pid,$dashboard_pid"
}

# Check for alerts
check_alerts() {
    local cpu_usage=$1
    local mem_usage=$2
    local temperature=$3
    local load_1min=$4
    
    local alerts=()
    
    # CPU alert
    if [ "$cpu_usage" -gt "$CPU_ALERT_THRESHOLD" ]; then
        alerts+=("🔥 High CPU usage: ${cpu_usage}%")
    fi
    
    # Memory alert
    if [ "$mem_usage" -gt "$MEMORY_ALERT_THRESHOLD" ]; then
        alerts+=("💾 High memory usage: ${mem_usage}%")
    fi
    
    # Temperature alert
    if [ "$temperature" != "N/A" ] && [ "$temperature" -gt "$TEMP_ALERT_THRESHOLD" ]; then
        alerts+=("🌡️ High temperature: ${temperature}°C")
    fi
    
    # Load average alert
    if [ "$(echo "$load_1min > $LOAD_ALERT_THRESHOLD" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        alerts+=("⚡ High load average: $load_1min")
    fi
    
    # Send alerts if any
    if [ ${#alerts[@]} -gt 0 ]; then
        local alert_message="Intel NUC Alert - $(date)\n"
        for alert in "${alerts[@]}"; do
            alert_message="${alert_message}${alert}\n"
        done
        
        if [ -x "$ALERT_SCRIPT" ]; then
            echo -e "$alert_message" | "$ALERT_SCRIPT"
        fi
        
        log_metric "ALERT: $(echo -e "$alert_message" | tr '\n' ' ')"
    fi
}

# Generate JSON metrics
generate_json_metrics() {
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local cpu_usage=$1
    local mem_data=$2
    local temperature=$3
    local load_data=$4
    local disk_data=$5
    local network_data=$6
    local process_data=$7
    
    # Parse data
    IFS=',' read -r mem_usage mem_total mem_used mem_available <<< "$mem_data"
    IFS=',' read -r load_1min load_5min load_15min <<< "$load_data"
    IFS=',' read -r disk_usage disk_total disk_used disk_available <<< "$disk_data"
    IFS=',' read -r rx_bytes tx_bytes interface <<< "$network_data"
    IFS=',' read -r trading_pid tunnel_pid dashboard_pid <<< "$process_data"
    
    cat > "$METRICS_FILE" << EOF
{
  "timestamp": "$timestamp",
  "hostname": "$(hostname)",
  "system": {
    "uptime": "$(uptime -p)",
    "load_average": {
      "1min": $load_1min,
      "5min": $load_5min,
      "15min": $load_15min
    }
  },
  "cpu": {
    "usage_percent": $cpu_usage,
    "temperature_celsius": "$temperature"
  },
  "memory": {
    "usage_percent": $mem_usage,
    "total_kb": $mem_total,
    "used_kb": $mem_used,
    "available_kb": $mem_available
  },
  "disk": {
    "usage_percent": $disk_usage,
    "total": "$disk_total",
    "used": "$disk_used",
    "available": "$disk_available"
  },
  "network": {
    "interface": "$interface",
    "rx_bytes": $rx_bytes,
    "tx_bytes": $tx_bytes
  },
  "processes": {
    "trading_agent_pid": "$trading_pid",
    "ssh_tunnel_pid": "$tunnel_pid",
    "dashboard_pid": "$dashboard_pid"
  }
}
EOF
}

# Display metrics
display_metrics() {
    local cpu_usage=$1
    local mem_data=$2
    local temperature=$3
    local load_data=$4
    local disk_data=$5
    
    # Parse data
    IFS=',' read -r mem_usage mem_total mem_used mem_available <<< "$mem_data"
    IFS=',' read -r load_1min load_5min load_15min <<< "$load_data"
    IFS=',' read -r disk_usage disk_total disk_used disk_available <<< "$disk_data"
    
    echo -e "${BLUE}📊 Intel NUC System Metrics - $(date)${NC}"
    echo "================================================"
    echo -e "🖥️  CPU Usage: ${cpu_usage}%"
    echo -e "🌡️  Temperature: ${temperature}°C"
    echo -e "💾 Memory: ${mem_usage}% (${mem_used}KB/${mem_total}KB)"
    echo -e "💿 Disk: ${disk_usage}% (${disk_used}/${disk_total})"
    echo -e "⚡ Load: ${load_1min} (1m), ${load_5min} (5m), ${load_15min} (15m)"
    echo ""
}

# Main monitoring function
main() {
    # Create log directories
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$(dirname "$METRICS_FILE")"
    
    # Collect metrics
    local cpu_usage=$(get_cpu_usage)
    local mem_data=$(get_memory_usage)
    local temperature=$(get_cpu_temperature)
    local load_data=$(get_load_average)
    local disk_data=$(get_disk_usage)
    local network_data=$(get_network_stats)
    local process_data=$(get_process_info)
    
    # Parse load for alerts
    local load_1min=$(echo "$load_data" | cut -d',' -f1)
    local mem_usage=$(echo "$mem_data" | cut -d',' -f1)
    
    # Display metrics if not in quiet mode
    if [ "${1:-}" != "--quiet" ]; then
        display_metrics "$cpu_usage" "$mem_data" "$temperature" "$load_data" "$disk_data"
    fi
    
    # Generate JSON metrics
    generate_json_metrics "$cpu_usage" "$mem_data" "$temperature" "$load_data" "$disk_data" "$network_data" "$process_data"
    
    # Check for alerts
    check_alerts "$cpu_usage" "$mem_usage" "$temperature" "$load_1min"
    
    # Log metrics
    log_metric "CPU:${cpu_usage}% MEM:${mem_usage}% TEMP:${temperature}°C LOAD:${load_1min}"
}

# Handle command line arguments
case "${1:-monitor}" in
    "monitor")
        main
        ;;
    "continuous")
        echo "Starting continuous monitoring (Ctrl+C to stop)..."
        while true; do
            main --quiet
            sleep 60
        done
        ;;
    "json")
        main --quiet
        cat "$METRICS_FILE"
        ;;
    *)
        echo "Usage: $0 [monitor|continuous|json]"
        echo "  monitor    - Run single monitoring check (default)"
        echo "  continuous - Run continuous monitoring every 60 seconds"
        echo "  json       - Output metrics in JSON format"
        exit 1
        ;;
esac