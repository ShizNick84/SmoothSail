/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - FINAL VALIDATION AND TESTING
 * =============================================================================
 * 
 * This module provides comprehensive final validation and testing for the
 * AI crypto trading agent production deployment.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';
import { databaseSetup } from './database-setup';
import { configurationManager } from './configuration-manager';
import { securityHardening } from './security-hardening';
import { monitoringAutomation } from './monitoring-automation';
import { backupRecovery } from './backup-recovery';

interface ValidationResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'SKIP';
  message: string;
  details?: any;
  duration: number;
  critical: boolean;
}

interface ValidationSuite {
  name: string;
  description: string;
  tests: ValidationTest[];
  enabled: boolean;
}

interface ValidationTest {
  name: string;
  description: string;
  critical: boolean;
  timeout: number;
  test: () => Promise<{ success: boolean; message: string; details?: any }>;
}

interface ValidationReport {
  timestamp: Date;
  environment: string;
  version: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
    criticalFailed: number;
  };
  results: ValidationResult[];
  recommendations: string[];
  deploymentReady: boolean;
}

export class FinalValidation {
  private validationSuites: ValidationSuite[] = [];
  private startTime: Date = new Date();

  constructor() {
    this.initializeValidationSuites();
  }

  /**
   * Run complete validation suite
   */
  async runFullValidation(): Promise<ValidationReport> {
    logger.info('🔍 Starting comprehensive deployment validation...');
    this.startTime = new Date();

    const results: ValidationResult[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let warningTests = 0;
    let skippedTests = 0;
    let criticalFailures = 0;

    // Run all validation suites
    for (const suite of this.validationSuites) {
      if (!suite.enabled) {
        logger.info(`⏭️ Skipping disabled suite: ${suite.name}`);
        continue;
      }

      logger.info(`🧪 Running validation suite: ${suite.name}`);

      for (const test of suite.tests) {
        totalTests++;
        const testStartTime = Date.now();

        try {
          logger.info(`  🔍 Running test: ${test.name}`);

          // Run test with timeout
          const testResult = await Promise.race([
            test.test(),
            this.createTimeoutPromise(test.timeout)
          ]);

          const duration = Date.now() - testStartTime;
          const status = testResult.success ? 'PASS' : 'FAIL';

          const result: ValidationResult = {
            category: suite.name,
            name: test.name,
            status,
            message: testResult.message,
            details: testResult.details,
            duration,
            critical: test.critical
          };

          results.push(result);

          if (status === 'PASS') {
            passedTests++;
            logger.info(`    ✅ ${test.name} - ${testResult.message}`);
          } else {
            failedTests++;
            if (test.critical) {
              criticalFailures++;
            }
            logger.error(`    ❌ ${test.name} - ${testResult.message}`);
          }

        } catch (error) {
          const duration = Date.now() - testStartTime;
          const isTimeout = error.message === 'Test timeout';
          
          const result: ValidationResult = {
            category: suite.name,
            name: test.name,
            status: 'FAIL',
            message: isTimeout ? 'Test timed out' : `Test error: ${error.message}`,
            details: { error: error.message },
            duration,
            critical: test.critical
          };

          results.push(result);
          failedTests++;
          
          if (test.critical) {
            criticalFailures++;
          }

          logger.error(`    ❌ ${test.name} - ${result.message}`);
        }
      }
    }

    const totalDuration = Date.now() - this.startTime.getTime();
    const deploymentReady = criticalFailures === 0;

    const report: ValidationReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      version: this.getVersion(),
      duration: totalDuration,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        warnings: warningTests,
        skipped: skippedTests,
        criticalFailed: criticalFailures
      },
      results,
      recommendations: this.generateRecommendations(results),
      deploymentReady
    };

    // Save validation report
    await this.saveValidationReport(report);

    // Log summary
    this.logValidationSummary(report);

