#!/bin/bash

# SSH Tunnel Startup Script for Ubuntu Server
# Establishes SSH tunnel to Oracle Cloud for Gate.io API routing

set -e  # Exit on any error

echo "🚀 Starting SSH Tunnel to Oracle Cloud..."
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# SSH Configuration
SSH_HOST="${ORACLE_SSH_HOST}"
SSH_USERNAME="${ORACLE_SSH_USERNAME}"
SSH_KEY_PATH="${SSH_PRIVATE_KEY_PATH}"
LOCAL_PORT=8443
REMOTE_HOST="api.gateio.ws"
REMOTE_PORT=443

# Validate configuration
if [ -z "$SSH_HOST" ] || [ -z "$SSH_USERNAME" ] || [ -z "$SSH_KEY_PATH" ]; then
    echo "❌ Missing SSH configuration in .env file:"
    echo "   ORACLE_SSH_HOST: ${SSH_HOST:-MISSING}"
    echo "   ORACLE_SSH_USERNAME: ${SSH_USERNAME:-MISSING}"
    echo "   SSH_PRIVATE_KEY_PATH: ${SSH_KEY_PATH:-MISSING}"
    exit 1
fi

# Check if private key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
    echo "❌ SSH private key not found: $SSH_KEY_PATH"
    exit 1
fi

# Set correct permissions for SSH key
chmod 600 "$SSH_KEY_PATH"
echo "✅ SSH key permissions set to 600"

echo "✅ SSH Configuration:"
echo "   Host: $SSH_HOST"
echo "   Username: $SSH_USERNAME"
echo "   Key: $SSH_KEY_PATH"
echo ""

echo "🔗 Tunnel Configuration:"
echo "   Local Port: $LOCAL_PORT"
echo "   Remote: $REMOTE_HOST:$REMOTE_PORT"
echo ""

# Check if tunnel is already running
if pgrep -f "ssh.*$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" > /dev/null; then
    echo "⚠️  SSH tunnel already running on port $LOCAL_PORT"
    echo "   Use 'pkill -f \"ssh.*$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT\"' to stop it"
    exit 1
fi

# Check if port is already in use
if netstat -tuln | grep ":$LOCAL_PORT " > /dev/null 2>&1; then
    echo "❌ Port $LOCAL_PORT is already in use"
    echo "   Use 'netstat -tuln | grep :$LOCAL_PORT' to check what's using it"
    exit 1
fi

echo "⏳ Establishing SSH tunnel..."

# Start SSH tunnel in background
ssh -N -T \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o ConnectTimeout=30 \
    -o ServerAliveInterval=60 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -i "$SSH_KEY_PATH" \
    -L "$LOCAL_PORT:$REMOTE_HOST:$REMOTE_PORT" \
    "$SSH_USERNAME@$SSH_HOST" &

# Get the SSH process ID
SSH_PID=$!
echo "$SSH_PID" > tunnel.pid

# Wait a moment for tunnel to establish
sleep 3

# Check if SSH process is still running
if ! kill -0 $SSH_PID 2>/dev/null; then
    echo "❌ SSH tunnel failed to start"
    rm -f tunnel.pid
    exit 1
fi

# Test if port is now listening
if ! netstat -tuln | grep ":$LOCAL_PORT " > /dev/null 2>&1; then
    echo "❌ SSH tunnel started but port $LOCAL_PORT is not listening"
    kill $SSH_PID 2>/dev/null || true
    rm -f tunnel.pid
    exit 1
fi

echo ""
echo "✅ SSH Tunnel Established Successfully!"
echo "🌐 Process ID: $SSH_PID"
echo "🔗 Gate.io API accessible at: http://localhost:$LOCAL_PORT"
echo ""
echo "🧪 Test the API with: node test-gateio-api.js"
echo "⚠️  To stop the tunnel, run: ./stop-tunnel.sh"
echo ""
echo "📝 Process ID saved to tunnel.pid"
echo "🔍 Monitor tunnel: tail -f /var/log/auth.log | grep ssh"