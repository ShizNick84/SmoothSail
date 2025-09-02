# Ubuntu Deployment Design Document

## Overview

This design outlines the migration of the AI Crypto Trading Agent from Windows development environment to Ubuntu running on Intel NUC at home. The system will use SSH tunnel through Oracle Cloud Free Tier to access Gate.io API, with local dashboard, database, and notification services.

## Architecture

### Network Architecture
```
┌───────────────────────────────────────────────────────────────────────────── ┐
│                           Home Network (Intel NUC)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   Trading Bot   │  │   Web Dashboard │  │   Database   │  │ Telegram/   │ │
│  │   (Node.js)     │  │   (Next.js)     │  │ (PostgreSQL) │  │ Email Bot   │ │
│  │   Port: 3001    │  │   Port: 3000    │  │ Port: 5432   │  │             │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  └─────────────┘ │
│           │                     │                  |                 |       │
│           └─────────────────────┼────────────────────────────────────────────┤
│                                 │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                        SSH Tunnel Manager                               │ │
│  │                     localhost:8443 -> Oracle                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────── ┘
                                │
                                ▼ (SSH Tunnel)
                    ┌─────────────────────────┐
                    │    Oracle Cloud Free    │
                    │    Ubuntu Server        │
                    │   168.138.104.117       │
                    └─────────────────────────┘
                                │
                                ▼ (Proxy to Gate.io)
                    ┌─────────────────────────┐
                    │      Gate.io API        │
                    │   api.gateio.ws:443     │
                    └─────────────────────────┘
```

### Communication Flow
```
Trading Bot → SSH Tunnel (localhost:8443) → Oracle Cloud → Gate.io API
     ↓
Dashboard ← Database ← Trading Data
     ↓
Telegram/Email ← Notifications ← Trading Events
```

### Intel NUC System Services
```
┌─────────────────────────────────────────────────────────────┐
│                Intel NUC systemd Services                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ trading-agent   │  │  ssh-tunnel     │  │ postgresql   │ │
│  │   .service      │  │   .service      │  │  .service    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   dashboard     │  │  notifications  │  │  log-rotate  │ │
│  │   .service      │  │   .service      │  │   .service   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Trading Bot Component (Intel NUC)
- **Purpose**: Core trading logic and API communication
- **Location**: `/opt/trading-agent/`
- **Technology**: Node.js, TypeScript
- **API Access**: Via SSH tunnel to Oracle Cloud
- **Dependencies**: Node.js 18+, npm packages

### 2. SSH Tunnel Component (Intel NUC)
- **Purpose**: Secure connection to Oracle Cloud for API access
- **Technology**: OpenSSH client
- **Configuration**: Auto-reconnect, health monitoring
- **Tunnel**: localhost:8443 → Oracle:443 → Gate.io API
- **Management**: systemd service with auto-restart

### 3. Web Dashboard Component (Intel NUC)
- **Purpose**: Real-time trading monitoring and control
- **Technology**: Next.js, React
- **Port**: 3000 (local network access)
- **Features**: Trading stats, logs, manual controls
- **Access**: Home network only (192.168.x.x)

### 4. Database Component (Intel NUC)
- **Purpose**: Store trading data, logs, and configuration
- **Technology**: PostgreSQL
- **Location**: Local Intel NUC storage
- **Backup**: Daily automated backups
- **Access**: Local applications only

### 5. Notification Component (Intel NUC)
- **Purpose**: Send trading alerts and status updates
- **Channels**: Telegram bot, Email SMTP
- **Triggers**: Trade execution, errors, system status
- **Configuration**: Telegram bot token, SMTP settings
- **Rate limiting**: Prevent spam notifications

### 6. Home Router Component
- **Purpose**: Network gateway and DHCP public IP
- **Configuration**: Port forwarding (if needed)
- **Security**: Firewall rules, VPN access (optional)
- **ISP**: Dynamic public IP from ISP

## Data Models

### Environment Configuration
```bash
# /opt/trading-agent/.env
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Oracle Cloud SSH Tunnel Configuration
ORACLE_SSH_HOST=168.138.104.117
ORACLE_SSH_USERNAME=opc
SSH_PRIVATE_KEY_PATH=/opt/trading-agent/keys/oracle_key

# Gate.io API (via SSH tunnel)
GATE_IO_API_KEY=your_api_key
GATE_IO_API_SECRET=your_api_secret
GATE_IO_BASE_URL=http://localhost:8443/api/v4
GATE_IO_ENABLED=true

