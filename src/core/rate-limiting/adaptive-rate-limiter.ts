/**
 * =============================================================================
 * ADAPTIVE RATE LIMITING SYSTEM
 * =============================================================================
 * 
 * This module provides adaptive rate limiting based on Intel NUC system
 * performance, network latency, and SSH tunnel usage with dynamic adjustment
 * and recovery mechanisms.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { RateLimitingSystem, RateLimiterType, RateLimitConfig } from './rate-limiter';
import { logger } from '@/core/logging/logger';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { EventEmitter } from 'events';

/**
 * System performance thresholds
 */
export interface PerformanceThresholds {
  cpu: {
    normal: number;      // Normal operation threshold
    warning: number;     // Warning threshold
    critical: number;    // Critical threshold
  };
  memory: {
    normal: number;
    warning: number;
    critical: number;
  };
  networkLatency: {
    normal: number;      // Normal latency (ms)
    warning: number;     // Warning latency (ms)
    critical: number;    // Critical latency (ms)
  };
  diskIO: {
    normal: number;      // Normal disk usage (%)
    warning: number;     // Warning disk usage (%)
    critical: number;    // Critical disk usage (%)
  };
}

/**
 * Adaptation strategy configuration
 */
export interface AdaptationStrategy {
  name: string;
  description: string;
  cpuFactor: number;       // Multiplier for CPU-based adaptation
  memoryFactor: number;    // Multiplier for memory-based adaptation
  networkFactor: number;   // Multiplier for network-based adaptation
  diskFactor: number;      // Multiplier for disk-based adaptation
  minReduction: number;    // Minimum reduction factor (0.1 = 90% reduction)
  maxReduction: number;    // Maximum reduction factor (0.9 = 10% reduction)
  recoveryRate: number;    // Rate of recovery when conditions improve
}

/**
 * System performance metrics
 */
export interface SystemPerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    temperature?: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    usagePercent: number;
    available: number;
  };
  network: {
    latency: number;
    bandwidth?: number;
    packetLoss?: number;
  };
  disk: {
    usage: number;
    readSpeed?: number;
    writeSpeed?: number;
  };
  sshTunnel: {
    isConnected: boolean;
    reconnectCount: number;
    lastReconnect?: Date;
  };
}

/**
 * Rate limit adaptation event
 */
export interface RateLimitAdaptation {
  timestamp: Date;
  limiterType: RateLimiterType;
  originalLimit: number;
  adaptedLimit: number;
  adaptationFactor: number;
  reason: string;
  systemMetrics: SystemPerformanceMetrics;
  strategy: string;
}

/**
 * Adaptive rate limiting system for Intel NUC optimization
 */
export class AdaptiveRateLimiter extends EventEmitter {
  private rateLimitingSystem: RateLimitingSystem;
  private systemMonitor: SystemMonitor;
  private isInitialized: boolean = false;
  
  // Performance monitoring
  private performanceThresholds: PerformanceThresholds;
  private adaptationStrategies: Map<string, AdaptationStrategy> = new Map();
  private currentStrategy: string = 'balanced';
  
  // Monitoring intervals
  private performanceMonitoringInterval: NodeJS.Timeout | null = null;
  private adaptationInterval: NodeJS.Timeout | null = null;
  private recoveryInterval: NodeJS.Timeout | null = null;
  
  // Adaptation tracking
  private adaptationHistory: RateLimitAdaptation[] = [];
  private maxHistorySize: number = 1000;
  private lastAdaptation: Date | null = null;
  private adaptationCooldown: number = 30000; // 30 seconds
  
  // Recovery tracking
  private originalLimits: Map<RateLimiterType, RateLimitConfig> = new Map();
  private currentAdaptations: Map<RateLimiterType, number> = new Map();

  constructor(
    rateLimitingSystem: RateLimitingSystem,
    systemMonitor: SystemMonitor
  ) {
    super();
    this.rateLimitingSystem = rateLimitingSystem;
    this.systemMonitor = systemMonitor;
    
    this.setupDefaultThresholds();
    this.setupAdaptationStrategies();
  }

  /**
   * Initialize the adaptive rate limiter
   */
  public async initialize(): Promise<void> {
    if (!this.rateLimitingSystem || !this.systemMonitor) {
      throw new Error('Required dependencies not provided');
    }

    // Store original rate limits for recovery
    await this.storeOriginalLimits();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Start adaptation processing
    this.startAdaptationProcessing();

    // Start recovery monitoring
    this.startRecoveryMonitoring();

    this.isInitialized = true;
    logger.info('🎯 Adaptive rate limiter initialized for Intel NUC optimization');
  }

