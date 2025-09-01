#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - PREREQUISITES CHECK SCRIPT
# =============================================================================
# 
# This script checks all prerequisites for the AI Crypto Trading Agent
# deployment including hardware, software, and network requirements.
# 
# @author AI Crypto Trading System
# @version 1.0.0
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

# Logging functions
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((CHECKS_WARNING++))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check operating system
check_os() {
    info "Checking operating system..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        if [[ "$ID" == "ubuntu" ]]; then
            local version=$(echo "$VERSION_ID" | cut -d. -f1,2)
            if [[ $(echo "$version >= 22.04" | bc -l) -eq 1 ]]; then
                pass "Ubuntu $VERSION_ID detected"
            else
                fail "Ubuntu 22.04 or later required (found: $VERSION_ID)"
            fi
        else
            fail "Ubuntu OS required (found: $PRETTY_NAME)"
        fi
    else
        fail "Cannot determine operating system"
    fi
}

# Check hardware requirements
check_hardware() {
    info "Checking hardware requirements..."
    
    # Check CPU
    local cpu_cores=$(nproc)
    local cpu_info=$(lscpu | grep "Model name" | cut -d: -f2 | xargs)
    
    if [[ $cpu_cores -ge 4 ]]; then
        pass "CPU: $cpu_cores cores ($cpu_info)"
    else
        warn "CPU: $cpu_cores cores (4+ recommended)"
    fi
    
    # Check if Intel CPU
    if lscpu | grep -q "Intel"; then
        pass "Intel CPU detected (optimized for Intel NUC)"
    else
        warn "Non-Intel CPU detected (Intel recommended for optimal performance)"
    fi
    
    # Check memory
    local mem_total_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local mem_total_gb=$((mem_total_kb / 1024 / 1024))
    
    if [[ $mem_total_gb -ge 12 ]]; then
        pass "Memory: ${mem_total_gb}GB RAM"
    elif [[ $mem_total_gb -ge 8 ]]; then
        warn "Memory: ${mem_total_gb}GB RAM (12GB recommended)"
    else
        fail "Memory: ${mem_total_gb}GB RAM (minimum 8GB required)"
    fi
    
    # Check available memory
    local mem_available_kb=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    local mem_available_gb=$((mem_available_kb / 1024 / 1024))
    
    if [[ $mem_available_gb -ge 6 ]]; then
        pass "Available memory: ${mem_available_gb}GB"
    else
        warn "Available memory: ${mem_available_gb}GB (6GB+ recommended)"
    fi
    
    # Check disk space
    local disk_total=$(df -BG / | awk 'NR==2{print $2}' | sed 's/G//')
    local disk_available=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    
    if [[ $disk_available -ge 100 ]]; then
        pass "Disk space: ${disk_available}GB available (${disk_total}GB total)"
    elif [[ $disk_available -ge 50 ]]; then
        warn "Disk space: ${disk_available}GB available (100GB+ recommended)"
    else
        fail "Disk space: ${disk_available}GB available (minimum 50GB required)"
    fi
    
    # Check if SSD
    local root_device=$(df / | tail -1 | awk '{print $1}' | sed 's/[0-9]*$//')
    if [[ -f "/sys/block/$(basename $root_device)/queue/rotational" ]]; then
        local is_rotational=$(cat "/sys/block/$(basename $root_device)/queue/rotational")
        if [[ $is_rotational -eq 0 ]]; then
            pass "SSD storage detected"
        else
            warn "HDD storage detected (SSD recommended for optimal performance)"
        fi
    fi
}

# Check network connectivity
check_network() {
    info "Checking network connectivity..."
    
    # Check internet connectivity
    if ping -c 1 -W 5 google.com &> /dev/null; then
        pass "Internet connectivity available"
    else
        fail "Internet connectivity required"
        return
    fi
    
    # Check DNS resolution
    if nslookup google.com &> /dev/null; then
        pass "DNS resolution working"
    else
        fail "DNS resolution issues detected"
    fi
    
    # Check network interfaces
    local interfaces=$(ip link show | grep -E "^[0-9]+:" | grep -v "lo:" | wc -l)
    if [[ $interfaces -ge 1 ]]; then
        pass "Network interfaces: $interfaces detected"
        
        # List active interfaces
        ip link show | grep -E "^[0-9]+:" | grep -v "lo:" | while read line; do
            local iface=$(echo $line | cut -d: -f2 | xargs)
            local state=$(echo $line | grep -o "state [A-Z]*" | cut -d' ' -f2)
            if [[ "$state" == "UP" ]]; then
                info "  - $iface: $state"
            fi
        done
    else
        fail "No network interfaces detected"
    fi
    
    # Check for wireless capability
    if command -v iwconfig &> /dev/null && iwconfig 2>&1 | grep -q "IEEE 802.11"; then
        pass "Wireless capability detected"
    else
        warn "Wireless capability not detected"
    fi
}

