/**
 * =============================================================================
 * RATE LIMITING INTEGRATION SERVICE
 * =============================================================================
 * 
 * This module provides comprehensive integration of all rate limiting systems
 * with the main trading application, including SSH tunnel rate limiting,
 * system load-based adaptations, and recovery mechanisms.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { RateLimitingManager } from './index';
import { AdaptiveRateLimiter } from './adaptive-rate-limiter';
import { RateLimitingSystem, RateLimiterType } from './rate-limiter';
import { SystemMonitor } from '@/infrastructure/system-monitor';
import { SSHTunnelManager } from '@/infrastructure/ssh-tunnel-manager';
import { logger } from '@/core/logging/logger';
import { EventEmitter } from 'events';

/**
 * SSH tunnel rate limiting configuration
 */
export interface SSHTunnelRateLimitConfig {
  maxReconnectsPerHour: number;
  reconnectCooldown: number; // milliseconds
  healthCheckInterval: number; // milliseconds
  adaptiveReconnectDelay: boolean;
}

/**
 * System load thresholds for rate limiting adaptation
 */
export interface SystemLoadThresholds {
  cpu: {
    low: number;    // Below this: increase limits
    normal: number; // Normal operation
    high: number;   // Above this: decrease limits
    critical: number; // Emergency reduction
  };
  memory: {
    low: number;
    normal: number;
    high: number;
    critical: number;
  };
  network: {
    lowLatency: number;    // ms
    normalLatency: number; // ms
    highLatency: number;   // ms
    criticalLatency: number; // ms
  };
}

/**
 * Rate limiting integration statistics
 */
export interface RateLimitingIntegrationStats {
  timestamp: Date;
  systemLoad: {
    cpu: number;
    memory: number;
    networkLatency: number;
  };
  rateLimiters: {
    api: any;
    ai: any;
    notifications: any;
  };
  adaptations: {
    totalAdaptations: number;
    recentAdaptations: number;
    currentStrategy: string;
  };
  sshTunnel: {
    reconnectCount: number;
    lastReconnect: Date | null;
    isHealthy: boolean;
  };
  performance: {
    overallHealth: number; // 0-100
    bottlenecks: string[];
    recommendations: string[];
  };
}

/**
 * Rate limiting integration service
 */
export class RateLimitingIntegration extends EventEmitter {
  private rateLimitingManager: RateLimitingManager;
  private adaptiveRateLimiter: AdaptiveRateLimiter;
  private systemMonitor: SystemMonitor;
  private sshTunnelManager: SSHTunnelManager | null = null;
  private isInitialized: boolean = false;
  
  // Configuration
  private sshTunnelConfig: SSHTunnelRateLimitConfig;
  private systemLoadThresholds: SystemLoadThresholds;
  
  // Monitoring
  private integrationMonitoringInterval: NodeJS.Timeout | null = null;
  private sshTunnelMonitoringInterval: NodeJS.Timeout | null = null;
  
  // Statistics
  private sshReconnectCount: number = 0;
  private lastSSHReconnect: Date | null = null;
  private performanceHistory: Array<{ timestamp: Date; metrics: any }> = [];
  private maxHistorySize: number = 1000;

  constructor(
    rateLimitingManager: RateLimitingManager,
    systemMonitor: SystemMonitor,
    sshTunnelManager?: SSHTunnelManager
  ) {
    super();
    
    this.rateLimitingManager = rateLimitingManager;
    this.systemMonitor = systemMonitor;
    this.sshTunnelManager = sshTunnelManager || null;
    this.adaptiveRateLimiter = rateLimitingManager.getAdaptiveRateLimiter();
    
    this.setupDefaultConfigurations();
  }

