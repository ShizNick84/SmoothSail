#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - PERFORMANCE LOGGER
# =============================================================================
# 
# This script collects comprehensive performance metrics for the AI crypto
# trading agent running on Intel NUC Ubuntu deployment. It monitors system
# resources, application performance, and trading-specific metrics.
# 
# Features:
# - Intel NUC hardware monitoring (CPU, RAM, SSD, temperature)
# - Network performance and SSH tunnel monitoring
# - Trading application performance metrics
# - Database performance monitoring
# - Alert generation for threshold violations
# - JSON-formatted output for automated analysis
# 
# Usage:
# ./performance-logger.sh [--output-file FILE] [--alert-threshold CPU,MEM,DISK]
# 
# @author AI Crypto Trading System
# @version 1.0.0
# @license PROPRIETARY
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/trading-agent/performance/metrics.log"
ALERT_FILE="/var/log/trading-agent/system/alerts.log"
PID_FILE="/var/run/trading-agent.pid"

# Default thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
TEMP_THRESHOLD=75
NETWORK_LATENCY_THRESHOLD=100

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --alert-threshold)
            IFS=',' read -r CPU_THRESHOLD MEMORY_THRESHOLD DISK_THRESHOLD <<< "$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [--output-file FILE] [--alert-threshold CPU,MEM,DISK]"
            echo "  --output-file FILE    Output log file (default: $LOG_FILE)"
            echo "  --alert-threshold     CPU,Memory,Disk thresholds (default: $CPU_THRESHOLD,$MEMORY_THRESHOLD,$DISK_THRESHOLD)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1" >&2
}

# Generate alert
generate_alert() {
    local type="$1"
    local severity="$2"
    local message="$3"
    local current_value="$4"
    local threshold="$5"
    
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')
    local alert_id="${type}_$(date +%s)_$$"
    
    # Create alert JSON
    local alert_json=$(cat <<EOF
{
    "timestamp": "$timestamp",
    "alert_id": "$alert_id",
    "type": "$type",
    "severity": "$severity",
    "message": "$message",
    "current_value": $current_value,
    "threshold": $threshold,
    "hostname": "$(hostname)",
    "source": "performance-logger"
}
EOF
)
    
    # Log alert
    echo "$alert_json" >> "$ALERT_FILE"
    
    # Log to syslog
    logger -p "local0.$severity" -t "trading-performance" "$message"
    
    # Output to stderr for immediate visibility
    if [[ "$severity" == "critical" ]]; then
        log_error "🚨 CRITICAL: $message"
    elif [[ "$severity" == "warning" ]]; then
        log_warn "⚠️ WARNING: $message"
    fi
}

# Get CPU metrics
get_cpu_metrics() {
    local cpu_usage cpu_temp cpu_freq cpu_cores cpu_model
    
    # CPU usage (1-minute average)
    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | cut -d. -f1)
    
    # CPU temperature
    if command -v sensors >/dev/null 2>&1; then
        cpu_temp=$(sensors 2>/dev/null | grep -E "(Core 0|Tctl)" | head -1 | awk '{print $3}' | sed 's/+//;s/°C//' | cut -d. -f1 || echo "0")
    else
        cpu_temp="0"
    fi
    
    # CPU frequency
    cpu_freq=$(cat /proc/cpuinfo | grep "cpu MHz" | head -1 | awk '{print $4}' | cut -d. -f1 || echo "0")
    
    # CPU cores
    cpu_cores=$(nproc)
    
    # CPU model
    cpu_model=$(cat /proc/cpuinfo | grep "model name" | head -1 | cut -d: -f2 | sed 's/^ *//' | sed 's/ \+/ /g')
    
    # Load averages
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^ *//')
    
    # Check thresholds
    if [[ $cpu_usage -gt $CPU_THRESHOLD ]]; then
        if [[ $cpu_usage -gt 90 ]]; then
            generate_alert "CPU" "critical" "CPU usage critical: ${cpu_usage}%" "$cpu_usage" "$CPU_THRESHOLD"
        else
            generate_alert "CPU" "warning" "CPU usage high: ${cpu_usage}%" "$cpu_usage" "$CPU_THRESHOLD"
        fi
    fi
    
    if [[ $cpu_temp -gt $TEMP_THRESHOLD && $cpu_temp -ne 0 ]]; then
        if [[ $cpu_temp -gt 85 ]]; then
            generate_alert "TEMPERATURE" "critical" "CPU temperature critical: ${cpu_temp}°C" "$cpu_temp" "$TEMP_THRESHOLD"
        else
            generate_alert "TEMPERATURE" "warning" "CPU temperature high: ${cpu_temp}°C" "$cpu_temp" "$TEMP_THRESHOLD"
        fi
    fi
    
    cat <<EOF
    "cpu": {
        "usage_percent": $cpu_usage,
        "temperature_celsius": $cpu_temp,
        "frequency_mhz": $cpu_freq,
        "cores": $cpu_cores,
        "model": "$cpu_model",
        "load_average": "$load_avg"
    }
