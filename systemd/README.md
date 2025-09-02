# systemd Service Files for Trading Agent

This directory contains systemd service files for deploying the AI Crypto Trading Agent on Ubuntu/Intel NUC.

## Service Files

### 1. ssh-tunnel.service
- **Purpose**: Manages SSH tunnel to Oracle Cloud for Gate.io API access
- **Dependencies**: network-online.target
- **Port**: localhost:8443 → Oracle Cloud → Gate.io API
- **Features**: Auto-restart, health monitoring, failure recovery

### 2. trading-agent.service
- **Purpose**: Main trading application service
- **Dependencies**: ssh-tunnel.service, postgresql.service
- **Features**: Pre-start checks, health monitoring, graceful shutdown
- **Resource Limits**: 1GB memory, 80% CPU quota

### 3. trading-dashboard.service
- **Purpose**: Web dashboard for monitoring and control
- **Dependencies**: trading-agent.service
- **Port**: 3000 (local network access)
- **Features**: Network restrictions, resource limits

## Installation Instructions

1. **Copy service files to systemd directory:**
   ```bash
   sudo cp systemd/*.service /etc/systemd/system/
   ```

2. **Make scripts executable:**
   ```bash
   chmod +x scripts/*.sh
   ```

3. **Reload systemd daemon:**
   ```bash
   sudo systemctl daemon-reload
   ```

4. **Enable services for auto-start:**
   ```bash
   sudo systemctl enable ssh-tunnel
   sudo systemctl enable trading-agent
   sudo systemctl enable trading-dashboard
   ```

5. **Start services:**
   ```bash
   sudo systemctl start ssh-tunnel
   sudo systemctl start trading-agent
   sudo systemctl start trading-dashboard
   ```

## Service Management

### Using the Service Manager Script
```bash
# Start all services
./scripts/service-manager.sh start

# Check status of all services
./scripts/service-manager.sh status

# Run health checks
./scripts/service-manager.sh health

# View logs
./scripts/service-manager.sh logs

# Follow logs in real-time
./scripts/service-manager.sh follow
```

### Individual Service Management
```bash
# SSH Tunnel
./scripts/tunnel-manager.sh start
./scripts/tunnel-manager.sh status
./scripts/tunnel-manager.sh test

# Check service status
sudo systemctl status ssh-tunnel
sudo systemctl status trading-agent
sudo systemctl status trading-dashboard

# View logs
sudo journalctl -u ssh-tunnel -f
sudo journalctl -u trading-agent -f
sudo journalctl -u trading-dashboard -f
```

## Service Dependencies

```
network-online.target
    ↓
ssh-tunnel.service
    ↓
trading-agent.service
    ↓
trading-dashboard.service
```

## Health Monitoring

Each service includes health monitoring scripts:

- **tunnel-health-check.sh**: Verifies SSH tunnel and API connectivity
- **trading-health-check.sh**: Monitors trading agent process and memory
- **dashboard-health-check.sh**: Checks dashboard accessibility and API endpoints

## Security Features

- **User isolation**: All services run as 'trading' user
- **Network restrictions**: Dashboard limited to local network access
- **Resource limits**: Memory and CPU quotas to prevent resource exhaustion
- **File system protection**: Read-only system directories, limited write access

## Logging

All services log to systemd journal:
- **SSH Tunnel**: SyslogIdentifier=ssh-tunnel
- **Trading Agent**: SyslogIdentifier=trading-agent
- **Dashboard**: SyslogIdentifier=trading-dashboard

Additional logs stored in `/var/log/trading-agent/`:
- `tunnel-health.log`
- `health-check.log`
- `dashboard-health.log`
- `service-manager.log`

## Troubleshooting

### Service Won't Start
1. Check dependencies: `sudo systemctl list-dependencies <service>`
2. View detailed logs: `sudo journalctl -u <service> -n 50`
3. Run pre-start checks manually
4. Verify file permissions and ownership

### SSH Tunnel Issues
1. Test SSH connection: `ssh -i /opt/trading-agent/keys/oracle_key opc@168.138.104.117`
2. Check tunnel health: `./scripts/tunnel-manager.sh test`
3. Verify Oracle Cloud firewall settings
4. Check local firewall rules

### Dashboard Not Accessible
1. Verify port 3000 is listening: `netstat -tuln | grep :3000`
2. Check local network IP: `hostname -I`
3. Test from another device on same network
4. Verify firewall allows local network access

## File Permissions

Ensure proper ownership and permissions:
```bash
sudo chown -R trading:trading /opt/trading-agent
sudo chmod +x /opt/trading-agent/scripts/*.sh
sudo chmod 600 /opt/trading-agent/keys/oracle_key
sudo chmod 644 /opt/trading-agent/.env
```

## Environment Variables

Required in `/opt/trading-agent/.env`:
- `ORACLE_SSH_HOST=168.138.104.117`
- `ORACLE_SSH_USERNAME=opc`
- `SSH_PRIVATE_KEY_PATH=/opt/trading-agent/keys/oracle_key`
- `GATE_IO_BASE_URL=http://localhost:8443/api/v4`
- `NODE_ENV=production`