# AI Crypto Trading Agent - Documentation

## 📖 Documentation Overview

This is the complete documentation for the AI Crypto Trading Agent - a military-grade, security-first cryptocurrency trading system designed for 24/7 operation on Intel NUC hardware.

## 🚀 Quick Start

**For System Administrators**: Start with the [System Administrator Manual](SYSTEM_ADMINISTRATOR_MANUAL.md) - this is your complete guide.

**For Quick Setup**: See the [Quick Start Guide](QUICK_START.md) for rapid deployment.

## 📚 Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [**System Administrator Manual**](SYSTEM_ADMINISTRATOR_MANUAL.md) | Complete system administration guide including installation, configuration, troubleshooting, error handling, and maintenance | System Administrators |
| [**Maintenance Procedures**](MAINTENANCE_PROCEDURES.md) | Daily, weekly, monthly maintenance tasks and procedures | Operations Team |
| [**Quick Start Guide**](QUICK_START.md) | Fast deployment and basic setup | All Users |

## 🏗️ Architecture & APIs

| Directory | Contents |
|-----------|----------|
| [**api/**](api/) | Complete API documentation and endpoints |
| [**architecture/**](architecture/) | System architecture and design documents |
| [**deployment/**](deployment/) | Production deployment guides |
| [**configuration/**](configuration/) | Configuration options and examples |

## 🚨 Emergency Information

### Critical Commands
```bash
# System health check
curl http://localhost:3001/api/health

# Emergency stop all trading
curl -X POST http://localhost:3001/api/emergency/stop

# System recovery
/usr/local/bin/trading-system-recovery

# Check service status
sudo systemctl status trading-agent ssh-tunnel
```

### Emergency Contacts
- **Operations**: ops@trading-system.com | +1-555-OPS-TEAM
- **Engineering**: eng@trading-system.com | +1-555-ENG-TEAM  
- **Emergency Hotline**: +1-555-EMERGENCY

### Key System Locations
- **Configuration**: `/opt/trading-agent/.env`
- **Logs**: `/var/log/trading-agent/`
- **Backups**: `/opt/trading-agent/backups/`
- **Scripts**: `/usr/local/bin/trading-*`

## 🎯 System Features

- 🔒 **Military-grade security** with comprehensive threat detection
- 📈 **Multi-strategy trading** (Moving Average, RSI, MACD, Fibonacci)
- 🤖 **AI-powered analysis** with local LLM integration
- 💰 **Advanced risk management** and capital preservation
- 🌐 **Secure SSH tunnel** through Oracle Free Tier
- 📱 **Modern dashboard** with PWA support
- 🔧 **Intel NUC optimized** for 24/7 operation
- 📊 **Comprehensive monitoring** and error handling
- 🛡️ **Automated recovery** and incident response

---

**Start Here**: [System Administrator Manual](SYSTEM_ADMINISTRATOR_MANUAL.md)