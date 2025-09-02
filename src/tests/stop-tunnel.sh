#!/bin/bash

# SSH Tunnel Stop Script for Ubuntu Server

echo "⏹️  Stopping SSH Tunnel..."
echo "=========================="

# Check if tunnel.pid exists
if [ ! -f tunnel.pid ]; then
    echo "⚠️  tunnel.pid file not found"
    echo "   Checking for running SSH tunnels..."
    
    # Look for SSH processes with our tunnel pattern
    SSH_PIDS=$(pgrep -f "ssh.*8443:api.gateio.ws:443" || true)
    
    if [ -z "$SSH_PIDS" ]; then
        echo "✅ No SSH tunnels found running"
        exit 0
    else
        echo "🔍 Found SSH tunnel processes: $SSH_PIDS"
        for pid in $SSH_PIDS; do
            echo "   Killing process $pid..."
            kill $pid 2>/dev/null || true
        done
        echo "✅ SSH tunnels stopped"
        exit 0
    fi
fi

# Read PID from file
SSH_PID=$(cat tunnel.pid)

# Check if process is running
if kill -0 $SSH_PID 2>/dev/null; then
    echo "🔍 Found SSH tunnel process: $SSH_PID"
    echo "   Stopping gracefully..."
    
    # Try graceful termination first
    kill $SSH_PID
    
    # Wait up to 5 seconds for graceful shutdown
    for i in {1..5}; do
        if ! kill -0 $SSH_PID 2>/dev/null; then
            echo "✅ SSH tunnel stopped gracefully"
            rm -f tunnel.pid
            exit 0
        fi
        sleep 1
    done
    
    # Force kill if still running
    echo "   Force killing process..."
    kill -9 $SSH_PID 2>/dev/null || true
    echo "✅ SSH tunnel force stopped"
else
    echo "⚠️  SSH tunnel process $SSH_PID not found (may have already stopped)"
fi

# Clean up PID file
rm -f tunnel.pid

# Double-check no tunnels are running
REMAINING=$(pgrep -f "ssh.*8443:api.gateio.ws:443" || true)
if [ -n "$REMAINING" ]; then
    echo "⚠️  Found remaining SSH tunnel processes: $REMAINING"
    echo "   Cleaning up..."
    for pid in $REMAINING; do
        kill -9 $pid 2>/dev/null || true
    done
fi

echo "✅ All SSH tunnels stopped"