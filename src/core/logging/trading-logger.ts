/**
 * =============================================================================
 * COMPREHENSIVE TRADING AND SYSTEM LOGGER
 * =============================================================================
 * 
 * This module provides detailed logging for all trading operations, market
 * analysis, strategy decisions, and system performance with rich context
 * and AI-powered explanations.
 * 
 * Features:
 * - Detailed trade execution logging with reasoning
 * - Market analysis and sentiment logging
 * - Strategy decision logs with AI explanations
 * - Performance metrics with Intel NUC monitoring
 * - Error and exception logging with recovery actions
 * - Audit trail for configuration changes
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { EnhancedLogger, LogEmojis } from './enhanced-logger';
import { LogMetadata } from './logger';
import os from 'os';
import { performance } from 'perf_hooks';
import { execSync } from 'child_process';

/**
 * Trade execution context interface
 */
interface TradeExecutionContext {
  tradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  orderType: 'market' | 'limit' | 'stop';
  strategy: string;
  confidence: number;
  marketConditions: {
    price: number;
    volume: number;
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
    sentiment: number;
  };
  reasoning: {
    entryReason: string;
    exitReason?: string;
    riskAssessment: string;
    expectedOutcome: string;
    alternativeActions: string[];
  };
  timestamp: Date;
}

/**
 * Market analysis context interface
 */
interface MarketAnalysisContext {
  symbol: string;
  timeframe: string;
  analysis: {
    technicalIndicators: Record<string, number>;
    sentimentScore: number;
    volumeAnalysis: Record<string, number>;
    priceAction: Record<string, any>;
    supportResistance: {
      support: number[];
      resistance: number[];
    };
  };
  prediction: {
    direction: 'up' | 'down' | 'sideways';
    confidence: number;
    timeHorizon: string;
    targetPrice?: number;
    stopLoss?: number;
  };
  reasoning: string;
  timestamp: Date;
}

/**
 * Strategy decision context interface
 */
interface StrategyDecisionContext {
  strategyName: string;
  symbol: string;
  decision: 'buy' | 'sell' | 'hold' | 'exit';
  confidence: number;
  parameters: Record<string, any>;
  signals: {
    technical: Record<string, number>;
    fundamental: Record<string, any>;
    sentiment: number;
  };
  reasoning: {
    primaryFactors: string[];
    riskFactors: string[];
    opportunityFactors: string[];
    aiExplanation: string;
    confidenceFactors: string[];
  };
  alternatives: {
    action: string;
    probability: number;
    reasoning: string;
  }[];
  timestamp: Date;
}

/**
 * System performance context interface
 */
interface SystemPerformanceContext {
  component: 'intel_nuc' | 'network' | 'database' | 'api' | 'application';
  metrics: {
    cpu?: {
      usage: number;
      temperature?: number;
      frequency?: number;
    };
    memory?: {
      used: number;
      total: number;
      percentage: number;
      swap?: number;
    };
    disk?: {
      used: number;
      total: number;
      percentage: number;
      iops?: number;
    };
    network?: {
      latency: number;
      bandwidth: number;
      packetLoss?: number;
      connections: number;
    };
    database?: {
      connections: number;
      queryTime: number;
      cacheHitRatio?: number;
    };
  };
  thresholds: {
    warning: Record<string, number>;
    critical: Record<string, number>;
  };
  status: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
}

/**
 * Error context interface with recovery actions
 */
interface ErrorContext {
  errorId: string;
  component: string;
  errorType: 'trading' | 'system' | 'network' | 'database' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  error: Error;
  context: Record<string, any>;
  recoveryActions: {
    attempted: string[];
    successful: string[];
    failed: string[];
    nextSteps: string[];
  };
  impact: {
    tradingAffected: boolean;
    systemStability: 'stable' | 'degraded' | 'unstable';
    userExperience: 'normal' | 'degraded' | 'unavailable';
  };
  timestamp: Date;
}