# Database (local PostgreSQL)
DATABASE_URL=postgresql://trading_user:secure_password@localhost:5432/trading_agent
DATABASE_HOST=localhost
DATABASE_NAME=trading_agent
DATABASE_USER=trading_user
DATABASE_PASSWORD=secure_password

# Telegram Notifications
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Email Notifications
EMAIL_FROM=your_email@domain.com
EMAIL_PASSWORD=your_app_password
EMAIL_TO=alerts@yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/var/log/trading-agent/app.log

# Security
JWT_SECRET=generated_secret
ENCRYPTION_KEY=generated_key
```

### SSH Tunnel Service Configuration
```ini
# /etc/systemd/system/ssh-tunnel.service
[Unit]
Description=SSH Tunnel to Oracle Cloud for Gate.io API
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=trading
WorkingDirectory=/opt/trading-agent
ExecStart=/opt/trading-agent/start-tunnel.sh
Restart=always
RestartSec=30
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Trading Agent Service Configuration
```ini
# /etc/systemd/system/trading-agent.service
[Unit]
Description=AI Crypto Trading Agent
After=network.target ssh-tunnel.service postgresql.service
Requires=ssh-tunnel.service
Wants=postgresql.service

[Service]
Type=simple
User=trading
WorkingDirectory=/opt/trading-agent
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Dashboard Service Configuration
```ini
# /etc/systemd/system/trading-dashboard.service
[Unit]
Description=Trading Agent Web Dashboard
After=network.target trading-agent.service

[Service]
Type=simple
User=trading
WorkingDirectory=/opt/trading-agent
ExecStart=/usr/bin/npm run dashboard:start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Error Handling

### Service Failure Recovery
- **Auto-restart**: systemd automatically restarts failed services
- **Restart limits**: Prevent infinite restart loops
- **Logging**: All failures logged to systemd journal
- **Notifications**: Optional email/Telegram alerts on failures

### Network Connectivity Issues
- **Retry logic**: Built-in API retry mechanisms
- **Circuit breaker**: Prevent cascade failures
- **Fallback modes**: Graceful degradation when APIs unavailable
- **Health checks**: Regular connectivity monitoring

### Resource Exhaustion
- **Memory limits**: systemd memory limits to prevent OOM
- **Log rotation**: Prevent disk space issues
- **Process monitoring**: Alert on high resource usage
- **Cleanup routines**: Regular cleanup of temporary files

## Testing Strategy

### Pre-deployment Testing
1. **Local Ubuntu VM**: Test deployment scripts locally
2. **Dependency verification**: Ensure all packages install correctly
3. **Service testing**: Verify systemd service configuration
4. **Network testing**: Test direct API connectivity

### Deployment Testing
1. **Smoke tests**: Basic functionality after deployment
2. **API connectivity**: Verify Gate.io API access
3. **Web dashboard**: Ensure dashboard loads correctly
4. **Service management**: Test start/stop/restart operations

### Post-deployment Testing
1. **Load testing**: Verify performance under load
2. **Failover testing**: Test automatic restart functionality
3. **Security testing**: Verify firewall and permissions
4. **Monitoring testing**: Ensure logging and alerts work

### Rollback Strategy
1. **Backup current state**: Before any changes
2. **Version control**: Tag deployments for easy rollback
3. **Service snapshots**: systemd service backups
4. **Data backups**: Configuration and data backups

## Deployment Process

### Phase 1: Intel NUC Preparation
1. Install Ubuntu Server on Intel NUC
2. Update system packages and install dependencies
3. Install Node.js 18+, npm, PostgreSQL
4. Create service user and directories
5. Configure SSH keys for Oracle Cloud access

### Phase 2: Application Deployment
1. Transfer application files to Intel NUC
2. Install npm dependencies and build application
3. Configure environment variables for local setup
4. Set up PostgreSQL database and user
5. Configure SSH tunnel scripts and keys

### Phase 3: Service Configuration
1. Create systemd services (tunnel, trading, dashboard)
2. Configure service dependencies and startup order
3. Set up log rotation and monitoring
4. Configure local firewall rules

### Phase 4: Network Configuration
1. Configure home router (if port forwarding needed)
2. Test SSH tunnel to Oracle Cloud
3. Verify Gate.io API access through tunnel
4. Test local dashboard access from home network

### Phase 5: Notification Setup
1. Configure Telegram bot integration
2. Set up email SMTP configuration
3. Test notification delivery
4. Configure alert thresholds and rules

### Phase 6: Production Enablement
1. Enable all services for auto-start
2. Test system reboot and auto-recovery
3. Set up automated backups
4. Configure monitoring and health checks
5. Document operational procedures