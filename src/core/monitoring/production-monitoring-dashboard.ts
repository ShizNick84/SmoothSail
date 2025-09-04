/**
 * =============================================================================
 * PRODUCTION MONITORING DASHBOARD INTEGRATION
 * =============================================================================
 * 
 * This module provides real-time monitoring dashboard integration for production
 * logging and system metrics. It aggregates data from all monitoring sources
 * and provides a unified interface for system health visualization.
 * 
 * Features:
 * - Real-time system metrics aggregation
 * - Performance trend analysis
 * - Alert management and escalation
 * - Health score calculation
 * - Automated reporting
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '../logging/logger';
import { performanceMonitor } from './performance-monitor';
import { SystemMonitor, SystemAlert as InfraSystemAlert, SystemHealthStatus as InfraSystemHealthStatus } from '../../infrastructure/system-monitor';
import { productionLogger, SystemHealthStatus, SystemAlert } from '../logging/production-logger';

/**
 * Dashboard metrics interface
 */
export interface ProductionDashboardMetrics {
  /** System overview */
  system: {
    uptime: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    overallHealth: number;
    lastUpdate: Date;
  };
  /** Performance metrics */
  performance: {
    cpu: {
      usage: number;
      temperature: number;
      frequency: number;
    };
    memory: {
      usage: number;
      total: number;
      available: number;
    };
    disk: {
      usage: number;
      total: number;
      iops: number;
    };
    network: {
      latency: number;
      throughput: number;
      connections: number;
    };
  };
  /** Application metrics */
  application: {
    processId: number;
    memoryUsage: number;
    cpuUsage: number;
    heapUsage: number;
    uptime: number;
  };
  /** Trading metrics */
  trading: {
    activeOrders: number;
    totalTrades: number;
    profitLoss: number;
    apiLatency: number;
    lastTradeTime?: Date;
  };
  /** Alert summary */
  alerts: {
    total: number;
    critical: number;
    warning: number;
    info: number;
    recent: SystemAlert[];
  };
}

/**
 * Performance trend data
 */
export interface PerformanceTrend {
  /** Metric name */
  metric: string;
  /** Time series data */
  data: Array<{
    timestamp: Date;
    value: number;
  }>;
  /** Trend direction */
  trend: 'UP' | 'DOWN' | 'STABLE';
  /** Trend percentage */
  trendPercentage: number;
}

/**
 * System health report
 */
export interface SystemHealthReport {
  /** Report timestamp */
  timestamp: Date;
  /** Overall health score */
  overallHealth: number;
  /** Component health scores */
  components: {
    [key: string]: {
      score: number;
      status: string;
      message: string;
    };
  };
  /** Performance trends */
  trends: PerformanceTrend[];
  /** Active alerts */
  alerts: SystemAlert[];
  /** Recommendations */
  recommendations: string[];
  /** System statistics */
  statistics: {
    totalUptime: number;
    averagePerformance: number;
    alertsGenerated: number;
    systemRestarts: number;
  };
}

/**
 * Production Monitoring Dashboard
 */
