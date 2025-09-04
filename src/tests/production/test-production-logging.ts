/**
 * =============================================================================
 * PRODUCTION LOGGING AND MONITORING TEST SUITE
 * =============================================================================
 * 
 * This test suite validates the production logging and monitoring setup
 * to ensure all components are working correctly before deployment.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { productionLoggingIntegration } from '../../core/logging/production-logging-integration';
import { productionLoggingConfig } from '../../core/logging/production-logging-config';
import { productionMonitoringDashboard } from '../../core/monitoring/production-monitoring-dashboard';
import { logger } from '../../core/logging/logger';

/**
 * Test result interface
 */
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  error?: Error;
}

/**
 * Production Logging Test Suite
 */
export class ProductionLoggingTestSuite {
  private testResults: TestResult[] = [];

  /**
   * Run all production logging tests
   */
  public async runAllTests(): Promise<{
    passed: number;
    failed: number;
    total: number;
    results: TestResult[];
  }> {
    logger.info('🧪 Starting production logging and monitoring test suite...');

    // Test 1: Production logging configuration
    await this.testProductionLoggingConfig();

    // Test 2: Production logging integration
    await this.testProductionLoggingIntegration();

    // Test 3: Monitoring dashboard
    await this.testMonitoringDashboard();

    // Test 4: System health monitoring
    await this.testSystemHealthMonitoring();

    // Test 5: Performance metrics collection
    await this.testPerformanceMetrics();

    // Test 6: Alert generation and handling
    await this.testAlertGeneration();

    // Test 7: Production readiness validation
    await this.testProductionReadiness();

    // Test 8: Backup and recovery procedures
    await this.testBackupProcedures();

    // Calculate results
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;

    logger.info('🎯 Production logging test suite completed', {
      passed,
      failed,
      total,
      successRate: `${Math.round((passed / total) * 100)}%`
    });

    return {
      passed,
      failed,
      total,
      results: this.testResults
    };
  }

