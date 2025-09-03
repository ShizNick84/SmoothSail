/**
 * =============================================================================
 * ENHANCED ALERT TYPES SYSTEM
 * =============================================================================
 * 
 * Comprehensive alert types with real-time information for the AI crypto 
 * trading agent. Implements new trade alerts, trade updates, trade closures,
 * and error alerts with detailed context and real-time market data.
 * 
 * Features:
 * - New Trade Alert system (Order placed) with real-time data
 * - Trade Update alerts (Price approaching stop-loss/take-profit)
 * - Trade Closed alerts (Order executed with profit/loss update)
 * - Error Alerts (API issues, connection failures, etc.)
 * - Real-time market data integration
 * - Enhanced notification content with context
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Enhanced Alert System Implementation
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';

/**
 * Enhanced alert types for comprehensive trading notifications
 */
export enum EnhancedAlertType {
  // New Trade Alerts
  NEW_TRADE_ORDER_PLACED = 'NEW_TRADE_ORDER_PLACED',
  NEW_TRADE_ORDER_FILLED = 'NEW_TRADE_ORDER_FILLED',
  NEW_TRADE_ORDER_PARTIAL_FILL = 'NEW_TRADE_ORDER_PARTIAL_FILL',
  NEW_TRADE_ORDER_CANCELLED = 'NEW_TRADE_ORDER_CANCELLED',
  NEW_TRADE_ORDER_REJECTED = 'NEW_TRADE_ORDER_REJECTED',

  // Trade Update Alerts
  TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS = 'TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS',
  TRADE_UPDATE_PRICE_APPROACHING_TAKE_PROFIT = 'TRADE_UPDATE_PRICE_APPROACHING_TAKE_PROFIT',
  TRADE_UPDATE_POSITION_SIZE_CHANGED = 'TRADE_UPDATE_POSITION_SIZE_CHANGED',
  TRADE_UPDATE_STOP_LOSS_ADJUSTED = 'TRADE_UPDATE_STOP_LOSS_ADJUSTED',
  TRADE_UPDATE_TAKE_PROFIT_ADJUSTED = 'TRADE_UPDATE_TAKE_PROFIT_ADJUSTED',
  TRADE_UPDATE_TRAILING_STOP_ACTIVATED = 'TRADE_UPDATE_TRAILING_STOP_ACTIVATED',

  // Trade Closed Alerts
  TRADE_CLOSED_PROFIT_TARGET_HIT = 'TRADE_CLOSED_PROFIT_TARGET_HIT',
  TRADE_CLOSED_STOP_LOSS_TRIGGERED = 'TRADE_CLOSED_STOP_LOSS_TRIGGERED',
  TRADE_CLOSED_MANUAL_EXIT = 'TRADE_CLOSED_MANUAL_EXIT',
  TRADE_CLOSED_TIME_BASED_EXIT = 'TRADE_CLOSED_TIME_BASED_EXIT',
  TRADE_CLOSED_RISK_MANAGEMENT = 'TRADE_CLOSED_RISK_MANAGEMENT',

  // Error Alerts
  ERROR_API_CONNECTION_FAILED = 'ERROR_API_CONNECTION_FAILED',
  ERROR_API_RATE_LIMIT_EXCEEDED = 'ERROR_API_RATE_LIMIT_EXCEEDED',
  ERROR_INSUFFICIENT_BALANCE = 'ERROR_INSUFFICIENT_BALANCE',
  ERROR_INVALID_ORDER_PARAMETERS = 'ERROR_INVALID_ORDER_PARAMETERS',
  ERROR_MARKET_DATA_UNAVAILABLE = 'ERROR_MARKET_DATA_UNAVAILABLE',
  ERROR_SYSTEM_OVERLOAD = 'ERROR_SYSTEM_OVERLOAD',
  ERROR_NETWORK_CONNECTIVITY = 'ERROR_NETWORK_CONNECTIVITY',
  ERROR_DATABASE_CONNECTION = 'ERROR_DATABASE_CONNECTION',
  ERROR_SSH_TUNNEL_FAILURE = 'ERROR_SSH_TUNNEL_FAILURE',
  ERROR_AUTHENTICATION_FAILED = 'ERROR_AUTHENTICATION_FAILED'
}

/**
 * Alert severity levels for prioritization
 */
export enum AlertSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency'
}

/**
 * Real-time market data structure
 */
export interface RealTimeMarketData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  bid: number;
  ask: number;
  spread: number;
  marketCap?: number;
  timestamp: Date;
  
  // Technical indicators
  technicalIndicators?: {
    rsi: number;
    macd: number;
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
    ema20: number;
    ema50: number;
    support: number;
    resistance: number;
  };
  
  // Market sentiment
  sentiment?: {
    overall: number; // -1 to 1
    news: number;
    social: number;
    technical: number;
  };
}