/**
 * Configuration change audit context
 */
interface ConfigChangeContext {
  changeId: string;
  component: string;
  changeType: 'create' | 'update' | 'delete';
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason: string;
  approvedBy: string;
  impact: {
    requiresRestart: boolean;
    affectedComponents: string[];
    riskLevel: 'low' | 'medium' | 'high';
  };
  timestamp: Date;
}

/**
 * Comprehensive trading and system logger
 */
export class TradingLogger extends EnhancedLogger {
  private tradeSequence: number = 0;
  private performanceHistory: Map<string, number[]> = new Map();
  private errorHistory: Map<string, ErrorContext[]> = new Map();

  constructor(componentName?: string) {
    super(componentName || 'TradingLogger');
  }

  /**
   * Log detailed trade execution with reasoning
   */
  public logTradeExecution(context: TradeExecutionContext): void {
    this.tradeSequence++;
    
    const emoji = context.side === 'buy' ? LogEmojis.BUY : LogEmojis.SELL;
    const message = `Trade execution: ${context.side.toUpperCase()} ${context.amount} ${context.symbol} @ $${context.price?.toFixed(4) || 'MARKET'}`;
    
    const enrichedMeta: LogMetadata = {
      tradeId: context.tradeId,
      sequence: this.tradeSequence,
      symbol: context.symbol,
      side: context.side,
      amount: context.amount,
      price: context.price,
      orderType: context.orderType,
      strategy: context.strategy,
      confidence: context.confidence,
      marketConditions: context.marketConditions,
      reasoning: context.reasoning,
      classification: 'CONFIDENTIAL',
      timestamp: context.timestamp.toISOString()
    };

    this.logWithEmoji('info', emoji, message, enrichedMeta);
    this.trading('trade_execution', message, enrichedMeta);

    // Log detailed reasoning
    this.logTradeReasoning(context);
  }

  /**
   * Log trade reasoning and AI explanation
   */
  private logTradeReasoning(context: TradeExecutionContext): void {
    const reasoningMessage = `Trade reasoning for ${context.tradeId}:
    
📊 Market Conditions:
  • Price: $${context.marketConditions.price.toFixed(4)}
  • Volume: ${context.marketConditions.volume.toLocaleString()}
  • Volatility: ${(context.marketConditions.volatility * 100).toFixed(2)}%
  • Trend: ${context.marketConditions.trend} ${this.getTrendEmoji(context.marketConditions.trend)}
  • Sentiment: ${(context.marketConditions.sentiment * 100).toFixed(1)}%

🧠 AI Reasoning:
  • Entry Reason: ${context.reasoning.entryReason}
  • Risk Assessment: ${context.reasoning.riskAssessment}
  • Expected Outcome: ${context.reasoning.expectedOutcome}
  
🎯 Strategy: ${context.strategy} (${(context.confidence * 100).toFixed(1)}% confidence)

🔄 Alternative Actions Considered:
${context.reasoning.alternativeActions.map(action => `  • ${action}`).join('\n')}`;

    this.trading('trade_reasoning', reasoningMessage, {
      tradeId: context.tradeId,
      component: 'ai_decision_engine',
      classification: 'INTERNAL'
    });
  }

  /**
   * Log market analysis with sentiment and predictions
   */
  public logMarketAnalysis(context: MarketAnalysisContext): void {
    const trendEmoji = this.getTrendEmoji(context.prediction.direction === 'up' ? 'bullish' : 
                                        context.prediction.direction === 'down' ? 'bearish' : 'neutral');
    
    const message = `Market analysis for ${context.symbol} (${context.timeframe}): ${context.prediction.direction} ${trendEmoji} (${(context.prediction.confidence * 100).toFixed(1)}% confidence)`;
    
    const enrichedMeta: LogMetadata = {
      symbol: context.symbol,
      timeframe: context.timeframe,
      analysis: context.analysis,
      prediction: context.prediction,
      reasoning: context.reasoning,
      classification: 'INTERNAL',
      timestamp: context.timestamp.toISOString()
    };

    this.logWithEmoji('info', LogEmojis.TREND_UP, message, enrichedMeta);
    this.trading('market_analysis', message, enrichedMeta);

    // Log detailed technical analysis
    this.logTechnicalAnalysis(context);
  }

