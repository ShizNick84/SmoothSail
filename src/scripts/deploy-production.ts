#!/usr/bin/env tsx

/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PRODUCTION DEPLOYMENT CLI
 * =============================================================================
 * 
 * Command-line interface for production deployment automation.
 * This script provides a user-friendly interface to the production deployer.
 */

import { Command } from 'commander';
import { ProductionDeployer } from '../deployment/production-deployer';
import { logger } from '../core/logging/logger';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface CLIOptions {
  environment: 'development' | 'staging' | 'production';
  skipTests: boolean;
  skipBackup: boolean;
  skipSecurity: boolean;
  noStart: boolean;
  validateOnly: boolean;
  verbose: boolean;
  reportFile?: string;
}

class DeploymentCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup CLI commands and options
   */
  private setupCommands(): void {
    this.program
      .name('deploy-production')
      .description('AI Crypto Trading Agent Production Deployment Tool')
      .version('1.0.0');

    // Main deployment command
    this.program
      .command('deploy')
      .description('Deploy the AI crypto trading agent')
      .option('-e, --environment <env>', 'deployment environment', 'production')
      .option('--skip-tests', 'skip running tests', false)
      .option('--skip-backup', 'skip creating backup', false)
      .option('--skip-security', 'skip security hardening', false)
      .option('--no-start', 'do not start services after deployment', false)
      .option('--validate-only', 'only validate deployment without starting services', false)
      .option('-v, --verbose', 'verbose output', false)
      .option('-r, --report-file <file>', 'save deployment report to file')
      .action(async (options: CLIOptions) => {
        await this.handleDeploy(options);
      });

    // Validation command
    this.program
      .command('validate')
      .description('Validate deployment configuration and environment')
      .option('-e, --environment <env>', 'deployment environment', 'production')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: CLIOptions) => {
        await this.handleValidate(options);
      });

    // Rollback command
    this.program
      .command('rollback')
      .description('Rollback to previous deployment')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: CLIOptions) => {
        await this.handleRollback(options);
      });

    // Status command
    this.program
      .command('status')
      .description('Check deployment and service status')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: CLIOptions) => {
        await this.handleStatus(options);
      });
  }

  /**
   * Handle deployment command
   */
  private async handleDeploy(options: CLIOptions): Promise<void> {
    try {
      this.showBanner();
      
      if (options.verbose) {
        logger.info('🔧 Deployment options:', options);
      }

      // Validate environment
      if (!['development', 'staging', 'production'].includes(options.environment)) {
        throw new Error(`Invalid environment: ${options.environment}`);
      }

      // Show warning for production
      if (options.environment === 'production') {
        console.log('⚠️  WARNING: You are deploying to PRODUCTION environment!');
        console.log('💰 This system handles real cryptocurrency trading.');
        console.log('🔒 Ensure all security measures are in place.');
        console.log('');
        
        // Require confirmation for production
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise<string>((resolve) => {
          readline.question('Type "DEPLOY" to confirm production deployment: ', resolve);
        });
        
        readline.close();
        
        if (answer !== 'DEPLOY') {
          console.log('❌ Deployment cancelled');
          process.exit(1);
        }
      }

      // Create deployer instance
      const deployer = new ProductionDeployer({
        environment: options.environment,
        skipTests: options.skipTests,
        skipBackup: options.skipBackup,
        skipSecurity: options.skipSecurity,
        autoStart: !options.noStart,
        validateOnly: options.validateOnly
      });

      // Execute deployment
      const result = await deployer.deploy();

      // Generate and display report
      const report = deployer.generateReport();
      this.displayDeploymentReport(report, result);

      // Save report to file if requested
      if (options.reportFile) {
        const reportData = {
          ...report,
          result
        };
        writeFileSync(options.reportFile, JSON.stringify(reportData, null, 2));
        logger.info(`📊 Deployment report saved to: ${options.reportFile}`);
      }

      if (result.success) {
        console.log('\n🎉 Deployment completed successfully!');
        this.showPostDeploymentInstructions(options.environment);
        process.exit(0);
      } else {
        console.log('\n❌ Deployment failed!');
        console.log('Errors:', result.errors);
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Deployment error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle validation command
   */
  private async handleValidate(options: CLIOptions): Promise<void> {
    try {
      logger.info('🔍 Running deployment validation...');

      const deployer = new ProductionDeployer({
        environment: options.environment,
        skipTests: true,
        skipBackup: true,
        skipSecurity: false,
        autoStart: false,
        validateOnly: true
      });

      const result = await deployer.deploy();

      if (result.success) {
        console.log('✅ Validation passed - system ready for deployment');
      } else {
        console.log('❌ Validation failed');
        console.log('Issues found:', result.errors);
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Validation error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle rollback command
   */
  private async handleRollback(options: CLIOptions): Promise<void> {
    try {
      logger.info('🔄 Starting rollback procedure...');

      // This would typically be implemented in the ProductionDeployer
      // For now, we'll provide basic rollback functionality
      const { execSync } = require('child_process');

      // Stop current services
      execSync('pm2 stop all', { stdio: 'pipe' });

      // Find latest backup
      const backups = execSync('ls -t backups/deployment-* 2>/dev/null || echo ""', { 
        encoding: 'utf-8' 
      }).trim().split('\n').filter(Boolean);

      if (backups.length > 0) {
        const latestBackup = backups[0];
        logger.info(`📦 Restoring from backup: ${latestBackup}`);

        // Restore backup (simplified)
        execSync(`cp -r ${latestBackup}/* . 2>/dev/null || true`);
        execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });

        console.log('✅ Rollback completed successfully');
      } else {
        console.log('⚠️ No backup found for rollback');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Rollback error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle status command
   */
  private async handleStatus(options: CLIOptions): Promise<void> {
    try {
      logger.info('📊 Checking deployment status...');

      const { execSync } = require('child_process');

      // Check PM2 processes
      try {
        const processes = execSync('pm2 jlist', { encoding: 'utf-8' });
        const processData = JSON.parse(processes);
        
        console.log('\n🔄 PM2 Processes:');
        processData.forEach((proc: any) => {
          const status = proc.pm2_env.status === 'online' ? '🟢' : '🔴';
          console.log(`  ${status} ${proc.name}: ${proc.pm2_env.status} (PID: ${proc.pid})`);
        });
      } catch {
        console.log('⚠️ PM2 not running or no processes found');
      }

      // Check API health
      try {
        execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
        console.log('🟢 API Service: Healthy');
      } catch {
        console.log('🔴 API Service: Unhealthy or not running');
      }

      // Check dashboard
      try {
        execSync('curl -f http://localhost:3002', { stdio: 'pipe' });
        console.log('🟢 Dashboard: Healthy');
      } catch {
        console.log('🔴 Dashboard: Unhealthy or not running');
      }

      // Check system resources
      const cpuUsage = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", { encoding: 'utf-8' }).trim();
      const memUsage = execSync("free | grep Mem | awk '{printf(\"%.1f\", $3/$2 * 100.0)}'", { encoding: 'utf-8' }).trim();
      const diskUsage = execSync("df -h / | awk 'NR==2{print $5}'", { encoding: 'utf-8' }).trim();

      console.log('\n💻 System Resources:');
      console.log(`  CPU Usage: ${cpuUsage}%`);
      console.log(`  Memory Usage: ${memUsage}%`);
      console.log(`  Disk Usage: ${diskUsage}`);

    } catch (error) {
      logger.error('❌ Status check error:', error);
      process.exit(1);
    }
  }

  /**
   * Show application banner
   */
  private showBanner(): void {
    console.log('\n🤖 AI CRYPTO TRADING AGENT - PRODUCTION DEPLOYMENT');
    console.log('═'.repeat(60));
    console.log('🔒 Military-Grade Security • 💰 Capital Preservation');
    console.log('🚀 Intel NUC Optimized • ⚡ 24/7 Operation');
    console.log('═'.repeat(60));
    console.log('');
  }

  /**
   * Display deployment report
   */
  private displayDeploymentReport(report: any, result: any): void {
    console.log('\n📊 DEPLOYMENT REPORT');
    console.log('═'.repeat(50));
    console.log(`Environment: ${report.deployment.environment}`);
    console.log(`Duration: ${report.deployment.duration}`);
    console.log(`Node.js: ${report.system.nodeVersion}`);
    console.log(`Platform: ${report.system.platform} (${report.system.arch})`);
    console.log('');

    console.log('📋 DEPLOYMENT STEPS:');
    report.steps.forEach((step: any) => {
      const statusIcon = {
        'COMPLETED': '✅',
        'FAILED': '❌',
        'SKIPPED': '⏭️',
        'PENDING': '⏳'
      }[step.status] || '❓';
      
      const duration = step.duration ? ` (${step.duration}ms)` : '';
      console.log(`  ${statusIcon} ${step.name}${duration}`);
      
      if (step.error) {
        console.log(`    Error: ${step.error}`);
      }
    });

    console.log('');
    console.log(`✅ Completed: ${report.summary.completed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⏭️ Skipped: ${report.summary.skipped}`);

    if (result.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS:');
      result.warnings.forEach((warning: string) => {
        console.log(`  • ${warning}`);
      });
    }

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach((error: string) => {
        console.log(`  • ${error}`);
      });
    }
  }

  /**
   * Show post-deployment instructions
   */
  private showPostDeploymentInstructions(environment: string): void {
    console.log('\n🎯 NEXT STEPS:');
    console.log('═'.repeat(40));
    console.log('1. Review deployment logs: pm2 logs');
    console.log('2. Check service status: pm2 status');
    console.log('3. Access dashboard: http://localhost:3002');
    console.log('4. Monitor system: npm run system:monitor');
    
    if (environment === 'production') {
      console.log('5. Configure Gate.io API credentials');
      console.log('6. Set up email/Telegram notifications');
      console.log('7. Run initial backtests');
      console.log('8. Enable live trading (when ready)');
    }
    
    console.log('\n📚 DOCUMENTATION:');
    console.log('• Full docs: docs/README.md');
    console.log('• API reference: docs/api/README.md');
    console.log('• Troubleshooting: docs/troubleshooting/README.md');
    console.log('');
  }

  /**
   * Run the CLI
   */
  run(): void {
    this.program.parse(process.argv);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new DeploymentCLI();
  cli.run();
}

export { DeploymentCLI };