/**
 * Trade order information structure
 */
export interface TradeOrderInfo {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
  executedQuantity: number;
  executedPrice?: number;
  commission: number;
  commissionAsset: string;
  timestamp: Date;
  updateTime: Date;
  
  // Strategy context
  strategy: string;
  confidence: number;
  riskReward: number;
  
  // Risk management
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number;
  maxRisk: number;
}

/**
 * Position information structure
 */
export interface PositionInfo {
  positionId: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  totalPnL: number;
  
  // Risk management levels
  stopLoss: number;
  takeProfit: number;
  liquidationPrice?: number;
  
  // Position metrics
  duration: number; // minutes
  maxProfit: number;
  maxLoss: number;
  maxDrawdown: number;
  
  // Market context
  marketData: RealTimeMarketData;
  
  // Timestamps
  openTime: Date;
  lastUpdateTime: Date;
}

/**
 * Error context information
 */
export interface ErrorContext {
  errorCode: string;
  errorMessage: string;
  errorType: 'API' | 'NETWORK' | 'SYSTEM' | 'VALIDATION' | 'AUTHENTICATION';
  severity: AlertSeverity;
  component: string;
  operation: string;
  
  // Additional context
  requestId?: string;
  userId?: string;
  symbol?: string;
  orderId?: string;
  
  // System state
  systemLoad?: number;
  memoryUsage?: number;
  networkLatency?: number;
  
  // Recovery information
  retryAttempts: number;
  maxRetries: number;
  nextRetryTime?: Date;
  recoveryAction?: string;
  
  // Timestamps
  firstOccurrence: Date;
  lastOccurrence: Date;
  resolvedTime?: Date;
}

/**
 * Enhanced alert data structure
 */
export interface EnhancedAlert {
  id: string;
  type: EnhancedAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  
  // Context data
  tradeOrder?: TradeOrderInfo;
  position?: PositionInfo;
  marketData?: RealTimeMarketData;
  errorContext?: ErrorContext;
  
  // System context
  systemInfo: {
    timestamp: Date;
    source: string;
    environment: 'development' | 'production';
    version: string;
    instanceId: string;
  };
  
  // Notification preferences
  channels: ('telegram' | 'email' | 'dashboard')[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  
  // Metadata
  tags: string[];
  correlationId?: string;
  parentAlertId?: string;
  
  // Delivery tracking
  deliveryStatus?: {
    telegram?: { sent: boolean; messageId?: number; error?: string };
    email?: { sent: boolean; messageId?: string; error?: string };
    dashboard?: { sent: boolean; error?: string };
  };
}

/**
 * Alert template configuration
 */
export interface AlertTemplate {
  type: EnhancedAlertType;
  severity: AlertSeverity;
  titleTemplate: string;
  messageTemplate: string;
  telegramTemplate: string;
  emailTemplate: string;
  defaultChannels: ('telegram' | 'email' | 'dashboard')[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  tags: string[];
}

/**
 * Enhanced alert system configuration
 */
export interface EnhancedAlertConfig {
  enabled: boolean;
  defaultChannels: ('telegram' | 'email' | 'dashboard')[];
  rateLimiting: {
    enabled: boolean;
    maxAlertsPerMinute: number;
    maxAlertsPerHour: number;
    cooldownPeriod: number; // seconds
  };
  deduplication: {
    enabled: boolean;
    windowMinutes: number;
    similarityThreshold: number;
  };
  escalation: {
    enabled: boolean;
    escalationRules: Array<{
      severity: AlertSeverity;
      delayMinutes: number;
      additionalChannels: ('telegram' | 'email')[];
    }>;
  };
}

/**
 * Alert statistics tracking
 */
export interface AlertStatistics {
  totalAlerts: number;
  alertsByType: Record<EnhancedAlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByChannel: Record<string, number>;
  deliverySuccess: {
    telegram: { sent: number; failed: number };
    email: { sent: number; failed: number };
    dashboard: { sent: number; failed: number };
  };
  averageDeliveryTime: number;
  lastAlert?: Date;
  systemUptime: number;
}

/**
 * Alert template registry with predefined templates
 */
export class AlertTemplateRegistry {
  private static templates: Map<EnhancedAlertType, AlertTemplate> = new Map();

