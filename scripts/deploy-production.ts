#!/usr/bin/env tsx

/**
 * Production Deployment Script
 * 
 * Automated deployment script for AI Crypto Trading Agent
 * Handles complete production deployment with security checks
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface DeploymentConfig {
  environment: 'production' | 'staging';
  skipTests: boolean;
  skipBackup: boolean;
  autoStart: boolean;
}

class ProductionDeployer {
  private config: DeploymentConfig;
  private startTime: Date;

  constructor(config: DeploymentConfig) {
    this.config = config;
    this.startTime = new Date();
  }

  async deploy(): Promise<void> {
    try {
      console.log('🚀 Starting production deployment...');
      console.log(`📅 Deployment started at: ${this.startTime.toISOString()}`);

      // Pre-deployment checks
      await this.runPreDeploymentChecks();

      // Create backup
      if (!this.config.skipBackup) {
        await this.createBackup();
      }

      // Install dependencies
      await this.installDependencies();

      // Run tests
      if (!this.config.skipTests) {
        await this.runTests();
      }

      // Build application
      await this.buildApplication();

      // Configure services
      await this.configureServices();

      // Deploy application
      await this.deployApplication();

      // Post-deployment verification
      await this.verifyDeployment();

      // Start services
      if (this.config.autoStart) {
        await this.startServices();
      }

      console.log('✅ Production deployment completed successfully!');
      this.printDeploymentSummary();

    } catch (error) {
      console.error('❌ Deployment failed:', error);
      await this.rollback();
      process.exit(1);
    }
  }

  private async runPreDeploymentChecks(): Promise<void> {
    console.log('🔍 Running pre-deployment checks...');

    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18.') && !nodeVersion.startsWith('v20.')) {
      throw new Error(`Unsupported Node.js version: ${nodeVersion}. Required: v18.x or v20.x`);
    }

    // Check environment file
    if (!existsSync('.env')) {
      throw new Error('.env file not found. Please create from .env.example');
    }

    // Validate environment variables
    const requiredVars = [
      'GATEIO_API_KEY',
      'GATEIO_API_SECRET',
      'ORACLE_HOST',
      'ORACLE_SSH_KEY_PATH',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const envContent = readFileSync('.env', 'utf-8');
    for (const varName of requiredVars) {
      if (!envContent.includes(`${varName}=`)) {
        throw new Error(`Required environment variable missing: ${varName}`);
      }
    }

    // Check SSH key
    const sshKeyPath = this.getEnvVar('ORACLE_SSH_KEY_PATH');
    if (!existsSync(sshKeyPath)) {
      throw new Error(`SSH key not found: ${sshKeyPath}`);
    }

    // Test SSH connection
    try {
      const oracleHost = this.getEnvVar('ORACLE_HOST');
      execSync(`ssh -i ${sshKeyPath} -o ConnectTimeout=10 ubuntu@${oracleHost} echo "Connection test"`, {
        stdio: 'pipe'
      });
      console.log('✅ SSH connection test passed');
    } catch (error) {
      throw new Error('SSH connection test failed. Check Oracle Free Tier connectivity.');
    }

    console.log('✅ Pre-deployment checks passed');
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating deployment backup...');

    const backupDir = `backups/deployment-${Date.now()}`;
    execSync(`mkdir -p ${backupDir}`);

    // Backup current application
    if (existsSync('dist')) {
      execSync(`cp -r dist ${backupDir}/`);
    }

    // Backup configuration
    execSync(`cp .env ${backupDir}/`);
    execSync(`cp package.json ${backupDir}/`);
    execSync(`cp ecosystem.config.js ${backupDir}/`);

    // Backup PM2 configuration
    try {
      execSync(`pm2 save`);
      execSync(`cp ~/.pm2/dump.pm2 ${backupDir}/`);
    } catch (error) {
      console.warn('⚠️ PM2 backup failed (may not be running)');
    }

    console.log(`✅ Backup created: ${backupDir}`);
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Installing dependencies...');

    // Clean install
    execSync('rm -rf node_modules package-lock.json');
    execSync('npm install --production', { stdio: 'inherit' });

    console.log('✅ Dependencies installed');
  }

  private async runTests(): Promise<void> {
    console.log('🧪 Running tests...');

    // Install dev dependencies for testing
    execSync('npm install --only=dev', { stdio: 'pipe' });

    // Run test suite
    execSync('npm run test', { stdio: 'inherit' });
    execSync('npm run test:security', { stdio: 'inherit' });

    // Clean dev dependencies
    execSync('npm prune --production', { stdio: 'pipe' });

    console.log('✅ All tests passed');
  }

  private async buildApplication(): Promise<void> {
    console.log('🔨 Building application...');

    // Install dev dependencies for build
    execSync('npm install --only=dev', { stdio: 'pipe' });

    // Build TypeScript
    execSync('npm run build', { stdio: 'inherit' });

    // Build dashboard
    execSync('npm run dashboard:build', { stdio: 'inherit' });

    // Clean dev dependencies
    execSync('npm prune --production', { stdio: 'pipe' });

    console.log('✅ Application built successfully');
  }

  private async configureServices(): Promise<void> {
    console.log('⚙️ Configuring services...');

    // Create systemd service file
    const serviceContent = `[Unit]
Description=AI Crypto Trading Agent
After=network.target

[Service]
Type=simple
User=${process.env.USER}
WorkingDirectory=${process.cwd()}
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=ai-crypto-trading

[Install]
WantedBy=multi-user.target
`;

    writeFileSync('/tmp/ai-crypto-trading.service', serviceContent);
    
    try {
      execSync('sudo cp /tmp/ai-crypto-trading.service /etc/systemd/system/');
      execSync('sudo systemctl daemon-reload');
      execSync('sudo systemctl enable ai-crypto-trading');
      console.log('✅ Systemd service configured');
    } catch (error) {
      console.warn('⚠️ Systemd service configuration failed (may require manual setup)');
    }

    // Configure log rotation
    const logrotateContent = `${process.cwd()}/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 ${process.env.USER} ${process.env.USER}
}
`;

    writeFileSync('/tmp/ai-crypto-trading-logrotate', logrotateContent);
    
    try {
      execSync('sudo cp /tmp/ai-crypto-trading-logrotate /etc/logrotate.d/ai-crypto-trading');
      console.log('✅ Log rotation configured');
    } catch (error) {
      console.warn('⚠️ Log rotation configuration failed');
    }

    console.log('✅ Services configured');
  }

  private async deployApplication(): Promise<void> {
    console.log('🚀 Deploying application...');

    // Stop existing services
    try {
      execSync('pm2 stop all', { stdio: 'pipe' });
    } catch (error) {
      console.log('ℹ️ No existing PM2 processes to stop');
    }

    // Create required directories
    execSync('mkdir -p logs data backups');

    // Set proper permissions
    execSync('chmod 755 logs data backups');
    execSync('chmod 600 .env');

    console.log('✅ Application deployed');
  }

  private async verifyDeployment(): Promise<void> {
    console.log('🔍 Verifying deployment...');

    // Check build artifacts
    if (!existsSync('dist/index.js')) {
      throw new Error('Build artifact missing: dist/index.js');
    }

    // Check dashboard build
    if (!existsSync('src/dashboard/.next')) {
      throw new Error('Dashboard build missing');
    }

    // Verify configuration
    try {
      execSync('node -e "require(\'./dist/config/environment-validator.js\')"', { stdio: 'pipe' });
      console.log('✅ Configuration validation passed');
    } catch (error) {
      throw new Error('Configuration validation failed');
    }

    console.log('✅ Deployment verification passed');
  }

  private async startServices(): Promise<void> {
    console.log('🎬 Starting services...');

    // Start with PM2
    execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });
    execSync('pm2 save');

    // Wait for services to start
    await this.sleep(5000);

    // Verify services are running
    try {
      execSync('pm2 status', { stdio: 'inherit' });
      
      // Test API health
      execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
      console.log('✅ API service healthy');

      // Test dashboard
      execSync('curl -f http://localhost:3002', { stdio: 'pipe' });
      console.log('✅ Dashboard service healthy');

    } catch (error) {
      throw new Error('Service health check failed');
    }

    console.log('✅ All services started successfully');
  }

  private async rollback(): Promise<void> {
    console.log('🔄 Starting rollback procedure...');

    try {
      // Stop current services
      execSync('pm2 stop all', { stdio: 'pipe' });

      // Find latest backup
      const backups = execSync('ls -t backups/deployment-* 2>/dev/null || echo ""', { 
        encoding: 'utf-8' 
      }).trim().split('\n').filter(Boolean);

      if (backups.length > 0) {
        const latestBackup = backups[0];
        console.log(`📦 Restoring from backup: ${latestBackup}`);

        // Restore backup
        execSync(`cp -r ${latestBackup}/* .`);
        execSync('pm2 start ecosystem.config.js', { stdio: 'pipe' });

        console.log('✅ Rollback completed');
      } else {
        console.log('⚠️ No backup found for rollback');
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }

  private printDeploymentSummary(): void {
    const endTime = new Date();
    const duration = Math.round((endTime.getTime() - this.startTime.getTime()) / 1000);

    console.log('\n📊 Deployment Summary');
    console.log('='.repeat(50));
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Start Time: ${this.startTime.toISOString()}`);
    console.log(`End Time: ${endTime.toISOString()}`);
    console.log(`Duration: ${duration} seconds`);
    console.log(`Node.js Version: ${process.version}`);
    console.log(`Working Directory: ${process.cwd()}`);
    console.log('\n🌐 Service URLs:');
    console.log(`API: http://localhost:3001`);
    console.log(`Dashboard: http://localhost:3002`);
    console.log('\n📝 Next Steps:');
    console.log('1. Monitor logs: pm2 logs');
    console.log('2. Check status: pm2 status');
    console.log('3. View dashboard: http://localhost:3002');
    console.log('4. Monitor system: npm run system:monitor');
  }

  private getEnvVar(name: string): string {
    const envContent = readFileSync('.env', 'utf-8');
    const match = envContent.match(new RegExp(`^${name}=(.*)$`, 'm'));
    return match ? match[1].replace(/['"]/g, '') : '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const config: DeploymentConfig = {
    environment: 'production',
    skipTests: args.includes('--skip-tests'),
    skipBackup: args.includes('--skip-backup'),
    autoStart: !args.includes('--no-start')
  };

  if (args.includes('--staging')) {
    config.environment = 'staging';
  }

  const deployer = new ProductionDeployer(config);
  await deployer.deploy();
}

if (require.main === module) {
  main().catch(console.error);
}

export { ProductionDeployer };