# Check software requirements
check_software() {
    info "Checking software requirements..."
    
    # Check for required commands
    local required_commands=("curl" "wget" "git" "ssh" "openssl")
    
    for cmd in "${required_commands[@]}"; do
        if command -v "$cmd" &> /dev/null; then
            pass "$cmd is available"
        else
            fail "$cmd is required but not installed"
        fi
    done
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node -v | sed 's/v//')
        local major_version=$(echo $node_version | cut -d. -f1)
        
        if [[ $major_version -ge 18 ]]; then
            pass "Node.js $node_version (compatible)"
        else
            fail "Node.js $node_version (v18+ required)"
        fi
    else
        warn "Node.js not installed (will be installed during deployment)"
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm -v)
        pass "npm $npm_version available"
    else
        warn "npm not installed (will be installed with Node.js)"
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        local python_version=$(python3 --version | cut -d' ' -f2)
        pass "Python $python_version available"
    else
        warn "Python3 not installed (required for some dependencies)"
    fi
    
    # Check build tools
    if command -v gcc &> /dev/null; then
        pass "GCC compiler available"
    else
        warn "GCC compiler not installed (required for native modules)"
    fi
    
    if command -v make &> /dev/null; then
        pass "Make utility available"
    else
        warn "Make utility not installed (required for native modules)"
    fi
}

# Check system permissions
check_permissions() {
    info "Checking system permissions..."
    
    # Check if user has sudo access
    if sudo -n true 2>/dev/null; then
        pass "Sudo access available (passwordless)"
    elif sudo -v 2>/dev/null; then
        pass "Sudo access available (password required)"
    else
        fail "Sudo access required for system configuration"
    fi
    
    # Check if running as root (should not be)
    if [[ $EUID -eq 0 ]]; then
        fail "Running as root (should run as regular user with sudo access)"
    else
        pass "Running as regular user"
    fi
    
    # Check home directory permissions
    if [[ -w "$HOME" ]]; then
        pass "Home directory is writable"
    else
        fail "Home directory is not writable"
    fi
    
    # Check /opt directory (where app will be installed)
    if [[ -d "/opt" ]]; then
        if sudo test -w "/opt" 2>/dev/null; then
            pass "/opt directory is accessible"
        else
            pass "/opt directory exists (will need sudo for installation)"
        fi
    else
        warn "/opt directory does not exist (will be created)"
    fi
}

# Check security requirements
check_security() {
    info "Checking security requirements..."
    
    # Check if UFW is available
    if command -v ufw &> /dev/null; then
        pass "UFW firewall available"
    else
        warn "UFW firewall not installed (will be installed)"
    fi
    
    # Check if fail2ban is available
    if command -v fail2ban-client &> /dev/null; then
        pass "Fail2ban available"
    else
        warn "Fail2ban not installed (will be installed)"
    fi
    
    # Check SSH configuration
    if [[ -f "/etc/ssh/sshd_config" ]]; then
        pass "SSH server configuration found"
        
        # Check if SSH is running
        if systemctl is-active --quiet ssh || systemctl is-active --quiet sshd; then
            pass "SSH service is running"
        else
            warn "SSH service is not running"
        fi
    else
        warn "SSH server not configured"
    fi
    
    # Check for existing SSH keys
    if [[ -f "$HOME/.ssh/id_rsa" ]] || [[ -f "$HOME/.ssh/id_ed25519" ]]; then
        pass "SSH keys found in ~/.ssh/"
    else
        warn "No SSH keys found (will be generated)"
    fi
}

