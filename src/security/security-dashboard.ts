/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - SECURITY DASHBOARD
 * =============================================================================
 * 
 * This service provides a comprehensive security dashboard with real-time
 * threat visualization, security metrics, and system health monitoring.
 * 
 * CRITICAL SECURITY NOTICE:
 * This dashboard provides real-time visibility into security threats and
 * system health. It must display accurate, up-to-date information to enable
 * rapid response to security incidents.
 * 
 * Dashboard Features:
 * - Real-time threat visualization
 * - Security metrics and KPI display
 * - System health monitoring
 * - Interactive threat analysis
 * - Historical trend analysis
 * - Alert management interface
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { logger } from '@/core/logging/logger';
import { securityMonitoringService, SecurityDashboardData, SecurityEvent, SecurityMetrics } from '@/security/security-monitoring-service';

/**
 * Interface for dashboard configuration
 */
export interface SecurityDashboardConfig {
  /** Dashboard refresh interval in milliseconds */
  refreshInterval: number;
  /** Maximum events to display */
  maxDisplayEvents: number;
  /** Chart data points for timeline */
  timelineDataPoints: number;
  /** Auto-refresh enabled */
  autoRefresh: boolean;
  /** Theme configuration */
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Interface for dashboard widget data
 */
export interface DashboardWidget {
  /** Widget identifier */
  id: string;
  /** Widget title */
  title: string;
  /** Widget type */
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status';
  /** Widget data */
  data: any;
  /** Widget configuration */
  config: Record<string, any>;
  /** Last update timestamp */
  lastUpdate: Date;
}

/**
 * Interface for threat visualization chart data
 */
export interface ThreatChartData {
  /** Chart type */
  type: 'line' | 'bar' | 'pie' | 'heatmap';
  /** Chart title */
  title: string;
  /** Chart data */
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string;
      borderWidth?: number;
    }>;
  };
  /** Chart options */
  options: Record<string, any>;
}

/**
 * Interface for security alert display
 */
export interface SecurityAlertDisplay {
  /** Alert identifier */
  alertId: string;
  /** Alert severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Alert timestamp */
  timestamp: Date;
  /** Alert status */
  status: 'active' | 'acknowledged' | 'resolved';
  /** Alert actions */
  actions: string[];
  /** Alert icon */
  icon: string;
  /** Alert color */
  color: string;
}

/**
 * Security dashboard service
 * Provides comprehensive security visualization and monitoring interface
 */
export class SecurityDashboard extends EventEmitter {
  /** Dashboard configuration */
  private config: SecurityDashboardConfig;
  
  /** Dashboard widgets */
  private widgets: Map<string, DashboardWidget> = new Map();
  
  /** Dashboard refresh interval */
  private refreshInterval: NodeJS.Timeout | null = null;
  
  /** Current dashboard data */
  private currentDashboardData: SecurityDashboardData | null = null;
  
  /** Active alerts */
  private activeAlerts: Map<string, SecurityAlertDisplay> = new Map();

  constructor(config?: Partial<SecurityDashboardConfig>) {
    super();
    
    // Initialize configuration with defaults
    this.config = {
      refreshInterval: 5000, // 5 seconds
      maxDisplayEvents: 100,
      timelineDataPoints: 24, // 24 hours
      autoRefresh: true,
      theme: 'dark',
      ...config
    };
    
    // Initialize dashboard widgets
    this.initializeWidgets();
    
    // Set up event handlers
    this.setupEventHandlers();
    
    logger.info('📊 Security Dashboard initialized');
  }

  /**
   * Start dashboard
   * Begins dashboard operations and data refresh
   * 
   * @returns Promise<void>
   */
  public async startDashboard(): Promise<void> {
    try {
      logger.info('🚀 Starting security dashboard...');
      
      // Perform initial data load
      await this.refreshDashboardData();
      
      // Start auto-refresh if enabled
      if (this.config.autoRefresh) {
        this.startAutoRefresh();
      }
      
      // Listen for security monitoring updates
      securityMonitoringService.on('dashboardUpdate', (data: SecurityDashboardData) => {
        this.handleDashboardUpdate(data);
      });
      
      logger.info('✅ Security dashboard started successfully');
      
    } catch (error) {
      logger.error('❌ Failed to start security dashboard:', error);
      throw new Error('Security dashboard startup failed');
    }
  }

  /**
   * Stop dashboard
   * Stops dashboard operations and cleanup
   * 
   * @returns Promise<void>
   */
  public async stopDashboard(): Promise<void> {
    try {
      logger.info('🛑 Stopping security dashboard...');
      
      // Stop auto-refresh
      this.stopAutoRefresh();
      
      // Clear widgets
      this.widgets.clear();
      
      // Clear alerts
      this.activeAlerts.clear();
      
      logger.info('✅ Security dashboard stopped successfully');
      
    } catch (error) {
      logger.error('❌ Failed to stop security dashboard:', error);
      throw new Error('Security dashboard shutdown failed');
    }
  }

