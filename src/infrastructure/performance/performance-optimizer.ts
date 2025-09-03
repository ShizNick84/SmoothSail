/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTEL NUC PERFORMANCE OPTIMIZER
 * =============================================================================
 * 
 * This module provides comprehensive performance optimization for Intel NUC systems
 * by coordinating memory, disk, and CPU optimization. It ensures optimal system
 * performance for 24/7 trading operations within hardware constraints.
 * 
 * CRITICAL PERFORMANCE NOTICE:
 * Performance optimization is essential for reliable trading operations on Intel NUC.
 * Poor system performance could impact trading decision timing, data processing,
 * and system stability, potentially resulting in financial losses.
 * 
 * Intel NUC Specifications:
 * - Intel i5 CPU (4-8 cores)
 * - 12GB RAM
 * - 256GB M.2 SSD
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';
import { MemoryOptimizer, MemoryMetrics, MemoryAlert } from './memory-optimizer';
import { DiskOptimizer, DiskMetrics, DiskAlert } from './disk-optimizer';
import { CPUOptimizer, CPUMetrics, CPUAlert } from './cpu-optimizer';

/**
 * Interface for comprehensive system performance metrics
 */
export interface SystemPerformanceMetrics {
  /** Memory metrics */
  memory: MemoryMetrics | null;
  /** Disk metrics */
  disk: DiskMetrics | null;
  /** CPU metrics */
  cpu: CPUMetrics | null;
  /** Overall system health score (0-100) */
  overallHealthScore: number;
  /** System performance level */
  performanceLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  /** Active alerts count */
  activeAlertsCount: number;
  /** System optimization status */
  optimizationStatus: {
    memory: boolean;
    disk: boolean;
    cpu: boolean;
  };
  /** Timestamp of metrics collection */
  timestamp: Date;
}

/**
 * Interface for performance optimization configuration
 */
export interface PerformanceOptimizerConfig {
  /** Enable memory optimization (default: true) */
  enableMemoryOptimization: boolean;
  /** Enable disk optimization (default: true) */
  enableDiskOptimization: boolean;
  /** Enable CPU optimization (default: true) */
  enableCPUOptimization: boolean;
  /** System monitoring interval in milliseconds (default: 30000) */
  systemMonitoringIntervalMs: number;
  /** Performance reporting interval in milliseconds (default: 300000) */
  reportingIntervalMs: number;
  /** Enable automatic optimization (default: true) */
  enableAutoOptimization: boolean;
  /** Performance alert threshold (default: 70) */
  performanceAlertThreshold: number;
  /** Critical performance threshold (default: 85) */
  criticalPerformanceThreshold: number;
}

/**
 * Interface for system performance alert
 */
export interface SystemPerformanceAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'SYSTEM_PERFORMANCE' | 'RESOURCE_EXHAUSTION' | 'OPTIMIZATION_FAILURE';
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Affected components */
  affectedComponents: ('memory' | 'disk' | 'cpu')[];
  /** Current performance score */
  currentScore: number;
  /** Performance threshold */
  threshold: number;
  /** Alert timestamp */
  timestamp: Date;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Interface for optimization report
 */
export interface OptimizationReport {
  /** Report ID */
  id: string;
  /** Report timestamp */
  timestamp: Date;
  /** Report period */
  period: {
    start: Date;
    end: Date;
  };
  /** Performance summary */
  summary: {
    averageHealthScore: number;
    minHealthScore: number;
    maxHealthScore: number;
    totalAlerts: number;
    optimizationEvents: number;
  };
  /** Component performance */
  components: {
    memory: {
      averageUtilization: number;
      peakUtilization: number;
      gcEvents: number;
      alerts: number;
    };
    disk: {
      averageUtilization: number;
      peakUtilization: number;
      cleanupEvents: number;
      alerts: number;
    };
    cpu: {
      averageUtilization: number;
      peakUtilization: number;
      optimizationEvents: number;
      alerts: number;
    };
  };
  /** Recommendations */
  recommendations: string[];
}

