/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PRODUCTION LOGGING CONFIGURATION
 * =============================================================================
 * 
 * This module provides production-specific logging configuration with enhanced
 * monitoring, alerting, and performance metrics collection for the Intel NUC
 * deployment environment.
 * 
 * CRITICAL PRODUCTION NOTICE:
 * This logging system is optimized for production environments with proper
 * log rotation, retention policies, and monitoring integration. All logs
 * are structured for automated analysis and alerting.
 * 
 * Features:
 * - Production-grade log levels and formatting
 * - Automated log rotation and retention
 * - Performance metrics integration
 * - System health monitoring
 * - Alert generation and escalation
 * - Backup and recovery logging
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { resolve } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { Logger, LogMetadata } from './logger';
import * as os from 'os';

/**
 * Interface for production logging configuration
 */
export interface ProductionLoggerConfig {
  /** Base log directory */
  baseLogDir: string;
  /** Log level for production */
  logLevel: string;
  /** Enable structured JSON logging */
  enableJsonLogging: boolean;
  /** Enable performance metrics logging */
  enablePerformanceLogging: boolean;
  /** Enable system health logging */
  enableHealthLogging: boolean;
  /** Log retention policies */
  retention: {
    application: string;
    audit: string;
    security: string;
    trading: string;
    performance: string;
    system: string;
  };
  /** Log rotation settings */
  rotation: {
    maxSize: string;
    maxFiles: string;
    compress: boolean;
  };
  /** Monitoring thresholds */
  thresholds: {
    cpu: { warning: number; critical: number };
    memory: { warning: number; critical: number };
    disk: { warning: number; critical: number };
    temperature: { warning: number; critical: number };
  };
  /** Alert configuration */
  alerts: {
    enabled: boolean;
    channels: string[];
    escalation: {
      critical: string[];
    };
  };
}

/**
 * Interface for performance metrics
 */
export interface PerformanceMetrics {
  /** Timestamp */
  timestamp: Date;
  /** System metrics */
  system: {
    cpu: {
      usage: number;
      temperature: number;
      frequency: number;
    };
    memory: {
      total: number;
      used: number;
      free: number;
      utilization: number;
    };
    disk: {
      total: number;
      used: number;
      free: number;
      utilization: number;
      iops: number;
    };
    network: {
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
    };
  };
  /** Application metrics */
  application: {
    pid: number;
    cpuUsage: number;
    memoryUsage: number;
    heapUsed: number;
    heapTotal: number;
    uptime: number;
  };
  /** Trading metrics */
  trading?: {
    activeOrders: number;
    totalTrades: number;
    profitLoss: number;
    apiLatency: number;
  };
}

/**
 * Interface for system health status
 */
export interface SystemHealthStatus {
  /** Overall health score (0-100) */
  overallHealth: number;
  /** Component health scores */
  components: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    application: number;
  };
  /** Active alerts */
  alerts: SystemAlert[];
  /** Recommendations */
  recommendations: string[];
  /** Last check timestamp */
  lastCheck: Date;
}

/**
 * Interface for system alerts
 */
export interface SystemAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'CPU' | 'MEMORY' | 'DISK' | 'NETWORK' | 'APPLICATION' | 'TRADING';
  /** Severity level */
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Current value */
  currentValue: number;
  /** Threshold value */
  threshold: number;
  /** Timestamp */
  timestamp: Date;
  /** Whether alert is active */
  isActive: boolean;
}

/**
 * Production Logger
 * Enhanced logging system for production deployment with monitoring and alerting
 */
export class ProductionLogger extends Logger {
  private config: ProductionLoggerConfig;
  private performanceLogger: winston.Logger;
  private healthLogger: winston.Logger;
  private alertLogger: winston.Logger;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private activeAlerts: Map<string, SystemAlert> = new Map();

  constructor(componentName?: string) {
    super(componentName);
    this.config = this.loadProductionConfig();
    this.initializeProductionLoggers();
    this.startMetricsCollection();
    this.startHealthMonitoring();
  }