  /**
   * Initialize alert templates
   */
  public static initialize(): void {
    logger.info('🔔 Initializing enhanced alert templates...');

    // New Trade Alert Templates
    this.registerTemplate({
      type: EnhancedAlertType.NEW_TRADE_ORDER_PLACED,
      severity: AlertSeverity.HIGH,
      titleTemplate: '🆕 New Trade Order Placed: {{symbol}}',
      messageTemplate: 'New {{side}} order placed for {{symbol}} - Quantity: {{quantity}}, Price: {{price}}',
      telegramTemplate: `
🆕 <b>NEW TRADE ORDER PLACED</b> 📊

🎯 <b>Symbol:</b> {{symbol}}
⚡ <b>Side:</b> {{side}}
📊 <b>Type:</b> {{type}}
💰 <b>Quantity:</b> {{quantity}}
💵 <b>Price:</b> {{price}}
🧠 <b>Strategy:</b> {{strategy}}
🎯 <b>Confidence:</b> {{confidence}}%

📈 <b>Market Data:</b>
• 💵 <b>Current Price:</b> {{currentPrice}}
• 📊 <b>24h Change:</b> {{priceChange24h}}%
• 📈 <b>Volume:</b> {{volume24h}}

⚠️ <b>Risk Management:</b>
• 🛑 <b>Stop Loss:</b> {{stopLoss}}
• 🎯 <b>Take Profit:</b> {{takeProfit}}
• ⚖️ <b>Risk/Reward:</b> 1:{{riskReward}}

⏰ <i>{{timestamp}}</i>
      `.trim(),
      emailTemplate: 'new_trade_order_placed',
      defaultChannels: ['telegram', 'email'],
      priority: 'high',
      tags: ['trade', 'order', 'new']
    });

    this.registerTemplate({
      type: EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS,
      severity: AlertSeverity.HIGH,
      titleTemplate: '⚠️ Price Approaching Stop Loss: {{symbol}}',
      messageTemplate: '{{symbol}} price is approaching stop loss level. Current: {{currentPrice}}, Stop Loss: {{stopLoss}}',
      telegramTemplate: `
⚠️ <b>PRICE APPROACHING STOP LOSS</b> 🚨

🎯 <b>Symbol:</b> {{symbol}}
📉 <b>Current Price:</b> {{currentPrice}}
🛑 <b>Stop Loss:</b> {{stopLoss}}
📊 <b>Distance:</b> {{distanceToStopLoss}}%

💰 <b>Position Info:</b>
• 📊 <b>Size:</b> {{positionSize}}
• 💵 <b>Entry Price:</b> {{entryPrice}}
• 📉 <b>Unrealized P&L:</b> {{unrealizedPnL}}
• ⏱️ <b>Duration:</b> {{duration}}

📈 <b>Market Conditions:</b>
• 📊 <b>24h Change:</b> {{priceChange24h}}%
• 📈 <b>Volume:</b> {{volume24h}}
• 🎯 <b>Support:</b> {{support}}

💡 <i>Consider adjusting stop loss or closing position</i>

⏰ <i>{{timestamp}}</i>
      `.trim(),
      emailTemplate: 'trade_update_stop_loss_approaching',
      defaultChannels: ['telegram', 'email'],
      priority: 'high',
      tags: ['trade', 'update', 'stop-loss', 'warning']
    });

    this.registerTemplate({
      type: EnhancedAlertType.TRADE_CLOSED_PROFIT_TARGET_HIT,
      severity: AlertSeverity.MEDIUM,
      titleTemplate: '🎯 Profit Target Hit: {{symbol}}',
      messageTemplate: 'Profit target reached for {{symbol}}. Realized P&L: {{realizedPnL}}',
      telegramTemplate: `
🎯 <b>PROFIT TARGET HIT!</b> 💰

🎯 <b>Symbol:</b> {{symbol}}
💰 <b>Realized P&L:</b> {{realizedPnL}}
📊 <b>Return:</b> {{returnPercent}}%

📈 <b>Trade Summary:</b>
• 💵 <b>Entry Price:</b> {{entryPrice}}
• 🎯 <b>Exit Price:</b> {{exitPrice}}
• 📊 <b>Quantity:</b> {{quantity}}
• ⏱️ <b>Duration:</b> {{duration}}

📊 <b>Performance:</b>
• 🏆 <b>Max Profit:</b> {{maxProfit}}
• 📉 <b>Max Drawdown:</b> {{maxDrawdown}}
• 🧠 <b>Strategy:</b> {{strategy}}

💎 <b>New Balance:</b> {{newBalance}}

🎉 <i>Excellent execution! Target achieved successfully.</i>

⏰ <i>{{timestamp}}</i>
      `.trim(),
      emailTemplate: 'trade_closed_profit_target',
      defaultChannels: ['telegram', 'email'],
      priority: 'normal',
      tags: ['trade', 'closed', 'profit', 'success']
    });

    this.registerTemplate({
      type: EnhancedAlertType.ERROR_API_CONNECTION_FAILED,
      severity: AlertSeverity.CRITICAL,
      titleTemplate: '🚨 API Connection Failed: {{component}}',
      messageTemplate: 'API connection failed for {{component}}. Error: {{errorMessage}}',
      telegramTemplate: `
🚨 <b>API CONNECTION FAILED</b> ❌

🔧 <b>Component:</b> {{component}}
⚠️ <b>Error:</b> {{errorMessage}}
🔢 <b>Error Code:</b> {{errorCode}}

🔄 <b>Recovery Status:</b>
• 🔁 <b>Retry Attempts:</b> {{retryAttempts}}/{{maxRetries}}
• ⏰ <b>Next Retry:</b> {{nextRetryTime}}
• 🛠️ <b>Recovery Action:</b> {{recoveryAction}}

🖥️ <b>System Status:</b>
• 💻 <b>System Load:</b> {{systemLoad}}%
• 🌐 <b>Network Latency:</b> {{networkLatency}}ms
• 💾 <b>Memory Usage:</b> {{memoryUsage}}%

⚠️ <i>Trading operations may be affected. Monitoring for recovery...</i>

⏰ <i>{{timestamp}}</i>
      `.trim(),
      emailTemplate: 'error_api_connection_failed',
      defaultChannels: ['telegram', 'email'],
      priority: 'critical',
      tags: ['error', 'api', 'connection', 'critical']
    });

    logger.info(`✅ Initialized ${this.templates.size} enhanced alert templates`);
  }

