#!/bin/bash

# Intel NUC Deployment Test Script
# This script tests the deployment on a clean Ubuntu system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"
LOG_DIR="/var/log/trading-agent"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TOTAL_TESTS=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    ((TOTAL_TESTS++))
    print_status "Running test: $test_name"
    
    if eval "$test_command"; then
        print_success "$test_name"
        ((TESTS_PASSED++))
        return 0
    else
        print_error "$test_name"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test functions
test_system_packages() {
    # Test Node.js installation
    node --version > /dev/null 2>&1 && npm --version > /dev/null 2>&1
}

test_postgresql_installation() {
    # Test PostgreSQL installation and service
    systemctl is-active --quiet postgresql && sudo -u postgres psql -c "SELECT version();" > /dev/null 2>&1
}

test_trading_user_creation() {
    # Test if trading user exists and has correct home directory
    id "$TRADING_USER" > /dev/null 2>&1 && [[ -d "$TRADING_HOME" ]]
}

test_directory_structure() {
    # Test if all required directories exist
    [[ -d "$TRADING_HOME/config" ]] && \
    [[ -d "$TRADING_HOME/logs" ]] && \
    [[ -d "$TRADING_HOME/scripts" ]] && \
    [[ -d "$TRADING_HOME/keys" ]] && \
    [[ -d "$TRADING_HOME/backups" ]] && \
    [[ -d "$LOG_DIR" ]]
}

test_directory_permissions() {
    # Test directory ownership and permissions
    [[ $(stat -c "%U" "$TRADING_HOME") == "$TRADING_USER" ]] && \
    [[ $(stat -c "%G" "$TRADING_HOME") == "$TRADING_USER" ]] && \
    [[ $(stat -c "%a" "$TRADING_HOME/keys") == "700" ]]
}

test_ssh_key_generation() {
    # Test if SSH keys were generated
    [[ -f "$TRADING_HOME/keys/oracle_key" ]] && \
    [[ -f "$TRADING_HOME/keys/oracle_key.pub" ]] && \
    [[ $(stat -c "%a" "$TRADING_HOME/keys/oracle_key") == "600" ]]
}

test_database_configuration() {
    # Test database and user creation
    sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='trading_agent';" | grep -q "1" && \
    sudo -u postgres psql -c "SELECT 1 FROM pg_user WHERE usename='$TRADING_USER';" | grep -q "1"
}

test_firewall_configuration() {
    # Test UFW firewall status and rules
    ufw status | grep -q "Status: active" && \
    ufw status | grep -q "3000" && \
    ufw status | grep -q "22/tcp"
}

test_fail2ban_installation() {
    # Test fail2ban installation and status
    systemctl is-active --quiet fail2ban && \
    [[ -f "/etc/fail2ban/jail.local" ]]
}

test_systemd_services() {
    # Test if systemd service files were created
    [[ -f "/etc/systemd/system/ssh-tunnel.service" ]] && \
    [[ -f "/etc/systemd/system/trading-agent.service" ]] && \
    [[ -f "/etc/systemd/system/trading-dashboard.service" ]]
}

test_logrotate_configuration() {
    # Test logrotate configuration
    [[ -f "/etc/logrotate.d/trading-agent" ]]
}

test_scripts_creation() {
    # Test if management scripts were created
    [[ -f "$TRADING_HOME/scripts/health-check.sh" ]] && \
    [[ -x "$TRADING_HOME/scripts/health-check.sh" ]] && \
    [[ -f "$TRADING_HOME/scripts/backup.sh" ]] && \
    [[ -x "$TRADING_HOME/scripts/backup.sh" ]]
}

test_cron_jobs() {
    # Test if cron jobs were created
    sudo -u "$TRADING_USER" crontab -l | grep -q "health-check.sh" && \
    sudo -u "$TRADING_USER" crontab -l | grep -q "backup.sh"
}

test_global_npm_packages() {
    # Test global npm packages
    npm list -g pm2 > /dev/null 2>&1 && \
    npm list -g typescript > /dev/null 2>&1 && \
    npm list -g ts-node > /dev/null 2>&1
}

test_nginx_installation() {
    # Test nginx installation
    systemctl is-enabled --quiet nginx && \
    nginx -t > /dev/null 2>&1
}

test_tunnel_scripts() {
    # Test tunnel management scripts
    [[ -f "scripts/start-tunnel.sh" ]] && \
    [[ -f "scripts/stop-tunnel.sh" ]] && \
    [[ -f "scripts/tunnel-status.sh" ]]
}

test_environment_template() {
    # Test environment template creation
    [[ -f ".env.nuc.template" ]]
}

