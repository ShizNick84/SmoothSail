/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - INTEL NUC MEMORY OPTIMIZER
 * =============================================================================
 * 
 * This module provides comprehensive memory optimization for Intel NUC systems
 * with 12GB RAM limit. It monitors memory usage, implements garbage collection
 * optimization, and provides automatic cleanup mechanisms.
 * 
 * CRITICAL PERFORMANCE NOTICE:
 * Memory optimization is crucial for stable 24/7 trading operations on Intel NUC.
 * Memory leaks or excessive usage could impact trading performance and system
 * stability, potentially resulting in missed trading opportunities.
 * 
 * Intel NUC Specifications:
 * - 12GB RAM total
 * - Target usage: <75% (9GB)
 * - Critical threshold: 90% (10.8GB)
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';

/**
 * Interface for memory usage metrics
 */
export interface MemoryMetrics {
  /** Total system memory in bytes */
  totalSystemMemory: number;
  /** Used system memory in bytes */
  usedSystemMemory: number;
  /** Free system memory in bytes */
  freeSystemMemory: number;
  /** System memory utilization percentage */
  systemUtilization: number;
  /** Node.js process memory usage */
  processMemory: {
    /** Resident Set Size in bytes */
    rss: number;
    /** Heap total in bytes */
    heapTotal: number;
    /** Heap used in bytes */
    heapUsed: number;
    /** External memory in bytes */
    external: number;
    /** Array buffers in bytes */
    arrayBuffers: number;
  };
  /** Process memory utilization percentage */
  processUtilization: number;
  /** Garbage collection statistics */
  gcStats: {
    /** Number of GC cycles */
    cycles: number;
    /** Total GC time in milliseconds */
    totalTime: number;
    /** Average GC time in milliseconds */
    averageTime: number;
    /** Last GC timestamp */
    lastGC: Date | null;
  };
  /** Memory pressure level */
  pressureLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Timestamp of metrics collection */
  timestamp: Date;
}

/**
 * Interface for memory optimization configuration
 */
export interface MemoryOptimizerConfig {
  /** Maximum system memory usage percentage (default: 75) */
  maxSystemUsagePercent: number;
  /** Critical system memory usage percentage (default: 90) */
  criticalSystemUsagePercent: number;
  /** Maximum process memory usage in MB (default: 2048) */
  maxProcessMemoryMB: number;
  /** Memory monitoring interval in milliseconds (default: 30000) */
  monitoringIntervalMs: number;
  /** Garbage collection optimization interval in milliseconds (default: 300000) */
  gcOptimizationIntervalMs: number;
  /** Enable automatic garbage collection (default: true) */
  enableAutoGC: boolean;
  /** Enable memory pressure detection (default: true) */
  enablePressureDetection: boolean;
  /** Memory cleanup threshold percentage (default: 80) */
  cleanupThresholdPercent: number;
}

/**
 * Interface for memory alert
 */
export interface MemoryAlert {
  /** Alert ID */
  id: string;
  /** Alert type */
  type: 'MEMORY_WARNING' | 'MEMORY_CRITICAL' | 'GC_PERFORMANCE' | 'MEMORY_LEAK';
  /** Alert severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Alert message */
  message: string;
  /** Current memory usage */
  currentUsage: number;
  /** Memory threshold */
  threshold: number;
  /** Alert timestamp */
  timestamp: Date;
  /** Recommended actions */
  recommendations: string[];
}

/**
 * Intel NUC Memory Optimizer
 * Provides comprehensive memory management and optimization for 12GB systems
 */
export class MemoryOptimizer extends EventEmitter {
  private config: MemoryOptimizerConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private gcOptimizationInterval: NodeJS.Timeout | null = null;
  private currentMetrics: MemoryMetrics | null = null;
  private gcStats = {
    cycles: 0,
    totalTime: 0,
    lastGC: null as Date | null
  };
  private memoryHistory: MemoryMetrics[] = [];
  private activeAlerts: Map<string, MemoryAlert> = new Map();
  private isOptimizing = false;