  /**
   * Register a new alert template
   */
  public static registerTemplate(template: AlertTemplate): void {
    this.templates.set(template.type, template);
  }

  /**
   * Get alert template by type
   */
  public static getTemplate(type: EnhancedAlertType): AlertTemplate | undefined {
    return this.templates.get(type);
  }

  /**
   * Get all templates
   */
  public static getAllTemplates(): Map<EnhancedAlertType, AlertTemplate> {
    return new Map(this.templates);
  }

  /**
   * Check if template exists
   */
  public static hasTemplate(type: EnhancedAlertType): boolean {
    return this.templates.has(type);
  }
}

/**
 * Alert data validator
 */
export class AlertDataValidator {
  /**
   * Validate enhanced alert data
   */
  public static validateAlert(alert: EnhancedAlert): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!alert.id) errors.push('Alert ID is required');
    if (!alert.type) errors.push('Alert type is required');
    if (!alert.severity) errors.push('Alert severity is required');
    if (!alert.title) errors.push('Alert title is required');
    if (!alert.message) errors.push('Alert message is required');

    // System info validation
    if (!alert.systemInfo) {
      errors.push('System info is required');
    } else {
      if (!alert.systemInfo.timestamp) errors.push('System timestamp is required');
      if (!alert.systemInfo.source) errors.push('System source is required');
    }

    // Channels validation
    if (!alert.channels || alert.channels.length === 0) {
      errors.push('At least one notification channel is required');
    }

    // Type-specific validation
    switch (alert.type) {
      case EnhancedAlertType.NEW_TRADE_ORDER_PLACED:
      case EnhancedAlertType.NEW_TRADE_ORDER_FILLED:
        if (!alert.tradeOrder) {
          errors.push('Trade order info is required for trade alerts');
        }
        break;

      case EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_STOP_LOSS:
      case EnhancedAlertType.TRADE_UPDATE_PRICE_APPROACHING_TAKE_PROFIT:
        if (!alert.position) {
          errors.push('Position info is required for trade update alerts');
        }
        if (!alert.marketData) {
          errors.push('Market data is required for trade update alerts');
        }
        break;

      case EnhancedAlertType.ERROR_API_CONNECTION_FAILED:
      case EnhancedAlertType.ERROR_NETWORK_CONNECTIVITY:
        if (!alert.errorContext) {
          errors.push('Error context is required for error alerts');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate market data
   */
  public static validateMarketData(marketData: RealTimeMarketData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!marketData.symbol) errors.push('Symbol is required');
    if (typeof marketData.currentPrice !== 'number' || marketData.currentPrice <= 0) {
      errors.push('Valid current price is required');
    }
    if (!marketData.timestamp) errors.push('Timestamp is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default {
  EnhancedAlertType,
  AlertSeverity,
  AlertTemplateRegistry,
  AlertDataValidator
};