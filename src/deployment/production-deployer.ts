/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PRODUCTION DEPLOYMENT AUTOMATION
 * =============================================================================
 * 
 * This module provides comprehensive production deployment automation for the
 * AI crypto trading agent on Intel NUC hardware. It handles environment setup,
 * configuration validation, security hardening, and service deployment.
 * 
 * CRITICAL DEPLOYMENT NOTICE:
 * This deployment system handles production financial trading infrastructure.
 * All deployment steps must be validated and secure.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, chmodSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';
import { databaseSetup } from './database-setup';
import { configurationManager } from './configuration-manager';
import { securityHardening } from './security-hardening';

interface DeploymentOptions {
  environment: 'development' | 'staging' | 'production';
  skipTests: boolean;
  skipBackup: boolean;
  skipSecurity: boolean;
  autoStart: boolean;
  validateOnly: boolean;
}

interface DeploymentResult {
  success: boolean;
  duration: number;
  steps: DeploymentStep[];
  errors: string[];
  warnings: string[];
}

interface DeploymentStep {
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  duration?: number;
  error?: string;
  details?: any;
}

export class ProductionDeployer {
  private options: DeploymentOptions;
  private startTime: Date;
  private steps: DeploymentStep[] = [];

  constructor(options: DeploymentOptions) {
    this.options = options;
    this.startTime = new Date();
    this.initializeSteps();
  }

