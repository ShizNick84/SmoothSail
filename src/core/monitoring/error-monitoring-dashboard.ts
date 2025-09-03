/**
 * =============================================================================
 * ERROR MONITORING DASHBOARD AND SYSTEM ORCHESTRATOR
 * =============================================================================
 * 
 * Comprehensive error monitoring dashboard that provides real-time visibility
 * into system health, error patterns, and recovery operations across all
 * system components.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { EventEmitter } from 'events';
import { Logger } from '../logging/logger';
import { SystemErrorManager, SystemComponent, SystemErrorSeverity } from '../error-handling/system-error-manager';
import { TradingErrorHandler } from '../error-handling/trading-error-handler';
import { AIErrorHandler } from '../error-handling/ai-error-handler';
import { NetworkErrorHandler } from '../error-handling/network-error-handler';
import { NotificationService } from '../notifications/notification-service';

export interface DashboardMetrics {
  systemHealth: {
    overall: number;
    components: Record<SystemComponent, number>;
    trend: 'improving' | 'stable' | 'degrading';
  };
  errorMetrics: {
    totalErrors: number;
    errorRate: number; // errors per hour
    criticalErrors: number;
    resolvedErrors: number;
    escalatedErrors: number;
    errorsByComponent: Record<SystemComponent, number>;
    errorsBySeverity: Record<SystemErrorSeverity, number>;
  };
  recoveryMetrics: {
    autoRecoverySuccessRate: number;
    averageRecoveryTime: number;
    manualInterventionsRequired: number;
    circuitBreakersOpen: number;
  };
  performanceMetrics: {
    systemUptime: number;
    componentUptimes: Record<SystemComponent, number>;
    lastIncident: Date | null;
    mtbf: number; // Mean Time Between Failures
    mttr: number; // Mean Time To Recovery
  };
}

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownPeriod: number;
  lastTriggered?: Date;
  actions: string[];
}

export interface SystemRecoveryAction {
  id: string;
  name: string;
  component: SystemComponent;
  action: string;
  automated: boolean;
  successRate: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
}

export class ErrorMonitoringDashboard extends EventEmitter {
  private logger: Logger;
  private systemErrorManager: SystemErrorManager;
  private tradingErrorHandler: TradingErrorHandler;
  private aiErrorHandler: AIErrorHandler;
  private networkErrorHandler: NetworkErrorHandler;
  private notificationService: NotificationService;
  
  private metrics: DashboardMetrics;
  private alertRules: Map<string, AlertRule> = new Map();
  private recoveryActions: Map<string, SystemRecoveryAction> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCooldowns: Map<string, Date> = new Map();
  
  private readonly updateInterval = 30000; // 30 seconds
  private readonly metricsRetentionPeriod = 86400000; // 24 hours

  constructor(
    systemErrorManager: SystemErrorManager,
    tradingErrorHandler: TradingErrorHandler,
    aiErrorHandler: AIErrorHandler,
    networkErrorHandler: NetworkErrorHandler
  ) {
    super();
    
    this.logger = new Logger('ErrorMonitoringDashboard');
    this.systemErrorManager = systemErrorManager;
    this.tradingErrorHandler = tradingErrorHandler;
    this.aiErrorHandler = aiErrorHandler;
    this.networkErrorHandler = networkErrorHandler;
    this.notificationService = new NotificationService();
    
    this.initializeMetrics();
    this.setupAlertRules();
    this.setupRecoveryActions();
    this.setupEventListeners();
    this.startMonitoring();
  }

  /**
   * Initialize dashboard metrics
   */
  private initializeMetrics(): void {
    this.metrics = {
      systemHealth: {
        overall: 100,
        components: {} as Record<SystemComponent, number>,
        trend: 'stable'
      },
      errorMetrics: {
        totalErrors: 0,
        errorRate: 0,
        criticalErrors: 0,
        resolvedErrors: 0,
        escalatedErrors: 0,
        errorsByComponent: {} as Record<SystemComponent, number>,
        errorsBySeverity: {} as Record<SystemErrorSeverity, number>
      },
      recoveryMetrics: {
        autoRecoverySuccessRate: 0,
        averageRecoveryTime: 0,
        manualInterventionsRequired: 0,
        circuitBreakersOpen: 0
      },
      performanceMetrics: {
        systemUptime: Date.now(),
        componentUptimes: {} as Record<SystemComponent, number>,
        lastIncident: null,
        mtbf: 0,
        mttr: 0
      }
    };

    // Initialize component metrics
    Object.values(SystemComponent).forEach(component => {
      this.metrics.systemHealth.components[component] = 100;
      this.metrics.errorMetrics.errorsByComponent[component] = 0;
      this.metrics.performanceMetrics.componentUptimes[component] = Date.now();
    });

    // Initialize severity metrics
    Object.values(SystemErrorSeverity).forEach(severity => {
      this.metrics.errorMetrics.errorsBySeverity[severity] = 0;
    });
  }

  /**
   * Setup alert rules for proactive monitoring
   */
  private setupAlertRules(): void {
    const rules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        condition: 'errorRate > 10',
        severity: 'high',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        actions: ['notify_ops', 'auto_recovery']
      },
      {
        id: 'critical_error_burst',
        name: 'Critical Error Burst',
        condition: 'criticalErrors > 3',
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 60000, // 1 minute
        actions: ['notify_ops', 'escalate_immediately', 'emergency_protocols']
      },
      {
        id: 'component_health_degraded',
        name: 'Component Health Degraded',
        condition: 'componentHealth < 70',
        severity: 'medium',
        enabled: true,
        cooldownPeriod: 600000, // 10 minutes
        actions: ['notify_ops', 'component_restart']
      },
      {
        id: 'recovery_failure_rate',
        name: 'High Recovery Failure Rate',
        condition: 'autoRecoverySuccessRate < 50',
        severity: 'high',
        enabled: true,
        cooldownPeriod: 900000, // 15 minutes
        actions: ['notify_ops', 'disable_auto_recovery']
      },
      {
        id: 'cascading_failure',
        name: 'Cascading Failure Risk',
        condition: 'circuitBreakersOpen > 2',
        severity: 'critical',
        enabled: true,
        cooldownPeriod: 300000, // 5 minutes
        actions: ['notify_ops', 'emergency_protocols', 'manual_intervention']
      }
    ];

    rules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Setup automated recovery actions
   */
  private setupRecoveryActions(): void {
    const actions: SystemRecoveryAction[] = [
      {
        id: 'restart_trading_engine',
        name: 'Restart Trading Engine',
        component: SystemComponent.TRADING_ENGINE,
        action: 'component_restart',
        automated: true,
        successRate: 85,
        averageExecutionTime: 30000
      },
      {
        id: 'restart_ai_system',
        name: 'Restart AI System',
        component: SystemComponent.AI_SYSTEM,
        action: 'service_restart',
        automated: true,
        successRate: 90,
        averageExecutionTime: 45000
      },
      {
        id: 'reconnect_network',
        name: 'Reconnect Network Services',
        component: SystemComponent.NETWORK_INFRASTRUCTURE,
        action: 'network_reconnect',
        automated: true,
        successRate: 75,
        averageExecutionTime: 60000
      },
      {
        id: 'restart_database',
        name: 'Restart Database Connection',
        component: SystemComponent.DATABASE,
        action: 'db_reconnect',
        automated: true,
        successRate: 80,
        averageExecutionTime: 20000
      },
      {
        id: 'emergency_shutdown',
        name: 'Emergency System Shutdown',
        component: SystemComponent.TRADING_ENGINE,
        action: 'emergency_stop',
        automated: false,
        successRate: 100,
        averageExecutionTime: 10000
      }
    ];

    actions.forEach(action => {
      this.recoveryActions.set(action.id, action);
    });
  }

  /**
   * Setup event listeners for all error handlers
   */
  private setupEventListeners(): void {
    // System error manager events
    this.systemErrorManager.on('systemError', (error) => {
      this.handleSystemError(error);
    });

    this.systemErrorManager.on('errorEscalated', (error, relatedErrors) => {
      this.handleErrorEscalation(error, relatedErrors);
    });

    this.systemErrorManager.on('cascadingFailure', (error, services) => {
      this.handleCascadingFailure(error, services);
    });

    // Trading error handler events
    this.tradingErrorHandler.on('errorEscalated', (error) => {
      this.metrics.errorMetrics.escalatedErrors++;
    });

    this.tradingErrorHandler.on('emergencyStop', (reason, cancelled, total) => {
      this.handleEmergencyStop(reason, cancelled, total);
    });

    // AI error handler events
    this.aiErrorHandler.on('modelError', (error) => {
      this.handleModelError(error);
    });

    this.aiErrorHandler.on('modelRecovered', (modelName) => {
      this.handleModelRecovery(modelName);
    });

    // Network error handler events
    this.networkErrorHandler.on('networkError', (error) => {
      this.handleNetworkError(error);
    });

    this.networkErrorHandler.on('cascadingFailureRisk', (services) => {
      this.handleCascadingFailureRisk(services);
    });
  }

  /**
   * Start monitoring and metrics collection
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
      this.evaluateAlertRules();
      this.optimizeRecoveryActions();
    }, this.updateInterval);

    this.logger.info('🔍 Error monitoring dashboard started');
  }

  /**
   * Update all dashboard metrics
   */
  private updateMetrics(): void {
    try {
      // Get system error dashboard data
      const systemDashboard = this.systemErrorManager.getErrorDashboard();
      
      // Update system health metrics
      this.metrics.systemHealth = {
        overall: systemDashboard.healthMetrics.overallHealth,
        components: systemDashboard.healthMetrics.componentHealth,
        trend: this.calculateHealthTrend()
      };

      // Update error metrics
      this.metrics.errorMetrics = {
        totalErrors: systemDashboard.recentErrors.length,
        errorRate: this.calculateErrorRate(systemDashboard.recentErrors),
        criticalErrors: systemDashboard.errorsBySeverity[SystemErrorSeverity.CRITICAL] || 0,
        resolvedErrors: systemDashboard.healthMetrics.resolvedErrors,
        escalatedErrors: systemDashboard.healthMetrics.escalatedErrors,
        errorsByComponent: systemDashboard.errorsByComponent,
        errorsBySeverity: systemDashboard.errorsBySeverity
      };

      // Update recovery metrics
      this.updateRecoveryMetrics();

      // Update performance metrics
      this.updatePerformanceMetrics(systemDashboard);

      // Emit metrics update event
      this.emit('metricsUpdated', this.metrics);

    } catch (error) {
      this.logger.error('Failed to update dashboard metrics:', error);
    }
  }

  /**
   * Calculate error rate (errors per hour)
   */
  private calculateErrorRate(recentErrors: any[]): number {
    const oneHourAgo = Date.now() - 3600000;
    const errorsInLastHour = recentErrors.filter(
      error => new Date(error.timestamp).getTime() > oneHourAgo
    );
    return errorsInLastHour.length;
  }

  /**
   * Calculate health trend
   */
  private calculateHealthTrend(): 'improving' | 'stable' | 'degrading' {
    // Simplified trend calculation - in production, this would use historical data
    const currentHealth = this.metrics.systemHealth.overall;
    
    if (currentHealth > 90) return 'stable';
    if (currentHealth > 70) return 'degrading';
    return 'degrading';
  }

  /**
   * Update recovery metrics
   */
  private updateRecoveryMetrics(): void {
    const tradingStats = this.tradingErrorHandler.getErrorStats();
    const networkStatus = this.networkErrorHandler.getNetworkStatus();
    
    // Calculate auto-recovery success rate
    const totalRecoveryAttempts = Array.from(this.recoveryActions.values())
      .reduce((sum, action) => sum + (action.lastExecuted ? 1 : 0), 0);
    
    const successfulRecoveries = Array.from(this.recoveryActions.values())
      .reduce((sum, action) => sum + (action.successRate / 100), 0);

    this.metrics.recoveryMetrics = {
      autoRecoverySuccessRate: totalRecoveryAttempts > 0 ? 
        (successfulRecoveries / totalRecoveryAttempts) * 100 : 0,
      averageRecoveryTime: this.calculateAverageRecoveryTime(),
      manualInterventionsRequired: this.countManualInterventions(),
      circuitBreakersOpen: tradingStats.circuitBreakers?.filter(cb => cb.isOpen).length || 0
    };
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(systemDashboard: any): void {
    this.metrics.performanceMetrics = {
      systemUptime: Date.now() - this.metrics.performanceMetrics.systemUptime,
      componentUptimes: this.calculateComponentUptimes(),
      lastIncident: systemDashboard.healthMetrics.lastIncident,
      mtbf: this.calculateMTBF(),
      mttr: this.calculateMTTR()
    };
  }

  /**
   * Calculate average recovery time
   */
  private calculateAverageRecoveryTime(): number {
    const actions = Array.from(this.recoveryActions.values())
      .filter(action => action.lastExecuted);
    
    if (actions.length === 0) return 0;
    
    return actions.reduce((sum, action) => sum + action.averageExecutionTime, 0) / actions.length;
  }

  /**
   * Count manual interventions required
   */
  private countManualInterventions(): number {
    return Array.from(this.recoveryActions.values())
      .filter(action => !action.automated && action.lastExecuted)
      .length;
  }

  /**
   * Calculate component uptimes
   */
  private calculateComponentUptimes(): Record<SystemComponent, number> {
    const uptimes = {} as Record<SystemComponent, number>;
    
    Object.values(SystemComponent).forEach(component => {
      const startTime = this.metrics.performanceMetrics.componentUptimes[component] || Date.now();
      uptimes[component] = Date.now() - startTime;
    });
    
    return uptimes;
  }

  /**
   * Calculate Mean Time Between Failures
   */
  private calculateMTBF(): number {
    // Simplified MTBF calculation
    const totalUptime = this.metrics.performanceMetrics.systemUptime;
    const totalFailures = this.metrics.errorMetrics.criticalErrors + this.metrics.errorMetrics.escalatedErrors;
    
    return totalFailures > 0 ? totalUptime / totalFailures : totalUptime;
  }

  /**
   * Calculate Mean Time To Recovery
   */
  private calculateMTTR(): number {
    return this.metrics.recoveryMetrics.averageRecoveryTime;
  }

  /**
   * Evaluate alert rules and trigger actions
   */
  private evaluateAlertRules(): void {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      // Check cooldown period
      const lastTriggered = this.alertCooldowns.get(ruleId);
      if (lastTriggered && Date.now() - lastTriggered.getTime() < rule.cooldownPeriod) {
        continue;
      }

      // Evaluate rule condition
      if (this.evaluateCondition(rule.condition)) {
        this.triggerAlert(rule);
        this.alertCooldowns.set(ruleId, new Date());
      }
    }
  }

  /**
   * Evaluate alert rule condition
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression parser
      const context = {
        errorRate: this.metrics.errorMetrics.errorRate,
        criticalErrors: this.metrics.errorMetrics.criticalErrors,
        componentHealth: Math.min(...Object.values(this.metrics.systemHealth.components)),
        autoRecoverySuccessRate: this.metrics.recoveryMetrics.autoRecoverySuccessRate,
        circuitBreakersOpen: this.metrics.recoveryMetrics.circuitBreakersOpen
      };

      // Replace variables in condition
      let evaluableCondition = condition;
      Object.entries(context).forEach(([key, value]) => {
        evaluableCondition = evaluableCondition.replace(new RegExp(key, 'g'), value.toString());
      });

      // Evaluate the condition (simplified - use proper parser in production)
      return eval(evaluableCondition);

    } catch (error) {
      this.logger.error(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  /**
   * Trigger alert and execute actions
   */
  private async triggerAlert(rule: AlertRule): Promise<void> {
    this.logger.warn(`Alert triggered: ${rule.name}`, {
      ruleId: rule.id,
      severity: rule.severity,
      condition: rule.condition
    });

    // Execute alert actions
    for (const actionName of rule.actions) {
      try {
        await this.executeAlertAction(actionName, rule);
      } catch (error) {
        this.logger.error(`Failed to execute alert action: ${actionName}`, error);
      }
    }

    // Update rule last triggered time
    rule.lastTriggered = new Date();

    // Emit alert event
    this.emit('alertTriggered', rule);
  }

  /**
   * Execute alert action
   */
  private async executeAlertAction(actionName: string, rule: AlertRule): Promise<void> {
    switch (actionName) {
      case 'notify_ops':
        await this.notificationService.sendAlert({
          title: `Alert: ${rule.name}`,
          message: `Alert condition met: ${rule.condition}`,
          details: { rule, metrics: this.metrics }
        });
        break;

      case 'escalate_immediately':
        await this.notificationService.sendCriticalAlert({
          title: `CRITICAL ALERT: ${rule.name}`,
          message: `Critical condition detected: ${rule.condition}`,
          details: { rule, metrics: this.metrics }
        });
        break;

      case 'auto_recovery':
        await this.executeAutoRecovery();
        break;

      case 'component_restart':
        await this.executeComponentRestart();
        break;

      case 'emergency_protocols':
        await this.executeEmergencyProtocols();
        break;

      case 'manual_intervention':
        await this.requestManualIntervention(rule);
        break;

      case 'disable_auto_recovery':
        this.disableAutoRecovery();
        break;
    }
  }

  /**
   * Execute auto-recovery procedures
   */
  private async executeAutoRecovery(): Promise<void> {
    this.logger.info('🔄 Executing auto-recovery procedures...');
    
    const automatedActions = Array.from(this.recoveryActions.values())
      .filter(action => action.automated)
      .sort((a, b) => b.successRate - a.successRate);

    for (const action of automatedActions) {
      try {
        await this.executeRecoveryAction(action);
      } catch (error) {
        this.logger.error(`Auto-recovery action failed: ${action.name}`, error);
      }
    }
  }

  /**
   * Execute component restart
   */
  private async executeComponentRestart(): Promise<void> {
    // Find the component with lowest health
    const componentHealthEntries = Object.entries(this.metrics.systemHealth.components);
    const lowestHealthComponent = componentHealthEntries
      .sort(([, a], [, b]) => a - b)[0];

    if (lowestHealthComponent && lowestHealthComponent[1] < 70) {
      const component = lowestHealthComponent[0] as SystemComponent;
      this.systemErrorManager.emit('restartComponent', component);
    }
  }

  /**
   * Execute emergency protocols
   */
  private async executeEmergencyProtocols(): Promise<void> {
    this.logger.warn('🚨 Executing emergency protocols...');
    
    // Trigger emergency stop for trading
    this.tradingErrorHandler.emit('emergencyStop', 'Critical system alert triggered');
    
    // Send critical notifications
    await this.notificationService.sendCriticalAlert({
      title: 'EMERGENCY PROTOCOLS ACTIVATED',
      message: 'Critical system condition detected - emergency protocols in effect',
      details: { metrics: this.metrics, timestamp: new Date() }
    });
  }

  /**
   * Request manual intervention
   */
  private async requestManualIntervention(rule: AlertRule): Promise<void> {
    await this.notificationService.sendCriticalAlert({
      title: 'MANUAL INTERVENTION REQUIRED',
      message: `Alert "${rule.name}" requires immediate manual attention`,
      details: { 
        rule, 
        metrics: this.metrics,
        recommendedActions: this.getRecommendedActions(rule)
      }
    });

    this.metrics.recoveryMetrics.manualInterventionsRequired++;
  }

  /**
   * Get recommended actions for manual intervention
   */
  private getRecommendedActions(rule: AlertRule): string[] {
    const actions = [];
    
    if (rule.id === 'cascading_failure') {
      actions.push('Check system logs for root cause');
      actions.push('Verify network connectivity');
      actions.push('Restart affected services manually');
      actions.push('Consider system maintenance window');
    }
    
    return actions;
  }

  /**
   * Disable auto-recovery
   */
  private disableAutoRecovery(): void {
    this.logger.warn('⚠️ Disabling auto-recovery due to high failure rate');
    
    Array.from(this.recoveryActions.values()).forEach(action => {
      if (action.automated) {
        action.automated = false;
      }
    });
  }

  /**
   * Execute recovery action
   */
  private async executeRecoveryAction(action: SystemRecoveryAction): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Executing recovery action: ${action.name}`);
      
      // Emit recovery action event
      this.systemErrorManager.emit('restartComponent', action.component);
      
      // Update action metrics
      action.lastExecuted = new Date();
      const executionTime = Date.now() - startTime;
      action.averageExecutionTime = (action.averageExecutionTime + executionTime) / 2;
      
      this.logger.info(`Recovery action completed: ${action.name} (${executionTime}ms)`);
      
    } catch (error) {
      this.logger.error(`Recovery action failed: ${action.name}`, error);
      throw error;
    }
  }

  /**
   * Optimize recovery actions based on success rates
   */
  private optimizeRecoveryActions(): void {
    // Disable actions with consistently low success rates
    Array.from(this.recoveryActions.values()).forEach(action => {
      if (action.successRate < 30 && action.automated) {
        this.logger.warn(`Disabling low-success recovery action: ${action.name} (${action.successRate}%)`);
        action.automated = false;
      }
    });
  }

  /**
   * Event handlers
   */
  private handleSystemError(error: any): void {
    this.metrics.errorMetrics.totalErrors++;
    this.emit('systemErrorDetected', error);
  }

  private handleErrorEscalation(error: any, relatedErrors: any[]): void {
    this.metrics.errorMetrics.escalatedErrors++;
    this.emit('errorEscalated', error, relatedErrors);
  }

  private handleCascadingFailure(error: any, services: any[]): void {
    this.logger.error('🚨 Cascading failure detected', { services: services.length });
    this.emit('cascadingFailureDetected', error, services);
  }

  private handleEmergencyStop(reason: string, cancelled: number, total: number): void {
    this.logger.warn(`🛑 Emergency stop: ${reason} (${cancelled}/${total} orders cancelled)`);
    this.emit('emergencyStopExecuted', reason, cancelled, total);
  }

  private handleModelError(error: any): void {
    this.logger.warn('🤖 AI model error detected', error);
    this.emit('aiModelError', error);
  }

  private handleModelRecovery(modelName: string): void {
    this.logger.info(`🤖 AI model recovered: ${modelName}`);
    this.emit('aiModelRecovered', modelName);
  }

  private handleNetworkError(error: any): void {
    this.logger.warn('🌐 Network error detected', error);
    this.emit('networkErrorDetected', error);
  }

  private handleCascadingFailureRisk(services: any[]): void {
    this.logger.warn('⚠️ Cascading failure risk detected', { services: services.length });
    this.emit('cascadingFailureRisk', services);
  }

  /**
   * Get current dashboard metrics
   */
  getDashboardMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get recovery actions
   */
  getRecoveryActions(): SystemRecoveryAction[] {
    return Array.from(this.recoveryActions.values());
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.logger.info(`Alert rule updated: ${ruleId}`, updates);
    return true;
  }

  /**
   * Shutdown monitoring dashboard
   */
  shutdown(): void {
    this.logger.info('🛑 Shutting down error monitoring dashboard...');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.logger.info('✅ Error monitoring dashboard shutdown completed');
  }
}