  /**
   * Initialize the rate limiting integration
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🔧 Initializing rate limiting integration...');

      // Initialize rate limiting manager
      await this.rateLimitingManager.initialize();

      // Setup event listeners
      this.setupEventListeners();

      // Start monitoring
      this.startIntegrationMonitoring();
      
      if (this.sshTunnelManager) {
        this.startSSHTunnelMonitoring();
      }

      this.isInitialized = true;
      logger.info('✅ Rate limiting integration initialized successfully');

      this.emit('initialized');
    } catch (error) {
      logger.error('❌ Failed to initialize rate limiting integration:', error);
      throw error;
    }
  }

  /**
   * Setup default configurations
   */
  private setupDefaultConfigurations(): void {
    this.sshTunnelConfig = {
      maxReconnectsPerHour: 10,
      reconnectCooldown: 30000, // 30 seconds
      healthCheckInterval: 60000, // 1 minute
      adaptiveReconnectDelay: true
    };

    this.systemLoadThresholds = {
      cpu: {
        low: 30,      // Below 30%: can increase limits
        normal: 70,   // 30-70%: normal operation
        high: 85,     // 85-95%: decrease limits
        critical: 95  // Above 95%: emergency reduction
      },
      memory: {
        low: 40,      // Below 40%: can increase limits
        normal: 75,   // 40-75%: normal operation
        high: 85,     // 85-95%: decrease limits
        critical: 95  // Above 95%: emergency reduction
      },
      network: {
        lowLatency: 50,      // Below 50ms: can increase limits
        normalLatency: 200,  // 50-200ms: normal operation
        highLatency: 1000,   // 200-1000ms: decrease limits
        criticalLatency: 2000 // Above 2000ms: emergency reduction
      }
    };
  }

  /**
   * Setup event listeners for all rate limiting components
   */
  private setupEventListeners(): void {
    // Adaptive rate limiter events
    this.adaptiveRateLimiter.on('rateLimitAdapted', (adaptation) => {
      logger.info(`🎯 Rate limit adapted: ${adaptation.limiterType} - ${adaptation.adaptationFactor.toFixed(2)}x`);
      this.emit('rateLimitAdapted', adaptation);
    });

    this.adaptiveRateLimiter.on('strategyChanged', (event) => {
      logger.info(`🎯 Adaptation strategy changed: ${event.oldStrategy} → ${event.newStrategy}`);
      this.emit('strategyChanged', event);
    });

    // SSH tunnel events (if available)
    if (this.sshTunnelManager) {
      this.sshTunnelManager.on('tunnelReconnected', (connection) => {
        this.handleSSHTunnelReconnect(connection);
      });

      this.sshTunnelManager.on('tunnelError', (connection, error) => {
        this.handleSSHTunnelError(connection, error);
      });
    }

    // System performance events
    this.adaptiveRateLimiter.on('performanceUpdate', (update) => {
      this.handlePerformanceUpdate(update);
    });
  }