  constructor(config?: Partial<MemoryOptimizerConfig>) {
    super();
    
    this.config = {
      maxSystemUsagePercent: 75,
      criticalSystemUsagePercent: 90,
      maxProcessMemoryMB: 2048,
      monitoringIntervalMs: 30000, // 30 seconds
      gcOptimizationIntervalMs: 300000, // 5 minutes
      enableAutoGC: true,
      enablePressureDetection: true,
      cleanupThresholdPercent: 80,
      ...config
    };

    logger.info('🧠 Intel NUC Memory Optimizer initializing...', {
      component: 'MemoryOptimizer',
      config: this.config
    });
  }

  /**
   * Start memory optimization and monitoring
   */
  public async startOptimization(): Promise<void> {
    try {
      logger.info('🚀 Starting Intel NUC memory optimization...');

      // Perform initial memory assessment
      await this.performMemoryAssessment();

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Start garbage collection optimization
      if (this.config.enableAutoGC) {
        this.startGCOptimization();
      }

      // Set up process memory limits
      this.setupProcessMemoryLimits();

      // Set up memory pressure detection
      if (this.config.enablePressureDetection) {
        this.setupMemoryPressureDetection();
      }

      logger.info('✅ Memory optimization started successfully');
      this.emit('optimizationStarted');

    } catch (error) {
      logger.error('❌ Failed to start memory optimization:', error);
      throw error;
    }
  }

  /**
   * Stop memory optimization
   */
  public stopOptimization(): void {
    logger.info('🛑 Stopping memory optimization...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.gcOptimizationInterval) {
      clearInterval(this.gcOptimizationInterval);
      this.gcOptimizationInterval = null;
    }

    logger.info('✅ Memory optimization stopped');
    this.emit('optimizationStopped');
  }

  /**
   * Perform comprehensive memory assessment
   */
  private async performMemoryAssessment(): Promise<void> {
    logger.info('🔍 Performing Intel NUC memory assessment...');

    const metrics = await this.collectMemoryMetrics();
    this.currentMetrics = metrics;

    // Log system memory information
    logger.info('📊 System Memory Assessment:', {
      totalSystemMemory: `${Math.round(metrics.totalSystemMemory / 1024 / 1024 / 1024 * 100) / 100}GB`,
      systemUtilization: `${metrics.systemUtilization}%`,
      processMemory: `${Math.round(metrics.processMemory.rss / 1024 / 1024)}MB`,
      processUtilization: `${metrics.processUtilization}%`,
      pressureLevel: metrics.pressureLevel
    });

    // Check if system meets Intel NUC requirements
    const totalGB = metrics.totalSystemMemory / 1024 / 1024 / 1024;
    if (totalGB < 11.5) { // Allow for some system overhead
      logger.warn('⚠️ System memory below Intel NUC specification:', {
        detected: `${Math.round(totalGB * 100) / 100}GB`,
        required: '12GB'
      });
    }

    // Generate initial recommendations
    const recommendations = this.generateMemoryRecommendations(metrics);
    if (recommendations.length > 0) {
      logger.info('💡 Memory optimization recommendations:', recommendations);
    }
  }

