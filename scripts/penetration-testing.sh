#!/bin/bash

# =============================================================================
# COMPREHENSIVE PENETRATION TESTING SCRIPT
# =============================================================================
# Task: 20.4 Security and Compliance Validation - Penetration Testing
# Requirements: 3.3, 5.4 - Security audit, penetration testing
# 
# This script performs comprehensive penetration testing on the AI Crypto
# Trading Agent production deployment to identify security vulnerabilities.
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_HOST="localhost"
TRADING_AGENT_DIR="/opt/trading-agent"
PENTEST_LOG="/var/log/trading-agent/penetration-test.log"
PENTEST_REPORT="/opt/trading-agent/penetration-test-report.json"

# Test results tracking
TOTAL_TESTS=0
VULNERABILITIES_FOUND=0
HIGH_RISK_VULNS=0
MEDIUM_RISK_VULNS=0
LOW_RISK_VULNS=0

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$PENTEST_LOG"
}

success() {
    echo -e "${GREEN}[✅ SECURE]${NC} $1" | tee -a "$PENTEST_LOG"
    ((TOTAL_TESTS++))
}

vulnerability() {
    local severity="$2"
    echo -e "${RED}[🚨 VULN-$severity]${NC} $1" | tee -a "$PENTEST_LOG"
    ((VULNERABILITIES_FOUND++))
    ((TOTAL_TESTS++))
    
    case "$severity" in
        "HIGH") ((HIGH_RISK_VULNS++)) ;;
        "MEDIUM") ((MEDIUM_RISK_VULNS++)) ;;
        "LOW") ((LOW_RISK_VULNS++)) ;;
    esac
}

warning() {
    echo -e "${YELLOW}[⚠️  WARN]${NC} $1" | tee -a "$PENTEST_LOG"
    ((TOTAL_TESTS++))
}

info() {
    echo -e "${CYAN}[ℹ️  INFO]${NC} $1" | tee -a "$PENTEST_LOG"
}

# Initialize penetration testing environment
init_pentest() {
    log "🎯 Initializing Penetration Testing Environment..."
    
    # Create log directory
    mkdir -p "$(dirname "$PENTEST_LOG")"
    mkdir -p "$(dirname "$PENTEST_REPORT")"
    
    # Initialize penetration test report
    cat > "$PENTEST_REPORT" << 'EOF'
{
  "test_timestamp": "",
  "test_version": "1.0.0",
  "target_system": "AI Crypto Trading Agent - Intel NUC",
  "target_host": "localhost",
  "test_scope": [
    "Network Services",
    "Web Application",
    "SSH Service",
    "Database Security",
    "File System",
    "Authentication",
    "Encryption"
  ],
  "vulnerabilities": [],
  "risk_assessment": {
    "overall_risk": "UNKNOWN",
    "high_risk_count": 0,
    "medium_risk_count": 0,
    "low_risk_count": 0
  },
  "remediation_plan": []
}
EOF
    
    success "Penetration testing environment initialized"
}

