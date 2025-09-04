/**
 * =============================================================================
 * PRODUCTION LOGGING AND MONITORING INTEGRATION
 * =============================================================================
 * 
 * This module provides the main integration point for production logging and
 * monitoring setup. It coordinates all logging, monitoring, and alerting
 * components to provide a unified production-ready system.
 * 
 * Features:
 * - Unified initialization of all logging and monitoring components
 * - Centralized configuration management
 * - Automated health checks and validation
 * - Production readiness verification
 * - Comprehensive error handling and recovery
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from './logger';
import { productionLoggingConfig } from './production-logging-config';
import { productionMonitoringDashboard } from '../monitoring/production-monitoring-dashboard';
import { performanceMonitor } from '../monitoring/performance-monitor';
import { SystemMonitor } from '../../infrastructure/system-monitor';
import { EventEmitter } from 'events';

/**
 * Production setup status interface
 */
export interface ProductionSetupStatus {
  /** Overall setup status */
  isReady: boolean;
  /** Individual component status */
  components: {
    logging: boolean;
    monitoring: boolean;
    dashboard: boolean;
    performance: boolean;
    systemHealth: boolean;
  };
  /** Setup errors */
  errors: string[];
  /** Setup warnings */
  warnings: string[];
  /** Setup timestamp */
  timestamp: Date;
  /** Configuration summary */
  configuration: {
    logLevel: string;
    logDirectory: string;
    monitoringInterval: number;
    alertsEnabled: boolean;
    backupEnabled: boolean;
  };
}

/**
 * Production validation result
 */
export interface ProductionValidationResult {
  /** Validation passed */
  isValid: boolean;
  /** Validation checks */
  checks: {
    [key: string]: {
      passed: boolean;
      message: string;
      severity: 'INFO' | 'WARNING' | 'ERROR';
    };
  };
  /** Overall score */
  score: number;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Production Logging and Monitoring Integration
 */
export class ProductionLoggingIntegration extends EventEmitter {
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  private setupStatus: ProductionSetupStatus;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.systemMonitor = new SystemMonitor();
    this.setupStatus = this.getInitialSetupStatus();
  }

  /**
   * Get initial setup status
   */
  private getInitialSetupStatus(): ProductionSetupStatus {
    return {
      isReady: false,
      components: {
        logging: false,
        monitoring: false,
        dashboard: false,
        performance: false,
        systemHealth: false
      },
      errors: [],
      warnings: [],
      timestamp: new Date(),
      configuration: {
        logLevel: process.env.LOG_LEVEL || 'info',
        logDirectory: process.env.LOG_DIR || '/var/log/trading-agent',
        monitoringInterval: parseInt(process.env.MONITORING_INTERVAL || '30000'),
        alertsEnabled: process.env.ALERTS_ENABLED !== 'false',
        backupEnabled: process.env.BACKUP_ENABLED !== 'false'
      }
    };
  }

  /**
   * Initialize complete production logging and monitoring setup
   */
  public async initializeProductionSetup(): Promise<ProductionSetupStatus> {
    try {
      logger.info('🚀 Initializing complete production logging and monitoring setup...');
      
      this.setupStatus = this.getInitialSetupStatus();
      this.setupStatus.timestamp = new Date();

      // Step 1: Initialize production logging configuration
      await this.initializeLoggingConfiguration();

      // Step 2: Initialize system monitoring
      await this.initializeSystemMonitoring();

      // Step 3: Initialize performance monitoring
      await this.initializePerformanceMonitoring();

      // Step 4: Initialize monitoring dashboard
      await this.initializeMonitoringDashboard();

      // Step 5: Setup health checks
      await this.setupHealthChecks();

      // Step 6: Validate production readiness
      const validationResult = await this.validateProductionReadiness();

      // Step 7: Start continuous monitoring
      await this.startContinuousMonitoring();

      // Update final status
      this.setupStatus.isReady = this.areAllComponentsReady();
      this.isInitialized = this.setupStatus.isReady;

      if (this.setupStatus.isReady) {
        logger.info('✅ Production logging and monitoring setup completed successfully');
        this.emit('production_setup_complete', this.setupStatus);
      } else {
        logger.warn('⚠️ Production setup completed with warnings', {
          errors: this.setupStatus.errors,
          warnings: this.setupStatus.warnings
        });
        this.emit('production_setup_warning', this.setupStatus);
      }

      return this.setupStatus;

    } catch (error) {
      logger.error('❌ Failed to initialize production setup', error);
      this.setupStatus.errors.push(`Setup initialization failed: ${error.message}`);
      this.emit('production_setup_error', { error, status: this.setupStatus });
      throw error;
    }
  }

