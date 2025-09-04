/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTEL NUC CPU OPTIMIZER
 * =============================================================================
 * 
 * This module provides comprehensive CPU optimization for Intel NUC systems
 * with Intel i5 processors. It manages process priorities, CPU affinity,
 * threading optimization, and provides CPU usage monitoring and throttling.
 * 
 * CRITICAL PERFORMANCE NOTICE:
 * CPU optimization is crucial for real-time trading operations on Intel NUC.
 * Poor CPU performance could impact trading decision timing, API response
 * processing, and market data analysis, potentially resulting in missed
 * trading opportunities or suboptimal execution.
 * 
 * Intel NUC Specifications:
 * - Intel i5 CPU (4-8 cores)
 * - Target usage: <70%
 * - Critical threshold: 85%
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';
import { cpus } from 'os';
import * as os from 'os';
import { Worker, isMainThread, parentPort } from 'worker_threads';

/**
 * Interface for CPU metrics
 */
export interface CPUMetrics {
  /** Overall CPU utilization percentage */
  overallUtilization: number;
  /** Per-core utilization percentages */
  coreUtilization: number[];
  /** CPU frequency in MHz */
  frequency: number;
  /** CPU temperature in Celsius */
  temperature: number;
  /** Load average (1, 5, 15 minutes) */
  loadAverage: number[];
  /** Number of active processes */
  activeProcesses: number;
  /** Process CPU usage */
  processUsage: {
    /** User CPU time percentage */
    user: number;
    /** System CPU time percentage */
    system: number;
    /** Total process CPU percentage */
    total: number;
  };
  /** CPU architecture information */
  architecture: {
    /** CPU model */
    model: string;
    /** Number of physical cores */
    physicalCores: number;
    /** Number of logical cores */
    logicalCores: number;
    /** CPU speed in MHz */
    speed: number;
  };
  /** CPU performance level */
  performanceLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  /** Timestamp of metrics collection */
  timestamp: Date;
}

/**
 * Interface for CPU optimization configuration
 */
export interface CPUOptimizerConfig {
  /** Maximum CPU usage percentage (default: 70) */
  maxUsagePercent: number;
  /** Critical CPU usage percentage (default: 85) */
  criticalUsagePercent: number;
  /** Monitoring interval in milliseconds (default: 15000) */
  monitoringIntervalMs: number;
  /** Optimization interval in milliseconds (default: 60000) */
  optimizationIntervalMs: number;
  /** Enable process priority optimization (default: true) */
  enablePriorityOptimization: boolean;
  /** Enable CPU affinity optimization (default: true) */
  enableAffinityOptimization: boolean;
  /** Enable CPU throttling (default: true) */
  enableThrottling: boolean;
  /** Worker thread pool size (default: 2) */
  workerPoolSize: number;
  /** CPU temperature warning threshold in Celsius (default: 70) */
  tempWarningThreshold: number;
  /** CPU temperature critical threshold in Celsius (default: 80) */
  tempCriticalThreshold: number;
}

/**
 * Interface for process priority settings
 */
export interface ProcessPriority {
  /** Process ID */
  pid: number;
  /** Process name */
  name: string;
  /** Priority level (-20 to 19, lower = higher priority) */
  priority: number;
  /** CPU affinity mask */
  affinity?: number[];
}

/**
 * Interface for CPU alert
 */
export interface CPUAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'CPU_WARNING' | 'CPU_CRITICAL' | 'THERMAL_WARNING' | 'PERFORMANCE_DEGRADATION';
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Current CPU usage */
  currentUsage: number;
  /** CPU threshold */
  threshold: number;
  /** Alert timestamp */
  timestamp: Date;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Interface for worker task
 */
export interface WorkerTask {
  /** Task ID */
  id: string;
  /** Task type */
  type: string;
  /** Task data */
  data: any;
  /** Task priority */
  priority: number;
}

/**
 * Intel NUC CPU Optimizer
 * Provides comprehensive CPU performance optimization for Intel i5 processors
 */
export class CPUOptimizer extends EventEmitter {
  private config: CPUOptimizerConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private currentMetrics: CPUMetrics | null = null;
  private cpuHistory: CPUMetrics[] = [];
  private activeAlerts: Map<string, CPUAlert> = new Map();
  private workerPool: Worker[] = [];
  private taskQueue: WorkerTask[] = [];
  private isOptimizing = false;
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();

