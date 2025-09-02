#!/bin/bash

# AI Crypto Trading Agent - SSH Tunnel Startup (Linux/Ubuntu)
# This script replaces the Windows .bat file for Ubuntu server deployment

set -e  # Exit on any error

echo "========================================"
echo "AI Crypto Trading Agent - SSH Tunnel Startup"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "[ERROR] .env file not found!"
    echo "Please make sure you have configured your .env file with:"
    echo "- ORACLE_SSH_HOST"
    echo "- ORACLE_SSH_USERNAME"
    echo "- SSH_PRIVATE_KEY_PATH"
    echo "- GATE_IO_API_KEY"
    echo "- GATE_IO_API_SECRET"
    exit 1
fi

echo "[INFO] Creating required directories..."
mkdir -p data logs temp

echo "[INFO] Installing dependencies..."
npm install

echo "[INFO] Building the project..."
npm run build

echo "[INFO] Starting SSH tunnel to Oracle Cloud..."
./start-tunnel.sh

# Wait a moment for tunnel to establish
sleep 5

echo "[INFO] Starting AI Crypto Trading Agent with SSH Tunnel..."
echo ""
echo "The application will:"
echo "1. ✅ SSH tunnel to Oracle Cloud (168.138.104.117)"
echo "2. 🔗 Route Gate.io API calls through the tunnel"
echo "3. 🌐 Start the dashboard on http://localhost:3000"
echo "4. 🤖 Initialize trading engine"
echo ""
echo "Press Ctrl+C to stop the application"
echo ""

# Start the main application
node dist/main.js