EOF
}

# Get memory metrics
get_memory_metrics() {
    local mem_info mem_total mem_used mem_free mem_available mem_percent
    local swap_total swap_used swap_free swap_percent
    
    # Parse /proc/meminfo
    mem_total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    mem_free=$(grep MemFree /proc/meminfo | awk '{print $2}')
    mem_available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    swap_total=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
    swap_free=$(grep SwapFree /proc/meminfo | awk '{print $2}')
    
    # Calculate used memory
    mem_used=$((mem_total - mem_available))
    swap_used=$((swap_total - swap_free))
    
    # Calculate percentages
    mem_percent=$((mem_used * 100 / mem_total))
    if [[ $swap_total -gt 0 ]]; then
        swap_percent=$((swap_used * 100 / swap_total))
    else
        swap_percent=0
    fi
    
    # Check thresholds
    if [[ $mem_percent -gt $MEMORY_THRESHOLD ]]; then
        if [[ $mem_percent -gt 95 ]]; then
            generate_alert "MEMORY" "critical" "Memory usage critical: ${mem_percent}%" "$mem_percent" "$MEMORY_THRESHOLD"
        else
            generate_alert "MEMORY" "warning" "Memory usage high: ${mem_percent}%" "$mem_percent" "$MEMORY_THRESHOLD"
        fi
    fi
    
    cat <<EOF
    "memory": {
        "total_kb": $mem_total,
        "used_kb": $mem_used,
        "free_kb": $mem_free,
        "available_kb": $mem_available,
        "usage_percent": $mem_percent,
        "swap": {
            "total_kb": $swap_total,
            "used_kb": $swap_used,
            "free_kb": $swap_free,
            "usage_percent": $swap_percent
        }
    }
EOF
}

# Get disk metrics
get_disk_metrics() {
    local disk_info disk_total disk_used disk_free disk_percent
    local iops_read iops_write throughput_read throughput_write
    
    # Get disk usage for root filesystem
    disk_info=$(df / | tail -1)
    disk_total=$(echo "$disk_info" | awk '{print $2}')
    disk_used=$(echo "$disk_info" | awk '{print $3}')
    disk_free=$(echo "$disk_info" | awk '{print $4}')
    disk_percent=$(echo "$disk_info" | awk '{print $5}' | sed 's/%//')
    
    # Get I/O statistics
    if command -v iostat >/dev/null 2>&1; then
        local iostat_output
        iostat_output=$(iostat -x 1 1 2>/dev/null | tail -n +4 | head -1 || echo "0 0 0 0 0 0")
        iops_read=$(echo "$iostat_output" | awk '{print $4}' | cut -d. -f1 || echo "0")
        iops_write=$(echo "$iostat_output" | awk '{print $5}' | cut -d. -f1 || echo "0")
        throughput_read=$(echo "$iostat_output" | awk '{print $6}' | cut -d. -f1 || echo "0")
        throughput_write=$(echo "$iostat_output" | awk '{print $7}' | cut -d. -f1 || echo "0")
    else
        iops_read=0
        iops_write=0
        throughput_read=0
        throughput_write=0
    fi
    
    # Check thresholds
    if [[ $disk_percent -gt $DISK_THRESHOLD ]]; then
        if [[ $disk_percent -gt 98 ]]; then
            generate_alert "DISK" "critical" "Disk usage critical: ${disk_percent}%" "$disk_percent" "$DISK_THRESHOLD"
        else
            generate_alert "DISK" "warning" "Disk usage high: ${disk_percent}%" "$disk_percent" "$DISK_THRESHOLD"
        fi
    fi
    
    cat <<EOF
    "disk": {
        "total_kb": $disk_total,
        "used_kb": $disk_used,
        "free_kb": $disk_free,
        "usage_percent": $disk_percent,
        "iops": {
            "read": $iops_read,
            "write": $iops_write
        },
        "throughput_kb_s": {
            "read": $throughput_read,
            "write": $throughput_write
        }
    }
EOF
}