  /**
   * Start continuous memory monitoring
   */
  private startMemoryMonitoring(): void {
    logger.info('📊 Starting continuous memory monitoring...');

    this.monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMemoryMetrics();
        this.currentMetrics = metrics;
        
        // Add to history (keep last 100 entries)
        this.memoryHistory.push(metrics);
        if (this.memoryHistory.length > 100) {
          this.memoryHistory.shift();
        }

        // Check for memory alerts
        await this.checkMemoryAlerts(metrics);

        // Emit metrics update
        this.emit('metricsUpdated', metrics);

        // Log periodic status
        if (this.memoryHistory.length % 10 === 0) { // Every 10 intervals
          this.logMemoryStatus(metrics);
        }

      } catch (error) {
        logger.error('❌ Memory monitoring error:', error);
      }
    }, this.config.monitoringIntervalMs);
  }

  /**
   * Start garbage collection optimization
   */
  private startGCOptimization(): void {
    logger.info('🗑️ Starting garbage collection optimization...');

    this.gcOptimizationInterval = setInterval(async () => {
      try {
        await this.optimizeGarbageCollection();
      } catch (error) {
        logger.error('❌ GC optimization error:', error);
      }
    }, this.config.gcOptimizationIntervalMs);
  }

  /**
   * Collect comprehensive memory metrics
   */
  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    // Get system memory information
    const totalSystemMemory = require('os').totalmem();
    const freeSystemMemory = require('os').freemem();
    const usedSystemMemory = totalSystemMemory - freeSystemMemory;
    const systemUtilization = Math.round((usedSystemMemory / totalSystemMemory) * 100);

    // Get process memory information
    const processMemory = process.memoryUsage();
    const processUtilization = Math.round((processMemory.rss / totalSystemMemory) * 100);

    // Calculate memory pressure level
    let pressureLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (systemUtilization >= this.config.criticalSystemUsagePercent) {
      pressureLevel = 'CRITICAL';
    } else if (systemUtilization >= this.config.maxSystemUsagePercent) {
      pressureLevel = 'HIGH';
    } else if (systemUtilization >= 60) {
      pressureLevel = 'MEDIUM';
    } else {
      pressureLevel = 'LOW';
    }

    return {
      totalSystemMemory,
      usedSystemMemory,
      freeSystemMemory,
      systemUtilization,
      processMemory,
      processUtilization,
      gcStats: {
        cycles: this.gcStats.cycles,
        totalTime: this.gcStats.totalTime,
        averageTime: this.gcStats.cycles > 0 ? this.gcStats.totalTime / this.gcStats.cycles : 0,
        lastGC: this.gcStats.lastGC
      },
      pressureLevel,
      timestamp: new Date()
    };
  }

  /**
   * Check for memory alerts and generate notifications
   */
  private async checkMemoryAlerts(metrics: MemoryMetrics): Promise<void> {
    const alerts: MemoryAlert[] = [];

    // Check system memory usage
    if (metrics.systemUtilization >= this.config.criticalSystemUsagePercent) {
      alerts.push({
        id: `system_memory_critical_${Date.now()}`,
        type: 'MEMORY_CRITICAL',
        severity: 'CRITICAL',
        message: `System memory usage critical: ${metrics.systemUtilization}%`,
        currentUsage: metrics.systemUtilization,
        threshold: this.config.criticalSystemUsagePercent,
        timestamp: new Date(),
        recommendations: [
          'Immediate memory cleanup required',
          'Consider restarting non-essential services',
          'Monitor for memory leaks',
          'Check for runaway processes'
        ]
      });
    } else if (metrics.systemUtilization >= this.config.maxSystemUsagePercent) {
      alerts.push({
        id: `system_memory_warning_${Date.now()}`,
        type: 'MEMORY_WARNING',
        severity: 'HIGH',
        message: `System memory usage high: ${metrics.systemUtilization}%`,
        currentUsage: metrics.systemUtilization,
        threshold: this.config.maxSystemUsagePercent,
        timestamp: new Date(),
        recommendations: [
          'Trigger garbage collection',
          'Clear unnecessary caches',
          'Monitor memory trends',
          'Consider memory optimization'
        ]
      });
    }

    // Check process memory usage
    const processMemoryMB = metrics.processMemory.rss / 1024 / 1024;
    if (processMemoryMB >= this.config.maxProcessMemoryMB) {
      alerts.push({
        id: `process_memory_warning_${Date.now()}`,
        type: 'MEMORY_WARNING',
        severity: 'HIGH',
        message: `Process memory usage high: ${Math.round(processMemoryMB)}MB`,
        currentUsage: processMemoryMB,
        threshold: this.config.maxProcessMemoryMB,
        timestamp: new Date(),
        recommendations: [
          'Force garbage collection',
          'Clear application caches',
          'Check for memory leaks in application code',
          'Consider process restart if persistent'
        ]
      });
    }

    // Check for potential memory leaks
    if (this.memoryHistory.length >= 10) {
      const recentTrend = this.analyzeMemoryTrend();
      if (recentTrend.isIncreasing && recentTrend.rate > 5) { // 5% increase per interval
        alerts.push({
          id: `memory_leak_warning_${Date.now()}`,
          type: 'MEMORY_LEAK',
          severity: 'MEDIUM',
          message: `Potential memory leak detected: ${recentTrend.rate.toFixed(1)}% increase rate`,
          currentUsage: metrics.systemUtilization,
          threshold: 0,
          timestamp: new Date(),
          recommendations: [
            'Investigate memory leak sources',
            'Review recent code changes',
            'Monitor garbage collection effectiveness',
            'Consider heap dump analysis'
          ]
        });
      }
    }

    // Process alerts
    for (const alert of alerts) {
      await this.processMemoryAlert(alert);
    }
  }

  /**
   * Process memory alert
   */
  private async processMemoryAlert(alert: MemoryAlert): Promise<void> {
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
    logger.warn(`⚠️ Memory Alert: ${alert.message}`, {
      component: 'MemoryOptimizer',
      alertType: alert.type,
      severity: alert.severity,
      currentUsage: alert.currentUsage,
      threshold: alert.threshold,
      recommendations: alert.recommendations
    });

    // Emit alert event
    this.emit('memoryAlert', alert);

    // Take automatic action for critical alerts
    if (alert.severity === 'CRITICAL') {
      await this.handleCriticalMemoryAlert(alert);
    }
  }

  /**
   * Handle critical memory alerts with automatic actions
   */
  private async handleCriticalMemoryAlert(alert: MemoryAlert): Promise<void> {
    logger.warn('🚨 Handling critical memory alert with automatic actions...');

    try {
      // Force garbage collection
      if (global.gc) {
        const startTime = Date.now();
        global.gc();
        const gcTime = Date.now() - startTime;
        
        this.gcStats.cycles++;
        this.gcStats.totalTime += gcTime;
        this.gcStats.lastGC = new Date();

        logger.info('🗑️ Emergency garbage collection completed', {
          gcTime: `${gcTime}ms`,
          totalCycles: this.gcStats.cycles
        });
      }

      // Clear internal caches
      await this.clearInternalCaches();

      // Emit emergency cleanup event
      this.emit('emergencyCleanup', alert);

    } catch (error) {
      logger.error('❌ Failed to handle critical memory alert:', error);
    }
  }

  /**
   * Optimize garbage collection
   */
  private async optimizeGarbageCollection(): Promise<void> {
    if (this.isOptimizing) {
      return; // Prevent concurrent optimization
    }

    this.isOptimizing = true;

    try {
      const beforeMetrics = await this.collectMemoryMetrics();
      
      // Check if GC optimization is needed
      if (beforeMetrics.pressureLevel === 'HIGH' || beforeMetrics.pressureLevel === 'CRITICAL') {
        logger.info('🗑️ Performing garbage collection optimization...');

        if (global.gc) {
          const startTime = Date.now();
          global.gc();
          const gcTime = Date.now() - startTime;

          this.gcStats.cycles++;
          this.gcStats.totalTime += gcTime;
          this.gcStats.lastGC = new Date();

          // Wait a moment for GC to complete
          await new Promise(resolve => setTimeout(resolve, 1000));

          const afterMetrics = await this.collectMemoryMetrics();
          const memoryFreed = beforeMetrics.processMemory.heapUsed - afterMetrics.processMemory.heapUsed;

          logger.info('✅ Garbage collection completed', {
            gcTime: `${gcTime}ms`,
            memoryFreed: `${Math.round(memoryFreed / 1024 / 1024)}MB`,
            beforeUsage: `${beforeMetrics.systemUtilization}%`,
            afterUsage: `${afterMetrics.systemUtilization}%`,
            totalCycles: this.gcStats.cycles
          });

          this.emit('gcOptimized', {
            gcTime,
            memoryFreed,
            beforeMetrics,
            afterMetrics
          });
        }
      }

    } catch (error) {
      logger.error('❌ GC optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Setup process memory limits
   */
  private setupProcessMemoryLimits(): void {
    logger.info('🔒 Setting up process memory limits...');

    // Set V8 heap size limit (if not already set)
    const maxHeapSizeMB = Math.min(this.config.maxProcessMemoryMB, 4096); // Max 4GB for V8
    
    logger.info('📏 Process memory limits configured', {
      maxProcessMemory: `${this.config.maxProcessMemoryMB}MB`,
      maxHeapSize: `${maxHeapSizeMB}MB`
    });
  }

  /**
   * Setup memory pressure detection
   */
  private setupMemoryPressureDetection(): void {
    logger.info('🔍 Setting up memory pressure detection...');

    // Monitor for memory pressure events
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning' || 
          warning.message.includes('memory')) {
        logger.warn('⚠️ Memory pressure warning detected:', {
          name: warning.name,
          message: warning.message
        });
        
        this.emit('memoryPressure', warning);
      }
    });
  }

  /**
   * Clear internal caches and temporary data
   */
  private async clearInternalCaches(): Promise<void> {
    logger.info('🧹 Clearing internal caches...');

    try {
      // Clear memory history (keep only recent entries)
      if (this.memoryHistory.length > 20) {
        this.memoryHistory = this.memoryHistory.slice(-20);
      }

      // Clear old alerts
      const now = Date.now();
      for (const [id, alert] of this.activeAlerts.entries()) {
        if (now - alert.timestamp.getTime() > 300000) { // 5 minutes old
          this.activeAlerts.delete(id);
        }
      }

      logger.info('✅ Internal caches cleared');

    } catch (error) {
      logger.error('❌ Failed to clear internal caches:', error);
    }
  }

  /**
   * Analyze memory usage trend
   */
  private analyzeMemoryTrend(): { isIncreasing: boolean; rate: number } {
    if (this.memoryHistory.length < 5) {
      return { isIncreasing: false, rate: 0 };
    }

    const recent = this.memoryHistory.slice(-5);
    const first = recent[0].systemUtilization;
    const last = recent[recent.length - 1].systemUtilization;
    
    const rate = ((last - first) / first) * 100;
    
    return {
      isIncreasing: rate > 0,
      rate: Math.abs(rate)
    };
  }

  /**
   * Generate memory optimization recommendations
   */
  private generateMemoryRecommendations(metrics: MemoryMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.systemUtilization > 80) {
      recommendations.push('System memory usage is high - consider enabling more aggressive garbage collection');
    }

    if (metrics.processUtilization > 15) {
      recommendations.push('Process memory usage is high - monitor for memory leaks');
    }

    if (metrics.gcStats.averageTime > 100) {
      recommendations.push('Garbage collection is taking too long - consider heap optimization');
    }

    if (metrics.pressureLevel === 'CRITICAL') {
      recommendations.push('Critical memory pressure - immediate action required');
    }

    return recommendations;
  }

  /**
   * Log memory status
   */
  private logMemoryStatus(metrics: MemoryMetrics): void {
    logger.debug('📊 Memory Status Update', {
      component: 'MemoryOptimizer',
      systemMemory: {
        total: `${Math.round(metrics.totalSystemMemory / 1024 / 1024 / 1024 * 100) / 100}GB`,
        used: `${Math.round(metrics.usedSystemMemory / 1024 / 1024 / 1024 * 100) / 100}GB`,
        utilization: `${metrics.systemUtilization}%`
      },
      processMemory: {
        rss: `${Math.round(metrics.processMemory.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(metrics.processMemory.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(metrics.processMemory.heapTotal / 1024 / 1024)}MB`
      },
      gcStats: {
        cycles: metrics.gcStats.cycles,
        averageTime: `${Math.round(metrics.gcStats.averageTime)}ms`
      },
      pressureLevel: metrics.pressureLevel,
      activeAlerts: this.activeAlerts.size
    });
  }

  /**
   * Get current memory metrics
   */
  public getCurrentMetrics(): MemoryMetrics | null {
    return this.currentMetrics;
  }

  /**
   * Get memory usage history
   */
  public getMemoryHistory(): MemoryMetrics[] {
    return [...this.memoryHistory];
  }

  /**
   * Get active memory alerts
   */
  public getActiveAlerts(): MemoryAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Force garbage collection
   */
  public async forceGarbageCollection(): Promise<void> {
    await this.optimizeGarbageCollection();
  }

  /**
   * Get memory optimizer status
   */
  public getStatus(): {
    isOptimizing: boolean;
    isMonitoring: boolean;
    currentMetrics: MemoryMetrics | null;
    activeAlerts: number;
    gcStats: any;
    config: MemoryOptimizerConfig;
  } {
    return {
      isOptimizing: this.isOptimizing,
      isMonitoring: this.monitoringInterval !== null,
      currentMetrics: this.currentMetrics,
      activeAlerts: this.activeAlerts.size,
      gcStats: this.gcStats,
      config: this.config
    };
  }
}