# Function to test SSH connectivity (requires Oracle Cloud to be accessible)
test_ssh_connectivity() {
    print_status "Testing SSH connectivity to Oracle Cloud (optional)..."
    
    if [[ -f "$TRADING_HOME/.env" ]]; then
        source "$TRADING_HOME/.env"
        
        if [[ -n "$ORACLE_SSH_HOST" ]] && [[ -n "$ORACLE_SSH_USERNAME" ]]; then
            if ssh -i "$TRADING_HOME/keys/oracle_key" \
                   -o ConnectTimeout=10 \
                   -o StrictHostKeyChecking=no \
                   -o BatchMode=yes \
                   "$ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST" \
                   "echo 'SSH test successful'" 2>/dev/null; then
                print_success "SSH connectivity to Oracle Cloud"
                return 0
            else
                print_warning "SSH connectivity test failed (this is expected if Oracle Cloud is not configured)"
                return 1
            fi
        else
            print_warning "Oracle Cloud SSH configuration not found in .env file"
            return 1
        fi
    else
        print_warning ".env file not found, skipping SSH connectivity test"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Starting Intel NUC deployment tests..."
    echo "========================================"
    
    # Core system tests
    run_test "Node.js and npm installation" "test_system_packages"
    run_test "PostgreSQL installation and service" "test_postgresql_installation"
    run_test "Trading user creation" "test_trading_user_creation"
    run_test "Directory structure creation" "test_directory_structure"
    run_test "Directory permissions" "test_directory_permissions"
    run_test "SSH key generation" "test_ssh_key_generation"
    run_test "Database configuration" "test_database_configuration"
    run_test "Firewall configuration" "test_firewall_configuration"
    run_test "Fail2ban installation" "test_fail2ban_installation"
    run_test "Systemd services creation" "test_systemd_services"
    run_test "Logrotate configuration" "test_logrotate_configuration"
    run_test "Management scripts creation" "test_scripts_creation"
    run_test "Cron jobs creation" "test_cron_jobs"
    run_test "Global npm packages" "test_global_npm_packages"
    run_test "Nginx installation" "test_nginx_installation"
    run_test "Tunnel scripts creation" "test_tunnel_scripts"
    run_test "Environment template creation" "test_environment_template"
    
    # Optional connectivity test
    test_ssh_connectivity || true  # Don't fail if this test fails
    
    echo "========================================"
    print_status "Test Results Summary:"
    print_success "Tests passed: $TESTS_PASSED"
    print_error "Tests failed: $TESTS_FAILED"
    print_status "Total tests: $TOTAL_TESTS"
    
    if [[ $TESTS_FAILED -eq 0 ]]; then
        print_success "All deployment tests passed! 🎉"
        echo ""
        print_status "Next steps:"
        echo "1. Copy your application code to $TRADING_HOME"
        echo "2. Create and configure .env file from template"
        echo "3. Install npm dependencies: cd $TRADING_HOME && npm install"
        echo "4. Build the application: npm run build"
        echo "5. Enable services: sudo systemctl enable ssh-tunnel trading-agent trading-dashboard"
        echo "6. Start services: sudo systemctl start ssh-tunnel trading-agent trading-dashboard"
        return 0
    else
        print_error "Some deployment tests failed. Please review the errors above."
        return 1
    fi
}

# Function to run specific test category
run_category_tests() {
    local category="$1"
    
    case $category in
        "system")
            run_test "Node.js and npm installation" "test_system_packages"
            run_test "PostgreSQL installation and service" "test_postgresql_installation"
            run_test "Global npm packages" "test_global_npm_packages"
            run_test "Nginx installation" "test_nginx_installation"
            ;;
        "user")
            run_test "Trading user creation" "test_trading_user_creation"
            run_test "Directory structure creation" "test_directory_structure"
            run_test "Directory permissions" "test_directory_permissions"
            ;;
        "security")
            run_test "SSH key generation" "test_ssh_key_generation"
            run_test "Firewall configuration" "test_firewall_configuration"
            run_test "Fail2ban installation" "test_fail2ban_installation"
            ;;
        "database")
            run_test "Database configuration" "test_database_configuration"
            ;;
        "services")
            run_test "Systemd services creation" "test_systemd_services"
            run_test "Logrotate configuration" "test_logrotate_configuration"
            ;;
        "scripts")
            run_test "Management scripts creation" "test_scripts_creation"
            run_test "Cron jobs creation" "test_cron_jobs"
            run_test "Tunnel scripts creation" "test_tunnel_scripts"
            run_test "Environment template creation" "test_environment_template"
            ;;
        *)
            print_error "Unknown test category: $category"
            echo "Available categories: system, user, security, database, services, scripts"
            return 1
            ;;
    esac
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  -a, --all                Run all deployment tests (default)"
    echo "  -c, --category CATEGORY  Run specific category of tests"
    echo "  -l, --list               List available test categories"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Test Categories:"
    echo "  system     - System packages and installations"
    echo "  user       - User and directory setup"
    echo "  security   - Security configuration (firewall, SSH, fail2ban)"
    echo "  database   - Database setup and configuration"
    echo "  services   - Systemd services and logging"
    echo "  scripts    - Management scripts and automation"
    echo ""
}

# Main execution
main() {
    local option="${1:-all}"
    local category="$2"
    
    case $option in
        -a|--all|all)
            run_all_tests
            ;;
        -c|--category)
            if [[ -z "$category" ]]; then
                print_error "Category not specified"
                show_usage
                exit 1
            fi
            run_category_tests "$category"
            ;;
        -l|--list)
            echo "Available test categories:"
            echo "  system, user, security, database, services, scripts"
            ;;
        -h|--help)
            show_usage
            ;;
        *)
            print_error "Unknown option: $option"
            show_usage
            exit 1
            ;;
    esac
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Some tests may not work correctly."
fi

# Run main function
main "$@"