  /**
   * Setup default performance thresholds for Intel NUC
   */
  private setupDefaultThresholds(): void {
    this.performanceThresholds = {
      cpu: {
        normal: 70,    // 70% CPU usage
        warning: 85,   // 85% CPU usage
        critical: 95   // 95% CPU usage
      },
      memory: {
        normal: 75,    // 75% memory usage (Intel NUC with 12GB RAM)
        warning: 85,   // 85% memory usage
        critical: 95   // 95% memory usage
      },
      networkLatency: {
        normal: 100,   // 100ms latency
        warning: 500,  // 500ms latency
        critical: 2000 // 2000ms latency
      },
      diskIO: {
        normal: 70,    // 70% disk usage
        warning: 85,   // 85% disk usage
        critical: 95   // 95% disk usage
      }
    };
  }

  /**
   * Setup adaptation strategies
   */
  private setupAdaptationStrategies(): void {
    // Conservative strategy - prioritize system stability
    this.adaptationStrategies.set('conservative', {
      name: 'Conservative',
      description: 'Prioritize system stability over throughput',
      cpuFactor: 0.8,
      memoryFactor: 0.7,
      networkFactor: 0.6,
      diskFactor: 0.8,
      minReduction: 0.2,
      maxReduction: 0.8,
      recoveryRate: 0.05
    });

    // Balanced strategy - balance performance and stability
    this.adaptationStrategies.set('balanced', {
      name: 'Balanced',
      description: 'Balance system performance and throughput',
      cpuFactor: 0.6,
      memoryFactor: 0.6,
      networkFactor: 0.5,
      diskFactor: 0.6,
      minReduction: 0.3,
      maxReduction: 0.7,
      recoveryRate: 0.1
    });

    // Aggressive strategy - prioritize throughput
    this.adaptationStrategies.set('aggressive', {
      name: 'Aggressive',
      description: 'Prioritize throughput over conservative limits',
      cpuFactor: 0.4,
      memoryFactor: 0.5,
      networkFactor: 0.4,
      diskFactor: 0.5,
      minReduction: 0.4,
      maxReduction: 0.6,
      recoveryRate: 0.15
    });

    // Emergency strategy - maximum system protection
    this.adaptationStrategies.set('emergency', {
      name: 'Emergency',
      description: 'Maximum system protection during critical conditions',
      cpuFactor: 0.9,
      memoryFactor: 0.9,
      networkFactor: 0.8,
      diskFactor: 0.9,
      minReduction: 0.1,
      maxReduction: 0.9,
      recoveryRate: 0.02
    });
  }

  /**
   * Store original rate limits for recovery
   */
  private async storeOriginalLimits(): Promise<void> {
    const limiterTypes = Object.values(RateLimiterType);
    
    for (const type of limiterTypes) {
      try {
        const status = await this.rateLimitingSystem.getStatus(type);
        if (status.adaptedConfig) {
          this.originalLimits.set(type, status.adaptedConfig);
        }
      } catch (error) {
        logger.warn(`⚠️ Could not store original limit for ${type}:`, error.message);
      }
    }

    logger.info(`📊 Stored original limits for ${this.originalLimits.size} rate limiters`);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceMonitoringInterval = setInterval(async () => {
      try {
        await this.monitorSystemPerformance();
      } catch (error) {
        logger.error('❌ Error in performance monitoring:', error);
      }
    }, 10000); // Monitor every 10 seconds

    logger.info('📊 Started adaptive performance monitoring');
  }

  /**
   * Monitor system performance and emit events
   */
  private async monitorSystemPerformance(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    
    // Determine system stress level
    const stressLevel = this.calculateSystemStressLevel(metrics);
    
    // Emit performance update event
    this.emit('performanceUpdate', {
      metrics,
      stressLevel,
      timestamp: new Date()
    });

    // Auto-adjust strategy based on stress level
    await this.autoAdjustStrategy(stressLevel, metrics);
  }