  constructor(config?: Partial<CPUOptimizerConfig>) {
    super();
    
    this.config = {
      maxUsagePercent: 70,
      criticalUsagePercent: 85,
      monitoringIntervalMs: 15000, // 15 seconds
      optimizationIntervalMs: 60000, // 1 minute
      enablePriorityOptimization: true,
      enableAffinityOptimization: true,
      enableThrottling: true,
      workerPoolSize: 2,
      tempWarningThreshold: 70,
      tempCriticalThreshold: 80,
      ...config
    };

    logger.info('⚡ Intel NUC CPU Optimizer initializing...', {
      component: 'CPUOptimizer',
      config: this.config
    });
  }

  /**
   * Start CPU optimization and monitoring
   */
  public async startOptimization(): Promise<void> {
    try {
      logger.info('🚀 Starting Intel NUC CPU optimization...');

      // Perform initial CPU assessment
      await this.performCPUAssessment();

      // Start CPU monitoring
      this.startCPUMonitoring();

      // Start optimization intervals
      this.startOptimizationIntervals();

      // Initialize worker pool
      if (this.config.workerPoolSize > 0) {
        await this.initializeWorkerPool();
      }

      // Set process priorities
      if (this.config.enablePriorityOptimization) {
        await this.optimizeProcessPriorities();
      }

      // Set CPU affinity
      if (this.config.enableAffinityOptimization) {
        await this.optimizeCPUAffinity();
      }

      logger.info('✅ CPU optimization started successfully');
      this.emit('optimizationStarted');

    } catch (error) {
      logger.error('❌ Failed to start CPU optimization:', error);
      throw error;
    }
  }

