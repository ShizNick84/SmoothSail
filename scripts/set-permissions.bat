@echo off
REM =============================================================================
REM Set Permissions Script for Intel NUC Deployment
REM =============================================================================
REM This script sets proper permissions for production deployment
REM Run this on the Intel NUC after copying files
REM =============================================================================

echo Setting permissions for Intel NUC deployment...

REM Make scripts executable
chmod +x /opt/trading-agent/scripts/*.sh
chmod +x /opt/trading-agent/start-tunnel.sh
chmod +x /opt/trading-agent/stop-tunnel.sh

REM Set SSH key permissions
chmod 600 /opt/trading-agent/keys/oracle_key
chmod 644 /opt/trading-agent/keys/oracle_key.pub

REM Set .env file permissions
chmod 600 /opt/trading-agent/.env

REM Set directory permissions
chown -R trading:trading /opt/trading-agent
chown -R trading:trading /var/log/trading-agent

REM Set log directory permissions
chmod 755 /var/log/trading-agent
chmod 755 /opt/trading-agent/logs
chmod 755 /opt/trading-agent/data
chmod 755 /opt/trading-agent/backups

echo Permissions set successfully!