  /**
   * Collect comprehensive system metrics
   */
  private async collectSystemMetrics(): Promise<SystemPerformanceMetrics> {
    const systemMetrics = await this.systemMonitor.getSystemMetrics();
    const networkLatency = await this.measureNetworkLatency();
    const sshTunnelStatus = await this.getSSHTunnelStatus();

    return {
      timestamp: new Date(),
      cpu: {
        usage: systemMetrics.cpu?.utilization || 0,
        temperature: systemMetrics.cpu.temperature,
        cores: typeof systemMetrics.cpu?.cores === 'object' ? systemMetrics.cpu.cores.logical : 4
      },
      memory: {
        used: systemMetrics.ram?.used || 0,
        total: systemMetrics.ram?.total || 0,
        usagePercent: systemMetrics.ram?.utilization || 0,
        available: systemMetrics.ram?.available || 0
      },
      network: {
        latency: networkLatency,
        bandwidth: (systemMetrics.network?.downloadSpeed || 0) + (systemMetrics.network?.uploadSpeed || 0),
        packetLoss: systemMetrics.network?.packetLoss
      },
      disk: {
        usage: systemMetrics.ssd?.utilization || 0,
        readSpeed: systemMetrics.ssd?.readThroughput || 0,
        writeSpeed: systemMetrics.ssd?.writeThroughput || 0
      },
      sshTunnel: sshTunnelStatus
    };
  }