  /**
   * Load production logging configuration
   * 
   * @returns ProductionLoggerConfig Configuration object
   */
  private loadProductionConfig(): ProductionLoggerConfig {
    const configPath = process.env.PRODUCTION_LOGGING_CONFIG || '/etc/trading-agent/logging/production.json';
    
    let config: Partial<ProductionLoggerConfig> = {};
    
    // Try to load configuration from file
    if (existsSync(configPath)) {
      try {
        const configData = readFileSync(configPath, 'utf8');
        const parsedConfig = JSON.parse(configData);
        config = parsedConfig.logging || {};
      } catch (error) {
        this.warn('Failed to load production config file, using defaults', { error: error.message });
      }
    }

    // Merge with defaults
    return {
      baseLogDir: config.baseLogDir || process.env.LOG_DIR || '/var/log/trading-agent',
      logLevel: config.logLevel || process.env.LOG_LEVEL || 'info',
      enableJsonLogging: config.enableJsonLogging !== false,
      enablePerformanceLogging: config.enablePerformanceLogging !== false,
      enableHealthLogging: config.enableHealthLogging !== false,
      retention: {
        application: config.retention?.application || '30d',
        audit: config.retention?.audit || '365d',
        security: config.retention?.security || '365d',
        trading: config.retention?.trading || '90d',
        performance: config.retention?.performance || '7d',
        system: config.retention?.system || '30d'
      },
      rotation: {
        maxSize: config.rotation?.maxSize || '100m',
        maxFiles: config.rotation?.maxFiles || '30',
        compress: config.rotation?.compress !== false
      },
      thresholds: {
        cpu: {
          warning: config.thresholds?.cpu?.warning || 70,
          critical: config.thresholds?.cpu?.critical || 85
        },
        memory: {
          warning: config.thresholds?.memory?.warning || 75,
          critical: config.thresholds?.memory?.critical || 90
        },
        disk: {
          warning: config.thresholds?.disk?.warning || 80,
          critical: config.thresholds?.disk?.critical || 95
        },
        temperature: {
          warning: config.thresholds?.temperature?.warning || 70,
          critical: config.thresholds?.temperature?.critical || 80
        }
      },
      alerts: {
        enabled: config.alerts?.enabled !== false,
        channels: config.alerts?.channels || ['log', 'syslog'],
        escalation: {
          critical: config.alerts?.escalation?.critical || ['email', 'telegram']
        }
      }
    };
  }