  /**
   * Test production logging configuration
   */
  private async testProductionLoggingConfig(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('📝 Testing production logging configuration...');

      // Initialize production logging
      await productionLoggingConfig.initializeProductionLogging();

      // Get production stats
      const stats = productionLoggingConfig.getProductionStats();

      // Validate configuration
      if (!stats.isInitialized) {
        throw new Error('Production logging not initialized');
      }

      if (stats.logDirectories.length === 0) {
        throw new Error('No log directories configured');
      }

      // Test log directory creation
      const testMessage = `Test log entry: ${new Date().toISOString()}`;
      logger.info(testMessage);

      this.addTestResult('Production Logging Configuration', true, 
        'Configuration initialized successfully', Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Production Logging Configuration', false, 
        `Configuration failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test production logging integration
   */
  private async testProductionLoggingIntegration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('🔗 Testing production logging integration...');

      // Initialize production setup
      const setupStatus = await productionLoggingIntegration.initializeProductionSetup();

      // Validate setup status
      if (!setupStatus.isReady) {
        throw new Error(`Setup not ready: ${setupStatus.errors.join(', ')}`);
      }

      // Test production readiness
      const isReady = productionLoggingIntegration.isProductionReady();
      if (!isReady) {
        throw new Error('Production setup not ready');
      }

      // Get production metrics
      const metrics = await productionLoggingIntegration.getProductionMetrics();
      if (!metrics) {
        throw new Error('Failed to get production metrics');
      }

      this.addTestResult('Production Logging Integration', true, 
        'Integration working correctly', Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Production Logging Integration', false, 
        `Integration failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test monitoring dashboard
   */
  private async testMonitoringDashboard(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('📊 Testing monitoring dashboard...');

      // Start monitoring dashboard
      await productionMonitoringDashboard.startMonitoringDashboard();

      // Get dashboard status
      const status = productionMonitoringDashboard.getDashboardStatus();
      if (!status.isMonitoring) {
        throw new Error('Dashboard monitoring not active');
      }

      // Collect dashboard metrics
      const metrics = await productionMonitoringDashboard.collectDashboardMetrics();
      if (!metrics) {
        throw new Error('Failed to collect dashboard metrics');
      }

      // Validate metrics structure
      if (!metrics.system || !metrics.performance || !metrics.application) {
        throw new Error('Invalid metrics structure');
      }

      this.addTestResult('Monitoring Dashboard', true, 
        'Dashboard functioning correctly', Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Monitoring Dashboard', false, 
        `Dashboard failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test system health monitoring
   */
  private async testSystemHealthMonitoring(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('🏥 Testing system health monitoring...');

      // Generate health report
      const healthReport = await productionMonitoringDashboard.generateSystemHealthReport();

      // Validate health report
      if (!healthReport) {
        throw new Error('Failed to generate health report');
      }

      if (typeof healthReport.overallHealth !== 'number') {
        throw new Error('Invalid health score');
      }

      if (!healthReport.components) {
        throw new Error('Missing component health data');
      }

      // Check if health score is reasonable
      if (healthReport.overallHealth < 0 || healthReport.overallHealth > 100) {
        throw new Error(`Invalid health score: ${healthReport.overallHealth}`);
      }

      this.addTestResult('System Health Monitoring', true, 
        `Health monitoring working (score: ${healthReport.overallHealth})`, Date.now() - startTime);

    } catch (error) {
      this.addTestResult('System Health Monitoring', false, 
        `Health monitoring failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test performance metrics collection
   */
  private async testPerformanceMetrics(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('📈 Testing performance metrics collection...');

      // Collect dashboard metrics
      const metrics = await productionMonitoringDashboard.collectDashboardMetrics();

      // Validate performance metrics
      if (!metrics.performance) {
        throw new Error('No performance metrics collected');
      }

      const { cpu, memory, disk } = metrics.performance;

      // Validate CPU metrics
      if (typeof cpu.usage !== 'number' || cpu.usage < 0 || cpu.usage > 100) {
        throw new Error(`Invalid CPU usage: ${cpu.usage}`);
      }

      // Validate memory metrics
      if (typeof memory.usage !== 'number' || memory.usage < 0 || memory.usage > 100) {
        throw new Error(`Invalid memory usage: ${memory.usage}`);
      }

      // Validate disk metrics
      if (typeof disk.usage !== 'number' || disk.usage < 0 || disk.usage > 100) {
        throw new Error(`Invalid disk usage: ${disk.usage}`);
      }

      this.addTestResult('Performance Metrics Collection', true, 
        'Metrics collection working correctly', Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Performance Metrics Collection', false, 
        `Metrics collection failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test alert generation and handling
   */
  private async testAlertGeneration(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('🚨 Testing alert generation and handling...');

      // Get current metrics to check alert system
      const metrics = await productionMonitoringDashboard.collectDashboardMetrics();

      // Validate alert summary
      if (!metrics.alerts) {
        throw new Error('No alert summary available');
      }

      const { alerts } = metrics;

      // Validate alert structure
      if (typeof alerts.total !== 'number' || 
          typeof alerts.critical !== 'number' || 
          typeof alerts.warning !== 'number') {
        throw new Error('Invalid alert summary structure');
      }

      // Check if alert counts are reasonable
      if (alerts.total < 0 || alerts.critical < 0 || alerts.warning < 0) {
        throw new Error('Invalid alert counts');
      }

      this.addTestResult('Alert Generation and Handling', true, 
        `Alert system working (${alerts.total} total alerts)`, Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Alert Generation and Handling', false, 
        `Alert system failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test production readiness validation
   */
  private async testProductionReadiness(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('🔍 Testing production readiness validation...');

      // Validate production readiness
      const validation = await productionLoggingIntegration.validateProductionReadiness();

      // Check validation result
      if (!validation) {
        throw new Error('Failed to get validation result');
      }

      if (typeof validation.isValid !== 'boolean') {
        throw new Error('Invalid validation result structure');
      }

      if (typeof validation.score !== 'number' || validation.score < 0 || validation.score > 100) {
        throw new Error(`Invalid validation score: ${validation.score}`);
      }

      // Check if validation checks exist
      if (!validation.checks || Object.keys(validation.checks).length === 0) {
        throw new Error('No validation checks performed');
      }

      this.addTestResult('Production Readiness Validation', true, 
        `Validation working (score: ${validation.score}, valid: ${validation.isValid})`, Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Production Readiness Validation', false, 
        `Validation failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Test backup and recovery procedures
   */
  private async testBackupProcedures(): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('💾 Testing backup and recovery procedures...');

      // Get production stats to check backup configuration
      const stats = productionLoggingConfig.getProductionStats();

      // Validate backup configuration exists
      if (!stats.config.backup) {
        throw new Error('No backup configuration found');
      }

      const { backup } = stats.config;

      // Validate backup settings
      if (typeof backup.enabled !== 'boolean') {
        throw new Error('Invalid backup enabled setting');
      }

      if (typeof backup.retention !== 'number' || backup.retention <= 0) {
        throw new Error(`Invalid backup retention: ${backup.retention}`);
      }

      // Test log directory access (simulated backup test)
      if (stats.logDirectories.length === 0) {
        throw new Error('No log directories available for backup');
      }

      this.addTestResult('Backup and Recovery Procedures', true, 
        'Backup configuration valid', Date.now() - startTime);

    } catch (error) {
      this.addTestResult('Backup and Recovery Procedures', false, 
        `Backup test failed: ${error.message}`, Date.now() - startTime, error);
    }
  }

  /**
   * Add test result
   */
  private addTestResult(testName: string, passed: boolean, message: string, duration: number, error?: Error): void {
    this.testResults.push({
      testName,
      passed,
      message,
      duration,
      error
    });

    const status = passed ? '✅' : '❌';
    const durationMs = `${duration}ms`;
    
    if (passed) {
      logger.info(`${status} ${testName}: ${message} (${durationMs})`);
    } else {
      logger.error(`${status} ${testName}: ${message} (${durationMs})`, error);
    }
  }

  /**
   * Get test results
   */
  public getTestResults(): TestResult[] {
    return [...this.testResults];
  }

  /**
   * Clean up after tests
   */
  public async cleanup(): Promise<void> {
    try {
      logger.info('🧹 Cleaning up test environment...');
      
      // Stop production setup
      await productionLoggingIntegration.stopProductionSetup();
      
      logger.info('✅ Test cleanup completed');
    } catch (error) {
      logger.error('❌ Test cleanup failed', error);
    }
  }
}

// Export test suite
export { ProductionLoggingTestSuite };

// Export test result type
export type { TestResult };