/**
 * Intel NUC Performance Optimizer
 * Coordinates comprehensive system performance optimization
 */
export class PerformanceOptimizer extends EventEmitter {
  private config: PerformanceOptimizerConfig;
  private memoryOptimizer: MemoryOptimizer;
  private diskOptimizer: DiskOptimizer;
  private cpuOptimizer: CPUOptimizer;
  
  private systemMonitoringInterval: NodeJS.Timeout | null = null;
  private reportingInterval: NodeJS.Timeout | null = null;
  
  private currentMetrics: SystemPerformanceMetrics | null = null;
  private metricsHistory: SystemPerformanceMetrics[] = [];
  private activeAlerts: Map<string, SystemPerformanceAlert> = new Map();
  
  private isOptimizing = false;
  private startTime: Date;

  constructor(config?: Partial<PerformanceOptimizerConfig>) {
    super();
    
    this.config = {
      enableMemoryOptimization: true,
      enableDiskOptimization: true,
      enableCPUOptimization: true,
      systemMonitoringIntervalMs: 30000, // 30 seconds
      reportingIntervalMs: 300000, // 5 minutes
      enableAutoOptimization: true,
      performanceAlertThreshold: 70,
      criticalPerformanceThreshold: 85,
      ...config
    };

    this.startTime = new Date();

    // Initialize component optimizers
    this.memoryOptimizer = new MemoryOptimizer();
    this.diskOptimizer = new DiskOptimizer();
    this.cpuOptimizer = new CPUOptimizer();

    // Set up event listeners
    this.setupEventListeners();

    logger.info('🚀 Intel NUC Performance Optimizer initializing...', {
      component: 'PerformanceOptimizer',
      config: this.config
    });
  }

  /**
   * Start comprehensive performance optimization
   */
  public async startOptimization(): Promise<void> {
    try {
      logger.info('🚀 Starting Intel NUC performance optimization...');

      // Start component optimizers
      if (this.config.enableMemoryOptimization) {
        await this.memoryOptimizer.startOptimization();
        logger.info('✅ Memory optimization started');
      }

      if (this.config.enableDiskOptimization) {
        await this.diskOptimizer.startOptimization();
        logger.info('✅ Disk optimization started');
      }

      if (this.config.enableCPUOptimization) {
        await this.cpuOptimizer.startOptimization();
        logger.info('✅ CPU optimization started');
      }

      // Start system monitoring
      this.startSystemMonitoring();

      // Start performance reporting
      this.startPerformanceReporting();

      // Perform initial system assessment
      await this.performSystemAssessment();

      logger.info('✅ Performance optimization started successfully');
      this.emit('optimizationStarted');

    } catch (error) {
      logger.error('❌ Failed to start performance optimization:', error);
      throw error;
    }
  }

  /**
   * Stop performance optimization
   */
  public stopOptimization(): void {
    logger.info('🛑 Stopping performance optimization...');

    // Stop system monitoring
    if (this.systemMonitoringInterval) {
      clearInterval(this.systemMonitoringInterval);
      this.systemMonitoringInterval = null;
    }

    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }

    // Stop component optimizers
    if (this.config.enableMemoryOptimization) {
      this.memoryOptimizer.stopOptimization();
    }

    if (this.config.enableDiskOptimization) {
      this.diskOptimizer.stopOptimization();
    }

    if (this.config.enableCPUOptimization) {
      this.cpuOptimizer.stopOptimization();
    }