# Update penetration test report
update_pentest_report() {
    local vuln_name="$1"
    local severity="$2"
    local description="$3"
    local impact="${4:-Unknown impact}"
    local remediation="${5:-No remediation provided}"
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$PENTEST_REPORT', 'r') as f:
        report = json.load(f)
    
    report['test_timestamp'] = datetime.now().isoformat()
    
    vulnerability = {
        'name': '$vuln_name',
        'severity': '$severity',
        'description': '$description',
        'impact': '$impact',
        'remediation': '$remediation',
        'discovered_at': datetime.now().isoformat()
    }
    
    report['vulnerabilities'].append(vulnerability)
    
    # Update risk counts
    if '$severity' == 'HIGH':
        report['risk_assessment']['high_risk_count'] += 1
    elif '$severity' == 'MEDIUM':
        report['risk_assessment']['medium_risk_count'] += 1
    elif '$severity' == 'LOW':
        report['risk_assessment']['low_risk_count'] += 1
    
    with open('$PENTEST_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
        
except Exception as e:
    print(f'Error updating pentest report: {e}', file=sys.stderr)
" 2>/dev/null || true
}

# Test 1: Network Service Enumeration and Vulnerability Assessment
test_network_services() {
    log "🌐 Testing Network Services Security..."
    
    # Port scanning
    info "Performing port scan on $TARGET_HOST..."
    
    # Check if nmap is available
    if ! command -v nmap &> /dev/null; then
        warning "nmap not available, using netstat for port enumeration"
        
        # Use netstat as fallback
        local open_ports=$(netstat -tln 2>/dev/null | grep LISTEN | awk '{print $4}' | cut -d: -f2 | sort -n | uniq)
        info "Open ports detected: $(echo $open_ports | tr '\n' ' ')"
        
        # Check for dangerous ports
        for port in $open_ports; do
            case "$port" in
                23) vulnerability "Telnet service detected on port 23" "HIGH" "Telnet transmits data in plaintext" "Disable telnet service and use SSH instead" ;;
                21) vulnerability "FTP service detected on port 21" "MEDIUM" "FTP may transmit credentials in plaintext" "Use SFTP or secure FTP alternatives" ;;
                135|139|445) vulnerability "SMB/NetBIOS service detected on port $port" "MEDIUM" "SMB services can be exploited" "Disable SMB services if not needed" ;;
                1433) vulnerability "SQL Server detected on port 1433" "HIGH" "Database directly exposed to network" "Restrict database access to localhost only" ;;
                3389) vulnerability "RDP service detected on port 3389" "MEDIUM" "Remote desktop service exposed" "Disable RDP or restrict access" ;;
                *) info "Port $port is open" ;;
            esac
        done
    else
        # Use nmap for comprehensive scanning
        local nmap_output=$(nmap -sS -O -sV --script vuln "$TARGET_HOST" 2>/dev/null || nmap -sT "$TARGET_HOST" 2>/dev/null)
        
        # Analyze nmap results
        if echo "$nmap_output" | grep -q "23/tcp.*open.*telnet"; then
            vulnerability "Telnet service detected" "HIGH" "Telnet transmits data in plaintext" "Disable telnet and use SSH"
        fi
        
        if echo "$nmap_output" | grep -q "21/tcp.*open.*ftp"; then
            vulnerability "FTP service detected" "MEDIUM" "FTP may be insecure" "Use SFTP instead of FTP"
        fi
        
        if echo "$nmap_output" | grep -q "80/tcp.*open.*http"; then
            warning "HTTP service detected - ensure HTTPS is also available"
        fi
        
        # Check for SSH version and configuration
        if echo "$nmap_output" | grep -q "22/tcp.*open.*ssh"; then
            success "SSH service detected on standard port"
            
            # Test SSH configuration
            local ssh_version=$(echo "$nmap_output" | grep "22/tcp" | grep -o "OpenSSH [0-9.]*" || echo "Unknown")
            info "SSH version: $ssh_version"
            
            # Check for SSH vulnerabilities
            if echo "$ssh_version" | grep -q "OpenSSH [1-6]\."; then
                vulnerability "Outdated SSH version detected" "HIGH" "Old SSH versions have known vulnerabilities" "Update SSH to latest version"
            fi
        fi
    fi
    
    # Test for unnecessary services
    local dangerous_services=("telnet" "rsh" "rlogin" "ftp" "tftp")
    
    for service in "${dangerous_services[@]}"; do
        if systemctl is-enabled "$service" &>/dev/null 2>&1; then
            vulnerability "Dangerous service '$service' is enabled" "HIGH" "Service $service is insecure" "Disable service: systemctl disable $service"
        else
            success "Dangerous service '$service' is not enabled"
        fi
    done
}