    return report;
  }

  /**
   * Initialize validation test suites
   */
  private initializeValidationSuites(): void {
    this.validationSuites = [
      {
        name: 'System Requirements',
        description: 'Validate system requirements and dependencies',
        enabled: true,
        tests: [
          {
            name: 'Node.js Version',
            description: 'Verify Node.js version compatibility',
            critical: true,
            timeout: 5000,
            test: async () => {
              const version = process.version;
              const majorVersion = parseInt(version.slice(1).split('.')[0]);
              
              if (majorVersion >= 18) {
                return { success: true, message: `Node.js ${version} is compatible` };
              } else {
                return { success: false, message: `Node.js ${version} is not supported (requires v18+)` };
              }
            }
          },
          {
            name: 'System Resources',
            description: 'Check available system resources',
            critical: true,
            timeout: 10000,
            test: async () => {
              const memInfo = execSync('free -g', { encoding: 'utf-8' });
              const memLines = memInfo.split('\n')[1].split(/\s+/);
              const totalMem = parseInt(memLines[1]);
              const availableMem = parseInt(memLines[6]);

              const diskInfo = execSync("df -BG / | tail -1", { encoding: 'utf-8' });
              const diskAvailable = parseInt(diskInfo.split(/\s+/)[3]);

              if (totalMem < 8) {
                return { success: false, message: `Insufficient RAM: ${totalMem}GB (minimum 8GB required)` };
              }

              if (availableMem < 2) {
                return { success: false, message: `Insufficient available RAM: ${availableMem}GB (minimum 2GB required)` };
              }

              if (diskAvailable < 10) {
                return { success: false, message: `Insufficient disk space: ${diskAvailable}GB (minimum 10GB required)` };
              }

              return { 
                success: true, 
                message: `System resources adequate: ${totalMem}GB RAM, ${diskAvailable}GB disk`,
                details: { totalMem, availableMem, diskAvailable }
              };
            }
          },
          {
            name: 'Network Connectivity',
            description: 'Verify internet connectivity',
            critical: true,
            timeout: 15000,
            test: async () => {
              try {
                execSync('ping -c 1 google.com', { stdio: 'pipe' });
                execSync('ping -c 1 api.gateio.ws', { stdio: 'pipe' });
                return { success: true, message: 'Network connectivity verified' };
              } catch {
                return { success: false, message: 'Network connectivity issues detected' };
              }
            }
          }
        ]
      },
      {
        name: 'Configuration Validation',
        description: 'Validate all configuration settings',
        enabled: true,
        tests: [
          {
            name: 'Environment Configuration',
            description: 'Validate environment variables',
            critical: true,
            timeout: 10000,
            test: async () => {
              const result = await configurationManager.validateConfiguration();
              
              if (result.valid) {
                return { 
                  success: true, 
                  message: 'Configuration validation passed',
                  details: { warnings: result.warnings }
                };
              } else {
                return { 
                  success: false, 
                  message: `Configuration validation failed: ${result.errors.join(', ')}`,
                  details: { errors: result.errors, warnings: result.warnings }
                };
              }
            }
          },
          {
            name: 'API Credentials',
            description: 'Validate API credentials format',
            critical: true,
            timeout: 5000,
            test: async () => {
              const apiKey = process.env.GATEIO_API_KEY;
              const apiSecret = process.env.GATEIO_API_SECRET;

              if (!apiKey || apiKey.length < 10) {
                return { success: false, message: 'Invalid or missing Gate.io API key' };
              }

              if (!apiSecret || apiSecret.length < 10) {
                return { success: false, message: 'Invalid or missing Gate.io API secret' };
              }

              return { success: true, message: 'API credentials format validated' };
            }
          },
          {
            name: 'SSH Configuration',
            description: 'Validate SSH tunnel configuration',
            critical: true,
            timeout: 15000,
            test: async () => {
              const oracleHost = process.env.ORACLE_HOST;
              const sshKeyPath = process.env.ORACLE_SSH_KEY_PATH;

              if (!oracleHost) {
                return { success: false, message: 'Oracle host not configured' };
              }

              if (!sshKeyPath || !existsSync(sshKeyPath)) {
                return { success: false, message: 'SSH key not found or not configured' };
              }

              // Test SSH connection
              try {
                execSync(`ssh -i ${sshKeyPath} -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@${oracleHost} echo "test"`, { stdio: 'pipe' });
                return { success: true, message: 'SSH tunnel configuration validated' };
              } catch {
                return { success: false, message: 'SSH connection test failed' };
              }
            }
          }
        ]
      },
      {
        name: 'Security Validation',
        description: 'Validate security configurations',
        enabled: true,
        tests: [
          {
            name: 'Security Hardening',
            description: 'Verify security hardening measures',
            critical: true,
            timeout: 30000,
            test: async () => {
              const result = await securityHardening.validateSecurityForDeployment();
              
              if (result.ready) {
                return { success: true, message: 'Security validation passed' };
              } else {
                return { 
                  success: false, 
                  message: `Security issues found: ${result.criticalIssues.join(', ')}`,
                  details: { issues: result.criticalIssues }
                };
              }
            }
          },
          {
            name: 'File Permissions',
            description: 'Check critical file permissions',
            critical: true,
            timeout: 5000,
            test: async () => {
              const criticalFiles = [
                { path: '.env', expectedPerms: '600' },
                { path: 'keys', expectedPerms: '700' }
              ];

              for (const file of criticalFiles) {
                if (existsSync(file.path)) {
                  const stats = require('fs').statSync(file.path);
                  const perms = (stats.mode & parseInt('777', 8)).toString(8);
                  
                  if (perms !== file.expectedPerms) {
                    return { 
                      success: false, 
                      message: `Incorrect permissions for ${file.path}: ${perms} (expected ${file.expectedPerms})` 
                    };
                  }
                }
              }

              return { success: true, message: 'File permissions validated' };
            }
          },
          {
            name: 'Firewall Status',
            description: 'Check firewall configuration',
            critical: false,
            timeout: 10000,
            test: async () => {
              try {
                const ufwStatus = execSync('sudo ufw status', { encoding: 'utf-8' });
                const isActive = ufwStatus.includes('Status: active');
                
                if (isActive) {
                  return { success: true, message: 'Firewall is active and configured' };
                } else {
                  return { success: false, message: 'Firewall is not active' };
                }
              } catch {
                return { success: false, message: 'Unable to check firewall status' };
              }
            }
          }
        ]
      },
      {
        name: 'Database Validation',
        description: 'Validate database setup and integrity',
        enabled: true,
        tests: [
          {
            name: 'Database Initialization',
            description: 'Verify database is properly initialized',
            critical: true,
            timeout: 15000,
            test: async () => {
              try {
                await databaseSetup.initialize();
                return { success: true, message: 'Database initialization successful' };
              } catch (error) {
                return { success: false, message: `Database initialization failed: ${error.message}` };
              }
            }
          },
          {
            name: 'Database Integrity',
            description: 'Check database integrity',
            critical: true,
            timeout: 10000,
            test: async () => {
              const isValid = await databaseSetup.validateIntegrity();
              
              if (isValid) {
                return { success: true, message: 'Database integrity check passed' };
              } else {
                return { success: false, message: 'Database integrity check failed' };
              }
            }
          },
          {
            name: 'Database Statistics',
            description: 'Collect database statistics',
            critical: false,
            timeout: 10000,
            test: async () => {
              try {
                const stats = await databaseSetup.getStatistics();
                return { 
                  success: true, 
                  message: 'Database statistics collected',
                  details: stats
                };
              } catch (error) {
                return { success: false, message: `Failed to collect database statistics: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'Application Build',
        description: 'Validate application build and dependencies',
        enabled: true,
        tests: [
          {
            name: 'Build Artifacts',
            description: 'Check if application is properly built',
            critical: true,
            timeout: 5000,
            test: async () => {
              if (!existsSync('dist/index.js')) {
                return { success: false, message: 'Main application build artifact missing (dist/index.js)' };
              }

              if (existsSync('src/dashboard') && !existsSync('src/dashboard/.next')) {
                return { success: false, message: 'Dashboard build artifacts missing' };
              }

              return { success: true, message: 'All build artifacts present' };
            }
          },
          {
            name: 'Dependencies',
            description: 'Verify all dependencies are installed',
            critical: true,
            timeout: 15000,
            test: async () => {
              try {
                execSync('npm ls --production', { stdio: 'pipe' });
                return { success: true, message: 'All production dependencies installed' };
              } catch (error) {
                return { success: false, message: 'Missing or incompatible dependencies detected' };
              }
            }
          },
          {
            name: 'TypeScript Compilation',
            description: 'Verify TypeScript compilation',
            critical: true,
            timeout: 30000,
            test: async () => {
              try {
                execSync('npx tsc --noEmit', { stdio: 'pipe' });
                return { success: true, message: 'TypeScript compilation successful' };
              } catch (error) {
                return { success: false, message: 'TypeScript compilation errors detected' };
              }
            }
          }
        ]
      },
      {
        name: 'Service Integration',
        description: 'Test service integration and communication',
        enabled: true,
        tests: [
          {
            name: 'PM2 Configuration',
            description: 'Validate PM2 ecosystem configuration',
            critical: true,
            timeout: 10000,
            test: async () => {
              if (!existsSync('ecosystem.config.js')) {
                return { success: false, message: 'PM2 ecosystem configuration missing' };
              }

              try {
                // Test PM2 configuration syntax
                require(join(process.cwd(), 'ecosystem.config.js'));
                return { success: true, message: 'PM2 configuration is valid' };
              } catch (error) {
                return { success: false, message: `PM2 configuration error: ${error.message}` };
              }
            }
          },
          {
            name: 'Service Startup',
            description: 'Test service startup without errors',
            critical: true,
            timeout: 30000,
            test: async () => {
              try {
                // Start services in test mode
                execSync('pm2 start ecosystem.config.js --env test', { stdio: 'pipe' });
                
                // Wait for services to start
                await new Promise(resolve => setTimeout(resolve, 5000));
                
                // Check if services are running
                const processes = execSync('pm2 jlist', { encoding: 'utf-8' });
                const processData = JSON.parse(processes);
                const runningProcesses = processData.filter(p => p.pm2_env.status === 'online');
                
                // Stop test services
                execSync('pm2 stop all', { stdio: 'pipe' });
                execSync('pm2 delete all', { stdio: 'pipe' });
                
                if (runningProcesses.length > 0) {
                  return { 
                    success: true, 
                    message: `${runningProcesses.length} services started successfully`,
                    details: { processes: runningProcesses.length }
                  };
                } else {
                  return { success: false, message: 'No services started successfully' };
                }
              } catch (error) {
                // Cleanup on error
                try {
                  execSync('pm2 stop all', { stdio: 'pipe' });
                  execSync('pm2 delete all', { stdio: 'pipe' });
                } catch {
                  // Ignore cleanup errors
                }
                
                return { success: false, message: `Service startup failed: ${error.message}` };
              }
            }
          },
          {
            name: 'API Health Check',
            description: 'Test API endpoint availability',
            critical: true,
            timeout: 20000,
            test: async () => {
              try {
                // Start API service temporarily
                execSync('pm2 start ecosystem.config.js --only ai-crypto-trading-api', { stdio: 'pipe' });
                
                // Wait for service to start
                await new Promise(resolve => setTimeout(resolve, 8000));
                
                // Test API health endpoint
                const startTime = Date.now();
                execSync('curl -f http://localhost:3001/api/v1/health', { stdio: 'pipe' });
                const responseTime = Date.now() - startTime;
                
                // Stop test service
                execSync('pm2 stop ai-crypto-trading-api', { stdio: 'pipe' });
                execSync('pm2 delete ai-crypto-trading-api', { stdio: 'pipe' });
                
                return { 
                  success: true, 
                  message: `API health check passed (${responseTime}ms)`,
                  details: { responseTime }
                };
              } catch (error) {
                // Cleanup on error
                try {
                  execSync('pm2 stop ai-crypto-trading-api', { stdio: 'pipe' });
                  execSync('pm2 delete ai-crypto-trading-api', { stdio: 'pipe' });
                } catch {
                  // Ignore cleanup errors
                }
                
                return { success: false, message: `API health check failed: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'Backup and Recovery',
        description: 'Test backup and recovery systems',
        enabled: true,
        tests: [
          {
            name: 'Backup System',
            description: 'Test backup creation',
            critical: false,
            timeout: 60000,
            test: async () => {
              try {
                const result = await backupRecovery.performFullBackup();
                
                if (result.success) {
                  return { 
                    success: true, 
                    message: `Backup created successfully (${this.formatBytes(result.totalSize)})`,
                    details: { size: result.totalSize, duration: result.duration }
                  };
                } else {
                  return { success: false, message: `Backup failed: ${result.error}` };
                }
              } catch (error) {
                return { success: false, message: `Backup test failed: ${error.message}` };
              }
            }
          },
          {
            name: 'Recovery Plans',
            description: 'Validate recovery plan definitions',
            critical: false,
            timeout: 5000,
            test: async () => {
              const plans = backupRecovery.getRecoveryPlans();
              
              if (plans.length > 0) {
                return { 
                  success: true, 
                  message: `${plans.length} recovery plans available`,
                  details: { plans: plans.map(p => p.name) }
                };
              } else {
                return { success: false, message: 'No recovery plans defined' };
              }
            }
          }
        ]
      }
    ];
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), timeout);
    });
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedCritical = results.filter(r => r.status === 'FAIL' && r.critical);
    const failedNonCritical = results.filter(r => r.status === 'FAIL' && !r.critical);
    const warnings = results.filter(r => r.status === 'WARNING');

    if (failedCritical.length > 0) {
      recommendations.push('CRITICAL: Fix all critical test failures before deployment');
      failedCritical.forEach(test => {
        recommendations.push(`  - ${test.category}: ${test.name} - ${test.message}`);
      });
    }

    if (failedNonCritical.length > 0) {
      recommendations.push('Address non-critical test failures for optimal performance');
    }

    if (warnings.length > 0) {
      recommendations.push('Review and address warning conditions');
    }

    // Performance recommendations
    const slowTests = results.filter(r => r.duration > 10000);
    if (slowTests.length > 0) {
      recommendations.push('Some tests took longer than expected - monitor system performance');
    }

    // Security recommendations
    const securityFailures = results.filter(r => r.category === 'Security Validation' && r.status === 'FAIL');
    if (securityFailures.length > 0) {
      recommendations.push('Security validation failures detected - review security configuration');
    }

    if (recommendations.length === 0) {
      recommendations.push('All validations passed - system is ready for deployment');
    }

    return recommendations;
  }

  /**
   * Save validation report
   */
  private async saveValidationReport(report: ValidationReport): Promise<void> {
    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const reportPath = join(process.cwd(), 'logs', `validation-report-${timestamp}.json`);
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`📊 Validation report saved: ${reportPath}`);
  }

  /**
   * Log validation summary
   */
  private logValidationSummary(report: ValidationReport): void {
    logger.info('\n📊 VALIDATION SUMMARY');
    logger.info('═'.repeat(50));
    logger.info(`Environment: ${report.environment}`);
    logger.info(`Duration: ${Math.round(report.duration / 1000)}s`);
    logger.info(`Total Tests: ${report.summary.total}`);
    logger.info(`✅ Passed: ${report.summary.passed}`);
    logger.info(`❌ Failed: ${report.summary.failed}`);
    logger.info(`⚠️ Warnings: ${report.summary.warnings}`);
    logger.info(`⏭️ Skipped: ${report.summary.skipped}`);
    logger.info(`🚨 Critical Failures: ${report.summary.criticalFailed}`);
    logger.info(`🚀 Deployment Ready: ${report.deploymentReady ? 'YES' : 'NO'}`);

    if (report.recommendations.length > 0) {
      logger.info('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        logger.info(`  • ${rec}`);
      });
    }

    if (!report.deploymentReady) {
      logger.error('\n❌ DEPLOYMENT BLOCKED - Critical issues must be resolved');
    } else {
      logger.info('\n✅ VALIDATION PASSED - System ready for deployment');
    }
  }

  /**
   * Get application version
   */
  private getVersion(): string {
    try {
      if (existsSync('package.json')) {
        const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
        return packageJson.version || '1.0.0';
      }
    } catch {
      // Ignore errors
    }
    return '1.0.0';
  }

  /**
   * Format bytes utility
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Run specific validation suite
   */
  async runValidationSuite(suiteName: string): Promise<ValidationResult[]> {
    const suite = this.validationSuites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Validation suite not found: ${suiteName}`);
    }

    logger.info(`🧪 Running validation suite: ${suite.name}`);
    const results: ValidationResult[] = [];

    for (const test of suite.tests) {
      const testStartTime = Date.now();

      try {
        const testResult = await Promise.race([
          test.test(),
          this.createTimeoutPromise(test.timeout)
        ]);

        const duration = Date.now() - testStartTime;
        const status = testResult.success ? 'PASS' : 'FAIL';

        results.push({
          category: suite.name,
          name: test.name,
          status,
          message: testResult.message,
          details: testResult.details,
          duration,
          critical: test.critical
        });

      } catch (error) {
        const duration = Date.now() - testStartTime;
        
        results.push({
          category: suite.name,
          name: test.name,
          status: 'FAIL',
          message: error.message === 'Test timeout' ? 'Test timed out' : `Test error: ${error.message}`,
          details: { error: error.message },
          duration,
          critical: test.critical
        });
      }
    }

    return results;
  }

  /**
   * Get available validation suites
   */
  getValidationSuites(): ValidationSuite[] {
    return this.validationSuites.map(suite => ({
      ...suite,
      tests: suite.tests.map(test => ({
        name: test.name,
        description: test.description,
        critical: test.critical,
        timeout: test.timeout,
        test: undefined // Don't expose test functions
      }))
    }));
  }
}

// Export singleton instance
export const finalValidation = new FinalValidation();