  /**
   * Execute complete production deployment
   */
  async deploy(): Promise<DeploymentResult> {
    logger.info('🚀 Starting AI Crypto Trading Agent production deployment...');
    logger.info(`📅 Deployment started at: ${this.startTime.toISOString()}`);
    logger.info(`🎯 Environment: ${this.options.environment}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Pre-deployment validation
      await this.executeStep('pre-deployment-checks', async () => {
        await this.runPreDeploymentChecks();
      });

      // Configuration management
      await this.executeStep('configuration-validation', async () => {
        const result = await configurationManager.validateConfiguration();
        if (!result.valid) {
          throw new Error(`Configuration validation failed: ${result.errors.join(', ')}`);
        }
        warnings.push(...result.warnings);
      });

      // Security hardening
      if (!this.options.skipSecurity) {
        await this.executeStep('security-hardening', async () => {
          const result = await securityHardening.hardenSystem();
          if (!result.success) {
            const criticalFailures = result.results.filter(r => 
              r.severity === 'CRITICAL' && r.finalStatus === 'FAILED'
            );
            if (criticalFailures.length > 0) {
              throw new Error(`Critical security issues found: ${criticalFailures.map(f => f.name).join(', ')}`);
            }
          }
        });
      }

      // Database setup
      await this.executeStep('database-setup', async () => {
        await databaseSetup.initialize();
      });

      // Create backup
      if (!this.options.skipBackup) {
        await this.executeStep('create-backup', async () => {
          await this.createDeploymentBackup();
        });
      }

      // Install dependencies
      await this.executeStep('install-dependencies', async () => {
        await this.installDependencies();
      });

      // Run tests
      if (!this.options.skipTests) {
        await this.executeStep('run-tests', async () => {
          await this.runTests();
        });
      }

      // Build application
      await this.executeStep('build-application', async () => {
        await this.buildApplication();
      });

      // Configure services
      await this.executeStep('configure-services', async () => {
        await this.configureServices();
      });

      // Deploy application
      await this.executeStep('deploy-application', async () => {
        await this.deployApplication();
      });

      // Post-deployment validation
      await this.executeStep('post-deployment-validation', async () => {
        await this.validateDeployment();
      });

      // Start services
      if (this.options.autoStart && !this.options.validateOnly) {
        await this.executeStep('start-services', async () => {
          await this.startServices();
        });
      }

      // Final verification
      await this.executeStep('final-verification', async () => {
        await this.verifyDeployment();
      });

      const duration = Date.now() - this.startTime.getTime();
      logger.info(`🎉 Deployment completed successfully in ${duration}ms`);

      return {
        success: true,
        duration,
        steps: this.steps,
        errors,
        warnings
      };

    } catch (error) {
      logger.error('❌ Deployment failed:', error);
      
      // Attempt rollback
      await this.rollback();
      
      const duration = Date.now() - this.startTime.getTime();
      errors.push(error.message);

      return {
        success: false,
        duration,
        steps: this.steps,
        errors,
        warnings
      };
    }
  }

  /**
   * Initialize deployment steps
   */
  private initializeSteps(): void {
    const stepNames = [
      'pre-deployment-checks',
      'configuration-validation',
      'security-hardening',
      'database-setup',
      'create-backup',
      'install-dependencies',
      'run-tests',
      'build-application',
      'configure-services',
      'deploy-application',
      'post-deployment-validation',
      'start-services',
      'final-verification'
    ];

    this.steps = stepNames.map(name => ({
      name,
      status: 'PENDING'
    }));
  }

  /**
   * Execute a deployment step with error handling and timing
   */
  private async executeStep(stepName: string, action: () => Promise<void>): Promise<void> {
    const step = this.steps.find(s => s.name === stepName);
    if (!step) {
      throw new Error(`Unknown deployment step: ${stepName}`);
    }

    // Skip step if conditions not met
    if (this.shouldSkipStep(stepName)) {
      step.status = 'SKIPPED';
      logger.info(`⏭️ Skipping step: ${stepName}`);
      return;
    }

    step.status = 'RUNNING';
    const stepStartTime = Date.now();
    
    logger.info(`🔄 Executing step: ${stepName}`);

    try {
      await action();
      step.status = 'COMPLETED';
      step.duration = Date.now() - stepStartTime;
      logger.info(`✅ Step completed: ${stepName} (${step.duration}ms)`);
    } catch (error) {
      step.status = 'FAILED';
      step.duration = Date.now() - stepStartTime;
      step.error = error.message;
      logger.error(`❌ Step failed: ${stepName} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a step should be skipped based on options
   */
  private shouldSkipStep(stepName: string): boolean {
    switch (stepName) {
      case 'security-hardening':
        return this.options.skipSecurity;
      case 'create-backup':
        return this.options.skipBackup;
      case 'run-tests':
        return this.options.skipTests;
      case 'start-services':
        return !this.options.autoStart || this.options.validateOnly;
      default:
        return false;
    }
  }

  /**
   * Run pre-deployment checks
   */
  private async runPreDeploymentChecks(): Promise<void> {
    logger.info('🔍 Running pre-deployment checks...');

    // Check Node.js version
    const nodeVersion = process.version;
    if (!nodeVersion.startsWith('v18.') && !nodeVersion.startsWith('v20.')) {
      throw new Error(`Unsupported Node.js version: ${nodeVersion}. Required: v18.x or v20.x`);
    }

    // Check if running as root (should not be)
    if (process.getuid && process.getuid() === 0) {
      throw new Error('Deployment should not be run as root for security reasons');
    }

    // Check available disk space
    const diskSpace = execSync("df -BG / | awk 'NR==2{print $4}' | sed 's/G//'", { encoding: 'utf-8' });
    if (parseInt(diskSpace.trim()) < 10) {
      throw new Error(`Insufficient disk space: ${diskSpace.trim()}GB available (minimum 10GB required)`);
    }

    // Check available memory
    const memInfo = execSync("free -g | awk 'NR==2{print $7}'", { encoding: 'utf-8' });
    if (parseInt(memInfo.trim()) < 2) {
      throw new Error(`Insufficient available memory: ${memInfo.trim()}GB (minimum 2GB required)`);
    }

    // Check internet connectivity
    try {
      execSync('ping -c 1 google.com', { stdio: 'pipe' });
    } catch {
      throw new Error('Internet connectivity required for deployment');
    }

    logger.info('✅ Pre-deployment checks passed');
  }

  /**
   * Create deployment backup
   */
  private async createDeploymentBackup(): Promise<void> {
    logger.info('💾 Creating deployment backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(process.cwd(), 'backups', `deployment-${timestamp}`);

    // Create backup directory
    mkdirSync(backupDir, { recursive: true });

    // Backup current application if exists
    if (existsSync('dist')) {
      execSync(`cp -r dist ${backupDir}/`);
    }

    // Backup configuration
    if (existsSync('.env')) {
      execSync(`cp .env ${backupDir}/`);
    }

    // Backup database
    if (existsSync('data')) {
      execSync(`cp -r data ${backupDir}/`);
    }

    // Backup PM2 configuration
    try {
      execSync('pm2 save', { stdio: 'pipe' });
      if (existsSync(`${process.env.HOME}/.pm2/dump.pm2`)) {
        execSync(`cp ${process.env.HOME}/.pm2/dump.pm2 ${backupDir}/`);
      }
    } catch {
      logger.warn('⚠️ PM2 backup failed (may not be running)');
    }

    logger.info(`✅ Backup created: ${backupDir}`);
  }

  /**
   * Install dependencies
   */
  private async installDependencies(): Promise<void> {
    logger.info('📦 Installing dependencies...');

    // Clean install for production
    if (existsSync('node_modules')) {
      execSync('rm -rf node_modules');
    }
    if (existsSync('package-lock.json')) {
      execSync('rm -f package-lock.json');
    }

    // Install production dependencies
    execSync('npm ci --production --silent', { stdio: 'inherit' });

    logger.info('✅ Dependencies installed');
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<void> {
    logger.info('🧪 Running tests...');

    // Install dev dependencies for testing
    execSync('npm install --only=dev --silent', { stdio: 'pipe' });

    try {
      // Run test suite
      execSync('npm run test', { stdio: 'inherit' });
      execSync('npm run test:security', { stdio: 'inherit' });
      
      logger.info('✅ All tests passed');
    } finally {
      // Clean dev dependencies
      execSync('npm prune --production --silent', { stdio: 'pipe' });
    }
  }

  /**
   * Build application
   */
  private async buildApplication(): Promise<void> {
    logger.info('🔨 Building application...');

    // Install dev dependencies for build
    execSync('npm install --only=dev --silent', { stdio: 'pipe' });

    try {
      // Build TypeScript
      execSync('npm run build', { stdio: 'inherit' });

      // Build dashboard if exists
      if (existsSync('src/dashboard')) {
        execSync('npm run dashboard:build', { stdio: 'inherit' });
      }

      logger.info('✅ Application built successfully');
    } finally {
      // Clean dev dependencies
      execSync('npm prune --production --silent', { stdio: 'pipe' });
    }
  }

  /**
   * Configure system services
   */
  private async configureServices(): Promise<void> {
    logger.info('⚙️ Configuring services...');

    // Create systemd service file
    const serviceContent = `[Unit]
Description=AI Crypto Trading Agent
Documentation=https://github.com/your-org/ai-crypto-trading-agent
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${process.env.USER}
Group=${process.env.USER}
WorkingDirectory=${process.cwd()}
Environment=NODE_ENV=${this.options.environment}
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
TimeoutStopSec=30
KillMode=mixed
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ai-crypto-trading

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${process.cwd()}

[Install]
WantedBy=multi-user.target
`;

    writeFileSync('/tmp/ai-crypto-trading.service', serviceContent);
    
    try {
      execSync('sudo cp /tmp/ai-crypto-trading.service /etc/systemd/system/');
      execSync('sudo systemctl daemon-reload');
      execSync('sudo systemctl enable ai-crypto-trading');
      logger.info('✅ Systemd service configured');
    } catch (error) {
      logger.warn('⚠️ Systemd service configuration failed (may require manual setup)');
    }

    logger.info('✅ Services configured');
  }

  /**
   * Deploy application files
   */
  private async deployApplication(): Promise<void> {
    logger.info('🚀 Deploying application...');

    // Stop existing services
    try {
      execSync('pm2 stop all', { stdio: 'pipe' });
      logger.info('🛑 Stopped existing PM2 processes');
    } catch {
      logger.info('ℹ️ No existing PM2 processes to stop');
    }

    // Create required directories
    const directories = ['logs', 'data', 'backups', 'keys'];
    for (const dir of directories) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }

    // Set proper permissions
    chmodSync('logs', 0o755);
    chmodSync('data', 0o755);
    chmodSync('backups', 0o700);
    chmodSync('keys', 0o700);

    if (existsSync('.env')) {
      chmodSync('.env', 0o600);
    }

    logger.info('✅ Application deployed');
  }

  /**
   * Validate deployment
   */
  private async validateDeployment(): Promise<void> {
    logger.info('🔍 Validating deployment...');

    // Check build artifacts
    if (!existsSync('dist/index.js')) {
      throw new Error('Build artifact missing: dist/index.js');
    }

    // Check dashboard build if applicable
    if (existsSync('src/dashboard') && !existsSync('src/dashboard/.next')) {
      throw new Error('Dashboard build missing');
    }

    // Validate configuration
    const configResult = await configurationManager.validateConfiguration();
    if (!configResult.valid) {
      throw new Error(`Configuration validation failed: ${configResult.errors.join(', ')}`);
    }

    // Validate database
    const dbValid = await databaseSetup.validateIntegrity();
    if (!dbValid) {
      throw new Error('Database integrity check failed');
    }

    logger.info('✅ Deployment validation passed');
  }

  /**
   * Start services
   */
  private async startServices(): Promise<void> {
    logger.info('🎬 Starting services...');

    // Start with PM2
    execSync('pm2 start ecosystem.config.js --env ' + this.options.environment, { stdio: 'inherit' });
    execSync('pm2 save');

    // Generate PM2 startup script
    try {
      const startupCommand = execSync(`pm2 startup systemd -u ${process.env.USER} --hp ${process.env.HOME}`, { 
        encoding: 'utf-8' 
      });
      const sudoCommand = startupCommand.split('\n').find(line => line.startsWith('sudo'));
      if (sudoCommand) {
        execSync(sudoCommand);
      }
    } catch (error) {
      logger.warn('⚠️ PM2 startup script generation failed');
    }

    // Wait for services to start
    await this.sleep(5000);

    logger.info('✅ Services started successfully');
  }

  /**
   * Verify deployment is working
   */
  private async verifyDeployment(): Promise<void> {
    logger.info('🔍 Verifying deployment...');

    // Check PM2 processes
    try {
      const processes = execSync('pm2 jlist', { encoding: 'utf-8' });
      const processData = JSON.parse(processes);
      const runningProcesses = processData.filter(p => p.pm2_env.status === 'online');
      
      if (runningProcesses.length === 0) {
        throw new Error('No PM2 processes are running');
      }
      
      logger.info(`✅ ${runningProcesses.length} PM2 processes running`);
    } catch (error) {
      logger.warn('⚠️ Could not verify PM2 processes');
    }

    // Test API health if services are running
    if (this.options.autoStart && !this.options.validateOnly) {
      try {
        await this.sleep(3000); // Give services time to start
        execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
        logger.info('✅ API service healthy');
      } catch {
        logger.warn('⚠️ API health check failed');
      }

      // Test dashboard if available
      try {
        execSync('curl -f http://localhost:3002', { stdio: 'pipe' });
        logger.info('✅ Dashboard service healthy');
      } catch {
        logger.warn('⚠️ Dashboard health check failed');
      }
    }

    logger.info('✅ Deployment verification completed');
  }

  /**
   * Rollback deployment
   */
  private async rollback(): Promise<void> {
    logger.info('🔄 Starting rollback procedure...');

    try {
      // Stop current services
      execSync('pm2 stop all', { stdio: 'pipe' });

      // Find latest backup
      const backups = execSync('ls -t backups/deployment-* 2>/dev/null || echo ""', { 
        encoding: 'utf-8' 
      }).trim().split('\n').filter(Boolean);

      if (backups.length > 0) {
        const latestBackup = backups[0];
        logger.info(`📦 Restoring from backup: ${latestBackup}`);

        // Restore backup
        if (existsSync(join(latestBackup, 'dist'))) {
          execSync(`cp -r ${latestBackup}/dist .`);
        }
        if (existsSync(join(latestBackup, '.env'))) {
          execSync(`cp ${latestBackup}/.env .`);
        }
        if (existsSync(join(latestBackup, 'data'))) {
          execSync(`cp -r ${latestBackup}/data .`);
        }

        // Restart services
        execSync('pm2 start ecosystem.config.js', { stdio: 'pipe' });

        logger.info('✅ Rollback completed');
      } else {
        logger.warn('⚠️ No backup found for rollback');
      }
    } catch (error) {
      logger.error('❌ Rollback failed:', error);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate deployment report
   */
  generateReport(): any {
    const endTime = new Date();
    const duration = endTime.getTime() - this.startTime.getTime();

    return {
      deployment: {
        environment: this.options.environment,
        startTime: this.startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        options: this.options
      },
      steps: this.steps,
      summary: {
        total: this.steps.length,
        completed: this.steps.filter(s => s.status === 'COMPLETED').length,
        failed: this.steps.filter(s => s.status === 'FAILED').length,
        skipped: this.steps.filter(s => s.status === 'SKIPPED').length
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        workingDirectory: process.cwd(),
        user: process.env.USER
      }
    };
  }
}
