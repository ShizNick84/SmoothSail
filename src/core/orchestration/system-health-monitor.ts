/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SYSTEM HEALTH MONITOR
 * =============================================================================
 * 
 * This module provides comprehensive system health monitoring and status
 * reporting for all components in the trading system. It tracks component
 * health, system metrics, and provides early warning for potential issues.
 * 
 * CRITICAL SYSTEM NOTICE:
 * System health monitoring is essential for maintaining 24/7 trading
 * operations. Early detection of issues prevents financial losses and
 * ensures system reliability.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { auditService } from '@/security/audit-service';
import { SystemComponent, ComponentHealth, ComponentStatus } from './system-orchestrator';
import { communicationBus, MessagePriority } from './communication-bus';

/**
 * System health status enumeration
 */
export enum SystemHealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  DEGRADED = 'DEGRADED',
  OFFLINE = 'OFFLINE'
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  /** Component identifier */
  componentId: string;
  /** Health status */
  status: SystemHealthStatus;
  /** Health score (0-100) */
  score: number;
  /** Check timestamp */
  timestamp: Date;
  /** Response time in milliseconds */
  responseTime: number;
  /** Health details */
  details: Record<string, any>;
  /** Issues found */
  issues: HealthIssue[];
  /** Recommendations */
  recommendations: string[];
}

/**
 * Health issue interface
 */
export interface HealthIssue {
  /** Issue severity */
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Issue category */
  category: string;
  /** Issue description */
  description: string;
  /** Issue code */
  code: string;
  /** Affected metrics */
  affectedMetrics: string[];
  /** Suggested actions */
  suggestedActions: string[];
  /** Issue timestamp */
  timestamp: Date;
}

/**
 * System metrics interface
 */
export interface SystemMetrics {
  /** CPU metrics */
  cpu: {
    usage: number;
    temperature: number;
    loadAverage: number[];
    processes: number;
  };
  /** Memory metrics */
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
    swapUsed: number;
  };
  /** Disk metrics */
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
    ioRead: number;
    ioWrite: number;
  };
  /** Network metrics */
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors: number;
    latency: number;
  };
  /** Application metrics */
  application: {
    uptime: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerSecond: number;
    errorRate: number;
  };
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  /** Health check interval in milliseconds */
  checkInterval: number;
  /** Health check timeout in milliseconds */
  checkTimeout: number;
  /** Number of failed checks before marking as unhealthy */
  failureThreshold: number;
  /** Number of successful checks to recover */
  recoveryThreshold: number;
  /** Enable automatic recovery attempts */
  autoRecovery: boolean;
  /** Recovery cooldown period in milliseconds */
  recoveryCooldown: number;
  /** Health history retention count */
  historyRetention: number;
  /** Enable health alerts */
  enableAlerts: boolean;
  /** Alert thresholds */
  alertThresholds: {
    cpu: number;
    memory: number;
    disk: number;
    responseTime: number;
  };
}

/**
 * Component health tracker
 */
interface ComponentHealthTracker {
  /** Component reference */
  component: SystemComponent;
  /** Current health status */
  currentHealth: HealthCheckResult;
  /** Health history */
  healthHistory: HealthCheckResult[];
  /** Consecutive failure count */
  failureCount: number;
  /** Consecutive success count */
  successCount: number;
  /** Last recovery attempt */
  lastRecoveryAttempt?: Date;
  /** Health trend */
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
}

/**
 * System health monitor class
 */
export class SystemHealthMonitor extends EventEmitter {
  private componentTrackers: Map<string, ComponentHealthTracker> = new Map();
  private systemMetrics: SystemMetrics | null = null;
  private monitoringInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;
  private overallHealthStatus: SystemHealthStatus = SystemHealthStatus.HEALTHY;

  constructor(private config: HealthMonitorConfig) {
    super();
    this.setupEventHandlers();
  }

