#!/usr/bin/env tsx

/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - COMPREHENSIVE DEPLOYMENT CLI
 * =============================================================================
 * 
 * Complete command-line interface for deployment, validation, and testing
 * of the AI crypto trading agent production system.
 */

import { Command } from 'commander';
import { logger } from '../core/logger';
import { ProductionDeployer } from '../deployment/production-deployer';
import { finalValidation } from '../deployment/final-validation';
import { e2eTestRunner } from '../deployment/e2e-testing';
import { securityHardening } from '../deployment/security-hardening';
import { monitoringAutomation } from '../deployment/monitoring-automation';
import { backupRecovery } from '../deployment/backup-recovery';
import { configurationManager } from '../deployment/configuration-manager';
import { writeFileSync } from 'fs';

interface CLIOptions {
  environment: 'development' | 'staging' | 'production';
  verbose: boolean;
  skipTests: boolean;
  skipSecurity: boolean;
  skipBackup: boolean;
  noStart: boolean;
  validateOnly: boolean;
  reportFile?: string;
  force: boolean;
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
      .name('deployment-cli')
      .description('AI Crypto Trading Agent - Comprehensive Deployment CLI')
      .version('1.0.0');

    // Main deployment command
    this.program
      .command('deploy')
      .description('Deploy the AI crypto trading agent')
      .option('-e, --environment <env>', 'deployment environment', 'production')
      .option('--skip-tests', 'skip running tests', false)
      .option('--skip-security', 'skip security hardening', false)
      .option('--skip-backup', 'skip creating backup', false)
      .option('--no-start', 'do not start services after deployment', false)
      .option('--validate-only', 'only validate deployment without starting services', false)
      .option('-v, --verbose', 'verbose output', false)
      .option('-r, --report-file <file>', 'save deployment report to file')
      .option('--force', 'force deployment even with warnings', false)
      .action(async (options: CLIOptions) => {
        await this.handleDeploy(options);
      });

    // Validation commands
    this.program
      .command('validate')
      .description('Run comprehensive deployment validation')
      .option('-e, --environment <env>', 'deployment environment', 'production')
      .option('-v, --verbose', 'verbose output', false)
      .option('-r, --report-file <file>', 'save validation report to file')
      .action(async (options: CLIOptions) => {
        await this.handleValidate(options);
      });

