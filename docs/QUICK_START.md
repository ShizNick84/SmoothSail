# 🚀 Quick Start Guide - SSH Tunnel + Dashboard Access

## Overview
This guide will help you:
1. ✅ Test SSH connection to Oracle Cloud
2. ✅ Start SSH tunnel to Gate.io
3. ✅ Launch the dashboard
4. ✅ Begin trading operations

## Prerequisites Check
- ✅ Node.js installed
- ✅ Oracle Cloud VPS (168.138.104.117)
- ✅ Gate.io API credentials
- ✅ SSH private key configured

## Step 1: Test SSH Connection

First, let's verify your SSH connection works:

```bash
npm run test:ssh
```

This will test:
- SSH connection to Oracle Cloud
- Port forwarding capability
- Private key authentication

**If this fails**, check your `.env` file for:
- `ORACLE_SSH_HOST=168.138.104.117`
- `ORACLE_SSH_USERNAME=opc`
- `ORACLE_SSH_PRIVATE_KEY` or `SSH_PRIVATE_KEY_PATH`

## Step 2: Build the Project

```bash
npm run build
```

## Step 3: Start the Application

### Option A: Windows (Recommended)
```cmd
scripts\start-with-tunnel.bat
```

### Option B: Direct Command
```bash
npm start
```

## Step 4: Access the Dashboard

Once started, you'll see:
```
✅ AI Crypto Trading Agent is now running!
📊 Dashboard available at: http://localhost:3000
🔗 SSH Tunnel Status: Connected
```

Open your browser and go to: **http://localhost:3000**

## Application Startup Sequence

The application follows this exact order:

1. **🔐 Security Manager** - Initialize encryption and security
2. **💾 Database** - Connect to PostgreSQL database
3. **🔗 SSH Tunnel** - Establish tunnel to Gate.io via Oracle Cloud
4. **🤖 AI Engine** - Initialize Gemini AI for analysis
5. **📈 Trading Engine** - Connect to Gate.io through tunnel
6. **🖥️ Dashboard** - Start web interface on port 3000
7. **▶️ Trading Operations** - Begin automated trading

## Connection Flow

```
Your App → SSH Tunnel → Oracle Cloud → Gate.io API
localhost:8443 ← tunnel ← 168.138.104.117 ← api.gateio.ws:443
```

## Dashboard Features

Once connected, you'll have access to:

### 📊 Main Dashboard
- Real-time portfolio balance
- Active positions and P&L
- Trading performance metrics
- SSH tunnel connection status

### 📈 Trading Interface
- Place manual trades
- Monitor automated strategies
- Adjust risk parameters
- View order history

### 🤖 AI Analysis
- Market sentiment analysis
- Trade recommendations
- Risk assessments
- Performance predictions

### ⚙️ System Monitoring
- SSH tunnel health
- API connection status
- System resource usage
- Error logs and alerts

## Troubleshooting

### SSH Connection Issues

**Problem**: SSH test fails
```bash
# Test manual SSH connection
ssh -i ~/.ssh/id_rsa opc@168.138.104.117

# Check key permissions (Linux/Mac)
chmod 600 ~/.ssh/id_rsa

# Verify Oracle Cloud security rules allow SSH (port 22)
```

### Gate.io API Issues

**Problem**: API calls fail after tunnel is established
- ✅ Verify API key and secret in `.env`
- ✅ Check Gate.io IP whitelist includes Oracle Cloud IP
- ✅ Ensure API permissions include spot trading
- ✅ Test API directly through tunnel

### Dashboard Not Loading

**Problem**: Can't access http://localhost:3000
- ✅ Check if port 3000 is available
- ✅ Verify Windows firewall allows port 3000
- ✅ Try different port in `.env`: `PORT=3001`
- ✅ Check application logs in `./logs/trading.log`

### Database Connection Issues

**Problem**: Database connection fails
- ✅ Ensure PostgreSQL is running
- ✅ Verify database credentials in `.env`
- ✅ Check if database `scalping_alchemist` exists
- ✅ Test connection: `psql -h localhost -U trading_user -d scalping_alchemist`

## Environment Variables Quick Reference

Key variables for SSH tunnel and dashboard:

```env
# SSH Tunnel
ORACLE_SSH_HOST=168.138.104.117
ORACLE_SSH_USERNAME=opc
ORACLE_SSH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Gate.io API (routed through tunnel)
GATE_IO_API_KEY=your_api_key
GATE_IO_API_SECRET=your_api_secret

# Dashboard
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_HOST=localhost
DATABASE_NAME=scalping_alchemist
DATABASE_USER=trading_user
DATABASE_PASSWORD=secure_password_123
```

## Success Indicators

When everything is working correctly, you should see:

```
🚀 Starting AI Crypto Trading Agent...
🔐 Initializing Security Manager...
💾 Initializing Database...
🔗 Setting up SSH Tunnel to Gate.io...
✅ SSH Tunnel established successfully!
🤖 Initializing AI Engine...
📈 Initializing Trading Engine...
🖥️ Starting Dashboard Server...
📊 Dashboard server started on http://localhost:3000
▶️ Starting Trading Operations...
✅ AI Crypto Trading Agent is now running!
```

## Next Steps

1. **Monitor Dashboard**: Check real-time data and system health
2. **Review AI Analysis**: Verify AI recommendations are generating
3. **Test Trading**: Start with small position sizes
4. **Configure Alerts**: Set up Telegram/email notifications
5. **Optimize Settings**: Adjust risk parameters based on performance

## Support

If you encounter issues:
1. Check logs: `tail -f logs/trading.log`
2. Test SSH: `npm run test:ssh`
3. Verify configuration: Review `.env` file
4. Check system resources: Monitor CPU/memory usage

---

**🎉 You're ready to start trading with AI-powered analysis and secure SSH tunnel connectivity!**