# Test 2: SSH Security Assessment
test_ssh_security() {
    log "🔐 Testing SSH Security Configuration..."
    
    # Test SSH configuration
    local ssh_config="/etc/ssh/sshd_config"
    
    if [[ -f "$ssh_config" ]]; then
        # Test for weak SSH configurations
        if grep -q "^PermitRootLogin yes" "$ssh_config"; then
            vulnerability "SSH root login is enabled" "CRITICAL" "Root login via SSH is a major security risk" "Set PermitRootLogin to no"
        else
            success "SSH root login is properly disabled"
        fi
        
        if grep -q "^PasswordAuthentication yes" "$ssh_config"; then
            vulnerability "SSH password authentication is enabled" "HIGH" "Password authentication is vulnerable to brute force" "Disable password auth, use keys only"
        else
            success "SSH password authentication is disabled"
        fi
        
        if grep -q "^PermitEmptyPasswords yes" "$ssh_config"; then
            vulnerability "SSH allows empty passwords" "CRITICAL" "Empty passwords are a critical security flaw" "Set PermitEmptyPasswords to no"
        else
            success "SSH empty passwords are disabled"
        fi
        
        if grep -q "^Protocol 1" "$ssh_config"; then
            vulnerability "SSH Protocol 1 is enabled" "CRITICAL" "SSH Protocol 1 has known vulnerabilities" "Use Protocol 2 only"
        else
            success "SSH Protocol 1 is not enabled"
        fi
        
        # Check for weak ciphers
        if grep -q "^Ciphers.*des\|^Ciphers.*rc4\|^Ciphers.*md5" "$ssh_config"; then
            vulnerability "Weak SSH ciphers detected" "MEDIUM" "Weak encryption ciphers are vulnerable" "Use strong ciphers only"
        else
            success "No weak SSH ciphers detected"
        fi
        
    else
        vulnerability "SSH configuration file not found" "HIGH" "Cannot verify SSH security settings" "Ensure SSH is properly configured"
    fi
    
    # Test SSH brute force protection
    info "Testing SSH brute force protection..."
    
    # Attempt multiple failed connections
    local failed_attempts=0
    for i in {1..3}; do
        if timeout 3 ssh -o ConnectTimeout=1 -o BatchMode=yes -o StrictHostKeyChecking=no invalid_user@"$TARGET_HOST" 2>/dev/null; then
            ((failed_attempts++))
        fi
        sleep 1
    done
    
    if [[ $failed_attempts -eq 3 ]]; then
        vulnerability "SSH does not implement brute force protection" "MEDIUM" "No rate limiting on SSH connections" "Install and configure fail2ban"
    else
        success "SSH appears to have brute force protection"
    fi
    
    # Test for SSH key security
    local ssh_keys_dir="$TRADING_AGENT_DIR/keys"
    if [[ -d "$ssh_keys_dir" ]]; then
        # Check key permissions
        local key_files=$(find "$ssh_keys_dir" -name "*.key" -o -name "*_rsa" -o -name "*_dsa" -o -name "*_ecdsa" -o -name "*_ed25519" 2>/dev/null)
        
        for key_file in $key_files; do
            if [[ -f "$key_file" ]]; then
                local key_perms=$(stat -c "%a" "$key_file")
                if [[ "$key_perms" != "600" ]]; then
                    vulnerability "SSH private key has insecure permissions: $key_file ($key_perms)" "HIGH" "Private keys should be readable only by owner" "chmod 600 $key_file"
                else
                    success "SSH private key has secure permissions: $(basename "$key_file")"
                fi
                
                # Check key strength
                if ssh-keygen -l -f "$key_file" 2>/dev/null | grep -q " 1024 "; then
                    vulnerability "Weak SSH key detected: $(basename "$key_file") (1024 bits)" "MEDIUM" "1024-bit keys are considered weak" "Generate new 2048+ bit key"
                elif ssh-keygen -l -f "$key_file" 2>/dev/null | grep -q " 2048 \| 4096 \| 256 "; then
                    success "Strong SSH key detected: $(basename "$key_file")"
                fi
            fi
        done
    fi
}