  /**
   * Start health monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('⚠️ Health monitoring already running');
      return;
    }

    logger.info('🏥 Starting system health monitoring...');

    this.isMonitoring = true;

    // Start component health checks
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.checkInterval);

    // Start system metrics collection
    this.metricsInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 5000); // Collect metrics every 5 seconds

    // Initial health check
    await this.performHealthChecks();
    await this.collectSystemMetrics();

    // Send startup notification
    await communicationBus.publish('system.health.monitoring.started', {
      timestamp: new Date(),
      config: this.config
    }, {
      priority: MessagePriority.HIGH,
      source: 'system-health-monitor'
    });

    logger.info('✅ System health monitoring started');
  }

  /**
   * Stop health monitoring
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('🛑 Stopping system health monitoring...');

    this.isMonitoring = false;

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    // Send shutdown notification
    await communicationBus.publish('system.health.monitoring.stopped', {
      timestamp: new Date(),
      finalStatus: this.overallHealthStatus
    }, {
      priority: MessagePriority.HIGH,
      source: 'system-health-monitor'
    });

    logger.info('✅ System health monitoring stopped');
  }

  /**
   * Register component for health monitoring
   * 
   * @param component System component to monitor
   */
  public registerComponent(component: SystemComponent): void {
    logger.info(`📋 Registering component for health monitoring: ${component.id}`);

    const tracker: ComponentHealthTracker = {
      component,
      currentHealth: {
        componentId: component.id,
        status: SystemHealthStatus.HEALTHY,
        score: 100,
        timestamp: new Date(),
        responseTime: 0,
        details: {},
        issues: [],
        recommendations: []
      },
      healthHistory: [],
      failureCount: 0,
      successCount: 0,
      trend: 'STABLE'
    };

    this.componentTrackers.set(component.id, tracker);

    logger.info(`✅ Component registered for health monitoring: ${component.id}`);
  }

  /**
   * Unregister component from health monitoring
   * 
   * @param componentId Component identifier
   */
  public unregisterComponent(componentId: string): void {
    if (this.componentTrackers.has(componentId)) {
      this.componentTrackers.delete(componentId);
      logger.info(`📤 Component unregistered from health monitoring: ${componentId}`);
    }
  }

  /**
   * Get current system health status
   * 
   * @returns System health status
   */
  public getSystemHealthStatus(): {
    overallStatus: SystemHealthStatus;
    overallScore: number;
    componentCount: number;
    healthyComponents: number;
    unhealthyComponents: number;
    systemMetrics: SystemMetrics | null;
    lastUpdate: Date;
  } {
    const componentCount = this.componentTrackers.size;
    let healthyComponents = 0;
    let totalScore = 0;

    for (const tracker of this.componentTrackers.values()) {
      if (tracker.currentHealth.status === SystemHealthStatus.HEALTHY) {
        healthyComponents++;
      }
      totalScore += tracker.currentHealth.score;
    }

    const overallScore = componentCount > 0 ? totalScore / componentCount : 100;

    return {
      overallStatus: this.overallHealthStatus,
      overallScore,
      componentCount,
      healthyComponents,
      unhealthyComponents: componentCount - healthyComponents,
      systemMetrics: this.systemMetrics,
      lastUpdate: new Date()
    };
  }

  /**
   * Get component health status
   * 
   * @param componentId Component identifier
   * @returns Component health status or undefined
   */
  public getComponentHealth(componentId: string): HealthCheckResult | undefined {
    const tracker = this.componentTrackers.get(componentId);
    return tracker?.currentHealth;
  }

  /**
   * Get component health history
   * 
   * @param componentId Component identifier
   * @param limit Maximum number of history entries
   * @returns Array of health check results
   */
  public getComponentHealthHistory(componentId: string, limit: number = 100): HealthCheckResult[] {
    const tracker = this.componentTrackers.get(componentId);
    if (!tracker) {
      return [];
    }

    return tracker.healthHistory.slice(-limit);
  }

  /**
   * Force health check for specific component
   * 
   * @param componentId Component identifier
   * @returns Promise<HealthCheckResult>
   */
  public async forceHealthCheck(componentId: string): Promise<HealthCheckResult> {
    const tracker = this.componentTrackers.get(componentId);
    if (!tracker) {
      throw new Error(`Component not registered: ${componentId}`);
    }

    return await this.performComponentHealthCheck(tracker);
  }

  /**
   * Get system health report
   * 
   * @returns Comprehensive health report
   */
  public getHealthReport(): {
    timestamp: Date;
    overallStatus: SystemHealthStatus;
    overallScore: number;
    systemMetrics: SystemMetrics | null;
    components: HealthCheckResult[];
    criticalIssues: HealthIssue[];
    recommendations: string[];
  } {
    const components: HealthCheckResult[] = [];
    const criticalIssues: HealthIssue[] = [];
    const recommendations: Set<string> = new Set();

    for (const tracker of this.componentTrackers.values()) {
      components.push(tracker.currentHealth);

      // Collect critical issues
      for (const issue of tracker.currentHealth.issues) {
        if (issue.severity === 'CRITICAL' || issue.severity === 'HIGH') {
          criticalIssues.push(issue);
        }
      }

      // Collect recommendations
      for (const recommendation of tracker.currentHealth.recommendations) {
        recommendations.add(recommendation);
      }
    }

    const systemStatus = this.getSystemHealthStatus();

    return {
      timestamp: new Date(),
      overallStatus: systemStatus.overallStatus,
      overallScore: systemStatus.overallScore,
      systemMetrics: this.systemMetrics,
      components,
      criticalIssues,
      recommendations: Array.from(recommendations)
    };
  }

