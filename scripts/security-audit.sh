#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - COMPREHENSIVE SECURITY AUDIT SCRIPT
# =============================================================================
# This script performs a comprehensive security audit of the Intel NUC system
# and implements security hardening measures for the trading agent deployment.
# 
# Task: 12.1 Security Audit and Hardening
# Requirements: 3.3 - System security hardening
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
AUDIT_LOG="/var/log/trading-agent/security-audit.log"
AUDIT_REPORT="/opt/trading-agent/security-audit-report.json"
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$AUDIT_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$AUDIT_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$AUDIT_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$AUDIT_LOG"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$AUDIT_LOG"
}

# Initialize audit report
init_audit_report() {
    cat > "$AUDIT_REPORT" << 'EOF'
{
  "audit_timestamp": "",
  "audit_version": "1.0.0",
  "system_info": {},
  "security_findings": [],
  "compliance_status": {},
  "recommendations": [],
  "risk_score": 0,
  "overall_status": "UNKNOWN"
}
EOF
}

# Update audit report with findings
update_audit_report() {
    local category="$1"
    local status="$2"
    local message="$3"
    local severity="${4:-MEDIUM}"
    
    # Create temporary file with updated report
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$AUDIT_REPORT', 'r') as f:
        report = json.load(f)
    
    report['audit_timestamp'] = datetime.now().isoformat()
    
    finding = {
        'category': '$category',
        'status': '$status',
        'message': '$message',
        'severity': '$severity',
        'timestamp': datetime.now().isoformat()
    }
    
    report['security_findings'].append(finding)
    
    with open('$AUDIT_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
        
except Exception as e:
    print(f'Error updating audit report: {e}', file=sys.stderr)
" 2>/dev/null || true
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# System information gathering
gather_system_info() {
    log "🔍 Gathering system information..."
    
    local os_info=$(lsb_release -d 2>/dev/null | cut -f2 || echo "Unknown")
    local kernel_version=$(uname -r)
    local hostname=$(hostname)
    local uptime=$(uptime -p 2>/dev/null || uptime)
    local memory=$(free -h | grep "Mem:" | awk '{print $2}')
    local disk=$(df -h / | tail -1 | awk '{print $2}')
    
    info "Operating System: $os_info"
    info "Kernel Version: $kernel_version"
    info "Hostname: $hostname"
    info "Uptime: $uptime"
    info "Total Memory: $memory"
    info "Root Disk Size: $disk"
    
    # Update audit report with system info
    python3 -c "
import json
try:
    with open('$AUDIT_REPORT', 'r') as f:
        report = json.load(f)
    
    report['system_info'] = {
        'os': '$os_info',
        'kernel': '$kernel_version',
        'hostname': '$hostname',
        'memory': '$memory',
        'disk': '$disk'
    }
    
    with open('$AUDIT_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
except:
    pass
" 2>/dev/null || true
    
    success "System information gathered"
}

# Audit system users and permissions
audit_users_permissions() {
    log "👥 Auditing system users and permissions..."
    
    # Check for users with UID 0 (root privileges)
    local root_users=$(awk -F: '$3 == 0 {print $1}' /etc/passwd)
    if [[ "$root_users" != "root" ]]; then
        warning "Multiple users with root privileges detected: $root_users"
        update_audit_report "USER_SECURITY" "FAIL" "Multiple root users detected" "HIGH"
    else
        success "Only root user has UID 0"
        update_audit_report "USER_SECURITY" "PASS" "Single root user confirmed" "LOW"
    fi
    
    # Check for users with empty passwords
    local empty_password_users=$(awk -F: '$2 == "" {print $1}' /etc/shadow 2>/dev/null || echo "")
    if [[ -n "$empty_password_users" ]]; then
        error "Users with empty passwords detected: $empty_password_users"
        update_audit_report "PASSWORD_SECURITY" "FAIL" "Empty password users found" "CRITICAL"
    else
        success "No users with empty passwords"
        update_audit_report "PASSWORD_SECURITY" "PASS" "No empty passwords" "LOW"
    fi
    
    # Check trading user configuration
    if id "$TRADING_USER" &>/dev/null; then
        local trading_home=$(getent passwd "$TRADING_USER" | cut -d: -f6)
        local trading_shell=$(getent passwd "$TRADING_USER" | cut -d: -f7)
        
        info "Trading user home: $trading_home"
        info "Trading user shell: $trading_shell"
        
        # Check if trading user has sudo access
        if sudo -l -U "$TRADING_USER" 2>/dev/null | grep -q "may run"; then
            warning "Trading user has sudo privileges"
            update_audit_report "USER_PRIVILEGES" "WARN" "Trading user has sudo access" "MEDIUM"
        else
            success "Trading user has no sudo privileges"
            update_audit_report "USER_PRIVILEGES" "PASS" "Trading user properly restricted" "LOW"
        fi
    else
        error "Trading user '$TRADING_USER' not found"
        update_audit_report "USER_SECURITY" "FAIL" "Trading user missing" "HIGH"
    fi
}

# Audit file permissions and ownership
audit_file_permissions() {
    log "📁 Auditing file permissions and ownership..."
    
    # Check critical file permissions
    local critical_files=(
        "/etc/passwd:644"
        "/etc/shadow:640"
        "/etc/group:644"
        "/etc/gshadow:640"
        "/etc/ssh/sshd_config:600"
    )
    
    for file_perm in "${critical_files[@]}"; do
        local file="${file_perm%:*}"
        local expected_perm="${file_perm#*:}"
        
        if [[ -f "$file" ]]; then
            local actual_perm=$(stat -c "%a" "$file")
            if [[ "$actual_perm" == "$expected_perm" ]]; then
                success "Correct permissions on $file ($actual_perm)"
                update_audit_report "FILE_PERMISSIONS" "PASS" "$file has correct permissions" "LOW"
            else
                warning "Incorrect permissions on $file: $actual_perm (expected $expected_perm)"
                update_audit_report "FILE_PERMISSIONS" "WARN" "$file has incorrect permissions" "MEDIUM"
                
                # Fix permissions
                chmod "$expected_perm" "$file"
                success "Fixed permissions on $file"
            fi
        else
            warning "File $file not found"
            update_audit_report "FILE_PERMISSIONS" "WARN" "$file not found" "LOW"
        fi
    done
    
    # Check trading agent directory permissions
    if [[ -d "$TRADING_HOME" ]]; then
        local owner=$(stat -c "%U:%G" "$TRADING_HOME")
        local perms=$(stat -c "%a" "$TRADING_HOME")
        
        if [[ "$owner" == "$TRADING_USER:$TRADING_USER" ]]; then
            success "Trading home directory has correct ownership"
            update_audit_report "TRADING_PERMISSIONS" "PASS" "Correct ownership on trading directory" "LOW"
        else
            warning "Trading home directory ownership: $owner (expected $TRADING_USER:$TRADING_USER)"
            update_audit_report "TRADING_PERMISSIONS" "WARN" "Incorrect trading directory ownership" "MEDIUM"
            
            # Fix ownership
            chown -R "$TRADING_USER:$TRADING_USER" "$TRADING_HOME"
            success "Fixed trading directory ownership"
        fi
        
        # Check keys directory permissions
        local keys_dir="$TRADING_HOME/keys"
        if [[ -d "$keys_dir" ]]; then
            local key_perms=$(stat -c "%a" "$keys_dir")
            if [[ "$key_perms" == "700" ]]; then
                success "Keys directory has secure permissions"
                update_audit_report "KEY_SECURITY" "PASS" "Keys directory properly secured" "LOW"
            else
                warning "Keys directory permissions: $key_perms (expected 700)"
                update_audit_report "KEY_SECURITY" "WARN" "Keys directory not properly secured" "HIGH"
                
                # Fix permissions
                chmod 700 "$keys_dir"
                success "Fixed keys directory permissions"
            fi
        fi
    fi
}

# Audit SSH configuration
audit_ssh_configuration() {
    log "🔐 Auditing SSH configuration..."
    
    local ssh_config="/etc/ssh/sshd_config"
    
    if [[ -f "$ssh_config" ]]; then
        # Check SSH security settings
        local ssh_checks=(
            "PermitRootLogin:no"
            "PasswordAuthentication:no"
            "PermitEmptyPasswords:no"
            "X11Forwarding:no"
            "MaxAuthTries:3"
            "ClientAliveInterval:300"
            "ClientAliveCountMax:2"
        )
        
        for check in "${ssh_checks[@]}"; do
            local setting="${check%:*}"
            local expected="${check#*:}"
            
            local current=$(grep "^$setting" "$ssh_config" | awk '{print $2}' | tr '[:upper:]' '[:lower:]')
            
            if [[ "$current" == "$expected" ]]; then
                success "SSH $setting is correctly set to $expected"
                update_audit_report "SSH_SECURITY" "PASS" "$setting correctly configured" "LOW"
            else
                warning "SSH $setting is '$current' (expected '$expected')"
                update_audit_report "SSH_SECURITY" "WARN" "$setting incorrectly configured" "MEDIUM"
                
                # Fix SSH configuration
                if grep -q "^$setting" "$ssh_config"; then
                    sed -i "s/^$setting.*/$setting $expected/" "$ssh_config"
                else
                    echo "$setting $expected" >> "$ssh_config"
                fi
                success "Fixed SSH $setting configuration"
            fi
        done
        
        # Check SSH protocol version
        if grep -q "^Protocol 2" "$ssh_config" || ! grep -q "^Protocol" "$ssh_config"; then
            success "SSH Protocol 2 is enabled"
            update_audit_report "SSH_PROTOCOL" "PASS" "SSH Protocol 2 enabled" "LOW"
        else
            error "SSH Protocol 1 detected - security risk!"
            update_audit_report "SSH_PROTOCOL" "FAIL" "SSH Protocol 1 enabled" "CRITICAL"
            
            # Fix protocol
            sed -i 's/^Protocol.*/Protocol 2/' "$ssh_config"
            success "Fixed SSH protocol to version 2"
        fi
        
    else
        error "SSH configuration file not found"
        update_audit_report "SSH_SECURITY" "FAIL" "SSH config file missing" "HIGH"
    fi
}

# Audit firewall configuration
audit_firewall_configuration() {
    log "🔥 Auditing firewall configuration..."
    
    # Check if UFW is installed and active
    if command -v ufw &> /dev/null; then
        local ufw_status=$(ufw status | head -1)
        
        if echo "$ufw_status" | grep -q "Status: active"; then
            success "UFW firewall is active"
            update_audit_report "FIREWALL" "PASS" "UFW firewall active" "LOW"
            
            # Check firewall rules
            info "Current UFW rules:"
            ufw status numbered | tee -a "$AUDIT_LOG"
            
            # Check for dangerous rules
            if ufw status | grep -q "Anywhere"; then
                warning "Firewall allows connections from anywhere"
                update_audit_report "FIREWALL_RULES" "WARN" "Overly permissive firewall rules" "MEDIUM"
            fi
            
        else
            error "UFW firewall is not active"
            update_audit_report "FIREWALL" "FAIL" "UFW firewall inactive" "HIGH"
            
            # Enable UFW with secure defaults
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing
            ufw allow ssh
            ufw allow from 192.168.0.0/16 to any port 3000
            ufw allow from 10.0.0.0/8 to any port 3000
            ufw allow from 172.16.0.0/12 to any port 3000
            ufw --force enable
            success "UFW firewall enabled with secure configuration"
        fi
    else
        error "UFW firewall not installed"
        update_audit_report "FIREWALL" "FAIL" "UFW not installed" "HIGH"
        
        # Install and configure UFW
        apt update && apt install -y ufw
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow ssh
        ufw allow from 192.168.0.0/16 to any port 3000
        ufw allow from 10.0.0.0/8 to any port 3000
        ufw allow from 172.16.0.0/12 to any port 3000
        ufw --force enable
        success "UFW firewall installed and configured"
    fi
}

# Audit fail2ban configuration
audit_fail2ban_configuration() {
    log "🛡️  Auditing fail2ban configuration..."
    
    if command -v fail2ban-client &> /dev/null; then
        if systemctl is-active --quiet fail2ban; then
            success "fail2ban is active"
            update_audit_report "INTRUSION_PREVENTION" "PASS" "fail2ban active" "LOW"
            
            # Check fail2ban status
            info "fail2ban status:"
            fail2ban-client status | tee -a "$AUDIT_LOG"
            
        else
            warning "fail2ban is installed but not active"
            update_audit_report "INTRUSION_PREVENTION" "WARN" "fail2ban inactive" "MEDIUM"
            
            # Start and enable fail2ban
            systemctl start fail2ban
            systemctl enable fail2ban
            success "fail2ban started and enabled"
        fi
    else
        error "fail2ban not installed"
        update_audit_report "INTRUSION_PREVENTION" "FAIL" "fail2ban not installed" "HIGH"
        
        # Install and configure fail2ban
        apt update && apt install -y fail2ban
        
        # Create local configuration
        cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
        
        systemctl start fail2ban
        systemctl enable fail2ban
        success "fail2ban installed and configured"
    fi
}

# Audit network services
audit_network_services() {
    log "🌐 Auditing network services..."
    
    # Check for unnecessary services
    local unnecessary_services=("telnet" "rsh" "rlogin" "ftp" "tftp")
    
    for service in "${unnecessary_services[@]}"; do
        if systemctl is-enabled "$service" &>/dev/null; then
            error "Unnecessary service '$service' is enabled"
            update_audit_report "NETWORK_SERVICES" "FAIL" "Unnecessary service $service enabled" "HIGH"
            
            # Disable service
            systemctl stop "$service" 2>/dev/null || true
            systemctl disable "$service" 2>/dev/null || true
            success "Disabled unnecessary service '$service'"
        else
            success "Unnecessary service '$service' is not enabled"
            update_audit_report "NETWORK_SERVICES" "PASS" "Service $service properly disabled" "LOW"
        fi
    done
    
    # Check listening ports
    info "Currently listening ports:"
    netstat -tlnp 2>/dev/null | grep LISTEN | tee -a "$AUDIT_LOG" || ss -tlnp | grep LISTEN | tee -a "$AUDIT_LOG"
    
    # Check for suspicious open ports
    local suspicious_ports=("23" "513" "514" "515" "69")
    
    for port in "${suspicious_ports[@]}"; do
        if netstat -tln 2>/dev/null | grep ":$port " || ss -tln 2>/dev/null | grep ":$port "; then
            error "Suspicious port $port is open"
            update_audit_report "OPEN_PORTS" "FAIL" "Suspicious port $port open" "HIGH"
        else
            success "Suspicious port $port is closed"
            update_audit_report "OPEN_PORTS" "PASS" "Port $port properly closed" "LOW"
        fi
    done
}

# Audit system updates and patches
audit_system_updates() {
    log "📦 Auditing system updates and patches..."
    
    # Update package lists
    apt update &>/dev/null
    
    # Check for available updates
    local updates=$(apt list --upgradable 2>/dev/null | grep -c upgradable || echo "0")
    
    if [[ "$updates" -gt 0 ]]; then
        warning "$updates package updates available"
        update_audit_report "SYSTEM_UPDATES" "WARN" "$updates updates available" "MEDIUM"
        
        info "Available updates:"
        apt list --upgradable 2>/dev/null | head -20 | tee -a "$AUDIT_LOG"
        
    else
        success "System is up to date"
        update_audit_report "SYSTEM_UPDATES" "PASS" "System up to date" "LOW"
    fi
    
    # Check for security updates
    local security_updates=$(apt list --upgradable 2>/dev/null | grep -c security || echo "0")
    
    if [[ "$security_updates" -gt 0 ]]; then
        error "$security_updates security updates available"
        update_audit_report "SECURITY_UPDATES" "FAIL" "$security_updates security updates available" "CRITICAL"
        
        # Automatically install security updates
        warning "Installing critical security updates..."
        DEBIAN_FRONTEND=noninteractive apt-get -y upgrade
        success "Security updates installed"
        
    else
        success "No security updates needed"
        update_audit_report "SECURITY_UPDATES" "PASS" "No security updates needed" "LOW"
    fi
}

# Audit log configuration
audit_log_configuration() {
    log "📋 Auditing log configuration..."
    
    # Check if rsyslog is running
    if systemctl is-active --quiet rsyslog; then
        success "rsyslog is active"
        update_audit_report "LOGGING" "PASS" "rsyslog active" "LOW"
    else
        error "rsyslog is not active"
        update_audit_report "LOGGING" "FAIL" "rsyslog inactive" "MEDIUM"
        
        systemctl start rsyslog
        systemctl enable rsyslog
        success "rsyslog started and enabled"
    fi
    
    # Check log rotation configuration
    if [[ -f "/etc/logrotate.d/trading-agent" ]]; then
        success "Trading agent log rotation configured"
        update_audit_report "LOG_ROTATION" "PASS" "Log rotation configured" "LOW"
    else
        warning "Trading agent log rotation not configured"
        update_audit_report "LOG_ROTATION" "WARN" "Log rotation missing" "MEDIUM"
    fi
    
    # Check log file permissions
    local log_files=("/var/log/auth.log" "/var/log/syslog" "/var/log/kern.log")
    
    for log_file in "${log_files[@]}"; do
        if [[ -f "$log_file" ]]; then
            local perms=$(stat -c "%a" "$log_file")
            if [[ "$perms" == "640" ]] || [[ "$perms" == "644" ]]; then
                success "Log file $log_file has secure permissions"
                update_audit_report "LOG_PERMISSIONS" "PASS" "$log_file properly secured" "LOW"
            else
                warning "Log file $log_file has permissions $perms"
                update_audit_report "LOG_PERMISSIONS" "WARN" "$log_file permissions issue" "MEDIUM"
                
                chmod 640 "$log_file"
                success "Fixed permissions on $log_file"
            fi
        fi
    done
}

# Audit kernel security
audit_kernel_security() {
    log "🔧 Auditing kernel security parameters..."
    
    # Check kernel parameters
    local kernel_params=(
        "net.ipv4.ip_forward:0"
        "net.ipv4.conf.all.send_redirects:0"
        "net.ipv4.conf.default.send_redirects:0"
        "net.ipv4.conf.all.accept_redirects:0"
        "net.ipv4.conf.default.accept_redirects:0"
        "net.ipv4.conf.all.secure_redirects:0"
        "net.ipv4.conf.default.secure_redirects:0"
        "net.ipv4.icmp_echo_ignore_broadcasts:1"
        "net.ipv4.icmp_ignore_bogus_error_responses:1"
        "net.ipv4.conf.all.log_martians:1"
        "net.ipv4.conf.default.log_martians:1"
        "net.ipv4.tcp_syncookies:1"
    )
    
    for param in "${kernel_params[@]}"; do
        local setting="${param%:*}"
        local expected="${param#*:}"
        local current=$(sysctl -n "$setting" 2>/dev/null || echo "unknown")
        
        if [[ "$current" == "$expected" ]]; then
            success "Kernel parameter $setting = $expected"
            update_audit_report "KERNEL_SECURITY" "PASS" "$setting correctly set" "LOW"
        else
            warning "Kernel parameter $setting = $current (expected $expected)"
            update_audit_report "KERNEL_SECURITY" "WARN" "$setting incorrectly set" "MEDIUM"
            
            # Set kernel parameter
            sysctl -w "$setting=$expected" &>/dev/null
            
            # Make permanent
            echo "$setting = $expected" >> /etc/sysctl.conf
            success "Fixed kernel parameter $setting"
        fi
    done
}

# Audit application security
audit_application_security() {
    log "🔒 Auditing application security..."
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node --version | sed 's/v//')
        local major_version=$(echo "$node_version" | cut -d. -f1)
        
        if [[ "$major_version" -ge 18 ]]; then
            success "Node.js version $node_version is supported"
            update_audit_report "NODE_VERSION" "PASS" "Node.js version current" "LOW"
        else
            error "Node.js version $node_version is outdated"
            update_audit_report "NODE_VERSION" "FAIL" "Node.js version outdated" "HIGH"
        fi
    else
        error "Node.js not installed"
        update_audit_report "NODE_VERSION" "FAIL" "Node.js not installed" "HIGH"
    fi
    
    # Check npm audit
    if [[ -f "$TRADING_HOME/package.json" ]]; then
        cd "$TRADING_HOME"
        
        info "Running npm audit..."
        if npm audit --audit-level=high 2>/dev/null; then
            success "No high-severity npm vulnerabilities found"
            update_audit_report "NPM_SECURITY" "PASS" "No npm vulnerabilities" "LOW"
        else
            error "npm vulnerabilities detected"
            update_audit_report "NPM_SECURITY" "FAIL" "npm vulnerabilities found" "HIGH"
            
            warning "Attempting to fix npm vulnerabilities..."
            npm audit fix --force 2>/dev/null || true
        fi
    fi
    
    # Check environment file security
    local env_file="$TRADING_HOME/.env"
    if [[ -f "$env_file" ]]; then
        local env_perms=$(stat -c "%a" "$env_file")
        if [[ "$env_perms" == "600" ]]; then
            success "Environment file has secure permissions"
            update_audit_report "ENV_SECURITY" "PASS" "Environment file secured" "LOW"
        else
            warning "Environment file permissions: $env_perms (expected 600)"
            update_audit_report "ENV_SECURITY" "WARN" "Environment file not secured" "HIGH"
            
            chmod 600 "$env_file"
            success "Fixed environment file permissions"
        fi
        
        # Check for weak passwords in environment
        if grep -i "password.*=.*123\|password.*=.*pass\|password.*=.*admin" "$env_file" &>/dev/null; then
            error "Weak passwords detected in environment file"
            update_audit_report "WEAK_PASSWORDS" "FAIL" "Weak passwords in environment" "CRITICAL"
        else
            success "No obvious weak passwords in environment file"
            update_audit_report "WEAK_PASSWORDS" "PASS" "No weak passwords detected" "LOW"
        fi
    fi
}

# Generate security recommendations
generate_recommendations() {
    log "📝 Generating security recommendations..."
    
    local recommendations=()
    
    # Analyze audit findings and generate recommendations
    if grep -q '"status": "FAIL"' "$AUDIT_REPORT"; then
        recommendations+=("Address all FAIL status security findings immediately")
    fi
    
    if grep -q '"severity": "CRITICAL"' "$AUDIT_REPORT"; then
        recommendations+=("Prioritize CRITICAL severity issues for immediate remediation")
    fi
    
    recommendations+=("Implement regular security audits (weekly)")
    recommendations+=("Enable automated security updates")
    recommendations+=("Implement intrusion detection system")
    recommendations+=("Regular backup and recovery testing")
    recommendations+=("Security awareness training for administrators")
    recommendations+=("Implement network segmentation")
    recommendations+=("Regular penetration testing")
    recommendations+=("Implement security monitoring and alerting")
    
    # Update audit report with recommendations
    python3 -c "
import json
try:
    with open('$AUDIT_REPORT', 'r') as f:
        report = json.load(f)
    
    report['recommendations'] = [
        'Address all FAIL status security findings immediately',
        'Prioritize CRITICAL severity issues for immediate remediation',
        'Implement regular security audits (weekly)',
        'Enable automated security updates',
        'Implement intrusion detection system',
        'Regular backup and recovery testing',
        'Security awareness training for administrators',
        'Implement network segmentation',
        'Regular penetration testing',
        'Implement security monitoring and alerting'
    ]
    
    with open('$AUDIT_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
except:
    pass
" 2>/dev/null || true
    
    info "Security recommendations:"
    for rec in "${recommendations[@]}"; do
        info "  • $rec"
    done
}

# Calculate risk score
calculate_risk_score() {
    log "📊 Calculating overall risk score..."
    
    # Calculate risk score based on findings
    python3 -c "
import json
try:
    with open('$AUDIT_REPORT', 'r') as f:
        report = json.load(f)
    
    risk_score = 0
    total_findings = len(report['security_findings'])
    
    if total_findings > 0:
        for finding in report['security_findings']:
            if finding['severity'] == 'CRITICAL':
                if finding['status'] == 'FAIL':
                    risk_score += 25
                elif finding['status'] == 'WARN':
                    risk_score += 15
            elif finding['severity'] == 'HIGH':
                if finding['status'] == 'FAIL':
                    risk_score += 15
                elif finding['status'] == 'WARN':
                    risk_score += 10
            elif finding['severity'] == 'MEDIUM':
                if finding['status'] == 'FAIL':
                    risk_score += 8
                elif finding['status'] == 'WARN':
                    risk_score += 5
            elif finding['severity'] == 'LOW':
                if finding['status'] == 'FAIL':
                    risk_score += 3
                elif finding['status'] == 'WARN':
                    risk_score += 1
    
    # Cap risk score at 100
    risk_score = min(risk_score, 100)
    
    # Determine overall status
    if risk_score >= 70:
        overall_status = 'HIGH_RISK'
    elif risk_score >= 40:
        overall_status = 'MEDIUM_RISK'
    elif risk_score >= 20:
        overall_status = 'LOW_RISK'
    else:
        overall_status = 'SECURE'
    
    report['risk_score'] = risk_score
    report['overall_status'] = overall_status
    
    with open('$AUDIT_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'Risk Score: {risk_score}/100')
    print(f'Overall Status: {overall_status}')
    
except Exception as e:
    print(f'Error calculating risk score: {e}')
" | tee -a "$AUDIT_LOG"
}

# Main audit execution
main() {
    log "🔒 Starting comprehensive security audit..."
    
    # Check prerequisites
    check_root
    
    # Create audit log directory
    mkdir -p "$(dirname "$AUDIT_LOG")"
    mkdir -p "$(dirname "$AUDIT_REPORT")"
    
    # Initialize audit report
    init_audit_report
    
    # Gather system information
    gather_system_info
    
    # Perform security audits
    audit_users_permissions
    audit_file_permissions
    audit_ssh_configuration
    audit_firewall_configuration
    audit_fail2ban_configuration
    audit_network_services
    audit_system_updates
    audit_log_configuration
    audit_kernel_security
    audit_application_security
    
    # Generate recommendations and calculate risk
    generate_recommendations
    calculate_risk_score
    
    # Final report
    log "✅ Security audit completed!"
    info "Audit report saved to: $AUDIT_REPORT"
    info "Audit log saved to: $AUDIT_LOG"
    
    # Display summary
    echo ""
    echo "=== SECURITY AUDIT SUMMARY ==="
    python3 -c "
import json
try:
    with open('$AUDIT_REPORT', 'r') as f:
        report = json.load(f)
    
    print(f'Risk Score: {report.get(\"risk_score\", 0)}/100')
    print(f'Overall Status: {report.get(\"overall_status\", \"UNKNOWN\")}')
    print(f'Total Findings: {len(report.get(\"security_findings\", []))}')
    
    # Count by severity
    critical = sum(1 for f in report.get('security_findings', []) if f.get('severity') == 'CRITICAL' and f.get('status') == 'FAIL')
    high = sum(1 for f in report.get('security_findings', []) if f.get('severity') == 'HIGH' and f.get('status') == 'FAIL')
    medium = sum(1 for f in report.get('security_findings', []) if f.get('severity') == 'MEDIUM' and f.get('status') == 'FAIL')
    low = sum(1 for f in report.get('security_findings', []) if f.get('severity') == 'LOW' and f.get('status') == 'FAIL')
    
    print(f'Critical Issues: {critical}')
    print(f'High Issues: {high}')
    print(f'Medium Issues: {medium}')
    print(f'Low Issues: {low}')
    
except:
    print('Error reading audit report')
"
    
    echo "==============================="
}

# Execute main function
main "$@"