    logger.info('✅ Performance optimization stopped');
    this.emit('optimizationStopped');
  }

  /**
   * Setup event listeners for component optimizers
   */
  private setupEventListeners(): void {
    // Memory optimizer events
    this.memoryOptimizer.on('memoryAlert', (alert: MemoryAlert) => {
      this.handleComponentAlert('memory', alert);
    });

    this.memoryOptimizer.on('emergencyCleanup', () => {
      logger.warn('🚨 Memory emergency cleanup triggered');
      this.emit('emergencyAction', { component: 'memory', action: 'cleanup' });
    });

    // Disk optimizer events
    this.diskOptimizer.on('diskAlert', (alert: DiskAlert) => {
      this.handleComponentAlert('disk', alert);
    });

    this.diskOptimizer.on('emergencyCleanup', () => {
      logger.warn('🚨 Disk emergency cleanup triggered');
      this.emit('emergencyAction', { component: 'disk', action: 'cleanup' });
    });

    // CPU optimizer events
    this.cpuOptimizer.on('cpuAlert', (alert: CPUAlert) => {
      this.handleComponentAlert('cpu', alert);
    });

    this.cpuOptimizer.on('emergencyOptimization', () => {
      logger.warn('🚨 CPU emergency optimization triggered');
      this.emit('emergencyAction', { component: 'cpu', action: 'optimization' });
    });
  }

  /**
   * Handle component alerts
   */
  private async handleComponentAlert(component: string, alert: any): Promise<void> {
    logger.warn(`⚠️ Component alert from ${component}:`, {
      type: alert.type,
      severity: alert.severity,
      message: alert.message
    });

    // Create system-level alert if critical
    if (alert.severity === 'CRITICAL') {
      await this.createSystemAlert(component, alert);
    }

    // Trigger system-wide optimization if needed
    if (this.config.enableAutoOptimization && alert.severity === 'CRITICAL') {
      await this.performEmergencyOptimization();
    }
  }

  /**
   * Start system monitoring
   */
  private startSystemMonitoring(): void {
    logger.info('📊 Starting system performance monitoring...');

    this.systemMonitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        this.currentMetrics = metrics;
        
        // Add to history (keep last 200 entries)
        this.metricsHistory.push(metrics);
        if (this.metricsHistory.length > 200) {
          this.metricsHistory.shift();
        }

        // Check for system-level alerts
        await this.checkSystemAlerts(metrics);

        // Emit metrics update
        this.emit('metricsUpdated', metrics);

        // Log periodic status
        if (this.metricsHistory.length % 10 === 0) { // Every 10 intervals
          this.logSystemStatus(metrics);
        }

      } catch (error) {
        logger.error('❌ System monitoring error:', error);
      }
    }, this.config.systemMonitoringIntervalMs);
  }

  /**
   * Start performance reporting
   */
  private startPerformanceReporting(): void {
    logger.info('📈 Starting performance reporting...');

    this.reportingInterval = setInterval(async () => {
      try {
        await this.generatePerformanceReport();
      } catch (error) {
        logger.error('❌ Performance reporting error:', error);
      }
    }, this.config.reportingIntervalMs);
  }

  /**
   * Perform initial system assessment
   */
  private async performSystemAssessment(): Promise<void> {
    logger.info('🔍 Performing comprehensive system assessment...');

    const metrics = await this.collectSystemMetrics();
    this.currentMetrics = metrics;

    // Log system assessment
    logger.info('📊 System Assessment:', {
      overallHealthScore: metrics.overallHealthScore,
      performanceLevel: metrics.performanceLevel,
      memory: metrics.memory ? {
        utilization: `${metrics.memory.systemUtilization}%`,
        pressureLevel: metrics.memory.pressureLevel
      } : null,
      disk: metrics.disk ? {
        utilization: `${metrics.disk.utilization}%`,
        healthStatus: metrics.disk.healthStatus
      } : null,
      cpu: metrics.cpu ? {
        utilization: `${metrics.cpu.overallUtilization}%`,
        performanceLevel: metrics.cpu.performanceLevel
      } : null
    });

    // Generate system recommendations
    const recommendations = this.generateSystemRecommendations(metrics);
    if (recommendations.length > 0) {
      logger.info('💡 System optimization recommendations:', recommendations);
    }
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectSystemMetrics(): Promise<SystemPerformanceMetrics> {
    const memoryMetrics = this.memoryOptimizer.getCurrentMetrics();
    const diskMetrics = this.diskOptimizer.getCurrentMetrics();
    const cpuMetrics = this.cpuOptimizer.getCurrentMetrics();

    // Calculate overall health score
    let healthScore = 100;
    let componentScores: number[] = [];

    if (memoryMetrics) {
      const memoryScore = this.calculateComponentScore(memoryMetrics.systemUtilization, 75, 90);
      componentScores.push(memoryScore);
    }

    if (diskMetrics) {
      const diskScore = this.calculateComponentScore(diskMetrics.utilization, 80, 95);
      componentScores.push(diskScore);
    }

    if (cpuMetrics) {
      const cpuScore = this.calculateComponentScore(cpuMetrics.overallUtilization, 70, 85);
      componentScores.push(cpuScore);
    }

    if (componentScores.length > 0) {
      healthScore = Math.round(componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length);
    }

    // Determine performance level
    let performanceLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
    if (healthScore >= 90) {
      performanceLevel = 'EXCELLENT';
    } else if (healthScore >= 75) {
      performanceLevel = 'GOOD';
    } else if (healthScore >= 60) {
      performanceLevel = 'WARNING';
    } else {
      performanceLevel = 'CRITICAL';
    }

    // Count active alerts
    const memoryAlerts = this.memoryOptimizer.getActiveAlerts().length;
    const diskAlerts = this.diskOptimizer.getActiveAlerts().length;
    const cpuAlerts = this.cpuOptimizer.getActiveAlerts().length;
    const activeAlertsCount = memoryAlerts + diskAlerts + cpuAlerts + this.activeAlerts.size;

    return {
      memory: memoryMetrics,
      disk: diskMetrics,
      cpu: cpuMetrics,
      overallHealthScore: healthScore,
      performanceLevel,
      activeAlertsCount,
      optimizationStatus: {
        memory: this.memoryOptimizer.getStatus().isMonitoring,
        disk: this.diskOptimizer.getStatus().isMonitoring,
        cpu: this.cpuOptimizer.getStatus().isMonitoring
      },
      timestamp: new Date()
    };
  }

  /**
   * Calculate component health score
   */
  private calculateComponentScore(utilization: number, warningThreshold: number, criticalThreshold: number): number {
    if (utilization >= criticalThreshold) {
      return Math.max(0, 100 - ((utilization - criticalThreshold) / (100 - criticalThreshold)) * 50);
    } else if (utilization >= warningThreshold) {
      return Math.max(50, 100 - ((utilization - warningThreshold) / (criticalThreshold - warningThreshold)) * 50);
    } else {
      return 100;
    }
  }

  /**
   * Check for system-level alerts
   */
  private async checkSystemAlerts(metrics: SystemPerformanceMetrics): Promise<void> {
    const alerts: SystemPerformanceAlert[] = [];

    // Check overall performance
    if (metrics.overallHealthScore <= this.config.criticalPerformanceThreshold - 25) { // 60 for critical threshold of 85
      alerts.push({
        id: `system_critical_${Date.now()}`,
        type: 'SYSTEM_PERFORMANCE',
        severity: 'CRITICAL',
        message: `System performance critical: ${metrics.overallHealthScore}% health score`,
        affectedComponents: this.getAffectedComponents(metrics),
        currentScore: metrics.overallHealthScore,
        threshold: this.config.criticalPerformanceThreshold - 25,
        timestamp: new Date(),
        recommendations: [
          'Immediate system optimization required',
          'Check all component optimizers',
          'Consider system restart if persistent',
          'Review system resource allocation'
        ]
      });
    } else if (metrics.overallHealthScore <= this.config.performanceAlertThreshold) {
      alerts.push({
        id: `system_warning_${Date.now()}`,
        type: 'SYSTEM_PERFORMANCE',
        severity: 'HIGH',
        message: `System performance degraded: ${metrics.overallHealthScore}% health score`,
        affectedComponents: this.getAffectedComponents(metrics),
        currentScore: metrics.overallHealthScore,
        threshold: this.config.performanceAlertThreshold,
        timestamp: new Date(),
        recommendations: [
          'Monitor system performance closely',
          'Enable aggressive optimization',
          'Review component utilization',
          'Consider preventive maintenance'
        ]
      });
    }

    // Check for resource exhaustion
    const exhaustedComponents = this.checkResourceExhaustion(metrics);
    if (exhaustedComponents.length > 0) {
      alerts.push({
        id: `resource_exhaustion_${Date.now()}`,
        type: 'RESOURCE_EXHAUSTION',
        severity: 'CRITICAL',
        message: `Resource exhaustion detected: ${exhaustedComponents.join(', ')}`,
        affectedComponents: exhaustedComponents,
        currentScore: metrics.overallHealthScore,
        threshold: 95,
        timestamp: new Date(),
        recommendations: [
          'Immediate resource cleanup required',
          'Stop non-essential processes',
          'Enable emergency optimization',
          'Consider system restart'
        ]
      });
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processSystemAlert(alert);
    }
  }

  /**
   * Get affected components based on metrics
   */
  private getAffectedComponents(metrics: SystemPerformanceMetrics): ('memory' | 'disk' | 'cpu')[] {
    const affected: ('memory' | 'disk' | 'cpu')[] = [];

    if (metrics.memory && metrics.memory.systemUtilization > 80) {
      affected.push('memory');
    }

    if (metrics.disk && metrics.disk.utilization > 85) {
      affected.push('disk');
    }

    if (metrics.cpu && metrics.cpu.overallUtilization > 75) {
      affected.push('cpu');
    }

    return affected;
  }

  /**
   * Check for resource exhaustion
   */
  private checkResourceExhaustion(metrics: SystemPerformanceMetrics): ('memory' | 'disk' | 'cpu')[] {
    const exhausted: ('memory' | 'disk' | 'cpu')[] = [];

    if (metrics.memory && metrics.memory.systemUtilization >= 95) {
      exhausted.push('memory');
    }

    if (metrics.disk && metrics.disk.utilization >= 98) {
      exhausted.push('disk');
    }

    if (metrics.cpu && metrics.cpu.overallUtilization >= 95) {
      exhausted.push('cpu');
    }

    return exhausted;
  }

  /**
   * Process system alert
   */
  private async processSystemAlert(alert: SystemPerformanceAlert): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(a => a.type === alert.type && a.severity === alert.severity);

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentScore = alert.currentScore;
      existingAlert.timestamp = alert.timestamp;
      return;
    }

    // Add new alert
    this.activeAlerts.set(alert.id, alert);

    // Log alert
    logger.warn(`⚠️ System Alert: ${alert.message}`, {
      component: 'PerformanceOptimizer',
      alertType: alert.type,
      severity: alert.severity,
      affectedComponents: alert.affectedComponents,
      currentScore: alert.currentScore,
      threshold: alert.threshold,
      recommendations: alert.recommendations
    });

    // Emit alert event
    this.emit('systemAlert', alert);

    // Take automatic action for critical alerts
    if (alert.severity === 'CRITICAL' && this.config.enableAutoOptimization) {
      await this.performEmergencyOptimization();
    }
  }

  /**
   * Create system alert from component alert
   */
  private async createSystemAlert(component: string, componentAlert: any): Promise<void> {
    const alert: SystemPerformanceAlert = {
      id: `system_${component}_${Date.now()}`,
      type: 'SYSTEM_PERFORMANCE',
      severity: componentAlert.severity,
      message: `${component.toUpperCase()} critical: ${componentAlert.message}`,
      affectedComponents: [component as 'memory' | 'disk' | 'cpu'],
      currentScore: this.currentMetrics?.overallHealthScore || 0,
      threshold: 0,
      timestamp: new Date(),
      recommendations: componentAlert.recommendations || []
    };

    await this.processSystemAlert(alert);
  }

  /**
   * Perform emergency optimization
   */
  private async performEmergencyOptimization(): Promise<void> {
    if (this.isOptimizing) {
      return; // Prevent concurrent optimization
    }

    this.isOptimizing = true;

    try {
      logger.warn('🚨 Performing emergency system optimization...');

      const beforeMetrics = await this.collectSystemMetrics();

      // Force optimization on all components
      if (this.config.enableMemoryOptimization) {
        await this.memoryOptimizer.forceGarbageCollection();
      }

      if (this.config.enableDiskOptimization) {
        await this.diskOptimizer.forceCleanup();
      }

      if (this.config.enableCPUOptimization) {
        await this.cpuOptimizer.forceCPUOptimization();
      }

      // Wait for optimization to take effect
      await new Promise(resolve => setTimeout(resolve, 10000));

      const afterMetrics = await this.collectSystemMetrics();

      logger.info('✅ Emergency optimization completed', {
        beforeScore: beforeMetrics.overallHealthScore,
        afterScore: afterMetrics.overallHealthScore,
        improvement: afterMetrics.overallHealthScore - beforeMetrics.overallHealthScore
      });

      this.emit('emergencyOptimizationCompleted', {
        beforeMetrics,
        afterMetrics
      });

    } catch (error) {
      logger.error('❌ Emergency optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Generate performance report
   */
  private async generatePerformanceReport(): Promise<void> {
    try {
      if (this.metricsHistory.length < 10) {
        return; // Not enough data for meaningful report
      }

      const report = this.createOptimizationReport();
      
      logger.info('📈 Performance Report Generated', {
        reportId: report.id,
        averageHealthScore: report.summary.averageHealthScore,
        totalAlerts: report.summary.totalAlerts,
        optimizationEvents: report.summary.optimizationEvents
      });

      this.emit('performanceReport', report);

    } catch (error) {
      logger.error('❌ Failed to generate performance report:', error);
    }
  }

  /**
   * Create optimization report
   */
  private createOptimizationReport(): OptimizationReport {
    const now = new Date();
    const reportPeriod = this.config.reportingIntervalMs;
    const startTime = new Date(now.getTime() - reportPeriod);

    // Filter metrics for report period
    const periodMetrics = this.metricsHistory.filter(m => 
      m.timestamp >= startTime && m.timestamp <= now
    );

    // Calculate summary statistics
    const healthScores = periodMetrics.map(m => m.overallHealthScore);
    const averageHealthScore = healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length)
      : 0;
    const minHealthScore = healthScores.length > 0 ? Math.min(...healthScores) : 0;
    const maxHealthScore = healthScores.length > 0 ? Math.max(...healthScores) : 0;

    return {
      id: `perf_report_${Date.now()}`,
      timestamp: now,
      period: { start: startTime, end: now },
      summary: {
        averageHealthScore,
        minHealthScore,
        maxHealthScore,
        totalAlerts: this.activeAlerts.size,
        optimizationEvents: 0 // Would track actual optimization events
      },
      components: {
        memory: {
          averageUtilization: this.calculateAverageUtilization(periodMetrics, 'memory'),
          peakUtilization: this.calculatePeakUtilization(periodMetrics, 'memory'),
          gcEvents: 0, // Would track from memory optimizer
          alerts: this.memoryOptimizer.getActiveAlerts().length
        },
        disk: {
          averageUtilization: this.calculateAverageUtilization(periodMetrics, 'disk'),
          peakUtilization: this.calculatePeakUtilization(periodMetrics, 'disk'),
          cleanupEvents: 0, // Would track from disk optimizer
          alerts: this.diskOptimizer.getActiveAlerts().length
        },
        cpu: {
          averageUtilization: this.calculateAverageUtilization(periodMetrics, 'cpu'),
          peakUtilization: this.calculatePeakUtilization(periodMetrics, 'cpu'),
          optimizationEvents: 0, // Would track from CPU optimizer
          alerts: this.cpuOptimizer.getActiveAlerts().length
        }
      },
      recommendations: this.generateSystemRecommendations(this.currentMetrics!)
    };
  }

  /**
   * Calculate average utilization for component
   */
  private calculateAverageUtilization(metrics: SystemPerformanceMetrics[], component: 'memory' | 'disk' | 'cpu'): number {
    const values = metrics
      .map(m => {
        switch (component) {
          case 'memory': return m.memory?.systemUtilization || 0;
          case 'disk': return m.disk?.utilization || 0;
          case 'cpu': return m.cpu?.overallUtilization || 0;
        }
      })
      .filter(v => v > 0);

    return values.length > 0 
      ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
      : 0;
  }

  /**
   * Calculate peak utilization for component
   */
  private calculatePeakUtilization(metrics: SystemPerformanceMetrics[], component: 'memory' | 'disk' | 'cpu'): number {
    const values = metrics
      .map(m => {
        switch (component) {
          case 'memory': return m.memory?.systemUtilization || 0;
          case 'disk': return m.disk?.utilization || 0;
          case 'cpu': return m.cpu?.overallUtilization || 0;
        }
      })
      .filter(v => v > 0);

    return values.length > 0 ? Math.max(...values) : 0;
  }

  /**
   * Generate system recommendations
   */
  private generateSystemRecommendations(metrics: SystemPerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.overallHealthScore < 70) {
      recommendations.push('System performance is degraded - enable aggressive optimization');
    }

    if (metrics.memory && metrics.memory.systemUtilization > 80) {
      recommendations.push('Memory usage is high - consider increasing garbage collection frequency');
    }

    if (metrics.disk && metrics.disk.utilization > 85) {
      recommendations.push('Disk usage is high - enable more frequent cleanup operations');
    }

    if (metrics.cpu && metrics.cpu.overallUtilization > 75) {
      recommendations.push('CPU usage is high - consider process optimization and load balancing');
    }

    if (metrics.activeAlertsCount > 5) {
      recommendations.push('Multiple active alerts - review system configuration and thresholds');
    }

    return recommendations;
  }

  /**
   * Log system status
   */
  private logSystemStatus(metrics: SystemPerformanceMetrics): void {
    logger.debug('📊 System Performance Status', {
      component: 'PerformanceOptimizer',
      overallHealthScore: metrics.overallHealthScore,
      performanceLevel: metrics.performanceLevel,
      activeAlerts: metrics.activeAlertsCount,
      memory: metrics.memory ? `${metrics.memory.systemUtilization}%` : 'N/A',
      disk: metrics.disk ? `${metrics.disk.utilization}%` : 'N/A',
      cpu: metrics.cpu ? `${metrics.cpu.overallUtilization}%` : 'N/A',
      optimizationStatus: metrics.optimizationStatus
    });
  }

  /**
   * Get current system metrics
   */
  public getCurrentMetrics(): SystemPerformanceMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get system metrics history
   */
  public getMetricsHistory(): SystemPerformanceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get active system alerts
   */
  public getActiveAlerts(): SystemPerformanceAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Force system optimization
   */
  public async forceSystemOptimization(): Promise<void> {
    await this.performEmergencyOptimization();
  }

  /**
   * Get performance optimizer status
   */
  public getStatus(): {
    isOptimizing: boolean;
    isMonitoring: boolean;
    currentMetrics: SystemPerformanceMetrics | null;
    activeAlerts: number;
    uptime: number;
    config: PerformanceOptimizerConfig;
  } {
    return {
      isOptimizing: this.isOptimizing,
      isMonitoring: this.systemMonitoringInterval !== null,
      currentMetrics: this.currentMetrics,
      activeAlerts: this.activeAlerts.size,
      uptime: Date.now() - this.startTime.getTime(),
      config: this.config
    };
  }
}

// Export all types and classes
export {
  MemoryOptimizer,
  DiskOptimizer,
  CPUOptimizer,
  type MemoryMetrics,
  type DiskMetrics,
  type CPUMetrics,
  type MemoryAlert,
  type DiskAlert,
  type CPUAlert
};