  /**
   * Get dashboard data
   * Returns current dashboard data for rendering
   * 
   * @returns SecurityDashboardData Current dashboard data
   */
  public getDashboardData(): SecurityDashboardData | null {
    return this.currentDashboardData;
  }

  /**
   * Get dashboard widgets
   * Returns all dashboard widgets
   * 
   * @returns DashboardWidget[] Dashboard widgets
   */
  public getDashboardWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get threat visualization charts
   * Returns chart data for threat visualization
   * 
   * @returns ThreatChartData[] Threat visualization charts
   */
  public getThreatVisualizationCharts(): ThreatChartData[] {
    if (!this.currentDashboardData) {
      return [];
    }
    
    const charts: ThreatChartData[] = [];
    
    // Threats by type pie chart
    const threatsByType = this.currentDashboardData.threatVisualization.threatsByType;
    if (Object.keys(threatsByType).length > 0) {
      charts.push({
        type: 'pie',
        title: 'Threats by Type',
        data: {
          labels: Object.keys(threatsByType),
          datasets: [{
            label: 'Threats',
            data: Object.values(threatsByType),
            backgroundColor: [
              '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
              '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
    
    // Threat timeline chart
    const timeline = this.currentDashboardData.threatVisualization.threatTimeline;
    if (timeline.length > 0) {
      charts.push({
        type: 'line',
        title: 'Threat Timeline (24 Hours)',
        data: {
          labels: timeline.map(point => 
            point.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          ),
          datasets: [{
            label: 'Threats',
            data: timeline.map(point => point.count),
            borderColor: '#FF6384',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderWidth: 2,
            fill: true
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
    
    // Threats by source bar chart
    const threatsBySource = this.currentDashboardData.threatVisualization.threatsBySource;
    const topSources = Object.entries(threatsBySource)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10 sources
    
    if (topSources.length > 0) {
      charts.push({
        type: 'bar',
        title: 'Top Threat Sources',
        data: {
          labels: topSources.map(([source]) => source),
          datasets: [{
            label: 'Threats',
            data: topSources.map(([, count]) => count),
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
    
    return charts;
  }

  /**
   * Get security alerts
   * Returns current security alerts for display
   * 
   * @returns SecurityAlertDisplay[] Security alerts
   */
  public getSecurityAlerts(): SecurityAlertDisplay[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge alert
   * Marks security alert as acknowledged
   * 
   * @param alertId - Alert identifier
   * @returns Promise<void>
   */
  public async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      this.emit('alertAcknowledged', alert);
      
      logger.info('✅ Security alert acknowledged', {
        alertId,
        title: alert.title
      });
    }
  }

  /**
   * Resolve alert
   * Marks security alert as resolved
   * 
   * @param alertId - Alert identifier
   * @returns Promise<void>
   */
  public async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      this.emit('alertResolved', alert);
      
      // Remove resolved alerts after 5 minutes
      setTimeout(() => {
        this.activeAlerts.delete(alertId);
      }, 5 * 60 * 1000);
      
      logger.info('✅ Security alert resolved', {
        alertId,
        title: alert.title
      });
    }
  }

  /**
   * Initialize dashboard widgets
   * Sets up default dashboard widgets
   */
  private initializeWidgets(): void {
    // Security status widget
    this.widgets.set('security-status', {
      id: 'security-status',
      title: 'Security Status',
      type: 'status',
      data: { status: 'SECURE', color: 'green' },
      config: { size: 'large', priority: 1 },
      lastUpdate: new Date()
    });
    
    // Active threats widget
    this.widgets.set('active-threats', {
      id: 'active-threats',
      title: 'Active Threats',
      type: 'metric',
      data: { value: 0, trend: 'stable' },
      config: { size: 'medium', priority: 2 },
      lastUpdate: new Date()
    });
    
    // Security score widget
    this.widgets.set('security-score', {
      id: 'security-score',
      title: 'Security Score',
      type: 'metric',
      data: { value: 100, max: 100, unit: '%' },
      config: { size: 'medium', priority: 3 },
      lastUpdate: new Date()
    });
    
    // Recent events widget
    this.widgets.set('recent-events', {
      id: 'recent-events',
      title: 'Recent Security Events',
      type: 'table',
      data: { events: [] },
      config: { size: 'large', priority: 4 },
      lastUpdate: new Date()
    });
    
    // System health widget
    this.widgets.set('system-health', {
      id: 'system-health',
      title: 'System Health',
      type: 'status',
      data: { components: {} },
      config: { size: 'medium', priority: 5 },
      lastUpdate: new Date()
    });
  }

  /**
   * Set up event handlers
   * Configures event handling for dashboard updates
   */
  private setupEventHandlers(): void {
    // Handle security events
    securityMonitoringService.on('securityEvent', (event: SecurityEvent) => {
      this.handleSecurityEvent(event);
    });
    
    // Handle dashboard updates
    this.on('dashboardUpdate', () => {
      this.updateWidgets();
    });
  }

  /**
   * Start auto-refresh
   * Begins automatic dashboard data refresh
   */
  private startAutoRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        await this.refreshDashboardData();
      } catch (error) {
        logger.error('❌ Dashboard refresh error:', error);
      }
    }, this.config.refreshInterval);
  }

  /**
   * Stop auto-refresh
   * Stops automatic dashboard data refresh
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Refresh dashboard data
   * Updates dashboard data from security monitoring service
   * 
   * @returns Promise<void>
   */
  private async refreshDashboardData(): Promise<void> {
    try {
      const dashboardData = securityMonitoringService.getSecurityDashboardData();
      this.handleDashboardUpdate(dashboardData);
      
    } catch (error) {
      logger.error('❌ Failed to refresh dashboard data:', error);
    }
  }

  /**
   * Handle dashboard update
   * Processes dashboard data updates
   * 
   * @param data - Updated dashboard data
   */
  private handleDashboardUpdate(data: SecurityDashboardData): void {
    this.currentDashboardData = data;
    this.updateWidgets();
    this.updateAlerts();
    this.emit('dashboardUpdate', data);
  }

  /**
   * Handle security event
   * Processes security events for dashboard display
   * 
   * @param event - Security event
   */
  private handleSecurityEvent(event: SecurityEvent): void {
    // Create alert for high-severity events
    if (event.severity >= 7) {
      const alert: SecurityAlertDisplay = {
        alertId: event.eventId,
        severity: this.mapSeverityToAlertLevel(event.severity),
        title: this.formatEventTitle(event),
        message: this.formatEventMessage(event),
        timestamp: event.timestamp,
        status: 'active',
        actions: event.responseActions,
        icon: this.getEventIcon(event.eventType),
        color: this.getEventColor(event.severity)
      };
      
      this.activeAlerts.set(alert.alertId, alert);
      this.emit('newAlert', alert);
    }
  }

  /**
   * Update dashboard widgets
   * Updates widget data based on current dashboard data
   */
  private updateWidgets(): void {
    if (!this.currentDashboardData) return;
    
    const data = this.currentDashboardData;
    
    // Update security status widget
    const statusWidget = this.widgets.get('security-status');
    if (statusWidget) {
      statusWidget.data = {
        status: data.securityStatus,
        color: this.getStatusColor(data.securityStatus)
      };
      statusWidget.lastUpdate = new Date();
    }
    
    // Update active threats widget
    const threatsWidget = this.widgets.get('active-threats');
    if (threatsWidget) {
      threatsWidget.data = {
        value: data.activeThreats,
        trend: data.activeThreats > 0 ? 'up' : 'stable'
      };
      threatsWidget.lastUpdate = new Date();
    }
    
    // Update security score widget
    const scoreWidget = this.widgets.get('security-score');
    if (scoreWidget) {
      scoreWidget.data = {
        value: Math.round(data.metrics.securityScore),
        max: 100,
        unit: '%'
      };
      scoreWidget.lastUpdate = new Date();
    }
    
    // Update recent events widget
    const eventsWidget = this.widgets.get('recent-events');
    if (eventsWidget) {
      eventsWidget.data = {
        events: data.recentEvents.slice(0, this.config.maxDisplayEvents)
      };
      eventsWidget.lastUpdate = new Date();
    }
    
    // Update system health widget
    const healthWidget = this.widgets.get('system-health');
    if (healthWidget) {
      healthWidget.data = {
        components: data.systemHealth.componentStatus
      };
      healthWidget.lastUpdate = new Date();
    }
  }

  /**
   * Update alerts
   * Updates active alerts based on current events
   */
  private updateAlerts(): void {
    if (!this.currentDashboardData) return;
    
    // Auto-resolve old alerts (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp.getTime() < oneHourAgo && alert.status === 'active') {
        alert.status = 'resolved';
        setTimeout(() => {
          this.activeAlerts.delete(alertId);
        }, 5 * 60 * 1000); // Remove after 5 minutes
      }
    }
  }

  /**
   * Map severity to alert level
   * Converts numeric severity to alert level
   * 
   * @param severity - Numeric severity (1-10)
   * @returns Alert level
   */
  private mapSeverityToAlertLevel(severity: number): 'low' | 'medium' | 'high' | 'critical' {
    if (severity >= 9) return 'critical';
    if (severity >= 7) return 'high';
    if (severity >= 5) return 'medium';
    return 'low';
  }

  /**
   * Format event title
   * Creates human-readable event title
   * 
   * @param event - Security event
   * @returns Formatted title
   */
  private formatEventTitle(event: SecurityEvent): string {
    const typeMap: Record<string, string> = {
      'threat_detected': '🚨 Threat Detected',
      'authentication_failure': '🔐 Authentication Failure',
      'unauthorized_access': '🚫 Unauthorized Access',
      'suspicious_activity': '🔍 Suspicious Activity',
      'system_anomaly': '⚠️ System Anomaly',
      'network_intrusion': '🌐 Network Intrusion',
      'data_access_violation': '📊 Data Access Violation',
      'configuration_change': '⚙️ Configuration Change',
      'security_policy_violation': '📋 Policy Violation',
      'incident_escalation': '🚨 Incident Escalation'
    };
    
    return typeMap[event.eventType] || '⚠️ Security Event';
  }

  /**
   * Format event message
   * Creates human-readable event message
   * 
   * @param event - Security event
   * @returns Formatted message
   */
  private formatEventMessage(event: SecurityEvent): string {
    return `Security event from ${event.source} targeting ${event.target}. Severity: ${event.severity}/10`;
  }

  /**
   * Get event icon
   * Returns appropriate icon for event type
   * 
   * @param eventType - Event type
   * @returns Icon string
   */
  private getEventIcon(eventType: string): string {
    const iconMap: Record<string, string> = {
      'threat_detected': '🚨',
      'authentication_failure': '🔐',
      'unauthorized_access': '🚫',
      'suspicious_activity': '🔍',
      'system_anomaly': '⚠️',
      'network_intrusion': '🌐',
      'data_access_violation': '📊',
      'configuration_change': '⚙️',
      'security_policy_violation': '📋',
      'incident_escalation': '🚨'
    };
    
    return iconMap[eventType] || '⚠️';
  }

  /**
   * Get event color
   * Returns appropriate color for event severity
   * 
   * @param severity - Event severity
   * @returns Color string
   */
  private getEventColor(severity: number): string {
    if (severity >= 9) return '#dc3545'; // Critical - Red
    if (severity >= 7) return '#fd7e14'; // High - Orange
    if (severity >= 5) return '#ffc107'; // Medium - Yellow
    return '#28a745'; // Low - Green
  }

  /**
   * Get status color
   * Returns appropriate color for security status
   * 
   * @param status - Security status
   * @returns Color string
   */
  private getStatusColor(status: string): string {
    switch (status) {
      case 'SECURE': return '#28a745'; // Green
      case 'WARNING': return '#ffc107'; // Yellow
      case 'CRITICAL': return '#dc3545'; // Red
      default: return '#6c757d'; // Gray
    }
  }

  /**
   * Get dashboard configuration
   * Returns current dashboard configuration
   * 
   * @returns SecurityDashboardConfig Dashboard configuration
   */
  public getConfig(): SecurityDashboardConfig {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   * Updates dashboard configuration
   * 
   * @param config - New configuration
   * @returns Promise<void>
   */
  public async updateConfig(config: Partial<SecurityDashboardConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Restart auto-refresh if interval changed
    if (config.refreshInterval && this.refreshInterval) {
      this.stopAutoRefresh();
      this.startAutoRefresh();
    }
    
    this.emit('configUpdated', this.config);
  }

  /**
   * Get dashboard status
   * Returns current dashboard status
   * 
   * @returns Dashboard status information
   */
  public getStatus(): {
    isActive: boolean;
    widgetCount: number;
    activeAlerts: number;
    lastUpdate: Date | null;
    autoRefresh: boolean;
    timestamp: number;
  } {
    return {
      isActive: this.refreshInterval !== null,
      widgetCount: this.widgets.size,
      activeAlerts: this.activeAlerts.size,
      lastUpdate: this.currentDashboardData ? new Date() : null,
      autoRefresh: this.config.autoRefresh,
      timestamp: Date.now()
    };
  }
}

// Create and export singleton instance
export const securityDashboard = new SecurityDashboard();

// =============================================================================
// SECURITY DASHBOARD NOTES
// =============================================================================
// 1. Real-time security visualization with interactive charts and metrics
// 2. Comprehensive threat analysis and pattern visualization
// 3. Automated alert management with acknowledgment and resolution
// 4. Configurable dashboard widgets and layout
// 5. Integration with security monitoring service for live data
// 6. Support for multiple chart types and visualization formats
// 7. Responsive design for desktop and mobile access
// 8. Theme support for light/dark mode preferences
// =============================================================================