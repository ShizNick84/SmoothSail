# Deployment Guide

## Overview

This guide covers production deployment of the AI Crypto Trading Agent with automated deployment scripts and procedures.

## Deployment Methods

1. [Manual Deployment](./manual-deployment.md)
2. [Automated Deployment](./automated-deployment.md)
3. [Docker Deployment](./docker-deployment.md)
4. [CI/CD Pipeline](./cicd-pipeline.md)

## Pre-Deployment Checklist

### System Requirements
- [ ] Intel NUC with Ubuntu 22.04 LTS
- [ ] Node.js 18.0.0+ installed
- [ ] SSH access to Oracle Free Tier (168.138.104.117)
- [ ] Gate.io API credentials configured
- [ ] Email and Telegram credentials configured

### Security Requirements
- [ ] Firewall configured (UFW)
- [ ] Fail2Ban installed and configured
- [ ] SSH keys generated and deployed
- [ ] SSL certificates obtained (if using HTTPS)
- [ ] Environment variables encrypted

### Network Requirements
- [ ] Internet connectivity verified
- [ ] SSH tunnel to Oracle tested
- [ ] Gate.io API connectivity tested
- [ ] Email SMTP connectivity tested
- [ ] Telegram bot connectivity tested

## Quick Deployment

### Automated Deployment Script

```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e

echo "🚀 Starting AI Crypto Trading Agent deployment..."

# Check prerequisites
./scripts/check-prerequisites.sh

# Install system dependencies
./scripts/install-dependencies.sh

# Configure security
./scripts/configure-security.sh

# Setup SSH tunnel
./scripts/setup-ssh-tunnel.sh

# Deploy application
./scripts/deploy-application.sh

# Configure services
./scripts/configure-services.sh

# Run tests
./scripts/run-deployment-tests.sh

echo "✅ Deployment completed successfully!"
echo "📊 Dashboard: http://localhost:3002"
echo "🔧 API: http://localhost:3001"
```

### Run Deployment

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## Environment-Specific Deployments

### Development Environment

```bash
# Set environment
export NODE_ENV=development

# Install dev dependencies
npm install

# Start development servers
npm run dev &
npm run dashboard:dev &
```

### Staging Environment

```bash
# Set environment
export NODE_ENV=staging

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.staging.js
```

### Production Environment

```bash
# Set environment
export NODE_ENV=production

# Build and optimize
npm run build
npm run optimize

# Start production services
pm2 start ecosystem.config.js
pm2 save
```

## Deployment Verification

### Health Checks

```bash
# API health check
curl -f http://localhost:3001/api/v1/health || exit 1

# Dashboard health check
curl -f http://localhost:3002 || exit 1

# SSH tunnel check
npm run tunnel:status || exit 1

# Trading system check
npm run trading:status || exit 1
```

### Performance Tests

```bash
# Load testing
npm run test:load

# Security testing
npm run test:security

# Integration testing
npm run test:integration
```

## Rollback Procedures

### Automatic Rollback

```bash
#!/bin/bash
# rollback.sh - Automatic rollback script

echo "🔄 Starting rollback procedure..."

# Stop current services
pm2 stop all

# Restore previous version
./scripts/restore-backup.sh

# Start services
pm2 start ecosystem.config.js

# Verify rollback
./scripts/verify-deployment.sh

echo "✅ Rollback completed successfully!"
```

### Manual Rollback

```bash
# Stop services
pm2 stop all

# Switch to previous version
git checkout previous-stable-tag

# Rebuild
npm run build

# Restart services
pm2 start ecosystem.config.js
```