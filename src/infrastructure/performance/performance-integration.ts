/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - PERFORMANCE OPTIMIZATION INTEGRATION
 * =============================================================================
 * 
 * This module provides integration between the performance optimization system
 * and the main trading application. It ensures optimal system performance
 * for 24/7 trading operations on Intel NUC hardware.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { PerformanceOptimizer, SystemPerformanceMetrics, SystemPerformanceAlert } from './performance-optimizer';

/**
 * Performance Integration Manager
 * Integrates performance optimization with the main trading application
 */
export class PerformanceIntegration {
  private performanceOptimizer: PerformanceOptimizer;
  private isInitialized = false;

  constructor() {
    // Initialize with Intel NUC optimized configuration
    this.performanceOptimizer = new PerformanceOptimizer({
      enableMemoryOptimization: true,
      enableDiskOptimization: true,
      enableCPUOptimization: true,
      systemMonitoringIntervalMs: 30000, // 30 seconds
      reportingIntervalMs: 300000, // 5 minutes
      enableAutoOptimization: true,
      performanceAlertThreshold: 70,
      criticalPerformanceThreshold: 85
    });

    this.setupEventHandlers();
  }

  /**
   * Initialize performance optimization
   */
  public async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing Intel NUC performance optimization...');

      await this.performanceOptimizer.startOptimization();
      this.isInitialized = true;

      logger.info('✅ Performance optimization initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize performance optimization:', error);
      throw error;
    }
  }

  /**
   * Shutdown performance optimization
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('🛑 Shutting down performance optimization...');

      this.performanceOptimizer.stopOptimization();
      this.isInitialized = false;

      logger.info('✅ Performance optimization shutdown complete');

    } catch (error) {
      logger.error('❌ Error during performance optimization shutdown:', error);
    }
  }

  /**
   * Setup event handlers for performance optimization
   */
  private setupEventHandlers(): void {
    // Handle system alerts
    this.performanceOptimizer.on('systemAlert', (alert: SystemPerformanceAlert) => {
      this.handleSystemAlert(alert);
    });

    // Handle emergency actions
    this.performanceOptimizer.on('emergencyAction', (action: any) => {
      this.handleEmergencyAction(action);
    });

    // Handle performance reports
    this.performanceOptimizer.on('performanceReport', (report: any) => {
      this.handlePerformanceReport(report);
    });

    // Handle metrics updates
    this.performanceOptimizer.on('metricsUpdated', (metrics: SystemPerformanceMetrics) => {
      this.handleMetricsUpdate(metrics);
    });
  }

  /**
   * Handle system performance alerts
   */
  private handleSystemAlert(alert: SystemPerformanceAlert): void {
    logger.warn(`🚨 System Performance Alert: ${alert.message}`, {
      component: 'PerformanceIntegration',
      alertType: alert.type,
      severity: alert.severity,
      affectedComponents: alert.affectedComponents,
      currentScore: alert.currentScore
    });

    // Send notifications for critical alerts
    if (alert.severity === 'CRITICAL') {
      this.sendCriticalAlert(alert);
    }
  }

  /**
   * Handle emergency actions
   */
  private handleEmergencyAction(action: any): void {
    logger.warn(`🚨 Emergency Action Triggered: ${action.component} - ${action.action}`, {
      component: 'PerformanceIntegration',
      emergencyAction: action
    });

    // Could trigger additional emergency procedures here
    // such as reducing trading activity, sending notifications, etc.
  }

  /**
   * Handle performance reports
   */
  private handlePerformanceReport(report: any): void {
    logger.info('📈 Performance Report Generated', {
      component: 'PerformanceIntegration',
      reportId: report.id,
      averageHealthScore: report.summary.averageHealthScore,
      totalAlerts: report.summary.totalAlerts
    });

    // Could store reports in database or send to monitoring systems
  }

  /**
   * Handle metrics updates
   */
  private handleMetricsUpdate(metrics: SystemPerformanceMetrics): void {
    // Log critical performance issues
    if (metrics.performanceLevel === 'CRITICAL') {
      logger.warn('🚨 Critical system performance detected', {
        component: 'PerformanceIntegration',
        healthScore: metrics.overallHealthScore,
        performanceLevel: metrics.performanceLevel,
        activeAlerts: metrics.activeAlertsCount
      });
    }
  }

  /**
   * Send critical alert notifications
   */
  private async sendCriticalAlert(alert: SystemPerformanceAlert): Promise<void> {
    try {
      // This would integrate with the notification system
      // to send Telegram/email alerts for critical performance issues
      
      logger.info('📢 Sending critical performance alert notification...', {
        alertId: alert.id,
        message: alert.message,
        severity: alert.severity
      });

    } catch (error) {
      logger.error('❌ Failed to send critical alert notification:', error);
    }
  }

  /**
   * Get current system performance metrics
   */
  public getCurrentMetrics(): SystemPerformanceMetrics | null {
    return this.performanceOptimizer.getCurrentMetrics();
  }

  /**
   * Get system performance status
   */
  public getStatus(): {
    isInitialized: boolean;
    isOptimizing: boolean;
    currentMetrics: SystemPerformanceMetrics | null;
    activeAlerts: number;
  } {
    const optimizerStatus = this.performanceOptimizer.getStatus();
    
    return {
      isInitialized: this.isInitialized,
      isOptimizing: optimizerStatus.isOptimizing,
      currentMetrics: optimizerStatus.currentMetrics,
      activeAlerts: optimizerStatus.activeAlerts
    };
  }

  /**
   * Force system optimization
   */
  public async forceOptimization(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Performance optimization not initialized');
    }

    await this.performanceOptimizer.forceSystemOptimization();
  }

  /**
   * Health check for performance optimization
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    score: number;
    details: any;
    lastCheck: Date;
    issues: string[];
    recommendations: string[];
  }> {
    const metrics = this.getCurrentMetrics();
    const status = this.getStatus();

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!status.isInitialized) {
      issues.push('Performance optimization not initialized');
      recommendations.push('Initialize performance optimization system');
    }

    if (metrics && metrics.performanceLevel === 'CRITICAL') {
      issues.push(`Critical system performance: ${metrics.overallHealthScore}% health score`);
      recommendations.push('Immediate system optimization required');
    }

    if (status.activeAlerts > 5) {
      issues.push(`High number of active alerts: ${status.activeAlerts}`);
      recommendations.push('Review and resolve active performance alerts');
    }

    const healthy = issues.length === 0 && status.isInitialized;
    const score = metrics ? metrics.overallHealthScore : (healthy ? 100 : 0);

    return {
      healthy,
      score,
      details: {
        isInitialized: status.isInitialized,
        isOptimizing: status.isOptimizing,
        performanceLevel: metrics?.performanceLevel || 'UNKNOWN',
        activeAlerts: status.activeAlerts,
        memoryUtilization: metrics?.memory?.systemUtilization || 0,
        diskUtilization: metrics?.disk?.utilization || 0,
        cpuUtilization: metrics?.cpu?.overallUtilization || 0
      },
      lastCheck: new Date(),
      issues,
      recommendations
    };
  }
}