# Get network metrics
get_network_metrics() {
    local interface rx_bytes tx_bytes rx_packets tx_packets
    local ssh_tunnel_status api_latency
    
    # Find primary network interface
    interface=$(ip route | grep default | head -1 | awk '{print $5}' || echo "eth0")
    
    # Get network statistics
    if [[ -f "/sys/class/net/$interface/statistics/rx_bytes" ]]; then
        rx_bytes=$(cat "/sys/class/net/$interface/statistics/rx_bytes")
        tx_bytes=$(cat "/sys/class/net/$interface/statistics/tx_bytes")
        rx_packets=$(cat "/sys/class/net/$interface/statistics/rx_packets")
        tx_packets=$(cat "/sys/class/net/$interface/statistics/tx_packets")
    else
        rx_bytes=0
        tx_bytes=0
        rx_packets=0
        tx_packets=0
    fi
    
    # Check SSH tunnel status
    if pgrep -f "ssh.*oracle" >/dev/null; then
        ssh_tunnel_status="active"
    else
        ssh_tunnel_status="inactive"
        generate_alert "NETWORK" "warning" "SSH tunnel not detected" "0" "1"
    fi
    
    # Measure API latency (simplified)
    api_latency=0
    if [[ "$ssh_tunnel_status" == "active" ]]; then
        if command -v curl >/dev/null 2>&1; then
            api_latency=$(curl -w "%{time_total}" -s -o /dev/null --max-time 5 "http://localhost:8443" 2>/dev/null | cut -d. -f1 || echo "0")
            api_latency=$((api_latency * 1000)) # Convert to milliseconds
            
            if [[ $api_latency -gt $NETWORK_LATENCY_THRESHOLD && $api_latency -ne 0 ]]; then
                generate_alert "NETWORK" "warning" "High API latency: ${api_latency}ms" "$api_latency" "$NETWORK_LATENCY_THRESHOLD"
            fi
        fi
    fi
    
    cat <<EOF
    "network": {
        "interface": "$interface",
        "bytes": {
            "received": $rx_bytes,
            "transmitted": $tx_bytes
        },
        "packets": {
            "received": $rx_packets,
            "transmitted": $tx_packets
        },
        "ssh_tunnel_status": "$ssh_tunnel_status",
        "api_latency_ms": $api_latency
    }
EOF
}

# Get trading application metrics
get_application_metrics() {
    local pid cpu_percent mem_percent mem_rss uptime_seconds
    local heap_used heap_total gc_count
    
    # Find trading agent process
    if [[ -f "$PID_FILE" ]]; then
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "0")
    else
        pid=$(pgrep -f "trading-agent" | head -1 || echo "0")
    fi
    
    if [[ $pid -ne 0 ]] && kill -0 "$pid" 2>/dev/null; then
        # Get process statistics
        local ps_output
        ps_output=$(ps -p "$pid" -o %cpu,%mem,rss,etime --no-headers 2>/dev/null || echo "0 0 0 00:00")
        cpu_percent=$(echo "$ps_output" | awk '{print $1}' | cut -d. -f1)
        mem_percent=$(echo "$ps_output" | awk '{print $2}' | cut -d. -f1)
        mem_rss=$(echo "$ps_output" | awk '{print $3}')
        
        # Calculate uptime in seconds
        local etime
        etime=$(echo "$ps_output" | awk '{print $4}')
        if [[ "$etime" =~ ^[0-9]+-[0-9]+:[0-9]+:[0-9]+$ ]]; then
            # Format: days-hours:minutes:seconds
            uptime_seconds=$(echo "$etime" | awk -F'[-:]' '{print ($1*86400) + ($2*3600) + ($3*60) + $4}')
        elif [[ "$etime" =~ ^[0-9]+:[0-9]+:[0-9]+$ ]]; then
            # Format: hours:minutes:seconds
            uptime_seconds=$(echo "$etime" | awk -F':' '{print ($1*3600) + ($2*60) + $3}')
        elif [[ "$etime" =~ ^[0-9]+:[0-9]+$ ]]; then
            # Format: minutes:seconds
            uptime_seconds=$(echo "$etime" | awk -F':' '{print ($1*60) + $2}')
        else
            uptime_seconds=0
        fi
        
        # Try to get Node.js specific metrics (if available)
        heap_used=0
        heap_total=0
        gc_count=0
        
        # Check if process is responding
        local process_status="running"
        if ! kill -0 "$pid" 2>/dev/null; then
            process_status="not_responding"
            generate_alert "APPLICATION" "critical" "Trading agent process not responding" "0" "1"
        fi
    else
        pid=0
        cpu_percent=0
        mem_percent=0
        mem_rss=0
        uptime_seconds=0
        heap_used=0
        heap_total=0
        gc_count=0
        process_status="not_running"
        
        generate_alert "APPLICATION" "critical" "Trading agent process not running" "0" "1"
    fi
    
    cat <<EOF
    "application": {
        "pid": $pid,
        "status": "$process_status",
        "cpu_percent": $cpu_percent,
        "memory_percent": $mem_percent,
        "memory_rss_kb": $mem_rss,
        "uptime_seconds": $uptime_seconds,
        "heap": {
            "used_bytes": $heap_used,
            "total_bytes": $heap_total
        },
        "gc_count": $gc_count
    }