  /**
   * Perform health checks on all registered components
   */
  private async performHealthChecks(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    const healthCheckPromises: Promise<void>[] = [];

    for (const tracker of this.componentTrackers.values()) {
      healthCheckPromises.push(
        this.performComponentHealthCheck(tracker)
          .then(() => {}) // Convert to void
          .catch(error => {
            logger.error(`❌ Health check failed for ${tracker.component.id}:`, error);
          })
      );
    }

    await Promise.allSettled(healthCheckPromises);

    // Update overall system health
    this.updateOverallHealthStatus();
  }

  /**
   * Perform health check for specific component
   * 
   * @param tracker Component health tracker
   * @returns Promise<HealthCheckResult>
   */
  private async performComponentHealthCheck(tracker: ComponentHealthTracker): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Perform health check with timeout
      const healthCheckPromise = tracker.component.healthCheck();
      const timeoutPromise = new Promise<ComponentHealth>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Health check timeout'));
        }, this.config.checkTimeout);
      });

      const componentHealth = await Promise.race([healthCheckPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;

      // Convert to health check result
      const result: HealthCheckResult = {
        componentId: tracker.component.id,
        status: componentHealth.healthy ? SystemHealthStatus.HEALTHY : SystemHealthStatus.CRITICAL,
        score: componentHealth.score,
        timestamp: new Date(),
        responseTime,
        details: componentHealth.details,
        issues: this.convertToHealthIssues(componentHealth.issues),
        recommendations: componentHealth.recommendations
      };

      // Determine status based on score and issues
      result.status = this.determineHealthStatus(result);

      // Update tracker
      this.updateComponentTracker(tracker, result);

      // Handle unhealthy components
      if (result.status !== SystemHealthStatus.HEALTHY) {
        await this.handleUnhealthyComponent(tracker, result);
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        componentId: tracker.component.id,
        status: SystemHealthStatus.OFFLINE,
        score: 0,
        timestamp: new Date(),
        responseTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        issues: [{
          severity: 'CRITICAL',
          category: 'CONNECTIVITY',
          description: 'Component health check failed',
          code: 'HEALTH_CHECK_FAILED',
          affectedMetrics: ['availability'],
          suggestedActions: ['Restart component', 'Check component logs'],
          timestamp: new Date()
        }],
        recommendations: ['Investigate component failure', 'Check system resources']
      };

      // Update tracker
      this.updateComponentTracker(tracker, result);

      // Handle failed health check
      await this.handleUnhealthyComponent(tracker, result);

      return result;
    }
  }

  /**
   * Update component tracker with new health result
   * 
   * @param tracker Component health tracker
   * @param result Health check result
   */
  private updateComponentTracker(tracker: ComponentHealthTracker, result: HealthCheckResult): void {
    // Update current health
    tracker.currentHealth = result;

    // Add to history
    tracker.healthHistory.push(result);

    // Maintain history size
    if (tracker.healthHistory.length > this.config.historyRetention) {
      tracker.healthHistory = tracker.healthHistory.slice(-this.config.historyRetention);
    }

    // Update failure/success counts
    if (result.status === SystemHealthStatus.HEALTHY) {
      tracker.successCount++;
      tracker.failureCount = 0;
    } else {
      tracker.failureCount++;
      tracker.successCount = 0;
    }

    // Update trend
    tracker.trend = this.calculateHealthTrend(tracker);

    // Emit health change event
    this.emit('component:health-changed', tracker.component.id, result);
  }

  /**
   * Calculate health trend for component
   * 
   * @param tracker Component health tracker
   * @returns Health trend
   */
  private calculateHealthTrend(tracker: ComponentHealthTracker): 'IMPROVING' | 'STABLE' | 'DEGRADING' {
    if (tracker.healthHistory.length < 3) {
      return 'STABLE';
    }

    const recent = tracker.healthHistory.slice(-3);
    const scores = recent.map(h => h.score);

    const firstScore = scores[0];
    const lastScore = scores[scores.length - 1];

    if (lastScore > firstScore + 10) {
      return 'IMPROVING';
    } else if (lastScore < firstScore - 10) {
      return 'DEGRADING';
    } else {
      return 'STABLE';
    }
  }

  /**
   * Handle unhealthy component
   * 
   * @param tracker Component health tracker
   * @param result Health check result
   */
  private async handleUnhealthyComponent(
    tracker: ComponentHealthTracker,
    result: HealthCheckResult
  ): Promise<void> {
    // Send health alert
    if (this.config.enableAlerts) {
      await communicationBus.publish('system.health.component.unhealthy', {
        componentId: tracker.component.id,
        status: result.status,
        score: result.score,
        issues: result.issues,
        recommendations: result.recommendations,
        timestamp: result.timestamp
      }, {
        priority: result.status === SystemHealthStatus.CRITICAL ? MessagePriority.CRITICAL : MessagePriority.HIGH,
        source: 'system-health-monitor'
      });
    }

    // Attempt recovery if enabled
    if (this.config.autoRecovery && tracker.failureCount >= this.config.failureThreshold) {
      await this.attemptComponentRecovery(tracker);
    }
  }

  /**
   * Attempt to recover unhealthy component
   * 
   * @param tracker Component health tracker
   */
  private async attemptComponentRecovery(tracker: ComponentHealthTracker): Promise<void> {
    const now = new Date();
    
    // Check cooldown period
    if (tracker.lastRecoveryAttempt) {
      const timeSinceLastRecovery = now.getTime() - tracker.lastRecoveryAttempt.getTime();
      if (timeSinceLastRecovery < this.config.recoveryCooldown) {
        return;
      }
    }

    logger.warn(`🔄 Attempting recovery for unhealthy component: ${tracker.component.id}`);
    tracker.lastRecoveryAttempt = now;

    try {
      // Send recovery request
      await communicationBus.publish('system.component.recovery.request', {
        componentId: tracker.component.id,
        reason: 'HEALTH_CHECK_FAILURE',
        timestamp: now
      }, {
        priority: MessagePriority.HIGH,
        source: 'system-health-monitor'
      });

      logger.info(`✅ Recovery request sent for component: ${tracker.component.id}`);

    } catch (error) {
      logger.error(`❌ Failed to send recovery request for ${tracker.component.id}:`, error);
    }
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // This would integrate with system monitoring tools
      // For now, we'll create mock metrics
      this.systemMetrics = {
        cpu: {
          usage: Math.random() * 100,
          temperature: 45 + Math.random() * 20,
          loadAverage: [1.2, 1.5, 1.8],
          processes: 150 + Math.floor(Math.random() * 50)
        },
        memory: {
          total: 12 * 1024 * 1024 * 1024, // 12GB
          used: 8 * 1024 * 1024 * 1024,   // 8GB
          free: 4 * 1024 * 1024 * 1024,   // 4GB
          usage: 66.7,
          swapUsed: 0
        },
        disk: {
          total: 256 * 1024 * 1024 * 1024, // 256GB
          used: 128 * 1024 * 1024 * 1024,  // 128GB
          free: 128 * 1024 * 1024 * 1024,  // 128GB
          usage: 50,
          ioRead: 1000,
          ioWrite: 500
        },
        network: {
          bytesIn: 1000000,
          bytesOut: 500000,
          packetsIn: 1000,
          packetsOut: 800,
          errors: 0,
          latency: 10
        },
        application: {
          uptime: process.uptime() * 1000,
          memoryUsage: process.memoryUsage().heapUsed,
          activeConnections: 10,
          requestsPerSecond: 50,
          errorRate: 0.1
        }
      };

      // Check for metric alerts
      await this.checkMetricAlerts();

    } catch (error) {
      logger.error('❌ Failed to collect system metrics:', error);
    }
  }

  /**
   * Check for metric-based alerts
   */
  private async checkMetricAlerts(): Promise<void> {
    if (!this.systemMetrics || !this.config.enableAlerts) {
      return;
    }

    const alerts: string[] = [];

    // Check CPU usage
    if (this.systemMetrics.cpu.usage > this.config.alertThresholds.cpu) {
      alerts.push(`High CPU usage: ${this.systemMetrics.cpu.usage.toFixed(1)}%`);
    }

    // Check memory usage
    if (this.systemMetrics.memory.usage > this.config.alertThresholds.memory) {
      alerts.push(`High memory usage: ${this.systemMetrics.memory.usage.toFixed(1)}%`);
    }

    // Check disk usage
    if (this.systemMetrics.disk.usage > this.config.alertThresholds.disk) {
      alerts.push(`High disk usage: ${this.systemMetrics.disk.usage.toFixed(1)}%`);
    }

    // Send alerts if any
    if (alerts.length > 0) {
      await communicationBus.publish('system.health.metrics.alert', {
        alerts,
        metrics: this.systemMetrics,
        timestamp: new Date()
      }, {
        priority: MessagePriority.HIGH,
        source: 'system-health-monitor'
      });
    }
  }

  /**
   * Update overall system health status
   */
  private updateOverallHealthStatus(): void {
    const componentStatuses = Array.from(this.componentTrackers.values())
      .map(tracker => tracker.currentHealth.status);

    if (componentStatuses.length === 0) {
      this.overallHealthStatus = SystemHealthStatus.HEALTHY;
      return;
    }

    // Determine overall status based on component statuses
    if (componentStatuses.some(status => status === SystemHealthStatus.OFFLINE)) {
      this.overallHealthStatus = SystemHealthStatus.OFFLINE;
    } else if (componentStatuses.some(status => status === SystemHealthStatus.CRITICAL)) {
      this.overallHealthStatus = SystemHealthStatus.CRITICAL;
    } else if (componentStatuses.some(status => status === SystemHealthStatus.DEGRADED)) {
      this.overallHealthStatus = SystemHealthStatus.DEGRADED;
    } else if (componentStatuses.some(status => status === SystemHealthStatus.WARNING)) {
      this.overallHealthStatus = SystemHealthStatus.WARNING;
    } else {
      this.overallHealthStatus = SystemHealthStatus.HEALTHY;
    }
  }

  /**
   * Determine health status based on score and issues
   * 
   * @param result Health check result
   * @returns System health status
   */
  private determineHealthStatus(result: HealthCheckResult): SystemHealthStatus {
    // Check for critical issues
    const hasCriticalIssues = result.issues.some(issue => issue.severity === 'CRITICAL');
    if (hasCriticalIssues) {
      return SystemHealthStatus.CRITICAL;
    }

    // Check for high severity issues
    const hasHighIssues = result.issues.some(issue => issue.severity === 'HIGH');
    if (hasHighIssues) {
      return SystemHealthStatus.DEGRADED;
    }

    // Check score thresholds
    if (result.score >= 90) {
      return SystemHealthStatus.HEALTHY;
    } else if (result.score >= 70) {
      return SystemHealthStatus.WARNING;
    } else if (result.score >= 50) {
      return SystemHealthStatus.DEGRADED;
    } else {
      return SystemHealthStatus.CRITICAL;
    }
  }

  /**
   * Convert component issues to health issues
   * 
   * @param issues Component issues
   * @returns Array of health issues
   */
  private convertToHealthIssues(issues: string[]): HealthIssue[] {
    return issues.map(issue => ({
      severity: 'MEDIUM' as const,
      category: 'GENERAL',
      description: issue,
      code: 'COMPONENT_ISSUE',
      affectedMetrics: [],
      suggestedActions: ['Investigate issue'],
      timestamp: new Date()
    }));
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.on('component:health-changed', (componentId: string, health: HealthCheckResult) => {
      logger.debug(`🏥 Component health changed: ${componentId} - ${health.status} (${health.score})`);
    });
  }
}

/**
 * Default health monitoring configuration
 */
export const defaultHealthMonitorConfig: HealthMonitorConfig = {
  checkInterval: 30000,        // 30 seconds
  checkTimeout: 10000,         // 10 seconds
  failureThreshold: 3,         // 3 consecutive failures
  recoveryThreshold: 2,        // 2 consecutive successes
  autoRecovery: true,
  recoveryCooldown: 300000,    // 5 minutes
  historyRetention: 100,       // Keep last 100 health checks
  enableAlerts: true,
  alertThresholds: {
    cpu: 80,                   // 80% CPU usage
    memory: 85,                // 85% memory usage
    disk: 90,                  // 90% disk usage
    responseTime: 5000         // 5 second response time
  }
};

// =============================================================================
// SYSTEM HEALTH MONITORING NOTES
// =============================================================================
// 1. Comprehensive component health monitoring with configurable intervals
// 2. System metrics collection and threshold-based alerting
// 3. Health trend analysis and predictive issue detection
// 4. Automatic recovery attempts with cooldown periods
// 5. Health history tracking for performance analysis
// 6. Event-driven health status changes and notifications
// 7. Integration with communication bus for system-wide alerts
// 8. Configurable thresholds and monitoring parameters
// =============================================================================