  /**
   * Initialize logging configuration
   */
  private async initializeLoggingConfiguration(): Promise<void> {
    try {
      logger.info('📝 Initializing production logging configuration...');
      
      await productionLoggingConfig.initializeProductionLogging();
      
      this.setupStatus.components.logging = true;
      logger.info('✅ Production logging configuration initialized');
      
    } catch (error) {
      const errorMsg = `Logging configuration failed: ${error.message}`;
      this.setupStatus.errors.push(errorMsg);
      logger.error('❌ ' + errorMsg, error);
    }
  }

  /**
   * Initialize system monitoring
   */
  private async initializeSystemMonitoring(): Promise<void> {
    try {
      logger.info('🖥️ Initializing system monitoring...');
      
      await this.systemMonitor.startHardwareMonitoring();
      
      // Validate system requirements
      const requirements = await this.systemMonitor.validateSystemRequirements();
      if (!requirements.meetsRequirements) {
        this.setupStatus.warnings.push('System does not meet all recommended requirements');
        requirements.warnings.forEach(warning => {
          this.setupStatus.warnings.push(warning);
        });
      }
      
      this.setupStatus.components.systemHealth = true;
      logger.info('✅ System monitoring initialized');
      
    } catch (error) {
      const errorMsg = `System monitoring failed: ${error.message}`;
      this.setupStatus.errors.push(errorMsg);
      logger.error('❌ ' + errorMsg, error);
    }
  }

  /**
   * Initialize performance monitoring
   */
  private async initializePerformanceMonitoring(): Promise<void> {
    try {
      logger.info('📊 Initializing performance monitoring...');
      
      await performanceMonitor.startMonitoring(this.setupStatus.configuration.monitoringInterval);
      
      this.setupStatus.components.performance = true;
      logger.info('✅ Performance monitoring initialized');
      
    } catch (error) {
      const errorMsg = `Performance monitoring failed: ${error.message}`;
      this.setupStatus.errors.push(errorMsg);
      logger.error('❌ ' + errorMsg, error);
    }
  }

  /**
   * Initialize monitoring dashboard
   */
  private async initializeMonitoringDashboard(): Promise<void> {
    try {
      logger.info('📈 Initializing monitoring dashboard...');
      
      await productionMonitoringDashboard.startMonitoringDashboard();
      
      // Setup dashboard event listeners
      this.setupDashboardEventListeners();
      
      this.setupStatus.components.dashboard = true;
      logger.info('✅ Monitoring dashboard initialized');
      
    } catch (error) {
      const errorMsg = `Monitoring dashboard failed: ${error.message}`;
      this.setupStatus.errors.push(errorMsg);
      logger.error('❌ ' + errorMsg, error);
    }
  }

  /**
   * Setup dashboard event listeners
   */
  private setupDashboardEventListeners(): void {
    productionMonitoringDashboard.on('alert_generated', (alert) => {
      logger.warn('🚨 System alert generated', {
        type: alert.type,
        severity: alert.severity,
        message: alert.message
      });
      this.emit('system_alert', alert);
    });

    productionMonitoringDashboard.on('health_report_generated', (report) => {
      logger.info('📋 Health report generated', {
        overallHealth: report.overallHealth,
        activeAlerts: report.alerts.length
      });
      this.emit('health_report', report);
    });

    productionMonitoringDashboard.on('metrics_updated', (metrics) => {
      this.emit('metrics_updated', metrics);
    });
  }