  /**
   * Log detailed technical analysis
   */
  private logTechnicalAnalysis(context: MarketAnalysisContext): void {
    const technicalMessage = `Technical analysis for ${context.symbol}:

📈 Technical Indicators:
${Object.entries(context.analysis.technicalIndicators)
  .map(([indicator, value]) => `  • ${indicator}: ${typeof value === 'number' ? value.toFixed(4) : value}`)
  .join('\n')}

📊 Volume Analysis:
${Object.entries(context.analysis.volumeAnalysis)
  .map(([metric, value]) => `  • ${metric}: ${typeof value === 'number' ? value.toLocaleString() : value}`)
  .join('\n')}

🎯 Support/Resistance Levels:
  • Support: ${context.analysis.supportResistance.support.map(s => `$${s.toFixed(4)}`).join(', ')}
  • Resistance: ${context.analysis.supportResistance.resistance.map(r => `$${r.toFixed(4)}`).join(', ')}

🧠 AI Analysis: ${context.reasoning}`;

    this.trading('technical_analysis', technicalMessage, {
      symbol: context.symbol,
      component: 'technical_analyzer',
      classification: 'INTERNAL'
    });
  }

  /**
   * Log strategy decisions with AI explanations
   */
  public logStrategyDecision(context: StrategyDecisionContext): void {
    const decisionEmoji = this.getDecisionEmoji(context.decision);
    const message = `Strategy decision: ${context.strategyName} → ${context.decision.toUpperCase()} ${context.symbol} (${(context.confidence * 100).toFixed(1)}% confidence)`;
    
    const enrichedMeta: LogMetadata = {
      strategyName: context.strategyName,
      symbol: context.symbol,
      decision: context.decision,
      confidence: context.confidence,
      parameters: context.parameters,
      signals: context.signals,
      reasoning: context.reasoning,
      alternatives: context.alternatives,
      classification: 'INTERNAL',
      timestamp: context.timestamp.toISOString()
    };

    this.logWithEmoji('info', decisionEmoji, message, enrichedMeta);
    this.trading('strategy_decision', message, enrichedMeta);

    // Log detailed strategy reasoning
    this.logStrategyReasoning(context);
  }

  /**
   * Log detailed strategy reasoning
   */
  private logStrategyReasoning(context: StrategyDecisionContext): void {
    const reasoningMessage = `Strategy reasoning for ${context.strategyName}:

🎯 Decision: ${context.decision.toUpperCase()} (${(context.confidence * 100).toFixed(1)}% confidence)

📊 Signals:
  • Technical: ${Object.entries(context.signals.technical)
    .map(([signal, value]) => `${signal}=${typeof value === 'number' ? value.toFixed(4) : value}`)
    .join(', ')}
  • Sentiment: ${(context.signals.sentiment * 100).toFixed(1)}%

🧠 AI Reasoning: ${context.reasoning.aiExplanation}

✅ Primary Factors:
${context.reasoning.primaryFactors.map(factor => `  • ${factor}`).join('\n')}

⚠️ Risk Factors:
${context.reasoning.riskFactors.map(factor => `  • ${factor}`).join('\n')}

🚀 Opportunity Factors:
${context.reasoning.opportunityFactors.map(factor => `  • ${factor}`).join('\n')}

🎲 Alternative Actions:
${context.alternatives.map(alt => `  • ${alt.action} (${(alt.probability * 100).toFixed(1)}%): ${alt.reasoning}`).join('\n')}`;

    this.trading('strategy_reasoning', reasoningMessage, {
      strategyName: context.strategyName,
      symbol: context.symbol,
      component: 'strategy_engine',
      classification: 'INTERNAL'
    });
  }