# Test 3: Web Application Security Assessment
test_web_application_security() {
    log "🌍 Testing Web Application Security..."
    
    # Check if web dashboard is running
    local dashboard_port="3000"
    if netstat -tln 2>/dev/null | grep ":$dashboard_port " || ss -tln 2>/dev/null | grep ":$dashboard_port "; then
        info "Web dashboard detected on port $dashboard_port"
        
        local base_url="http://$TARGET_HOST:$dashboard_port"
        
        # Test 1: Directory Traversal
        info "Testing for directory traversal vulnerabilities..."
        local traversal_payloads=(
            "../../../etc/passwd"
            "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts"
            "....//....//....//etc/passwd"
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
        )
        
        for payload in "${traversal_payloads[@]}"; do
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/$payload" 2>/dev/null || echo "000")
            if [[ "$response" == "200" ]]; then
                vulnerability "Directory traversal vulnerability detected" "CRITICAL" "Application allows access to system files" "Implement proper input validation and path sanitization"
                break
            fi
        done
        
        if [[ $? -ne 0 ]]; then
            success "No directory traversal vulnerabilities detected"
        fi
        
        # Test 2: Cross-Site Scripting (XSS)
        info "Testing for XSS vulnerabilities..."
        local xss_payloads=(
            "<script>alert('xss')</script>"
            "<img src=x onerror=alert('xss')>"
            "javascript:alert('xss')"
            "<svg onload=alert('xss')>"
        )
        
        for payload in "${xss_payloads[@]}"; do
            local response=$(curl -s "$base_url/?q=$payload" 2>/dev/null || echo "")
            if echo "$response" | grep -q "$payload"; then
                vulnerability "Reflected XSS vulnerability detected" "HIGH" "Application reflects user input without sanitization" "Implement proper input sanitization and output encoding"
                break
            fi
        done
        
        if [[ $? -ne 0 ]]; then
            success "No reflected XSS vulnerabilities detected"
        fi
        
        # Test 3: SQL Injection
        info "Testing for SQL injection vulnerabilities..."
        local sql_payloads=(
            "' OR '1'='1"
            "'; DROP TABLE users; --"
            "' UNION SELECT * FROM information_schema.tables --"
            "1' AND (SELECT COUNT(*) FROM information_schema.tables)>0 --"
        )
        
        for payload in "${sql_payloads[@]}"; do
            local response=$(curl -s "$base_url/api/data?id=$payload" 2>/dev/null || echo "")
            if echo "$response" | grep -qi "sql\|mysql\|postgresql\|database error\|syntax error"; then
                vulnerability "SQL injection vulnerability detected" "CRITICAL" "Application is vulnerable to SQL injection attacks" "Use parameterized queries and input validation"
                break
            fi
        done
        
        if [[ $? -ne 0 ]]; then
            success "No SQL injection vulnerabilities detected"
        fi
        
        # Test 4: Authentication Bypass
        info "Testing for authentication bypass..."
        
        # Test for admin panels without authentication
        local admin_paths=("admin" "administrator" "login" "dashboard" "panel" "control")
        
        for path in "${admin_paths[@]}"; do
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/$path" 2>/dev/null || echo "000")
            if [[ "$response" == "200" ]]; then
                local content=$(curl -s "$base_url/$path" 2>/dev/null || echo "")
                if echo "$content" | grep -qi "admin\|control\|management" && ! echo "$content" | grep -qi "login\|password\|authentication"; then
                    vulnerability "Unauthenticated admin panel detected: /$path" "HIGH" "Admin functionality accessible without authentication" "Implement proper authentication for admin areas"
                fi
            fi
        done
        
        # Test 5: Information Disclosure
        info "Testing for information disclosure..."
        
        # Check for exposed configuration files
        local config_files=(".env" "config.json" "package.json" ".git/config" "web.config")
        
        for config_file in "${config_files[@]}"; do
            local response=$(curl -s -o /dev/null -w "%{http_code}" "$base_url/$config_file" 2>/dev/null || echo "000")
            if [[ "$response" == "200" ]]; then
                vulnerability "Configuration file exposed: $config_file" "HIGH" "Sensitive configuration data accessible" "Restrict access to configuration files"
            fi
        done
        
        # Test 6: HTTPS Configuration
        info "Testing HTTPS configuration..."
        
        local https_url="https://$TARGET_HOST:$dashboard_port"
        if curl -k -s -o /dev/null -w "%{http_code}" "$https_url" 2>/dev/null | grep -q "200"; then
            success "HTTPS is available"
            
            # Test SSL/TLS configuration
            if command -v openssl &> /dev/null; then
                local ssl_info=$(echo | openssl s_client -connect "$TARGET_HOST:$dashboard_port" 2>/dev/null)
                
                # Check for weak protocols
                if echo "$ssl_info" | grep -q "Protocol.*SSLv[23]\|Protocol.*TLSv1\.0"; then
                    vulnerability "Weak SSL/TLS protocol detected" "MEDIUM" "Weak encryption protocols are vulnerable" "Disable SSLv2, SSLv3, and TLSv1.0"
                else
                    success "Strong SSL/TLS protocols in use"
                fi
                
                # Check for weak ciphers
                if echo "$ssl_info" | grep -q "Cipher.*RC4\|Cipher.*DES\|Cipher.*MD5"; then
                    vulnerability "Weak SSL/TLS ciphers detected" "MEDIUM" "Weak encryption ciphers are vulnerable" "Disable weak ciphers"
                else
                    success "Strong SSL/TLS ciphers in use"
                fi
            fi
        else
            warning "HTTPS is not available - consider implementing SSL/TLS"
        fi
        
        # Test 7: Security Headers
        info "Testing security headers..."
        
        local headers=$(curl -s -I "$base_url" 2>/dev/null || echo "")
        
        if ! echo "$headers" | grep -qi "X-Frame-Options"; then
            vulnerability "Missing X-Frame-Options header" "LOW" "Application vulnerable to clickjacking" "Add X-Frame-Options: DENY header"
        else
            success "X-Frame-Options header present"
        fi
        
        if ! echo "$headers" | grep -qi "X-Content-Type-Options"; then
            vulnerability "Missing X-Content-Type-Options header" "LOW" "Application vulnerable to MIME sniffing" "Add X-Content-Type-Options: nosniff header"
        else
            success "X-Content-Type-Options header present"
        fi
        
        if ! echo "$headers" | grep -qi "X-XSS-Protection"; then
            vulnerability "Missing X-XSS-Protection header" "LOW" "Missing XSS protection header" "Add X-XSS-Protection: 1; mode=block header"
        else
            success "X-XSS-Protection header present"
        fi
        
        if ! echo "$headers" | grep -qi "Strict-Transport-Security"; then
            warning "Missing HSTS header - consider adding for HTTPS sites"
        else
            success "HSTS header present"
        fi
        
    else
        info "Web dashboard not running on port $dashboard_port - skipping web application tests"
    fi
}