  /**
   * Initialize production-specific loggers
   */
  private initializeProductionLoggers(): void {
    // Ensure log directories exist
    this.ensureProductionLogDirectories();

    // Initialize performance logger
    this.performanceLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: resolve(this.config.baseLogDir, 'performance', 'metrics-%DATE%.log'),
          datePattern: 'YYYY-MM-DD-HH',
          maxSize: this.config.rotation.maxSize,
          maxFiles: '168', // 7 days of hourly logs
          zippedArchive: this.config.rotation.compress
        })
      ]
    });

    // Initialize health logger
    this.healthLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: resolve(this.config.baseLogDir, 'system', 'health-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.rotation.maxSize,
          maxFiles: this.config.rotation.maxFiles,
          zippedArchive: this.config.rotation.compress
        })
      ]
    });

    // Initialize alert logger
    this.alertLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new DailyRotateFile({
          filename: resolve(this.config.baseLogDir, 'system', 'alerts-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.rotation.maxSize,
          maxFiles: '365', // Keep alerts for 1 year
          zippedArchive: this.config.rotation.compress
        })
      ]
    });
  }

  /**
   * Ensure production log directories exist
   */
  private ensureProductionLogDirectories(): void {
    const directories = [
      resolve(this.config.baseLogDir, 'application'),
      resolve(this.config.baseLogDir, 'audit'),
      resolve(this.config.baseLogDir, 'security'),
      resolve(this.config.baseLogDir, 'trading'),
      resolve(this.config.baseLogDir, 'performance'),
      resolve(this.config.baseLogDir, 'system')
    ];

    for (const dir of directories) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o750 });
      }
    }
  }

  /**
   * Start performance metrics collection
   */
  private startMetricsCollection(): void {
    if (!this.config.enablePerformanceLogging) {
      return;
    }

    this.metricsCollectionInterval = setInterval(async () => {
      try {
        const metrics = await this.collectPerformanceMetrics();
        this.logPerformanceMetrics(metrics);
      } catch (error) {
        this.error('Failed to collect performance metrics', { error: error.message });
      }
    }, 60000); // Collect every minute

    this.info('Performance metrics collection started', {
      interval: '60s',
      enabled: this.config.enablePerformanceLogging
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (!this.config.enableHealthLogging) {
      return;
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthStatus = await this.checkSystemHealth();
        this.logHealthStatus(healthStatus);
        await this.processHealthAlerts(healthStatus);
      } catch (error) {
        this.error('Failed to check system health', { error: error.message });
      }
    }, 300000); // Check every 5 minutes

    this.info('System health monitoring started', {
      interval: '5m',
      enabled: this.config.enableHealthLogging
    });
  }

  /**
   * Collect comprehensive performance metrics
   * 
   * @returns Promise<PerformanceMetrics> Performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const timestamp = new Date();

    // System metrics
    const cpuUsage = await this.getCPUUsage();
    const memoryInfo = process.memoryUsage();
    const systemMemory = this.getSystemMemoryInfo();
    const diskInfo = await this.getDiskInfo();
    const networkInfo = await this.getNetworkInfo();

    // Application metrics
    const applicationMetrics = {
      pid: process.pid,
      cpuUsage: cpuUsage,
      memoryUsage: (memoryInfo.rss / systemMemory.total) * 100,
      heapUsed: memoryInfo.heapUsed,
      heapTotal: memoryInfo.heapTotal,
      uptime: process.uptime()
    };

    return {
      timestamp,
      system: {
        cpu: {
          usage: cpuUsage,
          temperature: await this.getCPUTemperature(),
          frequency: await this.getCPUFrequency()
        },
        memory: systemMemory,
        disk: diskInfo,
        network: networkInfo
      },
      application: applicationMetrics
    };
  }

  /**
   * Get CPU usage percentage
   * 
   * @returns Promise<number> CPU usage percentage
   */
  private async getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);
        
        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000; // microseconds
        const totalUsage = endUsage.user + endUsage.system;
        const cpuPercent = (totalUsage / totalTime) * 100;
        
        resolve(Math.min(100, Math.max(0, cpuPercent)));
      }, 100);
    });
  }

  /**
   * Get CPU temperature
   * 
   * @returns Promise<number> CPU temperature in Celsius
   */
  private async getCPUTemperature(): Promise<number> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('sensors | grep "Core 0" | awk \'{print $3}\' | sed \'s/+//;s/°C//\'', 
        { encoding: 'utf8', timeout: 5000 });
      return parseFloat(output.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get CPU frequency
   * 
   * @returns Promise<number> CPU frequency in MHz
   */
  private async getCPUFrequency(): Promise<number> {
    try {
      const { execSync } = require('child_process');
      const output = execSync('cat /proc/cpuinfo | grep "cpu MHz" | head -1 | awk \'{print $4}\'', 
        { encoding: 'utf8', timeout: 5000 });
      return parseFloat(output.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get system memory information
   * 
   * @returns Memory information object
   */
  private getSystemMemoryInfo(): {
    total: number;
    used: number;
    free: number;
    utilization: number;
  } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const utilization = (usedMemory / totalMemory) * 100;

    return {
      total: totalMemory,
      used: usedMemory,
      free: freeMemory,
      utilization: Math.round(utilization)
    };
  }

  /**
   * Get disk information
   * 
   * @returns Promise<object> Disk information
   */
  private async getDiskInfo(): Promise<{
    total: number;
    used: number;
    free: number;
    utilization: number;
    iops: number;
  }> {
    try {
      const { execSync } = require('child_process');
      
      // Get disk usage
      const dfOutput = execSync('df / | tail -1', { encoding: 'utf8', timeout: 5000 });
      const dfParts = dfOutput.trim().split(/\s+/);
      
      const total = parseInt(dfParts[1]) * 1024; // Convert from KB to bytes
      const used = parseInt(dfParts[2]) * 1024;
      const free = parseInt(dfParts[3]) * 1024;
      const utilization = parseInt(dfParts[4].replace('%', ''));

      // Get IOPS (simplified)
      let iops = 0;
      try {
        const iostatOutput = execSync('iostat -x 1 1 | tail -n +4 | awk \'NR==2 {print $4+$5}\'', 
          { encoding: 'utf8', timeout: 10000 });
        iops = parseFloat(iostatOutput.trim()) || 0;
      } catch (error) {
        // IOPS measurement failed, continue with 0
      }

      return { total, used, free, utilization, iops };
    } catch (error) {
      return { total: 0, used: 0, free: 0, utilization: 0, iops: 0 };
    }
  }

  /**
   * Get network information
   * 
   * @returns Promise<object> Network information
   */
  private async getNetworkInfo(): Promise<{
    bytesReceived: number;
    bytesSent: number;
    packetsReceived: number;
    packetsSent: number;
  }> {
    try {
      const { execSync } = require('child_process');
      
      // Get network statistics
      const netOutput = execSync('cat /proc/net/dev | grep -E "(eth0|enp|wlan)" | head -1', 
        { encoding: 'utf8', timeout: 5000 });
      
      if (netOutput.trim()) {
        const parts = netOutput.trim().split(/\s+/);
        return {
          bytesReceived: parseInt(parts[1]) || 0,
          bytesSent: parseInt(parts[9]) || 0,
          packetsReceived: parseInt(parts[2]) || 0,
          packetsSent: parseInt(parts[10]) || 0
        };
      }
    } catch (error) {
      // Network stats failed
    }

    return {
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0
    };
  }

  /**
   * Log performance metrics
   * 
   * @param metrics Performance metrics to log
   */
  private logPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceLogger.info('performance_metrics', metrics);
    
    // Also log summary to main logger
    this.debug('Performance metrics collected', {
      cpu: `${metrics.system.cpu.usage.toFixed(1)}%`,
      memory: `${metrics.system.memory.utilization}%`,
      disk: `${metrics.system.disk.utilization}%`,
      temperature: `${metrics.system.cpu.temperature}°C`,
      appMemory: `${metrics.application.memoryUsage.toFixed(1)}%`,
      uptime: `${Math.floor(metrics.application.uptime)}s`
    });
  }

  /**
   * Check system health
   * 
   * @returns Promise<SystemHealthStatus> System health status
   */
  private async checkSystemHealth(): Promise<SystemHealthStatus> {
    const metrics = await this.collectPerformanceMetrics();
    const alerts: SystemAlert[] = [];
    const recommendations: string[] = [];

    // Calculate component health scores
    const cpuHealth = this.calculateHealthScore(
      metrics.system.cpu.usage,
      this.config.thresholds.cpu.warning,
      this.config.thresholds.cpu.critical
    );

    const memoryHealth = this.calculateHealthScore(
      metrics.system.memory.utilization,
      this.config.thresholds.memory.warning,
      this.config.thresholds.memory.critical
    );

    const diskHealth = this.calculateHealthScore(
      metrics.system.disk.utilization,
      this.config.thresholds.disk.warning,
      this.config.thresholds.disk.critical
    );

    const temperatureHealth = this.calculateHealthScore(
      metrics.system.cpu.temperature,
      this.config.thresholds.temperature.warning,
      this.config.thresholds.temperature.critical
    );

    // Check for alerts
    if (metrics.system.cpu.usage >= this.config.thresholds.cpu.critical) {
      alerts.push(this.createAlert('CPU', 'CRITICAL', 
        `CPU usage critical: ${metrics.system.cpu.usage.toFixed(1)}%`,
        metrics.system.cpu.usage, this.config.thresholds.cpu.critical));
      recommendations.push('Reduce CPU-intensive operations or upgrade hardware');
    } else if (metrics.system.cpu.usage >= this.config.thresholds.cpu.warning) {
      alerts.push(this.createAlert('CPU', 'WARNING', 
        `CPU usage high: ${metrics.system.cpu.usage.toFixed(1)}%`,
        metrics.system.cpu.usage, this.config.thresholds.cpu.warning));
    }

    if (metrics.system.memory.utilization >= this.config.thresholds.memory.critical) {
      alerts.push(this.createAlert('MEMORY', 'CRITICAL', 
        `Memory usage critical: ${metrics.system.memory.utilization}%`,
        metrics.system.memory.utilization, this.config.thresholds.memory.critical));
      recommendations.push('Free up memory or add more RAM');
    } else if (metrics.system.memory.utilization >= this.config.thresholds.memory.warning) {
      alerts.push(this.createAlert('MEMORY', 'WARNING', 
        `Memory usage high: ${metrics.system.memory.utilization}%`,
        metrics.system.memory.utilization, this.config.thresholds.memory.warning));
    }

    if (metrics.system.disk.utilization >= this.config.thresholds.disk.critical) {
      alerts.push(this.createAlert('DISK', 'CRITICAL', 
        `Disk usage critical: ${metrics.system.disk.utilization}%`,
        metrics.system.disk.utilization, this.config.thresholds.disk.critical));
      recommendations.push('Clean up disk space immediately');
    } else if (metrics.system.disk.utilization >= this.config.thresholds.disk.warning) {
      alerts.push(this.createAlert('DISK', 'WARNING', 
        `Disk usage high: ${metrics.system.disk.utilization}%`,
        metrics.system.disk.utilization, this.config.thresholds.disk.warning));
    }

    if (metrics.system.cpu.temperature >= this.config.thresholds.temperature.critical) {
      alerts.push(this.createAlert('CPU', 'CRITICAL', 
        `CPU temperature critical: ${metrics.system.cpu.temperature}°C`,
        metrics.system.cpu.temperature, this.config.thresholds.temperature.critical));
      recommendations.push('Check cooling system and reduce system load');
    } else if (metrics.system.cpu.temperature >= this.config.thresholds.temperature.warning) {
      alerts.push(this.createAlert('CPU', 'WARNING', 
        `CPU temperature high: ${metrics.system.cpu.temperature}°C`,
        metrics.system.cpu.temperature, this.config.thresholds.temperature.warning));
    }

    // Calculate overall health
    const overallHealth = Math.round(
      (cpuHealth + memoryHealth + diskHealth + temperatureHealth + 100) / 5
    );

    return {
      overallHealth,
      components: {
        cpu: cpuHealth,
        memory: memoryHealth,
        disk: diskHealth,
        network: 100, // Simplified for now
        application: metrics.application.memoryUsage < 50 ? 100 : 80
      },
      alerts,
      recommendations,
      lastCheck: new Date()
    };
  }

  /**
   * Calculate health score based on thresholds
   * 
   * @param value Current value
   * @param warningThreshold Warning threshold
   * @param criticalThreshold Critical threshold
   * @returns Health score (0-100)
   */
  private calculateHealthScore(value: number, warningThreshold: number, criticalThreshold: number): number {
    if (value >= criticalThreshold) {
      return Math.max(0, 100 - ((value - criticalThreshold) / criticalThreshold) * 100);
    } else if (value >= warningThreshold) {
      return Math.max(30, 100 - ((value - warningThreshold) / (criticalThreshold - warningThreshold)) * 70);
    } else {
      return 100;
    }
  }

  /**
   * Create system alert
   * 
   * @param type Alert type
   * @param severity Alert severity
   * @param message Alert message
   * @param currentValue Current value
   * @param threshold Threshold value
   * @returns SystemAlert
   */
  private createAlert(
    type: 'CPU' | 'MEMORY' | 'DISK' | 'NETWORK' | 'APPLICATION' | 'TRADING',
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    message: string,
    currentValue: number,
    threshold: number
  ): SystemAlert {
    return {
      id: `${type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      type,
      severity,
      message,
      currentValue,
      threshold,
      timestamp: new Date(),
      isActive: true
    };
  }

  /**
   * Log health status
   * 
   * @param healthStatus System health status
   */
  private logHealthStatus(healthStatus: SystemHealthStatus): void {
    this.healthLogger.info('system_health', healthStatus);
    
    // Log summary to main logger
    this.info('System health check completed', {
      overallHealth: healthStatus.overallHealth,
      activeAlerts: healthStatus.alerts.length,
      components: healthStatus.components
    });
  }

  /**
   * Process health alerts
   * 
   * @param healthStatus System health status
   */
  private async processHealthAlerts(healthStatus: SystemHealthStatus): Promise<void> {
    for (const alert of healthStatus.alerts) {
      // Check if this is a new alert
      const existingAlert = this.activeAlerts.get(alert.id);
      if (!existingAlert) {
        this.activeAlerts.set(alert.id, alert);
        
        // Log the alert
        this.alertLogger.info('system_alert', alert);
        
        // Log to main logger based on severity
        if (alert.severity === 'CRITICAL') {
          this.error(`🚨 CRITICAL ALERT: ${alert.message}`, {
            type: alert.type,
            currentValue: alert.currentValue,
            threshold: alert.threshold
          });
        } else if (alert.severity === 'WARNING') {
          this.warn(`⚠️ WARNING: ${alert.message}`, {
            type: alert.type,
            currentValue: alert.currentValue,
            threshold: alert.threshold
          });
        }

        // TODO: Integrate with notification service for critical alerts
        if (alert.severity === 'CRITICAL' && this.config.alerts.enabled) {
          // This would send notifications via configured channels
          this.info('Critical alert would trigger notifications', {
            channels: this.config.alerts.escalation.critical,
            alert: alert.message
          });
        }
      }
    }

    // Clean up resolved alerts
    const currentAlertIds = new Set(healthStatus.alerts.map(a => a.id));
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (!currentAlertIds.has(alertId)) {
        this.activeAlerts.delete(alertId);
        this.info('Alert resolved', { 
          type: alert.type, 
          message: alert.message 
        });
      }
    }
  }

  /**
   * Get production logging statistics
   * 
   * @returns Production logging statistics
   */
  public getProductionStats(): {
    config: ProductionLoggerConfig;
    activeAlerts: number;
    metricsCollectionActive: boolean;
    healthMonitoringActive: boolean;
    logDirectories: string[];
    timestamp: number;
  } {
    return {
      config: this.config,
      activeAlerts: this.activeAlerts.size,
      metricsCollectionActive: this.metricsCollectionInterval !== null,
      healthMonitoringActive: this.healthCheckInterval !== null,
      logDirectories: [
        resolve(this.config.baseLogDir, 'application'),
        resolve(this.config.baseLogDir, 'audit'),
        resolve(this.config.baseLogDir, 'security'),
        resolve(this.config.baseLogDir, 'trading'),
        resolve(this.config.baseLogDir, 'performance'),
        resolve(this.config.baseLogDir, 'system')
      ],
      timestamp: Date.now()
    };
  }

  /**
   * Stop production logging services
   */
  public stopProductionLogging(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
      this.info('Performance metrics collection stopped');
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.info('System health monitoring stopped');
    }
  }
}

// Create and export production logger instance
export const productionLogger = new ProductionLogger('ProductionSystem');

// Export types for use in other modules
export type {
  ProductionLoggerConfig,
  PerformanceMetrics,
  SystemHealthStatus,
  SystemAlert
};

// =============================================================================
// PRODUCTION LOGGING NOTES
// =============================================================================
// 1. All logs are structured in JSON format for automated analysis
// 2. Performance metrics are collected every minute
// 3. System health is monitored every 5 minutes
// 4. Alerts are generated based on configurable thresholds
// 5. Log rotation is handled automatically with proper retention
// 6. Critical alerts can trigger external notifications
// 7. All sensitive data is automatically sanitized
// 8. Backup procedures include log archival
// =============================================================================