  /**
   * Log Intel NUC and system performance metrics
   */
  public logSystemPerformance(context: SystemPerformanceContext): void {
    const statusEmoji = context.status === 'healthy' ? LogEmojis.SUCCESS :
                       context.status === 'warning' ? LogEmojis.WARNING : LogEmojis.ERROR;
    
    const message = `System performance: ${context.component} - ${context.status.toUpperCase()}`;
    
    const enrichedMeta: LogMetadata = {
      component: context.component,
      metrics: context.metrics,
      thresholds: context.thresholds,
      status: context.status,
      classification: 'INTERNAL',
      timestamp: context.timestamp.toISOString()
    };

    this.logWithEmoji(
      context.status === 'critical' ? 'error' : context.status === 'warning' ? 'warn' : 'info',
      statusEmoji,
      message,
      enrichedMeta
    );

    // Log detailed performance metrics
    this.logDetailedPerformanceMetrics(context);
    
    // Store performance history
    this.storePerformanceHistory(context);
  }

  /**
   * Log detailed performance metrics
   */
  private logDetailedPerformanceMetrics(context: SystemPerformanceContext): void {
    let metricsMessage = `Detailed performance metrics for ${context.component}:\n`;

    if (context.metrics.cpu) {
      metricsMessage += `\n⚙️ CPU Metrics:
  • Usage: ${context.metrics.cpu.usage.toFixed(1)}%
  • Temperature: ${context.metrics.cpu.temperature?.toFixed(1) || 'N/A'}°C
  • Frequency: ${context.metrics.cpu.frequency?.toFixed(0) || 'N/A'}MHz`;
    }

    if (context.metrics.memory) {
      metricsMessage += `\n🧠 Memory Metrics:
  • Used: ${(context.metrics.memory.used / 1024**3).toFixed(2)}GB
  • Total: ${(context.metrics.memory.total / 1024**3).toFixed(2)}GB
  • Usage: ${context.metrics.memory.percentage.toFixed(1)}%
  • Swap: ${context.metrics.memory.swap ? (context.metrics.memory.swap / 1024**3).toFixed(2) + 'GB' : 'N/A'}`;
    }

    if (context.metrics.disk) {
      metricsMessage += `\n💽 Disk Metrics:
  • Used: ${(context.metrics.disk.used / 1024**3).toFixed(2)}GB
  • Total: ${(context.metrics.disk.total / 1024**3).toFixed(2)}GB
  • Usage: ${context.metrics.disk.percentage.toFixed(1)}%
  • IOPS: ${context.metrics.disk.iops?.toLocaleString() || 'N/A'}`;
    }

    if (context.metrics.network) {
      metricsMessage += `\n🌐 Network Metrics:
  • Latency: ${context.metrics.network.latency.toFixed(1)}ms
  • Bandwidth: ${(context.metrics.network.bandwidth / 1024**2).toFixed(2)}MB/s
  • Packet Loss: ${context.metrics.network.packetLoss?.toFixed(2) || 'N/A'}%
  • Connections: ${context.metrics.network.connections}`;
    }

    if (context.metrics.database) {
      metricsMessage += `\n🗄️ Database Metrics:
  • Connections: ${context.metrics.database.connections}
  • Query Time: ${context.metrics.database.queryTime.toFixed(2)}ms
  • Cache Hit Ratio: ${context.metrics.database.cacheHitRatio?.toFixed(1) || 'N/A'}%`;
    }

    this.info(metricsMessage, {
      component: context.component,
      classification: 'INTERNAL'
    });
  }