# Test 4: Database Security Assessment
test_database_security() {
    log "🗄️  Testing Database Security..."
    
    # Test PostgreSQL security
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL service is running"
        
        # Test for default credentials
        info "Testing for default database credentials..."
        
        local default_creds=("postgres:postgres" "postgres:" "admin:admin" "root:root" "sa:sa")
        
        for cred in "${default_creds[@]}"; do
            local username="${cred%:*}"
            local password="${cred#*:}"
            
            if PGPASSWORD="$password" psql -h localhost -U "$username" -d postgres -c "SELECT 1;" &>/dev/null; then
                vulnerability "Default database credentials detected: $username" "CRITICAL" "Default credentials allow unauthorized access" "Change default passwords immediately"
            fi
        done
        
        # Test database configuration
        local pg_hba_conf="/etc/postgresql/*/main/pg_hba.conf"
        if ls $pg_hba_conf &>/dev/null; then
            # Check for trust authentication
            if grep -q "^local.*trust\|^host.*trust" $pg_hba_conf; then
                vulnerability "PostgreSQL uses trust authentication" "HIGH" "Trust authentication allows passwordless access" "Configure proper authentication methods"
            else
                success "PostgreSQL does not use trust authentication"
            fi
            
            # Check for remote connections
            if grep -q "^host.*0\.0\.0\.0/0\|^host.*::/0" $pg_hba_conf; then
                vulnerability "PostgreSQL allows connections from any host" "HIGH" "Database accessible from any network location" "Restrict database access to specific hosts"
            else
                success "PostgreSQL access is properly restricted"
            fi
        fi
        
        # Test for exposed database port
        if netstat -tln 2>/dev/null | grep ":5432.*0\.0\.0\.0" || ss -tln 2>/dev/null | grep ":5432.*\*"; then
            vulnerability "PostgreSQL port exposed to all interfaces" "MEDIUM" "Database port accessible from network" "Bind database to localhost only"
        else
            success "PostgreSQL port is not exposed to all interfaces"
        fi
        
    else
        info "PostgreSQL service not running - skipping database security tests"
    fi
}

# Test 5: File System Security Assessment
test_filesystem_security() {
    log "📁 Testing File System Security..."
    
    # Test for world-writable files
    info "Scanning for world-writable files..."
    
    local world_writable=$(find "$TRADING_AGENT_DIR" -type f -perm -002 2>/dev/null | head -10)
    if [[ -n "$world_writable" ]]; then
        vulnerability "World-writable files detected" "MEDIUM" "Files writable by all users pose security risk" "Remove world-write permissions"
        info "World-writable files found: $world_writable"
    else
        success "No world-writable files detected in trading agent directory"
    fi
    
    # Test for SUID/SGID files
    info "Scanning for SUID/SGID files..."
    
    local suid_files=$(find "$TRADING_AGENT_DIR" -type f \( -perm -4000 -o -perm -2000 \) 2>/dev/null)
    if [[ -n "$suid_files" ]]; then
        vulnerability "SUID/SGID files detected in application directory" "HIGH" "SUID/SGID files can be exploited for privilege escalation" "Review and remove unnecessary SUID/SGID bits"
        info "SUID/SGID files: $suid_files"
    else
        success "No SUID/SGID files detected in trading agent directory"
    fi
    
    # Test sensitive file permissions
    local sensitive_files=(
        "$TRADING_AGENT_DIR/.env"
        "$TRADING_AGENT_DIR/keys"
        "/etc/passwd"
        "/etc/shadow"
        "/etc/ssh/sshd_config"
    )
    
    for file in "${sensitive_files[@]}"; do
        if [[ -e "$file" ]]; then
            local perms=$(stat -c "%a" "$file")
            local owner=$(stat -c "%U:%G" "$file")
            
            case "$(basename "$file")" in
                ".env")
                    if [[ "$perms" != "600" ]]; then
                        vulnerability "Environment file has insecure permissions: $perms" "HIGH" "Environment file contains sensitive data" "chmod 600 $file"
                    else
                        success "Environment file has secure permissions"
                    fi
                    ;;
                "keys")
                    if [[ "$perms" != "700" ]]; then
                        vulnerability "Keys directory has insecure permissions: $perms" "HIGH" "SSH keys directory should be private" "chmod 700 $file"
                    else
                        success "Keys directory has secure permissions"
                    fi
                    ;;
                "shadow")
                    if [[ "$perms" != "640" ]] && [[ "$perms" != "600" ]]; then
                        vulnerability "Shadow file has insecure permissions: $perms" "CRITICAL" "Shadow file contains password hashes" "chmod 640 $file"
                    else
                        success "Shadow file has secure permissions"
                    fi
                    ;;
            esac
        fi
    done
    
    # Test for backup files
    info "Scanning for backup files..."
    
    local backup_patterns=("*.bak" "*.backup" "*.old" "*~" "*.tmp")
    local backup_files=""
    
    for pattern in "${backup_patterns[@]}"; do
        local found=$(find "$TRADING_AGENT_DIR" -name "$pattern" -type f 2>/dev/null | head -5)
        if [[ -n "$found" ]]; then
            backup_files="$backup_files $found"
        fi
    done
    
    if [[ -n "$backup_files" ]]; then
        warning "Backup files detected - ensure they don't contain sensitive data"
        info "Backup files: $backup_files"
    else
        success "No backup files detected"
    fi
}

