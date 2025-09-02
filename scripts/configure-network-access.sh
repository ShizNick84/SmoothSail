#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - Network Access Configuration for Intel NUC
# =============================================================================
# This script configures network access for the dashboard on Intel NUC
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Configuration
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
TRADING_PORT="${TRADING_PORT:-3001}"

log "🌐 Configuring network access for AI Crypto Trading Agent..."

# Get network interface information
log "Detecting network interfaces..."
INTERFACES=$(ip -o link show | awk -F': ' '{print $2}' | grep -v lo)
PRIMARY_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
LOCAL_IP=$(ip route get 8.8.8.8 | awk '{print $7}' | head -1)

success "Primary network interface: $PRIMARY_INTERFACE"
success "Local IP address: $LOCAL_IP"

# Display network information
echo ""
echo "=== Network Configuration ==="
echo "Local IP: $LOCAL_IP"
echo "Dashboard URL: http://$LOCAL_IP:$DASHBOARD_PORT"
echo "Trading API: http://$LOCAL_IP:$TRADING_PORT"
echo ""

# Check if UFW is installed and configured
if command -v ufw &> /dev/null; then
    log "Configuring UFW firewall rules..."
    
    # Allow SSH (important for remote management)
    sudo ufw allow ssh
    
    # Allow dashboard port from local network
    sudo ufw allow from 192.168.0.0/16 to any port "$DASHBOARD_PORT"
    sudo ufw allow from 10.0.0.0/8 to any port "$DASHBOARD_PORT"
    sudo ufw allow from 172.16.0.0/12 to any port "$DASHBOARD_PORT"
    
    # Allow trading API port from local network (if different)
    if [[ "$TRADING_PORT" != "$DASHBOARD_PORT" ]]; then
        sudo ufw allow from 192.168.0.0/16 to any port "$TRADING_PORT"
        sudo ufw allow from 10.0.0.0/8 to any port "$TRADING_PORT"
        sudo ufw allow from 172.16.0.0/12 to any port "$TRADING_PORT"
    fi
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        warning "UFW is not active. Enabling UFW..."
        sudo ufw --force enable
    fi
    
    success "UFW firewall rules configured"
    
    # Display UFW status
    echo ""
    echo "=== UFW Firewall Status ==="
    sudo ufw status numbered
    echo ""
else
    warning "UFW firewall not found. Consider installing and configuring a firewall."
fi

# Check if systemd-resolved is managing DNS
if systemctl is-active --quiet systemd-resolved; then
    log "Configuring systemd-resolved for local network..."
    
    # Ensure local network resolution works
    if [[ -f /etc/systemd/resolved.conf ]]; then
        # Backup original configuration
        sudo cp /etc/systemd/resolved.conf /etc/systemd/resolved.conf.backup 2>/dev/null || true
        
        # Configure DNS settings for local network
        sudo tee -a /etc/systemd/resolved.conf > /dev/null << EOF

# AI Trading Agent - Local Network Configuration
DNS=8.8.8.8 1.1.1.1
FallbackDNS=8.8.4.4 1.0.0.1
Domains=~.
DNSSEC=no
DNSOverTLS=no
MulticastDNS=yes
LLMNR=yes
Cache=yes
EOF
        
        # Restart systemd-resolved
        sudo systemctl restart systemd-resolved
        success "systemd-resolved configured for local network"
    fi
fi

# Create network test script
log "Creating network connectivity test script..."
cat > "/tmp/test-network-access.sh" << EOF
#!/bin/bash

# Test network connectivity for AI Crypto Trading Agent
LOCAL_IP="$LOCAL_IP"
DASHBOARD_PORT="$DASHBOARD_PORT"
TRADING_PORT="$TRADING_PORT"

echo "🌐 Testing network connectivity..."
echo ""

# Test local dashboard access
echo "Testing dashboard access..."
if curl -s --max-time 5 "http://\$LOCAL_IP:\$DASHBOARD_PORT/health" > /dev/null; then
    echo "✅ Dashboard accessible at http://\$LOCAL_IP:\$DASHBOARD_PORT"
else
    echo "❌ Dashboard not accessible at http://\$LOCAL_IP:\$DASHBOARD_PORT"
fi

# Test from different network interfaces
echo ""
echo "Testing from different interfaces..."
for interface in \$(ip -o link show | awk -F': ' '{print \$2}' | grep -v lo); do
    interface_ip=\$(ip addr show \$interface | grep 'inet ' | awk '{print \$2}' | cut -d/ -f1 | head -1)
    if [[ -n "\$interface_ip" ]]; then
        echo "Interface \$interface (\$interface_ip):"
        if curl -s --max-time 3 --interface \$interface_ip "http://\$LOCAL_IP:\$DASHBOARD_PORT/health" > /dev/null 2>&1; then
            echo "  ✅ Accessible"
        else
            echo "  ❌ Not accessible"
        fi
    fi
done

echo ""
echo "Dashboard URLs to try from other devices:"
echo "  http://\$LOCAL_IP:\$DASHBOARD_PORT"
echo "  http://localhost:\$DASHBOARD_PORT (from Intel NUC only)"
echo ""
EOF

chmod +x "/tmp/test-network-access.sh"
success "Network test script created at /tmp/test-network-access.sh"

# Display connection information for other devices
echo ""
echo "=== Connection Information for Other Devices ==="
echo ""
echo "📱 Mobile/Tablet Access:"
echo "   Open browser and go to: http://$LOCAL_IP:$DASHBOARD_PORT"
echo ""
echo "💻 Laptop/Desktop Access:"
echo "   Open browser and go to: http://$LOCAL_IP:$DASHBOARD_PORT"
echo ""
echo "🔧 API Access:"
echo "   Base URL: http://$LOCAL_IP:$TRADING_PORT"
echo "   Health Check: http://$LOCAL_IP:$DASHBOARD_PORT/health"
echo "   System Status: http://$LOCAL_IP:$DASHBOARD_PORT/api/system/status"
echo ""

# Create QR code for mobile access if qrencode is available
if command -v qrencode &> /dev/null; then
    log "Generating QR code for mobile access..."
    DASHBOARD_URL="http://$LOCAL_IP:$DASHBOARD_PORT"
    qrencode -t ANSIUTF8 "$DASHBOARD_URL"
    echo ""
    echo "📱 Scan the QR code above with your mobile device to access the dashboard"
    echo ""
else
    log "Install qrencode to generate QR codes for mobile access: sudo apt install qrencode"
fi

# Test network connectivity
log "Running network connectivity test..."
bash "/tmp/test-network-access.sh"

success "Network access configuration completed! 🎉"
echo ""
echo "🌐 Your AI Crypto Trading Agent dashboard is now accessible from:"
echo "   • Intel NUC: http://localhost:$DASHBOARD_PORT"
echo "   • Local Network: http://$LOCAL_IP:$DASHBOARD_PORT"
echo "   • Any device on your home network"
echo ""
echo "🔧 Run the network test anytime with: bash /tmp/test-network-access.sh"