EOF
}

# Get database metrics
get_database_metrics() {
    local db_status db_size db_connections query_time
    
    # Check if PostgreSQL is running
    if systemctl is-active --quiet postgresql 2>/dev/null; then
        db_status="running"
        
        # Get database size (if accessible)
        if command -v psql >/dev/null 2>&1; then
            db_size=$(sudo -u postgres psql -d trading_agent -t -c "SELECT pg_size_pretty(pg_database_size('trading_agent'));" 2>/dev/null | tr -d ' ' || echo "unknown")
            db_connections=$(sudo -u postgres psql -d trading_agent -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='trading_agent';" 2>/dev/null | tr -d ' ' || echo "0")
            
            # Simple query performance test
            local start_time end_time
            start_time=$(date +%s%N)
            sudo -u postgres psql -d trading_agent -t -c "SELECT 1;" >/dev/null 2>&1 || true
            end_time=$(date +%s%N)
            query_time=$(((end_time - start_time) / 1000000)) # Convert to milliseconds
        else
            db_size="unknown"
            db_connections=0
            query_time=0
        fi
    else
        db_status="not_running"
        db_size="unknown"
        db_connections=0
        query_time=0
        
        generate_alert "DATABASE" "critical" "PostgreSQL database not running" "0" "1"
    fi
    
    cat <<EOF
    "database": {
        "status": "$db_status",
        "size": "$db_size",
        "connections": $db_connections,
        "query_time_ms": $query_time
    }
EOF
}

# Main function to collect all metrics
collect_metrics() {
    local timestamp hostname
    timestamp=$(date -u '+%Y-%m-%dT%H:%M:%S.%3NZ')
    hostname=$(hostname)
    
    # Create metrics JSON
    cat <<EOF
{
    "timestamp": "$timestamp",
    "hostname": "$hostname",
    "metrics": {
$(get_cpu_metrics),
$(get_memory_metrics),
$(get_disk_metrics),
$(get_network_metrics),
$(get_application_metrics),
$(get_database_metrics)
    }
}
EOF
}

# Ensure log directory exists
ensure_log_directory() {
    local log_dir
    log_dir=$(dirname "$LOG_FILE")
    
    if [[ ! -d "$log_dir" ]]; then
        mkdir -p "$log_dir"
        chown trading:trading "$log_dir" 2>/dev/null || true
        chmod 750 "$log_dir"
    fi
    
    log_dir=$(dirname "$ALERT_FILE")
    if [[ ! -d "$log_dir" ]]; then
        mkdir -p "$log_dir"
        chown trading:trading "$log_dir" 2>/dev/null || true
        chmod 750 "$log_dir"
    fi
}

# Main execution
main() {
    # Ensure log directories exist
    ensure_log_directory
    
    # Collect and log metrics
    local metrics_json
    metrics_json=$(collect_metrics)
    
    # Append to log file
    echo "$metrics_json" >> "$LOG_FILE"
    
    # Output to stdout if running interactively
    if [[ -t 1 ]]; then
        echo "$metrics_json" | jq '.' 2>/dev/null || echo "$metrics_json"
    fi
    
    # Log summary to syslog
    local cpu_usage mem_usage disk_usage
    cpu_usage=$(echo "$metrics_json" | jq -r '.metrics.cpu.usage_percent' 2>/dev/null || echo "0")
    mem_usage=$(echo "$metrics_json" | jq -r '.metrics.memory.usage_percent' 2>/dev/null || echo "0")
    disk_usage=$(echo "$metrics_json" | jq -r '.metrics.disk.usage_percent' 2>/dev/null || echo "0")
    
    logger -p local0.info -t trading-performance "Metrics collected - CPU: ${cpu_usage}%, Memory: ${mem_usage}%, Disk: ${disk_usage}%"
}

# Execute main function
main "$@"