export class ProductionMonitoringDashboard extends EventEmitter {
  private systemMonitor: SystemMonitor;
  private isMonitoring: boolean = false;
  private metricsHistory: Map<string, Array<{ timestamp: Date; value: number }>> = new Map();
  private alertHistory: SystemAlert[] = [];
  private dashboardUpdateInterval?: NodeJS.Timeout;
  private reportGenerationInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.systemMonitor = new SystemMonitor();
  }

  /**
   * Start production monitoring dashboard
   */
  public async startMonitoringDashboard(): Promise<void> {
    try {
      logger.info('🚀 Starting production monitoring dashboard...');

      // Start system monitoring
      await this.systemMonitor.startHardwareMonitoring();

      // Start performance monitoring
      await performanceMonitor.startMonitoring(30000); // 30 seconds

      // Start dashboard updates
      this.startDashboardUpdates();

      // Start automated reporting
      this.startAutomatedReporting();

      this.isMonitoring = true;

      logger.info('✅ Production monitoring dashboard started successfully');
      this.emit('dashboard_started');

    } catch (error) {
      logger.error('❌ Failed to start monitoring dashboard', error);
      throw error;
    }
  }

  /**
   * Start dashboard updates
   */
  private startDashboardUpdates(): void {
    this.dashboardUpdateInterval = setInterval(async () => {
      try {
        await this.updateDashboardMetrics();
      } catch (error) {
        logger.error('❌ Dashboard update error', error);
      }
    }, 10000); // Update every 10 seconds

    logger.info('📊 Dashboard updates started (10s interval)');
  }

  /**
   * Start automated reporting
   */
  private startAutomatedReporting(): void {
    this.reportGenerationInterval = setInterval(async () => {
      try {
        await this.generateSystemHealthReport();
      } catch (error) {
        logger.error('❌ Report generation error', error);
      }
    }, 300000); // Generate report every 5 minutes

    logger.info('📋 Automated reporting started (5m interval)');
  }

  /**
   * Update dashboard metrics
   */
  private async updateDashboardMetrics(): Promise<void> {
    try {
      const metrics = await this.collectDashboardMetrics();
      
      // Store metrics in history
      this.storeMetricsHistory(metrics);
      
      // Emit metrics update
      this.emit('metrics_updated', metrics);
      
      // Check for alerts
      await this.processSystemAlerts(metrics);
      
    } catch (error) {
      logger.error('❌ Failed to update dashboard metrics', error);
    }
  }

  /**
   * Collect comprehensive dashboard metrics
   */
  public async collectDashboardMetrics(): Promise<ProductionDashboardMetrics> {
    try {
      // Get system health status
      const infraSystemHealth = await this.systemMonitor.getSystemHealthStatus();
      
      // Get current system metrics
      const systemMetrics = this.systemMonitor.getCurrentMetrics();
      
      // Get performance history
      const performanceHistory = performanceMonitor.getPerformanceHistory();
      
      // Get application metrics
      const appMetrics = this.getApplicationMetrics();
      
      // Get trading metrics (placeholder - would integrate with trading engine)
      const tradingMetrics = this.getTradingMetrics();
      
      // Aggregate alert information
      const alertSummary = this.getAlertSummary(infraSystemHealth.alerts);

      return {
        system: {
          uptime: process.uptime(),
          status: infraSystemHealth.overallHealth >= 80 ? 'HEALTHY' : 
                 systemHealth.overallHealth >= 60 ? 'WARNING' : 'CRITICAL',
          overallHealth: systemHealth.overallHealth,
          lastUpdate: new Date()
        },
        performance: {
          cpu: {
            usage: systemMetrics.cpu?.utilization || 0,
            temperature: systemMetrics.cpu?.temperature || 0,
            frequency: systemMetrics.cpu?.frequency || 0
          },
          memory: {
            usage: systemMetrics.ram?.utilization || 0,
            total: systemMetrics.ram?.total || 0,
            available: systemMetrics.ram?.available || 0
          },
          disk: {
            usage: systemMetrics.ssd?.utilization || 0,
            total: systemMetrics.ssd?.total || 0,
            iops: systemMetrics.ssd?.readIOPS + systemMetrics.ssd?.writeIOPS || 0
          },
          network: {
            latency: 0, // Would be calculated from network metrics
            throughput: 0, // Would be calculated from network metrics
            connections: systemMetrics.network?.interfaces?.filter(i => i.isUp).length || 0
          }
        },
        application: appMetrics,
        trading: tradingMetrics,
        alerts: alertSummary
      };

    } catch (error) {
      logger.error('❌ Failed to collect dashboard metrics', error);
      throw error;
    }
  }

  /**
   * Get application metrics
   */
  private getApplicationMetrics(): ProductionDashboardMetrics['application'] {
    const memUsage = process.memoryUsage();
    
    return {
      processId: process.pid,
      memoryUsage: memUsage.rss,
      cpuUsage: 0, // Would need CPU usage calculation
      heapUsage: memUsage.heapUsed,
      uptime: process.uptime()
    };
  }

  /**
   * Get trading metrics (placeholder)
   */
  private getTradingMetrics(): ProductionDashboardMetrics['trading'] {
    // This would integrate with the actual trading engine
    return {
      activeOrders: 0,
      totalTrades: 0,
      profitLoss: 0,
      apiLatency: 0,
      lastTradeTime: undefined
    };
  }

  /**
   * Get alert summary
   */
  private getAlertSummary(alerts: InfraSystemAlert[]): ProductionDashboardMetrics['alerts'] {
    // Convert infrastructure alerts to production logger format
    const convertedAlerts: SystemAlert[] = alerts.map(alert => ({
      id: alert.id,
      type: this.mapAlertType(alert.type),
      severity: this.mapAlertSeverity(alert.severity),
      message: alert.message,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      isActive: alert.isActive
    }));

    const critical = convertedAlerts.filter(a => a.severity === 'CRITICAL').length;
    const warning = convertedAlerts.filter(a => a.severity === 'WARNING').length;
    const info = convertedAlerts.filter(a => a.severity === 'INFO').length;
    
    // Get recent alerts (last 10)
    const recent = [...convertedAlerts]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      total: convertedAlerts.length,
      critical,
      warning,
      info,
      recent
    };
  }

  /**
   * Map infrastructure alert type to production logger alert type
   */
  private mapAlertType(type: InfraSystemAlert['type']): SystemAlert['type'] {
    switch (type) {
      case 'RAM': return 'MEMORY';
      case 'SSD': return 'DISK';
      case 'THERMAL': return 'CPU'; // Map thermal to CPU as closest match
      default: return type as SystemAlert['type'];
    }
  }

  /**
   * Map infrastructure alert severity to production logger severity
   */
  private mapAlertSeverity(severity: InfraSystemAlert['severity']): SystemAlert['severity'] {
    switch (severity) {
      case 'LOW': return 'INFO';
      case 'MEDIUM': return 'WARNING';
      case 'HIGH': return 'WARNING';
      case 'CRITICAL': return 'CRITICAL';
      default: return 'INFO';
    }
  }

  /**
   * Convert infrastructure SystemHealthStatus to production logger format
   */
  private convertSystemHealth(infraHealth: InfraSystemHealthStatus): SystemHealthStatus {
    return {
      ...infraHealth,
      lastCheck: new Date(), // Add the missing lastCheck field
      alerts: infraHealth.alerts.map(alert => ({
        id: alert.id,
        type: this.mapAlertType(alert.type),
        severity: this.mapAlertSeverity(alert.severity),
        message: alert.message,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
        timestamp: alert.timestamp,
        isActive: alert.isActive
      }))
    };
  }

  /**
   * Store metrics in history
   */
  private storeMetricsHistory(metrics: ProductionDashboardMetrics): void {
    const timestamp = new Date();
    
    // Store key metrics
    this.storeMetricValue('cpu_usage', metrics.performance.cpu.usage, timestamp);
    this.storeMetricValue('memory_usage', metrics.performance.memory.usage, timestamp);
    this.storeMetricValue('disk_usage', metrics.performance.disk.usage, timestamp);
    this.storeMetricValue('cpu_temperature', metrics.performance.cpu.temperature, timestamp);
    this.storeMetricValue('overall_health', metrics.system.overallHealth, timestamp);
    this.storeMetricValue('application_memory', metrics.application.memoryUsage, timestamp);
  }

  /**
   * Store individual metric value
   */
  private storeMetricValue(metric: string, value: number, timestamp: Date): void {
    const history = this.metricsHistory.get(metric) || [];
    
    history.push({ timestamp, value });
    
    // Keep only last 100 values (about 16 minutes at 10s intervals)
    if (history.length > 100) {
      history.shift();
    }
    
    this.metricsHistory.set(metric, history);
  }

  /**
   * Process system alerts
   */
  private async processSystemAlerts(metrics: ProductionDashboardMetrics): Promise<void> {
    try {
      // Check for new critical conditions
      const newAlerts: SystemAlert[] = [];
      
      // CPU usage alert
      if (metrics.performance.cpu.usage > 85) {
        newAlerts.push({
          id: `cpu_critical_${Date.now()}`,
          type: 'CPU',
          severity: 'CRITICAL',
          message: `CPU usage critical: ${metrics.performance.cpu.usage}%`,
          currentValue: metrics.performance.cpu.usage,
          threshold: 85,
          timestamp: new Date(),
          isActive: true
        });
      }
      
      // Memory usage alert
      if (metrics.performance.memory.usage > 90) {
        newAlerts.push({
          id: `memory_critical_${Date.now()}`,
          type: 'RAM',
          severity: 'CRITICAL',
          message: `Memory usage critical: ${metrics.performance.memory.usage}%`,
          currentValue: metrics.performance.memory.usage,
          threshold: 90,
          timestamp: new Date(),
          isActive: true
        });
      }
      
      // Disk usage alert
      if (metrics.performance.disk.usage > 95) {
        newAlerts.push({
          id: `disk_critical_${Date.now()}`,
          type: 'SSD',
          severity: 'CRITICAL',
          message: `Disk usage critical: ${metrics.performance.disk.usage}%`,
          currentValue: metrics.performance.disk.usage,
          threshold: 95,
          timestamp: new Date(),
          isActive: true
        });
      }
      
      // Process new alerts
      for (const alert of newAlerts) {
        await this.processNewAlert(alert);
      }
      
    } catch (error) {
      logger.error('❌ Failed to process system alerts', error);
    }
  }

  /**
   * Process new alert
   */
  private async processNewAlert(alert: SystemAlert): Promise<void> {
    // Add to alert history
    this.alertHistory.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift();
    }
    
    // Log the alert
    if (alert.severity === 'CRITICAL') {
      logger.error(`🚨 CRITICAL ALERT: ${alert.message}`, {
        type: alert.type,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
    } else {
      logger.warn(`⚠️ ${alert.severity} ALERT: ${alert.message}`, {
        type: alert.type,
        currentValue: alert.currentValue,
        threshold: alert.threshold
      });
    }
    
    // Emit alert event
    this.emit('alert_generated', alert);
  }

  /**
   * Generate system health report
   */
  public async generateSystemHealthReport(): Promise<SystemHealthReport> {
    try {
      const metrics = await this.collectDashboardMetrics();
      const infraSystemHealth = await this.systemMonitor.getSystemHealthStatus();
      
      // Calculate performance trends
      const trends = this.calculatePerformanceTrends();
      
      // Convert infrastructure system health to production format
      const systemHealth = this.convertSystemHealth(infraSystemHealth);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, systemHealth);
      
      const report: SystemHealthReport = {
        timestamp: new Date(),
        overallHealth: metrics.system.overallHealth,
        components: {
          cpu: {
            score: infraSystemHealth.components.cpu.score,
            status: infraSystemHealth.components.cpu.status,
            message: infraSystemHealth.components.cpu.message
          },
          memory: {
            score: systemHealth.components.ram.score,
            status: systemHealth.components.ram.status,
            message: systemHealth.components.ram.message
          },
          disk: {
            score: systemHealth.components.ssd.score,
            status: systemHealth.components.ssd.status,
            message: systemHealth.components.ssd.message
          },
          network: {
            score: systemHealth.components.network.score,
            status: systemHealth.components.network.status,
            message: systemHealth.components.network.message
          }
        },
        trends,
        alerts: systemHealth.alerts,
        recommendations,
        statistics: {
          totalUptime: process.uptime(),
          averagePerformance: this.calculateAveragePerformance(),
          alertsGenerated: this.alertHistory.length,
          systemRestarts: 0 // Would track actual restarts
        }
      };
      
      // Log the report
      logger.info('📋 System health report generated', {
        overallHealth: report.overallHealth,
        activeAlerts: report.alerts.length,
        recommendations: report.recommendations.length
      });
      
      // Emit report event
      this.emit('health_report_generated', report);
      
      return report;
      
    } catch (error) {
      logger.error('❌ Failed to generate system health report', error);
      throw error;
    }
  }

  /**
   * Calculate performance trends
   */
  private calculatePerformanceTrends(): PerformanceTrend[] {
    const trends: PerformanceTrend[] = [];
    
    for (const [metric, history] of this.metricsHistory.entries()) {
      if (history.length < 2) continue;
      
      const recent = history.slice(-10); // Last 10 values
      const older = history.slice(-20, -10); // Previous 10 values
      
      if (recent.length === 0 || older.length === 0) continue;
      
      const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
      const olderAvg = older.reduce((sum, item) => sum + item.value, 0) / older.length;
      
      const trendPercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      let trend: 'UP' | 'DOWN' | 'STABLE';
      if (Math.abs(trendPercentage) < 5) {
        trend = 'STABLE';
      } else if (trendPercentage > 0) {
        trend = 'UP';
      } else {
        trend = 'DOWN';
      }
      
      trends.push({
        metric,
        data: history.slice(-50), // Last 50 data points
        trend,
        trendPercentage: Math.round(trendPercentage * 100) / 100
      });
    }
    
    return trends;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    metrics: ProductionDashboardMetrics, 
    systemHealth: SystemHealthStatus
  ): string[] {
    const recommendations: string[] = [];
    
    // CPU recommendations
    if (metrics.performance.cpu.usage > 80) {
      recommendations.push('Consider reducing CPU-intensive operations or upgrading hardware');
    }
    
    if (metrics.performance.cpu.temperature > 75) {
      recommendations.push('Check system cooling and ensure proper ventilation');
    }
    
    // Memory recommendations
    if (metrics.performance.memory.usage > 85) {
      recommendations.push('Consider freeing up memory or adding more RAM');
    }
    
    // Disk recommendations
    if (metrics.performance.disk.usage > 90) {
      recommendations.push('Clean up disk space immediately to prevent system issues');
    }
    
    // Application recommendations
    if (metrics.application.memoryUsage > 1024 * 1024 * 1024) { // 1GB
      recommendations.push('Application memory usage is high, consider optimization');
    }
    
    // Alert-based recommendations
    if (metrics.alerts.critical > 0) {
      recommendations.push('Address critical alerts immediately to prevent system failure');
    }
    
    return recommendations;
  }

  /**
   * Calculate average performance
   */
  private calculateAveragePerformance(): number {
    const healthHistory = this.metricsHistory.get('overall_health') || [];
    
    if (healthHistory.length === 0) return 0;
    
    const sum = healthHistory.reduce((total, item) => total + item.value, 0);
    return Math.round(sum / healthHistory.length);
  }

  /**
   * Get dashboard status
   */
  public getDashboardStatus(): {
    isMonitoring: boolean;
    metricsCount: number;
    alertsCount: number;
    lastUpdate: Date | null;
    uptime: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      metricsCount: this.metricsHistory.size,
      alertsCount: this.alertHistory.length,
      lastUpdate: null, // Would track last update time
      uptime: process.uptime()
    };
  }

  /**
   * Stop monitoring dashboard
   */
  public stopMonitoringDashboard(): void {
    if (this.dashboardUpdateInterval) {
      clearInterval(this.dashboardUpdateInterval);
      this.dashboardUpdateInterval = undefined;
    }
    
    if (this.reportGenerationInterval) {
      clearInterval(this.reportGenerationInterval);
      this.reportGenerationInterval = undefined;
    }
    
    this.systemMonitor.stopHardwareMonitoring();
    performanceMonitor.stopMonitoring();
    
    this.isMonitoring = false;
    
    logger.info('🛑 Production monitoring dashboard stopped');
    this.emit('dashboard_stopped');
  }
}

// Create and export singleton instance
export const productionMonitoringDashboard = new ProductionMonitoringDashboard();

// Export types
export type { 
  ProductionDashboardMetrics, 
  PerformanceTrend, 
  SystemHealthReport 
};