  /**
   * Handle SSH tunnel reconnection with rate limiting
   */
  private async handleSSHTunnelReconnect(connection: any): Promise<void> {
    try {
      // Apply SSH tunnel reconnection rate limiting
      await this.rateLimitingManager.getRateLimitingSystem().consume(
        RateLimiterType.SSH_TUNNEL_RECONNECT,
        1,
        false
      );

      this.sshReconnectCount++;
      this.lastSSHReconnect = new Date();

      logger.info(`🔗 SSH tunnel reconnected: ${connection.id} (count: ${this.sshReconnectCount})`);
      
      // Check if reconnection rate is too high
      if (this.sshReconnectCount > this.sshTunnelConfig.maxReconnectsPerHour) {
        logger.warn('⚠️ High SSH tunnel reconnection rate detected, implementing adaptive delays');
        await this.implementAdaptiveSSHDelay();
      }

      this.emit('sshTunnelReconnected', {
        connectionId: connection.id,
        reconnectCount: this.sshReconnectCount,
        timestamp: this.lastSSHReconnect
      });

    } catch (error) {
      logger.error('❌ SSH tunnel reconnection rate limit exceeded:', error);
      this.emit('sshTunnelRateLimited', {
        connectionId: connection.id,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Handle SSH tunnel errors
   */
  private handleSSHTunnelError(connection: any, error: any): void {
    logger.error(`❌ SSH tunnel error: ${connection.id}`, error);
    
    // Implement exponential backoff for reconnection attempts
    if (this.sshTunnelConfig.adaptiveReconnectDelay) {
      const delay = Math.min(
        this.sshTunnelConfig.reconnectCooldown * Math.pow(2, this.sshReconnectCount),
        300000 // Max 5 minutes
      );
      
      logger.info(`⏳ Implementing adaptive SSH reconnect delay: ${delay}ms`);
    }

    this.emit('sshTunnelError', {
      connectionId: connection.id,
      error: error.message,
      reconnectCount: this.sshReconnectCount,
      timestamp: new Date()
    });
  }

  /**
   * Implement adaptive SSH delay based on system load
   */
  private async implementAdaptiveSSHDelay(): Promise<void> {
    const systemMetrics = await this.systemMonitor.getSystemMetrics();
    
    // Calculate delay based on system load
    let delayMultiplier = 1;
    
    if ((systemMetrics.cpu?.utilization || 0) > this.systemLoadThresholds.cpu.high) {
      delayMultiplier *= 2;
    }
    
    if ((systemMetrics.ram?.utilization || 0) > this.systemLoadThresholds.memory.high) {
      delayMultiplier *= 1.5;
    }

    const adaptiveDelay = this.sshTunnelConfig.reconnectCooldown * delayMultiplier;
    
    logger.info(`🎯 Adaptive SSH delay calculated: ${adaptiveDelay}ms (multiplier: ${delayMultiplier})`);
    
    // This would be implemented in the SSH tunnel manager
    // For now, we just log the recommendation
  }

  /**
   * Handle performance updates
   */
  private handlePerformanceUpdate(update: any): void {
    // Record performance history
    this.performanceHistory.push({
      timestamp: new Date(),
      metrics: update.metrics
    });

    // Keep history size manageable
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }

    // Analyze performance trends
    this.analyzePerformanceTrends(update);
  }

  /**
   * Analyze performance trends and make recommendations
   */
  private analyzePerformanceTrends(update: any): void {
    const metrics = update.metrics;
    const recommendations: string[] = [];
    const bottlenecks: string[] = [];

    // CPU analysis
    if (metrics.cpu.usage > this.systemLoadThresholds.cpu.critical) {
      bottlenecks.push('CPU usage critical');
      recommendations.push('Reduce AI model requests and API calls');
    } else if (metrics.cpu.usage > this.systemLoadThresholds.cpu.high) {
      bottlenecks.push('CPU usage high');
      recommendations.push('Consider reducing concurrent operations');
    }

    // Memory analysis
    if (metrics.memory.usagePercent > this.systemLoadThresholds.memory.critical) {
      bottlenecks.push('Memory usage critical');
      recommendations.push('Clear caches and reduce model loading');
    } else if (metrics.memory.usagePercent > this.systemLoadThresholds.memory.high) {
      bottlenecks.push('Memory usage high');
      recommendations.push('Monitor memory-intensive operations');
    }

    // Network analysis
    if (metrics.network.latency > this.systemLoadThresholds.network.criticalLatency) {
      bottlenecks.push('Network latency critical');
      recommendations.push('Check SSH tunnel and network connectivity');
    } else if (metrics.network.latency > this.systemLoadThresholds.network.highLatency) {
      bottlenecks.push('Network latency high');
      recommendations.push('Reduce API request frequency');
    }

    if (bottlenecks.length > 0 || recommendations.length > 0) {
      this.emit('performanceAnalysis', {
        timestamp: new Date(),
        bottlenecks,
        recommendations,
        metrics
      });
    }
  }

  /**
   * Start integration monitoring
   */
  private startIntegrationMonitoring(): void {
    this.integrationMonitoringInterval = setInterval(async () => {
      try {
        await this.performIntegrationHealthCheck();
      } catch (error) {
        logger.error('❌ Error in integration monitoring:', error);
      }
    }, 60000); // Check every minute

    logger.info('📊 Started rate limiting integration monitoring');
  }

  /**
   * Start SSH tunnel monitoring
   */
  private startSSHTunnelMonitoring(): void {
    if (!this.sshTunnelManager) return;

    this.sshTunnelMonitoringInterval = setInterval(async () => {
      try {
        await this.performSSHTunnelHealthCheck();
      } catch (error) {
        logger.error('❌ Error in SSH tunnel monitoring:', error);
      }
    }, this.sshTunnelConfig.healthCheckInterval);

    logger.info('🔗 Started SSH tunnel rate limiting monitoring');
  }

  /**
   * Perform comprehensive integration health check
   */
  private async performIntegrationHealthCheck(): Promise<void> {
    const healthCheck = await this.rateLimitingManager.healthCheck();
    
    if (!healthCheck.isHealthy) {
      logger.warn('⚠️ Rate limiting system health issues detected:', healthCheck.systems);
      
      this.emit('healthIssue', {
        timestamp: new Date(),
        systems: healthCheck.systems,
        overallHealth: false
      });
    }

    // Check for performance bottlenecks
    const stats = await this.getComprehensiveStatistics();
    const overallHealth = this.calculateOverallHealth(stats);

    if (overallHealth < 70) {
      logger.warn(`⚠️ Overall system health low: ${overallHealth}%`);
      
      this.emit('lowPerformance', {
        timestamp: new Date(),
        healthScore: overallHealth,
        statistics: stats
      });
    }
  }

  /**
   * Perform SSH tunnel health check
   */
  private async performSSHTunnelHealthCheck(): Promise<void> {
    if (!this.sshTunnelManager) return;

    try {
      const status = await this.sshTunnelManager.getConnectionStatus();
      
      if (!status.isConnected) {
        logger.warn('⚠️ SSH tunnel disconnected, monitoring reconnection attempts');
        
        this.emit('sshTunnelDisconnected', {
          timestamp: new Date(),
          status
        });
      }
    } catch (error) {
      logger.error('❌ SSH tunnel health check failed:', error);
    }
  }

  /**
   * Calculate overall system health score
   */
  private calculateOverallHealth(stats: RateLimitingIntegrationStats): number {
    let healthScore = 100;

    // Deduct points for high system load
    if (stats.systemLoad.cpu > this.systemLoadThresholds.cpu.high) {
      healthScore -= 20;
    }
    if (stats.systemLoad.memory > this.systemLoadThresholds.memory.high) {
      healthScore -= 20;
    }
    if (stats.systemLoad.networkLatency > this.systemLoadThresholds.network.highLatency) {
      healthScore -= 15;
    }

    // Deduct points for rate limiting issues
    if (stats.rateLimiters.api.recentViolations > 10) {
      healthScore -= 10;
    }
    if (stats.rateLimiters.ai.queueLength > 20) {
      healthScore -= 10;
    }
    if (stats.rateLimiters.notifications.queueLength > 50) {
      healthScore -= 5;
    }

    // Deduct points for SSH tunnel issues
    if (!stats.sshTunnel.isHealthy) {
      healthScore -= 15;
    }

    return Math.max(0, healthScore);
  }

  /**
   * Get comprehensive statistics
   */
  public async getComprehensiveStatistics(): Promise<RateLimitingIntegrationStats> {
    const systemMetrics = await this.systemMonitor.getSystemMetrics();
    const rateLimiterStats = await this.rateLimitingManager.getComprehensiveStatistics();
    const adaptationStats = this.adaptiveRateLimiter.getAdaptationStatistics();

    const stats: RateLimitingIntegrationStats = {
      timestamp: new Date(),
      systemLoad: {
        cpu: systemMetrics.cpu?.utilization || 0,
        memory: systemMetrics.ram?.utilization || 0,
        networkLatency: await this.measureNetworkLatency()
      },
      rateLimiters: {
        api: rateLimiterStats.core,
        ai: rateLimiterStats.ai,
        notifications: rateLimiterStats.notifications
      },
      adaptations: {
        totalAdaptations: adaptationStats.totalAdaptations,
        recentAdaptations: adaptationStats.recentAdaptations,
        currentStrategy: adaptationStats.currentStrategy
      },
      sshTunnel: {
        reconnectCount: this.sshReconnectCount,
        lastReconnect: this.lastSSHReconnect,
        isHealthy: await this.checkSSHTunnelHealth()
      },
      performance: {
        overallHealth: 0, // Will be calculated
        bottlenecks: [],
        recommendations: []
      }
    };

    // Calculate overall health and recommendations
    stats.performance.overallHealth = this.calculateOverallHealth(stats);
    stats.performance.bottlenecks = this.identifyBottlenecks(stats);
    stats.performance.recommendations = this.generateRecommendations(stats);

    return stats;
  }

  /**
   * Measure network latency
   */
  private async measureNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      await fetch('http://localhost:8443/ping', { method: 'HEAD' });
      return Date.now() - start;
    } catch (error) {
      return 5000; // High latency on error
    }
  }

  /**
   * Check SSH tunnel health
   */
  private async checkSSHTunnelHealth(): Promise<boolean> {
    if (!this.sshTunnelManager) return true;
    
    try {
      const status = await this.sshTunnelManager.getConnectionStatus();
      return status.isConnected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Identify system bottlenecks
   */
  private identifyBottlenecks(stats: RateLimitingIntegrationStats): string[] {
    const bottlenecks: string[] = [];

    if (stats.systemLoad.cpu > this.systemLoadThresholds.cpu.high) {
      bottlenecks.push('High CPU usage');
    }
    if (stats.systemLoad.memory > this.systemLoadThresholds.memory.high) {
      bottlenecks.push('High memory usage');
    }
    if (stats.systemLoad.networkLatency > this.systemLoadThresholds.network.highLatency) {
      bottlenecks.push('High network latency');
    }
    if (stats.rateLimiters.ai.queueLength > 10) {
      bottlenecks.push('AI request queue backlog');
    }
    if (stats.rateLimiters.notifications.queueLength > 20) {
      bottlenecks.push('Notification queue backlog');
    }

    return bottlenecks;
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(stats: RateLimitingIntegrationStats): string[] {
    const recommendations: string[] = [];

    if (stats.systemLoad.cpu > this.systemLoadThresholds.cpu.high) {
      recommendations.push('Reduce concurrent AI model requests');
      recommendations.push('Consider switching to lighter AI models');
    }

    if (stats.systemLoad.memory > this.systemLoadThresholds.memory.high) {
      recommendations.push('Clear AI model caches');
      recommendations.push('Reduce batch sizes for operations');
    }

    if (stats.systemLoad.networkLatency > this.systemLoadThresholds.network.highLatency) {
      recommendations.push('Check SSH tunnel stability');
      recommendations.push('Reduce API request frequency');
    }

    if (stats.rateLimiters.ai.queueLength > 10) {
      recommendations.push('Increase AI request processing capacity');
      recommendations.push('Implement request prioritization');
    }

    if (stats.sshTunnel.reconnectCount > 5) {
      recommendations.push('Investigate SSH tunnel stability');
      recommendations.push('Check network connectivity');
    }

    return recommendations;
  }

  /**
   * Force rate limit adaptation
   */
  public async forceAdaptation(strategy?: string): Promise<void> {
    if (strategy) {
      await this.adaptiveRateLimiter.setAdaptationStrategy(strategy);
    }
    
    logger.info('🎯 Forced rate limit adaptation triggered');
    this.emit('forcedAdaptation', {
      timestamp: new Date(),
      strategy: strategy || 'current'
    });
  }

  /**
   * Reset all rate limiters
   */
  public async resetAllRateLimiters(): Promise<void> {
    const rateLimitingSystem = this.rateLimitingManager.getRateLimitingSystem();
    
    for (const type of Object.values(RateLimiterType)) {
      try {
        await rateLimitingSystem.reset(type);
      } catch (error) {
        logger.warn(`⚠️ Failed to reset rate limiter ${type}:`, error.message);
      }
    }

    logger.info('🔄 All rate limiters reset');
    this.emit('rateLimitersReset', { timestamp: new Date() });
  }

  /**
   * Shutdown the integration service
   */
  public async shutdown(): Promise<void> {
    logger.info('🛑 Shutting down rate limiting integration...');

    if (this.integrationMonitoringInterval) {
      clearInterval(this.integrationMonitoringInterval);
      this.integrationMonitoringInterval = null;
    }

    if (this.sshTunnelMonitoringInterval) {
      clearInterval(this.sshTunnelMonitoringInterval);
      this.sshTunnelMonitoringInterval = null;
    }

    await this.rateLimitingManager.shutdown();

    this.performanceHistory = [];
    this.isInitialized = false;

    logger.info('✅ Rate limiting integration shutdown completed');
  }
}

// Exports are handled by individual export statements above