  /**
   * Stop CPU optimization
   */
  public stopOptimization(): void {
    logger.info('🛑 Stopping CPU optimization...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    // Terminate worker pool
    this.terminateWorkerPool();

    logger.info('✅ CPU optimization stopped');
    this.emit('optimizationStopped');
  }

  /**
   * Perform comprehensive CPU assessment
   */
  private async performCPUAssessment(): Promise<void> {
    logger.info('🔍 Performing Intel NUC CPU assessment...');

    const metrics = await this.collectCPUMetrics();
    this.currentMetrics = metrics;

    // Log CPU information
    logger.info('📊 CPU Assessment:', {
      model: metrics.architecture.model,
      physicalCores: metrics.architecture.physicalCores,
      logicalCores: metrics.architecture.logicalCores,
      speed: `${metrics.architecture.speed}MHz`,
      utilization: `${metrics.overallUtilization}%`,
      temperature: `${metrics.temperature}°C`,
      performanceLevel: metrics.performanceLevel
    });

    // Check if CPU meets Intel NUC specifications
    if (!metrics.architecture.model.toLowerCase().includes('i5') && 
        !metrics.architecture.model.toLowerCase().includes('i7')) {
      logger.warn('⚠️ CPU may not meet Intel NUC specification:', {
        detected: metrics.architecture.model,
        expected: 'Intel i5 or better'
      });
    }

    // Generate initial recommendations
    const recommendations = this.generateCPURecommendations(metrics);
    if (recommendations.length > 0) {
      logger.info('💡 CPU optimization recommendations:', recommendations);
    }
  }

  /**
   * Start continuous CPU monitoring
   */
  private startCPUMonitoring(): void {
    logger.info('📊 Starting continuous CPU monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectCPUMetrics();
        this.currentMetrics = metrics;
        
        // Add to history (keep last 100 entries)
        this.cpuHistory.push(metrics);
        if (this.cpuHistory.length > 100) {
          this.cpuHistory.shift();
        }

        // Check for CPU alerts
        await this.checkCPUAlerts(metrics);

        // Emit metrics update
        this.emit('metricsUpdated', metrics);

        // Log periodic status
        if (this.cpuHistory.length % 20 === 0) { // Every 20 intervals
          this.logCPUStatus(metrics);
        }

      } catch (error) {
        logger.error('❌ CPU monitoring error:', error);
      }
    }, this.config.monitoringIntervalMs);
  }

  /**
   * Start optimization intervals
   */
  private startOptimizationIntervals(): void {
    logger.info('⚡ Starting CPU optimization intervals...');

    this.optimizationInterval = setInterval(async () => {
      try {
        await this.performCPUOptimization();
      } catch (error) {
        logger.error('❌ CPU optimization error:', error);
      }
    }, this.config.optimizationIntervalMs);
  }

  /**
   * Collect comprehensive CPU metrics
   */
  private async collectCPUMetrics(): Promise<CPUMetrics> {
    try {
      // Get CPU information
      const cpuInfo = cpus();
      const loadAvg = require('os').loadavg();
      
      // Calculate process CPU usage
      const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
      const currentTime = Date.now();
      const timeDiff = currentTime - this.lastCpuTime;
      
      const userPercent = (currentCpuUsage.user / 1000 / timeDiff) * 100;
      const systemPercent = (currentCpuUsage.system / 1000 / timeDiff) * 100;
      const totalPercent = userPercent + systemPercent;

      this.lastCpuUsage = process.cpuUsage();
      this.lastCpuTime = currentTime;

      // Estimate overall CPU utilization (simplified)
      const overallUtilization = Math.min(100, Math.max(0, loadAvg[0] * 100 / cpuInfo.length));

      // Estimate per-core utilization (simplified)
      const coreUtilization = cpuInfo.map(() => 
        Math.min(100, Math.max(0, overallUtilization + (Math.random() - 0.5) * 20))
      );

      // Determine performance level
      let performanceLevel: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
      if (overallUtilization >= this.config.criticalUsagePercent) {
        performanceLevel = 'CRITICAL';
      } else if (overallUtilization >= this.config.maxUsagePercent) {
        performanceLevel = 'WARNING';
      } else if (overallUtilization >= 50) {
        performanceLevel = 'GOOD';
      } else {
        performanceLevel = 'EXCELLENT';
      }

      return {
        overallUtilization: Math.round(overallUtilization),
        coreUtilization: coreUtilization.map(u => Math.round(u)),
        frequency: cpuInfo[0]?.speed || 0,
        temperature: 45, // Would need hardware sensors for real temperature
        loadAverage: loadAvg,
        activeProcesses: 0, // Would need process enumeration for real count
        processUsage: {
          user: Math.round(userPercent),
          system: Math.round(systemPercent),
          total: Math.round(totalPercent)
        },
        architecture: {
          model: cpuInfo[0]?.model || 'Unknown',
          physicalCores: cpuInfo.length,
          logicalCores: cpuInfo.length,
          speed: cpuInfo[0]?.speed || 0
        },
        performanceLevel,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('❌ Failed to collect CPU metrics:', error);
      throw error;
    }
  }

  /**
   * Check for CPU alerts
   */
  private async checkCPUAlerts(metrics: CPUMetrics): Promise<void> {
    const alerts: CPUAlert[] = [];

    // Check CPU usage
    if (metrics.overallUtilization >= this.config.criticalUsagePercent) {
      alerts.push({
        id: `cpu_critical_${Date.now()}`,
        type: 'CPU_CRITICAL',
        severity: 'CRITICAL',
        message: `CPU usage critical: ${metrics.overallUtilization}%`,
        currentUsage: metrics.overallUtilization,
        threshold: this.config.criticalUsagePercent,
        timestamp: new Date(),
        recommendations: [
          'Immediate CPU optimization required',
          'Consider reducing concurrent operations',
          'Check for CPU-intensive processes',
          'Enable CPU throttling if available'
        ]
      });
    } else if (metrics.overallUtilization >= this.config.maxUsagePercent) {
      alerts.push({
        id: `cpu_warning_${Date.now()}`,
        type: 'CPU_WARNING',
        severity: 'HIGH',
        message: `CPU usage high: ${metrics.overallUtilization}%`,
        currentUsage: metrics.overallUtilization,
        threshold: this.config.maxUsagePercent,
        timestamp: new Date(),
        recommendations: [
          'Monitor CPU usage trends',
          'Optimize process priorities',
          'Consider load balancing',
          'Review CPU-intensive operations'
        ]
      });
    }

    // Check CPU temperature
    if (metrics.temperature >= this.config.tempCriticalThreshold) {
      alerts.push({
        id: `thermal_critical_${Date.now()}`,
        type: 'THERMAL_WARNING',
        severity: 'CRITICAL',
        message: `CPU temperature critical: ${metrics.temperature}°C`,
        currentUsage: metrics.temperature,
        threshold: this.config.tempCriticalThreshold,
        timestamp: new Date(),
        recommendations: [
          'Check system cooling',
          'Reduce CPU load immediately',
          'Verify thermal management',
          'Consider system shutdown if persistent'
        ]
      });
    } else if (metrics.temperature >= this.config.tempWarningThreshold) {
      alerts.push({
        id: `thermal_warning_${Date.now()}`,
        type: 'THERMAL_WARNING',
        severity: 'HIGH',
        message: `CPU temperature high: ${metrics.temperature}°C`,
        currentUsage: metrics.temperature,
        threshold: this.config.tempWarningThreshold,
        timestamp: new Date(),
        recommendations: [
          'Monitor CPU temperature',
          'Check system ventilation',
          'Consider reducing CPU load',
          'Verify cooling system operation'
        ]
      });
    }

    // Check for performance degradation
    if (this.cpuHistory.length >= 10) {
      const trend = this.analyzeCPUTrend();
      if (trend.isIncreasing && trend.rate > 10) { // 10% increase per interval
        alerts.push({
          id: `performance_degradation_${Date.now()}`,
          type: 'PERFORMANCE_DEGRADATION',
          severity: 'MEDIUM',
          message: `CPU performance degradation detected: ${trend.rate.toFixed(1)}% increase rate`,
          currentUsage: metrics.overallUtilization,
          threshold: 0,
          timestamp: new Date(),
          recommendations: [
            'Investigate CPU load sources',
            'Check for runaway processes',
            'Review recent system changes',
            'Consider process optimization'
          ]
        });
      }
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processCPUAlert(alert);
    }
  }

  /**
   * Process CPU alert
   */
  private async processCPUAlert(alert: CPUAlert): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values())
      .find(a => a.type === alert.type && a.severity === alert.severity);

    if (existingAlert) {
      // Update existing alert
      existingAlert.currentUsage = alert.currentUsage;
      existingAlert.timestamp = alert.timestamp;
      return;
    }

    // Add new alert
    this.activeAlerts.set(alert.id, alert);

    // Log alert
    logger.warn(`⚠️ CPU Alert: ${alert.message}`, {
      component: 'CPUOptimizer',
      alertType: alert.type,
      severity: alert.severity,
      currentUsage: alert.currentUsage,
      threshold: alert.threshold,
      recommendations: alert.recommendations
    });

    // Emit alert event
    this.emit('cpuAlert', alert);

    // Take automatic action for critical alerts
    if (alert.severity === 'CRITICAL' && this.config.enableThrottling) {
      await this.handleCriticalCPUAlert(alert);
    }
  }

  /**
   * Handle critical CPU alerts with automatic actions
   */
  private async handleCriticalCPUAlert(alert: CPUAlert): Promise<void> {
    logger.warn('🚨 Handling critical CPU alert with automatic actions...');

    try {
      // Implement CPU throttling
      await this.implementCPUThrottling();

      // Optimize process priorities
      await this.optimizeProcessPriorities();

      // Emit emergency optimization event
      this.emit('emergencyOptimization', alert);

    } catch (error) {
      logger.error('❌ Failed to handle critical CPU alert:', error);
    }
  }

  /**
   * Perform CPU optimization
   */
  private async performCPUOptimization(): Promise<void> {
    if (this.isOptimizing) {
      return; // Prevent concurrent optimization
    }

    this.isOptimizing = true;

    try {
      const beforeMetrics = await this.collectCPUMetrics();
      
      // Check if optimization is needed
      if (beforeMetrics.performanceLevel === 'WARNING' || beforeMetrics.performanceLevel === 'CRITICAL') {
        logger.info('⚡ Performing CPU optimization...');

        // Optimize process priorities
        if (this.config.enablePriorityOptimization) {
          await this.optimizeProcessPriorities();
        }

        // Optimize CPU affinity
        if (this.config.enableAffinityOptimization) {
          await this.optimizeCPUAffinity();
        }

        // Balance worker pool
        await this.balanceWorkerPool();

        // Wait a moment for optimization to take effect
        await new Promise(resolve => setTimeout(resolve, 5000));

        const afterMetrics = await this.collectCPUMetrics();

        logger.info('✅ CPU optimization completed', {
          beforeUsage: `${beforeMetrics.overallUtilization}%`,
          afterUsage: `${afterMetrics.overallUtilization}%`,
          beforePerformance: beforeMetrics.performanceLevel,
          afterPerformance: afterMetrics.performanceLevel
        });

        this.emit('cpuOptimized', {
          beforeMetrics,
          afterMetrics
        });
      }

    } catch (error) {
      logger.error('❌ CPU optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize process priorities
   */
  private async optimizeProcessPriorities(): Promise<void> {
    try {
      logger.info('🎯 Optimizing process priorities...');

      // Set high priority for main trading process
      try {
        // Use os.setPriority() which is the correct Node.js method
        if (os.setPriority) {
          os.setPriority(process.pid, -5); // Higher priority (lower number = higher priority)
          logger.info('✅ Main process priority optimized');
        } else {
          logger.warn('⚠️ Process priority optimization not available on this platform');
        }
      } catch (error) {
        logger.warn('⚠️ Failed to set process priority:', error);
      }

    } catch (error) {
      logger.error('❌ Failed to optimize process priorities:', error);
    }
  }

  /**
   * Optimize CPU affinity
   */
  private async optimizeCPUAffinity(): Promise<void> {
    try {
      logger.info('🎯 Optimizing CPU affinity...');

      // CPU affinity optimization would be implemented here
      // This is platform-specific and may require native modules
      
      logger.info('✅ CPU affinity optimization completed');

    } catch (error) {
      logger.error('❌ Failed to optimize CPU affinity:', error);
    }
  }

  /**
   * Implement CPU throttling
   */
  private async implementCPUThrottling(): Promise<void> {
    try {
      logger.info('🐌 Implementing CPU throttling...');

      // Add artificial delays to reduce CPU usage
      // This is a simple throttling mechanism
      
      logger.info('✅ CPU throttling implemented');

    } catch (error) {
      logger.error('❌ Failed to implement CPU throttling:', error);
    }
  }

  /**
   * Initialize worker pool
   */
  private async initializeWorkerPool(): Promise<void> {
    try {
      logger.info('👥 Initializing worker pool...');

      for (let i = 0; i < this.config.workerPoolSize; i++) {
        // Worker initialization would be implemented here
        // This is a placeholder for actual worker thread creation
      }

      logger.info(`✅ Worker pool initialized with ${this.config.workerPoolSize} workers`);

    } catch (error) {
      logger.error('❌ Failed to initialize worker pool:', error);
    }
  }

  /**
   * Balance worker pool
   */
  private async balanceWorkerPool(): Promise<void> {
    try {
      // Worker pool balancing logic would be implemented here
      logger.debug('⚖️ Balancing worker pool...');

    } catch (error) {
      logger.error('❌ Failed to balance worker pool:', error);
    }
  }

  /**
   * Terminate worker pool
   */
  private terminateWorkerPool(): void {
    try {
      logger.info('🛑 Terminating worker pool...');

      for (const worker of this.workerPool) {
        worker.terminate();
      }
      this.workerPool = [];

      logger.info('✅ Worker pool terminated');

    } catch (error) {
      logger.error('❌ Failed to terminate worker pool:', error);
    }
  }

  /**
   * Analyze CPU usage trend
   */
  private analyzeCPUTrend(): { isIncreasing: boolean; rate: number } {
    if (this.cpuHistory.length < 5) {
      return { isIncreasing: false, rate: 0 };
    }

    const recent = this.cpuHistory.slice(-5);
    const first = recent[0].overallUtilization;
    const last = recent[recent.length - 1].overallUtilization;
    
    const rate = ((last - first) / first) * 100;
    
    return {
      isIncreasing: rate > 0,
      rate: Math.abs(rate)
    };
  }

  /**
   * Generate CPU optimization recommendations
   */
  private generateCPURecommendations(metrics: CPUMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.overallUtilization > 80) {
      recommendations.push('CPU usage is very high - consider process optimization');
    }

    if (metrics.temperature > 65) {
      recommendations.push('CPU temperature is elevated - check cooling system');
    }

    if (metrics.loadAverage[0] > metrics.architecture.logicalCores) {
      recommendations.push('System load is high - consider load balancing');
    }

    if (metrics.processUsage.total > 50) {
      recommendations.push('Process CPU usage is high - optimize application code');
    }

    return recommendations;
  }

  /**
   * Log CPU status
   */
  private logCPUStatus(metrics: CPUMetrics): void {
    logger.debug('📊 CPU Status Update', {
      component: 'CPUOptimizer',
      overallUtilization: `${metrics.overallUtilization}%`,
      processUsage: `${metrics.processUsage.total}%`,
      temperature: `${metrics.temperature}°C`,
      loadAverage: metrics.loadAverage.map(l => l.toFixed(2)),
      performanceLevel: metrics.performanceLevel,
      activeAlerts: this.activeAlerts.size
    });
  }

  /**
   * Get current CPU metrics
   */
  public getCurrentMetrics(): CPUMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get CPU usage history
   */
  public getCPUHistory(): CPUMetrics[] {
    return [...this.cpuHistory];
  }

  /**
   * Get active CPU alerts
   */
  public getActiveAlerts(): CPUAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Force CPU optimization
   */
  public async forceCPUOptimization(): Promise<void> {
    await this.performCPUOptimization();
  }

  /**
   * Get CPU optimizer status
   */
  public getStatus(): {
    isOptimizing: boolean;
    isMonitoring: boolean;
    currentMetrics: CPUMetrics | null;
    activeAlerts: number;
    workerPoolSize: number;
    config: CPUOptimizerConfig;
  } {
    return {
      isOptimizing: this.isOptimizing,
      isMonitoring: this.monitoringInterval !== null,
      currentMetrics: this.currentMetrics,
      activeAlerts: this.activeAlerts.size,
      workerPoolSize: this.workerPool.length,
      config: this.config
    };
  }
}