# Test 6: Authentication and Access Control Assessment
test_authentication_security() {
    log "🔑 Testing Authentication and Access Control..."
    
    # Test user account security
    info "Testing user account security..."
    
    # Check for accounts with empty passwords
    local empty_password_users=$(awk -F: '$2 == "" {print $1}' /etc/shadow 2>/dev/null || echo "")
    if [[ -n "$empty_password_users" ]]; then
        vulnerability "Users with empty passwords detected: $empty_password_users" "CRITICAL" "Empty passwords allow unauthorized access" "Set passwords for all user accounts"
    else
        success "No users with empty passwords detected"
    fi
    
    # Check for duplicate UIDs
    local duplicate_uids=$(awk -F: '{print $3}' /etc/passwd | sort | uniq -d)
    if [[ -n "$duplicate_uids" ]]; then
        vulnerability "Duplicate UIDs detected: $duplicate_uids" "HIGH" "Duplicate UIDs can cause access control issues" "Ensure all users have unique UIDs"
    else
        success "No duplicate UIDs detected"
    fi
    
    # Check for users with UID 0 (root privileges)
    local root_users=$(awk -F: '$3 == 0 {print $1}' /etc/passwd)
    if [[ "$root_users" != "root" ]]; then
        vulnerability "Multiple users with root privileges: $root_users" "HIGH" "Multiple root accounts increase attack surface" "Remove root privileges from non-root accounts"
    else
        success "Only root user has UID 0"
    fi
    
    # Test sudo configuration
    if [[ -f "/etc/sudoers" ]]; then
        # Check for passwordless sudo
        if grep -q "NOPASSWD" /etc/sudoers /etc/sudoers.d/* 2>/dev/null; then
            vulnerability "Passwordless sudo configuration detected" "MEDIUM" "Passwordless sudo reduces security" "Require passwords for sudo access"
        else
            success "Sudo requires password authentication"
        fi
        
        # Check for overly permissive sudo rules
        if grep -q "ALL.*ALL.*ALL" /etc/sudoers /etc/sudoers.d/* 2>/dev/null; then
            warning "Overly permissive sudo rules detected - review sudo configuration"
        else
            success "Sudo configuration appears restrictive"
        fi
    fi
    
    # Test trading user security
    if id trading &>/dev/null; then
        local trading_groups=$(groups trading | cut -d: -f2)
        
        # Check if trading user is in dangerous groups
        local dangerous_groups=("root" "sudo" "wheel" "admin")
        
        for group in $dangerous_groups; do
            if echo "$trading_groups" | grep -q "$group"; then
                vulnerability "Trading user is in privileged group: $group" "HIGH" "Trading user has elevated privileges" "Remove trading user from privileged groups"
            fi
        done
        
        if [[ $? -ne 0 ]]; then
            success "Trading user is not in privileged groups"
        fi
    fi
}

# Test 7: Encryption and Data Protection Assessment
test_encryption_security() {
    log "🔐 Testing Encryption and Data Protection..."
    
    # Test SSL/TLS certificates
    local ssl_cert_dir="$TRADING_AGENT_DIR/ssl/certs"
    if [[ -d "$ssl_cert_dir" ]]; then
        success "SSL certificate directory exists"
        
        # Check certificate security
        for cert in "$ssl_cert_dir"/*.crt; do
            if [[ -f "$cert" ]]; then
                # Check certificate expiry
                local expiry_date=$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | cut -d= -f2)
                if [[ -n "$expiry_date" ]]; then
                    local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || echo "0")
                    local current_timestamp=$(date +%s)
                    local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                    
                    if [[ $days_until_expiry -lt 0 ]]; then
                        vulnerability "SSL certificate expired: $(basename "$cert")" "HIGH" "Expired certificates cause security warnings" "Renew SSL certificate"
                    elif [[ $days_until_expiry -lt 30 ]]; then
                        warning "SSL certificate expires soon: $(basename "$cert") ($days_until_expiry days)"
                    else
                        success "SSL certificate valid: $(basename "$cert") ($days_until_expiry days)"
                    fi
                fi
                
                # Check key strength
                local key_size=$(openssl x509 -in "$cert" -noout -text 2>/dev/null | grep "Public-Key:" | grep -o "[0-9]*" | head -1)
                if [[ -n "$key_size" ]] && [[ $key_size -lt 2048 ]]; then
                    vulnerability "Weak SSL certificate key: $(basename "$cert") ($key_size bits)" "MEDIUM" "Keys smaller than 2048 bits are considered weak" "Generate new certificate with 2048+ bit key"
                elif [[ -n "$key_size" ]]; then
                    success "Strong SSL certificate key: $(basename "$cert") ($key_size bits)"
                fi
                
                # Check for self-signed certificates
                local issuer=$(openssl x509 -in "$cert" -noout -issuer 2>/dev/null)
                local subject=$(openssl x509 -in "$cert" -noout -subject 2>/dev/null)
                
                if [[ "$issuer" == "$subject" ]]; then
                    warning "Self-signed certificate detected: $(basename "$cert") - consider using CA-signed certificate"
                else
                    success "CA-signed certificate: $(basename "$cert")"
                fi
            fi
        done
    else
        warning "SSL certificate directory not found - HTTPS may not be configured"
    fi
    
    # Test environment variable security
    if [[ -f "$TRADING_AGENT_DIR/.env" ]]; then
        # Check for plaintext sensitive data
        local sensitive_patterns=("password.*=" "secret.*=" "key.*=" "token.*=")
        
        for pattern in "${sensitive_patterns[@]}"; do
            if grep -i "$pattern" "$TRADING_AGENT_DIR/.env" | grep -v "ENCRYPTED\|HASHED\|\*\*\*"; then
                vulnerability "Potential plaintext sensitive data in .env file" "HIGH" "Sensitive data should be encrypted or hashed" "Encrypt sensitive configuration data"
                break
            fi
        done
        
        if [[ $? -ne 0 ]]; then
            success "No obvious plaintext sensitive data in .env file"
        fi
    fi
}

# Generate risk assessment and remediation plan
generate_risk_assessment() {
    log "📊 Generating Risk Assessment and Remediation Plan..."
    
    python3 -c "
import json
import sys
from datetime import datetime

try:
    with open('$PENTEST_REPORT', 'r') as f:
        report = json.load(f)
    
    # Calculate overall risk
    high_risk = $HIGH_RISK_VULNS
    medium_risk = $MEDIUM_RISK_VULNS
    low_risk = $LOW_RISK_VULNS
    
    if high_risk > 0:
        overall_risk = 'HIGH'
    elif medium_risk > 2:
        overall_risk = 'HIGH'
    elif medium_risk > 0 or low_risk > 3:
        overall_risk = 'MEDIUM'
    else:
        overall_risk = 'LOW'
    
    # Update risk assessment
    report['risk_assessment'] = {
        'overall_risk': overall_risk,
        'high_risk_count': high_risk,
        'medium_risk_count': medium_risk,
        'low_risk_count': low_risk,
        'total_vulnerabilities': high_risk + medium_risk + low_risk
    }
    
    # Generate remediation plan
    remediation_plan = []
    
    if high_risk > 0:
        remediation_plan.append({
            'priority': 'CRITICAL',
            'action': f'Address {high_risk} high-risk vulnerabilities immediately',
            'timeline': 'Within 24 hours'
        })
    
    if medium_risk > 0:
        remediation_plan.append({
            'priority': 'HIGH',
            'action': f'Address {medium_risk} medium-risk vulnerabilities',
            'timeline': 'Within 1 week'
        })
    
    if low_risk > 0:
        remediation_plan.append({
            'priority': 'MEDIUM',
            'action': f'Address {low_risk} low-risk vulnerabilities',
            'timeline': 'Within 1 month'
        })
    
    remediation_plan.extend([
        {
            'priority': 'ONGOING',
            'action': 'Implement regular security monitoring and alerting',
            'timeline': 'Continuous'
        },
        {
            'priority': 'ONGOING',
            'action': 'Conduct monthly penetration testing',
            'timeline': 'Monthly'
        },
        {
            'priority': 'ONGOING',
            'action': 'Keep all systems and software updated',
            'timeline': 'Weekly'
        }
    ])
    
    report['remediation_plan'] = remediation_plan
    report['test_timestamp'] = datetime.now().isoformat()
    
    with open('$PENTEST_REPORT', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'Overall Risk Level: {overall_risk}')
    print(f'High Risk Vulnerabilities: {high_risk}')
    print(f'Medium Risk Vulnerabilities: {medium_risk}')
    print(f'Low Risk Vulnerabilities: {low_risk}')
    print(f'Total Vulnerabilities: {high_risk + medium_risk + low_risk}')
    
except Exception as e:
    print(f'Error generating risk assessment: {e}', file=sys.stderr)
    sys.exit(1)
" | tee -a "$PENTEST_LOG"
}

# Display penetration testing summary
display_pentest_summary() {
    log "📋 Penetration Testing Summary"
    echo ""
    echo "=== PENETRATION TESTING RESULTS ==="
    echo "Test completed: $(date)"
    echo "Target system: AI Crypto Trading Agent (Intel NUC)"
    echo "Total tests executed: $TOTAL_TESTS"
    echo "Vulnerabilities found: $VULNERABILITIES_FOUND"
    echo ""
    echo "Risk Breakdown:"
    echo "  High Risk: $HIGH_RISK_VULNS"
    echo "  Medium Risk: $MEDIUM_RISK_VULNS"
    echo "  Low Risk: $LOW_RISK_VULNS"
    echo ""
    
    # Display overall risk assessment
    if [[ -f "$PENTEST_REPORT" ]]; then
        python3 -c "
import json
try:
    with open('$PENTEST_REPORT', 'r') as f:
        report = json.load(f)
    
    risk_assessment = report.get('risk_assessment', {})
    overall_risk = risk_assessment.get('overall_risk', 'UNKNOWN')
    
    print(f'Overall Risk Level: {overall_risk}')
    
    if overall_risk == 'HIGH':
        print('⚠️  CRITICAL: Immediate action required to address security vulnerabilities')
    elif overall_risk == 'MEDIUM':
        print('⚠️  WARNING: Security improvements needed')
    else:
        print('✅ System appears to have acceptable security posture')
    
except:
    print('Could not read penetration test report')
"
    fi
    
    echo ""
    echo "📄 Reports generated:"
    echo "  - Penetration test log: $PENTEST_LOG"
    echo "  - Detailed report: $PENTEST_REPORT"
    echo ""
    
    if [[ $VULNERABILITIES_FOUND -gt 0 ]]; then
        echo -e "${RED}⚠️  ATTENTION: $VULNERABILITIES_FOUND vulnerabilities discovered${NC}"
        echo "Review the detailed report and implement remediation measures."
    else
        echo -e "${GREEN}✅ No critical vulnerabilities discovered${NC}"
        echo "System appears to have good security posture."
    fi
    
    echo ""
}

# Main execution function
main() {
    log "🎯 Starting Comprehensive Penetration Testing..."
    
    # Initialize penetration testing environment
    init_pentest
    
    # Execute penetration tests
    test_network_services
    test_ssh_security
    test_web_application_security
    test_database_security
    test_filesystem_security
    test_authentication_security
    test_encryption_security
    
    # Generate risk assessment and remediation plan
    generate_risk_assessment
    
    # Display summary
    display_pentest_summary
    
    log "✅ Penetration testing completed!"
    
    # Return appropriate exit code based on findings
    if [[ $HIGH_RISK_VULNS -gt 0 ]]; then
        exit 2  # High risk vulnerabilities found
    elif [[ $MEDIUM_RISK_VULNS -gt 0 ]]; then
        exit 1  # Medium risk vulnerabilities found
    else
        exit 0  # No significant vulnerabilities
    fi
}

# Execute main function
main "$@"