  /**
   * Measure network latency to SSH tunnel endpoint
   */
  private async measureNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      await fetch('http://localhost:8443/ping', {
        method: 'HEAD'
      });
      return Date.now() - start;
    } catch (error) {
      return 5000; // High latency on error
    }
  }

  /**
   * Get SSH tunnel status
   */
  private async getSSHTunnelStatus(): Promise<any> {
    // This would integrate with the SSH tunnel manager
    // For now, return mock data
    return {
      isConnected: true,
      reconnectCount: 0,
      lastReconnect: null
    };
  }

  /**
   * Calculate system stress level
   */
  private calculateSystemStressLevel(metrics: SystemPerformanceMetrics): number {
    const thresholds = this.performanceThresholds;
    
    // Calculate stress factors (0-1 scale)
    const cpuStress = Math.min(metrics.cpu.usage / thresholds.cpu.critical, 1);
    const memoryStress = Math.min(metrics.memory.usagePercent / thresholds.memory.critical, 1);
    const networkStress = Math.min(metrics.network.latency / thresholds.networkLatency.critical, 1);
    const diskStress = Math.min(metrics.disk.usage / thresholds.diskIO.critical, 1);
    
    // Weighted average (CPU and memory are more important for Intel NUC)
    const overallStress = (
      cpuStress * 0.35 +
      memoryStress * 0.35 +
      networkStress * 0.20 +
      diskStress * 0.10
    );
    
    return Math.min(overallStress, 1);
  }

  /**
   * Auto-adjust strategy based on system stress
   */
  private async autoAdjustStrategy(stressLevel: number, metrics: SystemPerformanceMetrics): Promise<void> {
    let newStrategy = this.currentStrategy;

    if (stressLevel >= 0.9) {
      newStrategy = 'emergency';
    } else if (stressLevel >= 0.7) {
      newStrategy = 'conservative';
    } else if (stressLevel >= 0.4) {
      newStrategy = 'balanced';
    } else {
      newStrategy = 'aggressive';
    }

    if (newStrategy !== this.currentStrategy) {
      logger.info(`🎯 Auto-adjusting strategy from ${this.currentStrategy} to ${newStrategy} (stress: ${(stressLevel * 100).toFixed(1)}%)`);
      await this.setAdaptationStrategy(newStrategy);
    }
  }

  /**
   * Set adaptation strategy
   */
  public async setAdaptationStrategy(strategyName: string): Promise<void> {
    if (!this.adaptationStrategies.has(strategyName)) {
      throw new Error(`Unknown adaptation strategy: ${strategyName}`);
    }

    this.currentStrategy = strategyName;
    logger.info(`🎯 Set adaptation strategy to: ${strategyName}`);
    
    this.emit('strategyChanged', {
      oldStrategy: this.currentStrategy,
      newStrategy: strategyName,
      timestamp: new Date()
    });
  }

  /**
   * Start adaptation processing
   */
  private startAdaptationProcessing(): void {
    this.adaptationInterval = setInterval(async () => {
      try {
        await this.processAdaptations();
      } catch (error) {
        logger.error('❌ Error in adaptation processing:', error);
      }
    }, 15000); // Process adaptations every 15 seconds

    logger.info('🎯 Started adaptive rate limit processing');
  }

  /**
   * Process rate limit adaptations
   */
  private async processAdaptations(): Promise<void> {
    // Check cooldown period
    if (this.lastAdaptation && 
        Date.now() - this.lastAdaptation.getTime() < this.adaptationCooldown) {
      return;
    }

    const metrics = await this.collectSystemMetrics();
    const stressLevel = this.calculateSystemStressLevel(metrics);
    const strategy = this.adaptationStrategies.get(this.currentStrategy);

    if (!strategy) return;

    // Only adapt if stress level is significant
    if (stressLevel < 0.3) return;

    const limiterTypes = Object.values(RateLimiterType);
    
    for (const type of limiterTypes) {
      await this.adaptRateLimiter(type, metrics, stressLevel, strategy);
    }

    this.lastAdaptation = new Date();
  }

  /**
   * Adapt individual rate limiter
   */
  private async adaptRateLimiter(
    type: RateLimiterType,
    metrics: SystemPerformanceMetrics,
    stressLevel: number,
    strategy: AdaptationStrategy
  ): Promise<void> {
    try {
      const originalLimit = this.originalLimits.get(type);
      if (!originalLimit) return;

      // Calculate adaptation factor based on system metrics and strategy
      const adaptationFactor = this.calculateAdaptationFactor(metrics, stressLevel, strategy, type);
      
      // Apply adaptation if significant change is needed
      if (Math.abs(adaptationFactor - 1) > 0.1) { // 10% threshold
        const adaptedPoints = Math.floor(originalLimit.points * adaptationFactor);
        
        // Ensure minimum viable limits
        const minPoints = Math.max(1, Math.floor(originalLimit.points * strategy.minReduction));
        const finalPoints = Math.max(minPoints, adaptedPoints);

        // Update rate limiter configuration
        const adaptedConfig: RateLimitConfig = {
          ...originalLimit,
          points: finalPoints
        };

        // Apply the adaptation (this would need to be implemented in the rate limiting system)
        // For now, we'll track the adaptation
        this.currentAdaptations.set(type, adaptationFactor);

        // Record adaptation
        const adaptation: RateLimitAdaptation = {
          timestamp: new Date(),
          limiterType: type,
          originalLimit: originalLimit.points,
          adaptedLimit: finalPoints,
          adaptationFactor,
          reason: this.generateAdaptationReason(metrics, stressLevel),
          systemMetrics: metrics,
          strategy: this.currentStrategy
        };

        this.recordAdaptation(adaptation);
        
        logger.info(`🎯 Adapted ${type}: ${originalLimit.points} → ${finalPoints} (factor: ${adaptationFactor.toFixed(2)})`);
      }

    } catch (error) {
      logger.error(`❌ Error adapting rate limiter ${type}:`, error);
    }
  }

  /**
   * Calculate adaptation factor for rate limiter
   */
  private calculateAdaptationFactor(
    metrics: SystemPerformanceMetrics,
    stressLevel: number,
    strategy: AdaptationStrategy,
    type: RateLimiterType
  ): number {
    // Base adaptation factor from overall stress
    let adaptationFactor = 1 - (stressLevel * 0.5);

    // Apply strategy-specific factors
    const cpuImpact = (metrics.cpu.usage / 100) * strategy.cpuFactor;
    const memoryImpact = (metrics.memory.usagePercent / 100) * strategy.memoryFactor;
    const networkImpact = Math.min(metrics.network.latency / 1000, 1) * strategy.networkFactor;
    const diskImpact = (metrics.disk.usage / 100) * strategy.diskFactor;

    // Weighted impact based on rate limiter type
    const typeWeight = this.getTypeWeight(type);
    const totalImpact = (cpuImpact + memoryImpact + networkImpact + diskImpact) * typeWeight;

    adaptationFactor = Math.max(
      strategy.minReduction,
      Math.min(strategy.maxReduction, 1 - totalImpact)
    );

    return adaptationFactor;
  }

  /**
   * Get weight factor for rate limiter type
   */
  private getTypeWeight(type: RateLimiterType): number {
    switch (type) {
      case RateLimiterType.OLLAMA_LLAMA:
      case RateLimiterType.OLLAMA_CODELLAMA:
        return 1.2; // AI models are more resource intensive
      case RateLimiterType.GATE_IO_ORDERS:
        return 0.8; // Trading orders are critical
      case RateLimiterType.TELEGRAM_MESSAGES:
      case RateLimiterType.EMAIL_NOTIFICATIONS:
        return 0.6; // Notifications are less critical
      default:
        return 1.0;
    }
  }

  /**
   * Generate adaptation reason
   */
  private generateAdaptationReason(metrics: SystemPerformanceMetrics, stressLevel: number): string {
    const reasons = [];
    
    if (metrics.cpu.usage > this.performanceThresholds.cpu.warning) {
      reasons.push(`High CPU usage (${metrics.cpu.usage.toFixed(1)}%)`);
    }
    
    if (metrics.memory.usagePercent > this.performanceThresholds.memory.warning) {
      reasons.push(`High memory usage (${metrics.memory.usagePercent.toFixed(1)}%)`);
    }
    
    if (metrics.network.latency > this.performanceThresholds.networkLatency.warning) {
      reasons.push(`High network latency (${metrics.network.latency}ms)`);
    }
    
    if (metrics.disk.usage > this.performanceThresholds.diskIO.warning) {
      reasons.push(`High disk usage (${metrics.disk.usage.toFixed(1)}%)`);
    }

    return reasons.length > 0 
      ? reasons.join(', ')
      : `System stress level: ${(stressLevel * 100).toFixed(1)}%`;
  }

  /**
   * Record adaptation for history tracking
   */
  private recordAdaptation(adaptation: RateLimitAdaptation): void {
    this.adaptationHistory.push(adaptation);
    
    // Keep history size manageable
    if (this.adaptationHistory.length > this.maxHistorySize) {
      this.adaptationHistory = this.adaptationHistory.slice(-this.maxHistorySize);
    }

    this.emit('adaptationApplied', adaptation);
  }

  /**
   * Start recovery monitoring
   */
  private startRecoveryMonitoring(): void {
    this.recoveryInterval = setInterval(async () => {
      try {
        await this.processRecovery();
      } catch (error) {
        logger.error('❌ Error in recovery processing:', error);
      }
    }, 60000); // Check recovery every minute

    logger.info('🔄 Started adaptive recovery monitoring');
  }

  /**
   * Process recovery of rate limits when conditions improve
   */
  private async processRecovery(): Promise<void> {
    const metrics = await this.collectSystemMetrics();
    const stressLevel = this.calculateSystemStressLevel(metrics);
    const strategy = this.adaptationStrategies.get(this.currentStrategy);

    if (!strategy || stressLevel > 0.5) return; // Only recover when stress is low

    for (const [type, currentFactor] of this.currentAdaptations) {
      if (currentFactor < 1.0) { // Only recover if currently adapted
        const recoveryFactor = Math.min(1.0, currentFactor + strategy.recoveryRate);
        
        if (recoveryFactor > currentFactor) {
          this.currentAdaptations.set(type, recoveryFactor);
          
          logger.info(`🔄 Recovering ${type}: factor ${currentFactor.toFixed(2)} → ${recoveryFactor.toFixed(2)}`);
          
          if (recoveryFactor >= 0.99) {
            this.currentAdaptations.delete(type);
            logger.info(`✅ Full recovery completed for ${type}`);
          }
        }
      }
    }
  }

  /**
   * Get adaptation statistics
   */
  public getAdaptationStatistics(): any {
    const recentAdaptations = this.adaptationHistory.filter(
      a => Date.now() - a.timestamp.getTime() < 3600000 // Last hour
    );

    return {
      currentStrategy: this.currentStrategy,
      totalAdaptations: this.adaptationHistory.length,
      recentAdaptations: recentAdaptations.length,
      activeAdaptations: this.currentAdaptations.size,
      adaptationsByType: this.getAdaptationsByType(),
      averageAdaptationFactor: this.getAverageAdaptationFactor(),
      lastAdaptation: this.lastAdaptation
    };
  }

  /**
   * Get adaptations by type
   */
  private getAdaptationsByType(): Record<string, number> {
    return this.adaptationHistory.reduce((acc, adaptation) => {
      acc[adaptation.limiterType] = (acc[adaptation.limiterType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Get average adaptation factor
   */
  private getAverageAdaptationFactor(): number {
    if (this.adaptationHistory.length === 0) return 1.0;
    
    const sum = this.adaptationHistory.reduce((acc, a) => acc + a.adaptationFactor, 0);
    return sum / this.adaptationHistory.length;
  }

  /**
   * Shutdown the adaptive rate limiter
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down adaptive rate limiter...');

    if (this.performanceMonitoringInterval) {
      clearInterval(this.performanceMonitoringInterval);
      this.performanceMonitoringInterval = null;
    }

    if (this.adaptationInterval) {
      clearInterval(this.adaptationInterval);
      this.adaptationInterval = null;
    }

    if (this.recoveryInterval) {
      clearInterval(this.recoveryInterval);
      this.recoveryInterval = null;
    }

    this.adaptationHistory = [];
    this.currentAdaptations.clear();
    this.originalLimits.clear();
    this.isInitialized = false;

    logger.info('✅ Adaptive rate limiter shutdown completed');
  }
}

// Exports are handled by individual export statements above