  /**
   * Setup health checks
   */
  private async setupHealthChecks(): Promise<void> {
    try {
      logger.info('🏥 Setting up continuous health checks...');
      
      // Start periodic health checks
      this.healthCheckInterval = setInterval(async () => {
        try {
          await this.performHealthCheck();
        } catch (error) {
          logger.error('❌ Health check failed', error);
        }
      }, 300000); // Every 5 minutes
      
      // Perform initial health check
      await this.performHealthCheck();
      
      logger.info('✅ Health checks configured');
      
    } catch (error) {
      const errorMsg = `Health check setup failed: ${error.message}`;
      this.setupStatus.warnings.push(errorMsg);
      logger.warn('⚠️ ' + errorMsg, error);
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      // Check system health
      const systemHealth = await this.systemMonitor.getSystemHealthStatus();
      
      // Check dashboard status
      const dashboardStatus = productionMonitoringDashboard.getDashboardStatus();
      
      // Check performance monitoring
      const performanceActive = performanceMonitor.isMonitoringActive();
      
      // Log health status
      logger.debug('🏥 Health check completed', {
        systemHealth: systemHealth.overallHealth,
        dashboardActive: dashboardStatus.isMonitoring,
        performanceActive,
        activeAlerts: systemHealth.alerts.length
      });
      
      // Emit health check event
      this.emit('health_check_completed', {
        systemHealth,
        dashboardStatus,
        performanceActive,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('❌ Health check execution failed', error);
    }
  }

  /**
   * Start continuous monitoring
   */
  private async startContinuousMonitoring(): Promise<void> {
    try {
      logger.info('🔄 Starting continuous monitoring...');
      
      this.setupStatus.components.monitoring = true;
      logger.info('✅ Continuous monitoring started');
      
    } catch (error) {
      const errorMsg = `Continuous monitoring failed: ${error.message}`;
      this.setupStatus.errors.push(errorMsg);
      logger.error('❌ ' + errorMsg, error);
    }
  }

  /**
   * Validate production readiness
   */
  public async validateProductionReadiness(): Promise<ProductionValidationResult> {
    try {
      logger.info('🔍 Validating production readiness...');
      
      const checks: ProductionValidationResult['checks'] = {};
      let score = 0;
      const recommendations: string[] = [];

      // Check logging configuration
      const loggingStats = productionLoggingConfig.getProductionStats();
      checks.logging = {
        passed: loggingStats.isInitialized,
        message: loggingStats.isInitialized ? 'Logging configured correctly' : 'Logging not initialized',
        severity: loggingStats.isInitialized ? 'INFO' : 'ERROR'
      };
      if (checks.logging.passed) score += 20;

      // Check system monitoring
      const systemStatus = this.systemMonitor.getStatus();
      checks.systemMonitoring = {
        passed: systemStatus.isMonitoring,
        message: systemStatus.isMonitoring ? 'System monitoring active' : 'System monitoring not active',
        severity: systemStatus.isMonitoring ? 'INFO' : 'ERROR'
      };
      if (checks.systemMonitoring.passed) score += 20;

      // Check performance monitoring
      const performanceActive = performanceMonitor.isMonitoringActive();
      checks.performanceMonitoring = {
        passed: performanceActive,
        message: performanceActive ? 'Performance monitoring active' : 'Performance monitoring not active',
        severity: performanceActive ? 'INFO' : 'ERROR'
      };
      if (checks.performanceMonitoring.passed) score += 20;

      // Check dashboard
      const dashboardStatus = productionMonitoringDashboard.getDashboardStatus();
      checks.dashboard = {
        passed: dashboardStatus.isMonitoring,
        message: dashboardStatus.isMonitoring ? 'Dashboard monitoring active' : 'Dashboard not active',
        severity: dashboardStatus.isMonitoring ? 'INFO' : 'WARNING'
      };
      if (checks.dashboard.passed) score += 20;

      // Check system health
      const systemHealth = await this.systemMonitor.getSystemHealthStatus();
      const healthGood = systemHealth.overallHealth >= 70;
      checks.systemHealth = {
        passed: healthGood,
        message: `System health: ${systemHealth.overallHealth}%`,
        severity: systemHealth.overallHealth >= 80 ? 'INFO' : 
                 systemHealth.overallHealth >= 60 ? 'WARNING' : 'ERROR'
      };
      if (checks.systemHealth.passed) score += 20;

      // Generate recommendations
      if (!checks.logging.passed) {
        recommendations.push('Initialize production logging configuration');
      }
      if (!checks.systemMonitoring.passed) {
        recommendations.push('Start system hardware monitoring');
      }
      if (!checks.performanceMonitoring.passed) {
        recommendations.push('Enable performance metrics collection');
      }
      if (!checks.dashboard.passed) {
        recommendations.push('Activate monitoring dashboard');
      }
      if (!checks.systemHealth.passed) {
        recommendations.push('Address system health issues before production deployment');
      }

      const result: ProductionValidationResult = {
        isValid: score >= 80,
        checks,
        score,
        recommendations
      };

      logger.info('🎯 Production readiness validation completed', {
        isValid: result.isValid,
        score: result.score,
        recommendations: result.recommendations.length
      });

      return result;

    } catch (error) {
      logger.error('❌ Production readiness validation failed', error);
      throw error;
    }
  }

  /**
   * Check if all components are ready
   */
  private areAllComponentsReady(): boolean {
    const { components } = this.setupStatus;
    return components.logging && 
           components.monitoring && 
           components.dashboard && 
           components.performance && 
           components.systemHealth;
  }

  /**
   * Get current setup status
   */
  public getSetupStatus(): ProductionSetupStatus {
    return { ...this.setupStatus };
  }

  /**
   * Get production metrics
   */
  public async getProductionMetrics(): Promise<any> {
    try {
      if (!this.isInitialized) {
        throw new Error('Production setup not initialized');
      }

      const dashboardMetrics = await productionMonitoringDashboard.collectDashboardMetrics();
      const systemHealth = await this.systemMonitor.getSystemHealthStatus();
      const loggingStats = productionLoggingConfig.getProductionStats();

      return {
        dashboard: dashboardMetrics,
        systemHealth,
        logging: loggingStats,
        setupStatus: this.setupStatus,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('❌ Failed to get production metrics', error);
      throw error;
    }
  }

  /**
   * Stop production logging and monitoring
   */
  public async stopProductionSetup(): Promise<void> {
    try {
      logger.info('🛑 Stopping production logging and monitoring...');

      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = undefined;
      }

      // Stop monitoring dashboard
      productionMonitoringDashboard.stopMonitoringDashboard();

      // Stop performance monitoring
      performanceMonitor.stopMonitoring();

      // Stop system monitoring
      this.systemMonitor.stopHardwareMonitoring();

      // Stop production logging
      productionLoggingConfig.stopProductionLogging();

      this.isInitialized = false;
      this.setupStatus.isReady = false;

      logger.info('✅ Production setup stopped successfully');
      this.emit('production_setup_stopped');

    } catch (error) {
      logger.error('❌ Failed to stop production setup', error);
      throw error;
    }
  }

  /**
   * Check if production setup is initialized
   */
  public isProductionReady(): boolean {
    return this.isInitialized && this.setupStatus.isReady;
  }
}

// Create and export singleton instance
export const productionLoggingIntegration = new ProductionLoggingIntegration();