# Check Oracle Free Tier connectivity
check_oracle_connectivity() {
    info "Checking Oracle Free Tier connectivity..."
    
    local oracle_host="${ORACLE_HOST:-168.138.104.117}"
    
    # Check if Oracle host is reachable
    if ping -c 1 -W 5 "$oracle_host" &> /dev/null; then
        pass "Oracle Free Tier host ($oracle_host) is reachable"
    else
        fail "Oracle Free Tier host ($oracle_host) is not reachable"
        return
    fi
    
    # Check SSH port
    if timeout 5 bash -c "</dev/tcp/$oracle_host/22" 2>/dev/null; then
        pass "SSH port (22) is open on Oracle host"
    else
        fail "SSH port (22) is not accessible on Oracle host"
    fi
    
    # Check if SSH key exists for Oracle
    local oracle_key="$HOME/.ssh/oracle_key"
    if [[ -f "$oracle_key" ]]; then
        pass "Oracle SSH key found at $oracle_key"
        
        # Test SSH connection if key exists
        if ssh -i "$oracle_key" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
               -o BatchMode=yes ubuntu@"$oracle_host" "echo 'test'" &> /dev/null; then
            pass "SSH connection to Oracle Free Tier successful"
        else
            warn "SSH connection to Oracle Free Tier failed (key may need to be added)"
        fi
    else
        warn "Oracle SSH key not found (will be generated)"
    fi
}

# Check environment variables
check_environment() {
    info "Checking environment configuration..."
    
    # Check if .env file exists
    if [[ -f ".env" ]]; then
        pass ".env file found"
        
        # Check for required variables
        local required_vars=("GATEIO_API_KEY" "GATEIO_API_SECRET" "JWT_SECRET")
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" .env && [[ -n $(grep "^$var=" .env | cut -d= -f2) ]]; then
                pass "$var is configured"
            else
                warn "$var is not configured in .env"
            fi
        done
    elif [[ -f ".env.example" ]]; then
        warn ".env file not found (.env.example available)"
    else
        warn "No environment configuration files found"
    fi
}

# Check system resources under load
check_system_load() {
    info "Checking system load and performance..."
    
    # Check current load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_per_core=$(echo "scale=2; $load_avg / $cpu_cores" | bc -l)
    
    if (( $(echo "$load_per_core < 0.7" | bc -l) )); then
        pass "System load: $load_avg (${load_per_core} per core) - Normal"
    elif (( $(echo "$load_per_core < 1.0" | bc -l) )); then
        warn "System load: $load_avg (${load_per_core} per core) - Moderate"
    else
        warn "System load: $load_avg (${load_per_core} per core) - High"
    fi
    
    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    if (( $(echo "$mem_usage < 70" | bc -l) )); then
        pass "Memory usage: ${mem_usage}% - Normal"
    elif (( $(echo "$mem_usage < 85" | bc -l) )); then
        warn "Memory usage: ${mem_usage}% - Moderate"
    else
        warn "Memory usage: ${mem_usage}% - High"
    fi
    
    # Check disk I/O
    if command -v iostat &> /dev/null; then
        local io_wait=$(iostat -c 1 2 | tail -1 | awk '{print $4}')
        if (( $(echo "$io_wait < 10" | bc -l) )); then
            pass "I/O wait: ${io_wait}% - Normal"
        else
            warn "I/O wait: ${io_wait}% - High disk activity"
        fi
    fi
}

# Display summary
show_summary() {
    echo
    echo "=============================================="
    echo "         PREREQUISITES CHECK SUMMARY"
    echo "=============================================="
    echo
    echo -e "${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
    echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
    echo -e "${RED}Checks Failed: $CHECKS_FAILED${NC}"
    echo
    
    if [[ $CHECKS_FAILED -eq 0 ]]; then
        echo -e "${GREEN}✅ System is ready for deployment!${NC}"
        if [[ $CHECKS_WARNING -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  Please review warnings above${NC}"
        fi
        exit 0
    else
        echo -e "${RED}❌ System is not ready for deployment${NC}"
        echo -e "${RED}Please fix the failed checks before proceeding${NC}"
        exit 1
    fi
}

# Main function
main() {
    echo -e "${BLUE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║           🔍 AI CRYPTO TRADING AGENT                         ║
║              PREREQUISITES CHECK                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    
    check_os
    check_hardware
    check_network
    check_software
    check_permissions
    check_security
    check_oracle_connectivity
    check_environment
    check_system_load
    
    show_summary
}

# Run main function
main "$@"