    this.program
      .command('validate-suite <suite>')
      .description('Run specific validation suite')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (suite: string, options: CLIOptions) => {
        await this.handleValidateSuite(suite, options);
      });

    // Testing commands
    this.program
      .command('test')
      .description('Run end-to-end tests')
      .option('-v, --verbose', 'verbose output', false)
      .option('-r, --report-file <file>', 'save test report to file')
      .action(async (options: CLIOptions) => {
        await this.handleE2ETest(options);
      });

    this.program
      .command('test-suite <suite>')
      .description('Run specific test suite')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (suite: string, options: CLIOptions) => {
        await this.handleTestSuite(suite, options);
      });

    // Security commands
    this.program
      .command('security')
      .description('Run security hardening and validation')
      .option('-v, --verbose', 'verbose output', false)
      .option('-r, --report-file <file>', 'save security report to file')
      .action(async (options: CLIOptions) => {
        await this.handleSecurity(options);
      });

    // Configuration commands
    this.program
      .command('config')
      .description('Configuration management')
      .option('validate', 'validate configuration')
      .option('create <env>', 'create configuration for environment')
      .option('backup', 'backup current configuration')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: any) => {
        await this.handleConfig(options);
      });

    // Backup and recovery commands
    this.program
      .command('backup')
      .description('Create system backup')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: CLIOptions) => {
        await this.handleBackup(options);
      });

    this.program
      .command('recovery')
      .description('Recovery operations')
      .option('list', 'list available recovery plans')
      .option('execute <plan>', 'execute recovery plan')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: any) => {
        await this.handleRecovery(options);
      });

    // Monitoring commands
    this.program
      .command('monitor')
      .description('Monitoring and maintenance operations')
      .option('start', 'start monitoring automation')
      .option('stop', 'stop monitoring automation')
      .option('status', 'show monitoring status')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: any) => {
        await this.handleMonitoring(options);
      });

    // System status and control
    this.program
      .command('status')
      .description('Check system status')
      .option('-v, --verbose', 'verbose output', false)
      .action(async (options: CLIOptions) => {
        await this.handleStatus(options);
      });

    this.program
      .command('restart')
      .description('Restart system services')
      .option('--force', 'force restart without confirmation', false)
      .action(async (options: CLIOptions) => {
        await this.handleRestart(options);
      });

    this.program
      .command('stop')
      .description('Stop system services')
      .option('--force', 'force stop without confirmation', false)
      .action(async (options: CLIOptions) => {
        await this.handleStop(options);
      });

    // Utility commands
    this.program
      .command('logs')
      .description('View system logs')
      .option('-f, --follow', 'follow log output', false)
      .option('-n, --lines <number>', 'number of lines to show', '100')
      .option('-t, --type <type>', 'log type (application|system|security)', 'application')
      .action(async (options: any) => {
        await this.handleLogs(options);
      });

    this.program
      .command('health')
      .description('Comprehensive health check')
      .option('-v, --verbose', 'verbose output', false)
      .option('-r, --report-file <file>', 'save health report to file')
      .action(async (options: CLIOptions) => {
        await this.handleHealth(options);
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

      // Production confirmation
      if (options.environment === 'production' && !options.force) {
        const confirmed = await this.confirmProduction();
        if (!confirmed) {
          console.log('❌ Deployment cancelled');
          process.exit(1);
        }
      }

      // Run pre-deployment validation
      logger.info('🔍 Running pre-deployment validation...');
      const validationReport = await finalValidation.runFullValidation();
      
      if (!validationReport.deploymentReady && !options.force) {
        console.log('❌ Deployment blocked due to validation failures');
        console.log('Use --force to override (not recommended for production)');
        process.exit(1);
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

      // Generate comprehensive report
      const report = {
        deployment: deployer.generateReport(),
        validation: validationReport,
        result
      };

      // Save report if requested
      if (options.reportFile) {
        writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
        logger.info(`📊 Comprehensive report saved to: ${options.reportFile}`);
      }

      if (result.success) {
        console.log('\n🎉 Deployment completed successfully!');
        this.showPostDeploymentInstructions(options.environment);
        
        // Run post-deployment E2E tests if services were started
        if (!options.noStart && !options.validateOnly) {
          logger.info('🧪 Running post-deployment E2E tests...');
          const e2eReport = await e2eTestRunner.runE2ETests();
          
          if (!e2eReport.systemReady) {
            logger.warn('⚠️ E2E tests failed - system may have issues');
          } else {
            logger.info('✅ E2E tests passed - system is fully operational');
          }
        }
        
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
      logger.info('🔍 Running comprehensive validation...');

      const report = await finalValidation.runFullValidation();

      if (options.reportFile) {
        writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
        logger.info(`📊 Validation report saved to: ${options.reportFile}`);
      }

      if (report.deploymentReady) {
        console.log('✅ Validation passed - system ready for deployment');
        process.exit(0);
      } else {
        console.log('❌ Validation failed - issues must be resolved');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Validation error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle validation suite command
   */
  private async handleValidateSuite(suite: string, options: CLIOptions): Promise<void> {
    try {
      logger.info(`🔍 Running validation suite: ${suite}`);

      const results = await finalValidation.runValidationSuite(suite);
      const passed = results.filter(r => r.status === 'PASS').length;
      const failed = results.filter(r => r.status === 'FAIL').length;

      console.log(`\n📊 Suite Results: ${passed} passed, ${failed} failed`);
      
      results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${result.name} - ${result.message}`);
      });

      if (failed === 0) {
        process.exit(0);
      } else {
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Validation suite error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle E2E test command
   */
  private async handleE2ETest(options: CLIOptions): Promise<void> {
    try {
      logger.info('🧪 Running end-to-end tests...');

      const report = await e2eTestRunner.runE2ETests();

      if (options.reportFile) {
        writeFileSync(options.reportFile, JSON.stringify(report, null, 2));
        logger.info(`📊 E2E test report saved to: ${options.reportFile}`);
      }

      if (report.systemReady) {
        console.log('✅ E2E tests passed - system is operational');
        process.exit(0);
      } else {
        console.log('❌ E2E tests failed - system has issues');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ E2E test error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle test suite command
   */
  private async handleTestSuite(suite: string, options: CLIOptions): Promise<void> {
    try {
      logger.info(`🧪 Running test suite: ${suite}`);

      const results = await e2eTestRunner.runTestSuite(suite);
      const passed = results.filter(r => r.status === 'PASS').length;
      const failed = results.filter(r => r.status === 'FAIL').length;

      console.log(`\n📊 Suite Results: ${passed} passed, ${failed} failed`);
      
      results.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${result.name} - ${result.message}`);
      });

      if (failed === 0) {
        process.exit(0);
      } else {
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Test suite error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle security command
   */
  private async handleSecurity(options: CLIOptions): Promise<void> {
    try {
      logger.info('🔒 Running security hardening and validation...');

      const result = await securityHardening.hardenSystem();

      if (options.reportFile) {
        writeFileSync(options.reportFile, JSON.stringify(result, null, 2));
        logger.info(`📊 Security report saved to: ${options.reportFile}`);
      }

      if (result.success) {
        console.log('✅ Security hardening completed successfully');
        process.exit(0);
      } else {
        console.log('❌ Security hardening completed with issues');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Security error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle configuration command
   */
  private async handleConfig(options: any): Promise<void> {
    try {
      if (options.validate) {
        const result = await configurationManager.validateConfiguration();
        if (result.valid) {
          console.log('✅ Configuration is valid');
        } else {
          console.log('❌ Configuration validation failed:');
          result.errors.forEach(error => console.log(`  • ${error}`));
          process.exit(1);
        }
      } else if (options.create) {
        await configurationManager.createConfiguration(options.create);
        console.log(`✅ Configuration created for ${options.create} environment`);
      } else if (options.backup) {
        const backupFile = await configurationManager.backupConfiguration();
        console.log(`✅ Configuration backed up to: ${backupFile}`);
      } else {
        console.log('Please specify a configuration action (validate, create, backup)');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Configuration error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle backup command
   */
  private async handleBackup(options: CLIOptions): Promise<void> {
    try {
      logger.info('💾 Creating system backup...');

      const result = await backupRecovery.performFullBackup();

      if (result.success) {
        console.log(`✅ Backup created successfully: ${result.location}`);
        console.log(`📊 Size: ${this.formatBytes(result.totalSize)}, Duration: ${result.duration}ms`);
      } else {
        console.log(`❌ Backup failed: ${result.error}`);
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Backup error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle recovery command
   */
  private async handleRecovery(options: any): Promise<void> {
    try {
      if (options.list) {
        const plans = backupRecovery.getRecoveryPlans();
        console.log('\n📋 Available Recovery Plans:');
        plans.forEach(plan => {
          console.log(`  • ${plan.name}: ${plan.description}`);
          console.log(`    Risk: ${plan.riskLevel}, Est. Time: ${plan.estimatedTime}min`);
        });
      } else if (options.execute) {
        logger.info(`🔄 Executing recovery plan: ${options.execute}`);
        const result = await backupRecovery.executeRecovery(options.execute);
        
        if (result.success) {
          console.log(`✅ Recovery completed successfully (${result.completedSteps} steps)`);
        } else {
          console.log(`❌ Recovery failed: ${result.error}`);
          console.log(`Completed ${result.completedSteps} steps before failure`);
          process.exit(1);
        }
      } else {
        console.log('Please specify a recovery action (list, execute)');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Recovery error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle monitoring command
   */
  private async handleMonitoring(options: any): Promise<void> {
    try {
      if (options.start) {
        await monitoringAutomation.start();
        console.log('✅ Monitoring automation started');
      } else if (options.stop) {
        await monitoringAutomation.stop();
        console.log('✅ Monitoring automation stopped');
      } else if (options.status) {
        const tasks = monitoringAutomation.getMaintenanceStatus();
        console.log('\n📊 Monitoring Status:');
        tasks.forEach(task => {
          const status = task.enabled ? '🟢 Enabled' : '🔴 Disabled';
          console.log(`  ${status} ${task.name}: ${task.description}`);
          if (task.lastRun) {
            console.log(`    Last run: ${task.lastRun.toISOString()}`);
          }
        });
      } else {
        console.log('Please specify a monitoring action (start, stop, status)');
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Monitoring error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle status command
   */
  private async handleStatus(options: CLIOptions): Promise<void> {
    try {
      const { execSync } = require('child_process');

      console.log('\n📊 SYSTEM STATUS');
      console.log('═'.repeat(40));

      // PM2 processes
      try {
        const processes = execSync('pm2 jlist', { encoding: 'utf-8' });
        const processData = JSON.parse(processes);
        
        console.log('\n🔄 PM2 Processes:');
        if (processData.length === 0) {
          console.log('  No processes running');
        } else {
          processData.forEach((proc: any) => {
            const status = proc.pm2_env.status === 'online' ? '🟢' : '🔴';
            const uptime = proc.pm2_env.pm_uptime ? new Date(Date.now() - proc.pm2_env.pm_uptime).toISOString().substr(11, 8) : 'N/A';
            console.log(`  ${status} ${proc.name}: ${proc.pm2_env.status} (uptime: ${uptime})`);
          });
        }
      } catch {
        console.log('  ⚠️ PM2 not available');
      }

      // Service health
      console.log('\n🏥 Service Health:');
      try {
        execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
        console.log('  🟢 API Service: Healthy');
      } catch {
        console.log('  🔴 API Service: Unhealthy');
      }

      try {
        execSync('curl -f http://localhost:3002', { stdio: 'pipe' });
        console.log('  🟢 Dashboard: Healthy');
      } catch {
        console.log('  🔴 Dashboard: Unhealthy');
      }

      // System resources
      console.log('\n💻 System Resources:');
      try {
        const cpuUsage = execSync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1", { encoding: 'utf-8' }).trim();
        const memUsage = execSync("free | grep Mem | awk '{printf(\"%.1f\", $3/$2 * 100.0)}'", { encoding: 'utf-8' }).trim();
        const diskUsage = execSync("df -h / | awk 'NR==2{print $5}'", { encoding: 'utf-8' }).trim();

        console.log(`  CPU Usage: ${cpuUsage}%`);
        console.log(`  Memory Usage: ${memUsage}%`);
        console.log(`  Disk Usage: ${diskUsage}`);
      } catch {
        console.log('  ⚠️ Unable to collect system metrics');
      }

    } catch (error) {
      logger.error('❌ Status check error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle restart command
   */
  private async handleRestart(options: CLIOptions): Promise<void> {
    try {
      if (!options.force) {
        const confirmed = await this.confirmAction('restart system services');
        if (!confirmed) {
          console.log('❌ Restart cancelled');
          return;
        }
      }

      logger.info('🔄 Restarting system services...');
      const { execSync } = require('child_process');
      
      execSync('pm2 restart all', { stdio: 'inherit' });
      console.log('✅ System services restarted');

    } catch (error) {
      logger.error('❌ Restart error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle stop command
   */
  private async handleStop(options: CLIOptions): Promise<void> {
    try {
      if (!options.force) {
        const confirmed = await this.confirmAction('stop system services');
        if (!confirmed) {
          console.log('❌ Stop cancelled');
          return;
        }
      }

      logger.info('🛑 Stopping system services...');
      const { execSync } = require('child_process');
      
      execSync('pm2 stop all', { stdio: 'inherit' });
      console.log('✅ System services stopped');

    } catch (error) {
      logger.error('❌ Stop error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle logs command
   */
  private async handleLogs(options: any): Promise<void> {
    try {
      const { execSync } = require('child_process');
      
      let command = '';
      switch (options.type) {
        case 'application':
          command = `pm2 logs --lines ${options.lines}`;
          if (options.follow) command += ' --follow';
          break;
        case 'system':
          command = `journalctl -n ${options.lines} --no-pager`;
          if (options.follow) command += ' -f';
          break;
        case 'security':
          command = `tail -n ${options.lines} /var/log/auth.log`;
          if (options.follow) command += ' -f';
          break;
        default:
          command = `pm2 logs --lines ${options.lines}`;
      }

      execSync(command, { stdio: 'inherit' });

    } catch (error) {
      logger.error('❌ Logs error:', error);
      process.exit(1);
    }
  }

  /**
   * Handle health command
   */
  private async handleHealth(options: CLIOptions): Promise<void> {
    try {
      logger.info('🏥 Running comprehensive health check...');

      // Run validation
      const validationReport = await finalValidation.runFullValidation();
      
      // Run E2E tests
      const e2eReport = await e2eTestRunner.runE2ETests();

      const healthReport = {
        timestamp: new Date(),
        validation: validationReport,
        e2e: e2eReport,
        overall: validationReport.deploymentReady && e2eReport.systemReady ? 'HEALTHY' : 'UNHEALTHY'
      };

      if (options.reportFile) {
        writeFileSync(options.reportFile, JSON.stringify(healthReport, null, 2));
        logger.info(`📊 Health report saved to: ${options.reportFile}`);
      }

      console.log(`\n🏥 Overall Health: ${healthReport.overall}`);
      console.log(`📊 Validation: ${validationReport.deploymentReady ? 'PASS' : 'FAIL'}`);
      console.log(`🧪 E2E Tests: ${e2eReport.systemReady ? 'PASS' : 'FAIL'}`);

      if (healthReport.overall === 'HEALTHY') {
        process.exit(0);
      } else {
        process.exit(1);
      }

    } catch (error) {
      logger.error('❌ Health check error:', error);
      process.exit(1);
    }
  }

  /**
   * Utility methods
   */
  private showBanner(): void {
    console.log('\n🤖 AI CRYPTO TRADING AGENT - DEPLOYMENT CLI');
    console.log('═'.repeat(60));
    console.log('🔒 Military-Grade Security • 💰 Capital Preservation');
    console.log('🚀 Intel NUC Optimized • ⚡ 24/7 Operation');
    console.log('═'.repeat(60));
    console.log('');
  }

  private async confirmProduction(): Promise<boolean> {
    console.log('⚠️  WARNING: You are deploying to PRODUCTION environment!');
    console.log('💰 This system handles real cryptocurrency trading.');
    console.log('🔒 Ensure all security measures are in place.');
    console.log('');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      readline.question('Type "DEPLOY" to confirm production deployment: ', resolve);
    });
    
    readline.close();
    return answer === 'DEPLOY';
  }

  private async confirmAction(action: string): Promise<boolean> {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      readline.question(`Are you sure you want to ${action}? (y/N): `, resolve);
    });
    
    readline.close();
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  private showPostDeploymentInstructions(environment: string): void {
    console.log('\n🎯 NEXT STEPS:');
    console.log('═'.repeat(40));
    console.log('1. Check system status: npm run deploy:status');
    console.log('2. View logs: npm run logs');
    console.log('3. Access dashboard: http://localhost:3002');
    console.log('4. Run health check: npm run health');
    
    if (environment === 'production') {
      console.log('5. Configure API credentials');
      console.log('6. Set up notifications');
      console.log('7. Enable live trading (when ready)');
    }
    
    console.log('\n📚 DOCUMENTATION:');
    console.log('• Full docs: docs/README.md');
    console.log('• Troubleshooting: docs/troubleshooting/README.md');
    console.log('');
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Run the CLI
   */
  run(): void {
    this.program.parse();
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new DeploymentCLI();
  cli.run();
}

export { DeploymentCLI };