  /**
   * Log errors with comprehensive context and recovery actions
   */
  public logErrorWithRecovery(context: ErrorContext): void {
    const severityEmoji = context.severity === 'critical' ? LogEmojis.ERROR :
                         context.severity === 'high' ? LogEmojis.ALERT :
                         context.severity === 'medium' ? LogEmojis.WARNING : LogEmojis.INFO;
    
    const message = `${context.errorType.toUpperCase()} error in ${context.component}: ${context.error.message}`;
    
    const enrichedMeta: LogMetadata = {
      errorId: context.errorId,
      component: context.component,
      errorType: context.errorType,
      severity: context.severity,
      error: {
        name: context.error.name,
        message: context.error.message,
        stack: context.error.stack
      },
      context: context.context,
      recoveryActions: context.recoveryActions,
      impact: context.impact,
      classification: 'CONFIDENTIAL',
      timestamp: context.timestamp.toISOString()
    };

    this.logWithEmoji('error', severityEmoji, message, enrichedMeta);
    
    // Log detailed error context and recovery
    this.logErrorRecoveryDetails(context);
    
    // Store error history
    this.storeErrorHistory(context);
  }

  /**
   * Log detailed error recovery information
   */
  private logErrorRecoveryDetails(context: ErrorContext): void {
    const recoveryMessage = `Error recovery details for ${context.errorId}:

❌ Error Details:
  • Type: ${context.errorType}
  • Severity: ${context.severity}
  • Component: ${context.component}
  • Message: ${context.error.message}

🔧 Recovery Actions:
  • Attempted: ${context.recoveryActions.attempted.join(', ') || 'None'}
  • Successful: ${context.recoveryActions.successful.join(', ') || 'None'}
  • Failed: ${context.recoveryActions.failed.join(', ') || 'None'}
  • Next Steps: ${context.recoveryActions.nextSteps.join(', ') || 'None'}

📊 Impact Assessment:
  • Trading Affected: ${context.impact.tradingAffected ? 'Yes' : 'No'}
  • System Stability: ${context.impact.systemStability}
  • User Experience: ${context.impact.userExperience}

🔍 Context:
${Object.entries(context.context)
  .map(([key, value]) => `  • ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
  .join('\n')}`;

    this.error(recoveryMessage, {
      errorId: context.errorId,
      component: context.component,
      classification: 'CONFIDENTIAL'
    });
  }

  /**
   * Log configuration changes with audit trail
   */
  public logConfigurationChange(context: ConfigChangeContext): void {
    const changeEmoji = context.changeType === 'create' ? LogEmojis.SUCCESS :
                       context.changeType === 'update' ? LogEmojis.RESTART :
                       LogEmojis.ERROR;
    
    const message = `Configuration ${context.changeType}: ${context.component} (${context.changes.length} changes)`;
    
    const enrichedMeta: LogMetadata = {
      changeId: context.changeId,
      component: context.component,
      changeType: context.changeType,
      changes: context.changes,
      reason: context.reason,
      approvedBy: context.approvedBy,
      impact: context.impact,
      classification: 'CONFIDENTIAL',
      timestamp: context.timestamp.toISOString()
    };

    this.logWithEmoji('info', changeEmoji, message, enrichedMeta);
    this.audit({
      auditId: context.changeId,
      eventType: 'CONFIGURATION_CHANGE',
      actor: context.approvedBy,
      resource: context.component,
      action: context.changeType.toUpperCase(),
      result: 'SUCCESS',
      auditData: enrichedMeta,
      timestamp: context.timestamp
    });

    // Log detailed configuration changes
    this.logConfigurationDetails(context);
  }

  /**
   * Log detailed configuration change information
   */
  private logConfigurationDetails(context: ConfigChangeContext): void {
    const configMessage = `Configuration change details for ${context.changeId}:

🔧 Change Summary:
  • Component: ${context.component}
  • Type: ${context.changeType}
  • Approved By: ${context.approvedBy}
  • Reason: ${context.reason}

📝 Changes Made:
${context.changes.map(change => 
  `  • ${change.field}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`
).join('\n')}

⚠️ Impact Assessment:
  • Requires Restart: ${context.impact.requiresRestart ? 'Yes' : 'No'}
  • Risk Level: ${context.impact.riskLevel}
  • Affected Components: ${context.impact.affectedComponents.join(', ') || 'None'}`;

    this.info(configMessage, {
      changeId: context.changeId,
      component: context.component,
      classification: 'CONFIDENTIAL'
    });
  }

  /**
   * Get trend emoji based on direction
   */
  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'bullish': return LogEmojis.BULL;
      case 'bearish': return LogEmojis.BEAR;
      case 'neutral': return LogEmojis.BALANCE;
      default: return LogEmojis.INFO;
    }
  }

  /**
   * Get decision emoji based on action
   */
  private getDecisionEmoji(decision: string): string {
    switch (decision) {
      case 'buy': return LogEmojis.BUY;
      case 'sell': return LogEmojis.SELL;
      case 'hold': return LogEmojis.BALANCE;
      case 'exit': return LogEmojis.STOP;
      default: return LogEmojis.INFO;
    }
  }

  /**
   * Store performance history for trend analysis
   */
  private storePerformanceHistory(context: SystemPerformanceContext): void {
    const key = `${context.component}_${context.status}`;
    const history = this.performanceHistory.get(key) || [];
    
    // Store timestamp as performance metric
    history.push(Date.now());
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
    
    this.performanceHistory.set(key, history);
  }

  /**
   * Store error history for pattern analysis
   */
  private storeErrorHistory(context: ErrorContext): void {
    const key = `${context.component}_${context.errorType}`;
    const history = this.errorHistory.get(key) || [];
    
    history.push(context);
    
    // Keep only last 50 errors
    if (history.length > 50) {
      history.shift();
    }
    
    this.errorHistory.set(key, history);
  }

  /**
   * Get performance trends
   */
  public getPerformanceTrends(): Record<string, number[]> {
    return Object.fromEntries(this.performanceHistory);
  }

  /**
   * Get error patterns
   */
  public getErrorPatterns(): Record<string, ErrorContext[]> {
    return Object.fromEntries(this.errorHistory);
  }

  /**
   * Generate comprehensive system report
   */
  public async generateComprehensiveReport(): Promise<{
    timestamp: string;
    performanceTrends: Record<string, number[]>;
    errorPatterns: Record<string, ErrorContext[]>;
    systemHealth: any;
    tradingMetrics: any;
  }> {
    return {
      timestamp: new Date().toISOString(),
      performanceTrends: this.getPerformanceTrends(),
      errorPatterns: this.getErrorPatterns(),
      systemHealth: await this.getSystemHealth(),
      tradingMetrics: this.getOperationCounters()
    };
  }

  /**
   * Get current system health
   */
  private async getSystemHealth(): Promise<any> {
    try {
      const cpuInfo = os.cpus();
      const memInfo = process.memoryUsage();
      const loadAvg = os.loadavg();
      
      return {
        cpu: {
          cores: cpuInfo.length,
          model: cpuInfo[0]?.model || 'Unknown',
          loadAverage: loadAvg
        },
        memory: {
          rss: memInfo.rss,
          heapTotal: memInfo.heapTotal,
          heapUsed: memInfo.heapUsed,
          external: memInfo.external
        },
        system: {
          platform: os.platform(),
          arch: os.arch(),
          uptime: os.uptime(),
          hostname: os.hostname()
        }
      };
    } catch (error) {
      return { error: 'Failed to collect system health data' };
    }
  }
}

// Create and export singleton instance
export const tradingLogger = new TradingLogger();

// Export types and interfaces
export type {
  TradeExecutionContext,
  MarketAnalysisContext,
  StrategyDecisionContext,
  SystemPerformanceContext,
  ErrorContext,
  ConfigChangeContext
};