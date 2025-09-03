/**
 * =============================================================================
 * ENHANCED NOTIFICATION TEMPLATES WITH REAL-TIME DATA
 * =============================================================================
 * 
 * Advanced notification templates that integrate real-time market information,
 * current trading context, profit/loss calculations, and dynamic content based
 * on market conditions for both Telegram and Email notifications.
 * 
 * Features:
 * - Real-time market data integration
 * - Dynamic profit/loss calculations
 * - Context-aware content generation
 * - Market condition-based messaging
 * - Rich formatting with emojis and styling
 * - Responsive email templates
 * - Interactive Telegram messages
 * 
 * @author AI Crypto Trading System
 * @version 2.0.0 - Enhanced Templates with Real-Time Data
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { 
  EnhancedAlert, 
  EnhancedAlertType, 
  RealTimeMarketData, 
  TradeOrderInfo, 
  PositionInfo 
} from './enhanced-alert-types';

/**
 * Template context data structure
 */
export interface TemplateContext {
  alert: EnhancedAlert;
  marketData?: RealTimeMarketData;
  tradeOrder?: TradeOrderInfo;
  position?: PositionInfo;
  calculations: {
    profitLoss: number;
    profitLossPercent: number;
    riskReward: number;
    positionValue: number;
    marketSentiment: string;
    trendDirection: string;
    volatilityLevel: string;
  };
  systemMetrics: {
    timestamp: Date;
    systemLoad: number;
    networkLatency: number;
    tunnelStatus: string;
    tradingStatus: string;
  };
}

/**
 * Enhanced Telegram template generator
 */
export class EnhancedTelegramTemplates {
  /**
   * Generate new trade order placed template with real-time data
   */
  public static generateNewTradeOrderTemplate(context: TemplateContext): string {
    const { alert, tradeOrder, marketData, calculations, systemMetrics } = context;
    
    if (!tradeOrder || !marketData) {
      throw new Error('Trade order and market data required for new trade template');
    }

    const sideEmoji = tradeOrder.side === 'BUY' ? '🟢' : '🔴';
    const actionEmoji = tradeOrder.side === 'BUY' ? '📈' : '📉';
    const confidenceEmoji = this.getConfidenceEmoji(tradeOrder.confidence);
    const sentimentEmoji = this.getSentimentEmoji(calculations.marketSentiment);
    const trendEmoji = this.getTrendEmoji(calculations.trendDirection);
    const volatilityEmoji = this.getVolatilityEmoji(calculations.volatilityLevel);

    return `
${sideEmoji} <b>NEW TRADE ORDER PLACED</b> ${actionEmoji} <i>[Intel NUC]</i>

🎯 <b>Trade Details:</b>
• 💎 <b>Symbol:</b> ${tradeOrder.symbol}
• ⚡ <b>Side:</b> ${tradeOrder.side}
• 📊 <b>Type:</b> ${tradeOrder.type}
• 💰 <b>Quantity:</b> ${tradeOrder.quantity.toLocaleString()}
• 💵 <b>Price:</b> ${tradeOrder.price?.toFixed(4) || 'Market'}
• 💎 <b>Value:</b> $${calculations.positionValue.toLocaleString()}

🧠 <b>AI Analysis:</b>
• ${confidenceEmoji} <b>Confidence:</b> ${(tradeOrder.confidence * 100).toFixed(1)}%
• 🎯 <b>Strategy:</b> ${tradeOrder.strategy}
• ⚖️ <b>Risk/Reward:</b> 1:${calculations.riskReward.toFixed(2)}

📊 <b>Real-Time Market Data:</b>
• 💵 <b>Current Price:</b> $${marketData.currentPrice.toFixed(4)}
• 📈 <b>24h Change:</b> ${marketData.priceChangePercent24h >= 0 ? '+' : ''}${marketData.priceChangePercent24h.toFixed(2)}%
• 📊 <b>Volume:</b> ${this.formatVolume(marketData.volume24h)}
• 🔥 <b>High/Low:</b> $${marketData.high24h.toFixed(4)} / $${marketData.low24h.toFixed(4)}
• 📊 <b>Spread:</b> ${((marketData.ask - marketData.bid) / marketData.currentPrice * 100).toFixed(3)}%

📈 <b>Technical Analysis:</b>
• ${trendEmoji} <b>Trend:</b> ${calculations.trendDirection}
• ${sentimentEmoji} <b>Sentiment:</b> ${calculations.marketSentiment}
• ${volatilityEmoji} <b>Volatility:</b> ${calculations.volatilityLevel}
• 🎯 <b>Support:</b> $${marketData.technicalIndicators?.support.toFixed(4) || 'N/A'}
• 🚀 <b>Resistance:</b> $${marketData.technicalIndicators?.resistance.toFixed(4) || 'N/A'}

⚠️ <b>Risk Management:</b>
• 🛑 <b>Stop Loss:</b> $${tradeOrder.stopLoss?.toFixed(4) || 'N/A'}
• 🎯 <b>Take Profit:</b> $${tradeOrder.takeProfit?.toFixed(4) || 'N/A'}
• 📊 <b>Position Size:</b> ${tradeOrder.positionSize.toFixed(2)}%
• 💸 <b>Max Risk:</b> $${tradeOrder.maxRisk.toFixed(2)}

🖥️ <b>System Status:</b>
• 💻 <b>Load:</b> ${systemMetrics.systemLoad.toFixed(1)}%
• 🌐 <b>Latency:</b> ${systemMetrics.networkLatency}ms
• 🔒 <b>Tunnel:</b> ${systemMetrics.tunnelStatus}
• 🤖 <b>Trading:</b> ${systemMetrics.tradingStatus}

⏰ <i>${systemMetrics.timestamp.toLocaleString()}</i>
    `.trim();
  }

  /**
   * Generate trade update template for stop loss approaching
   */
  public static generateStopLossApproachingTemplate(context: TemplateContext): string {
    const { alert, position, marketData, calculations, systemMetrics } = context;
    
    if (!position || !marketData) {
      throw new Error('Position and market data required for stop loss template');
    }

    const distancePercent = Math.abs((position.currentPrice - position.stopLoss) / position.currentPrice * 100);
    const urgencyEmoji = distancePercent <= 1 ? '🚨' : distancePercent <= 3 ? '⚠️' : '📊';
    const pnlEmoji = position.unrealizedPnL >= 0 ? '💰' : '📉';
    const trendEmoji = this.getTrendEmoji(calculations.trendDirection);

    return `
${urgencyEmoji} <b>PRICE APPROACHING STOP LOSS</b> 🛑 <i>[Intel NUC]</i>

🎯 <b>Position Alert:</b>
• 💎 <b>Symbol:</b> ${position.symbol}
• 📉 <b>Current Price:</b> $${position.currentPrice.toFixed(4)}
• 🛑 <b>Stop Loss:</b> $${position.stopLoss.toFixed(4)}
• 📊 <b>Distance:</b> ${distancePercent.toFixed(2)}% (${Math.abs(position.currentPrice - position.stopLoss).toFixed(4)})

💰 <b>Position Details:</b>
• 📊 <b>Size:</b> ${position.size.toLocaleString()}
• 💵 <b>Entry Price:</b> $${position.entryPrice.toFixed(4)}
• ${pnlEmoji} <b>Unrealized P&L:</b> $${position.unrealizedPnL.toFixed(2)} (${position.unrealizedPnLPercent.toFixed(2)}%)
• ⏱️ <b>Duration:</b> ${this.formatDuration(position.duration)}
• 📈 <b>Max Profit:</b> $${position.maxProfit.toFixed(2)}
• 📉 <b>Max Drawdown:</b> $${position.maxDrawdown.toFixed(2)}

📊 <b>Real-Time Market Analysis:</b>
• 💵 <b>Current Price:</b> $${marketData.currentPrice.toFixed(4)}
• 📈 <b>24h Change:</b> ${marketData.priceChangePercent24h >= 0 ? '+' : ''}${marketData.priceChangePercent24h.toFixed(2)}%
• 📊 <b>Volume:</b> ${this.formatVolume(marketData.volume24h)}
• ${trendEmoji} <b>Trend:</b> ${calculations.trendDirection}
• 🎯 <b>Support Level:</b> $${marketData.technicalIndicators?.support.toFixed(4) || 'N/A'}

📈 <b>Technical Indicators:</b>
• 📊 <b>RSI:</b> ${marketData.technicalIndicators?.rsi.toFixed(1) || 'N/A'}
• 📈 <b>EMA20:</b> $${marketData.technicalIndicators?.ema20.toFixed(4) || 'N/A'}
• 📊 <b>Bollinger:</b> $${marketData.technicalIndicators?.bollinger.lower.toFixed(4) || 'N/A'} - $${marketData.technicalIndicators?.bollinger.upper.toFixed(4) || 'N/A'}

💡 <b>Recommendations:</b>
${distancePercent <= 1 ? '• 🚨 <b>URGENT:</b> Consider immediate action' : ''}
${distancePercent <= 3 ? '• ⚠️ Monitor closely for potential exit' : ''}
• 🔄 Consider adjusting stop loss if trend reverses
• 📊 Watch support level at $${marketData.technicalIndicators?.support.toFixed(4) || 'N/A'}
• 📈 Monitor volume for confirmation

⏰ <i>${systemMetrics.timestamp.toLocaleString()}</i>
    `.trim();
  }

  /**
   * Generate trade closed profit template
   */
  public static generateTradeClosedProfitTemplate(context: TemplateContext): string {
    const { alert, position, marketData, calculations, systemMetrics } = context;
    
    if (!position || !marketData) {
      throw new Error('Position and market data required for trade closed template');
    }

    const profitEmoji = position.realizedPnL > 1000 ? '🚀' : position.realizedPnL > 500 ? '💎' : position.realizedPnL > 100 ? '💰' : '📈';
    const returnPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice * 100);
    const performanceEmoji = returnPercent > 10 ? '🏆' : returnPercent > 5 ? '🎯' : '✅';

    return `
${profitEmoji} <b>PROFIT TARGET HIT!</b> 🎯 <i>[Intel NUC]</i>

💰 <b>Trade Summary:</b>
• 💎 <b>Symbol:</b> ${position.symbol}
• ${performanceEmoji} <b>Realized P&L:</b> $${position.realizedPnL.toFixed(2)}
• 📊 <b>Return:</b> ${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(2)}%
• ⏱️ <b>Duration:</b> ${this.formatDuration(position.duration)}

📈 <b>Execution Details:</b>
• 💵 <b>Entry Price:</b> $${position.entryPrice.toFixed(4)}
• 🎯 <b>Exit Price:</b> $${position.currentPrice.toFixed(4)}
• 📊 <b>Quantity:</b> ${position.size.toLocaleString()}
• 💎 <b>Total Value:</b> $${(position.size * position.currentPrice).toLocaleString()}

📊 <b>Performance Metrics:</b>
• 🏆 <b>Max Profit:</b> $${position.maxProfit.toFixed(2)}
• 📉 <b>Max Drawdown:</b> $${position.maxDrawdown.toFixed(2)}
• 📈 <b>Profit Factor:</b> ${(position.maxProfit / Math.abs(position.maxDrawdown) || 1).toFixed(2)}
• ⚖️ <b>Risk/Reward:</b> 1:${calculations.riskReward.toFixed(2)}

📊 <b>Market Context at Exit:</b>
• 💵 <b>Market Price:</b> $${marketData.currentPrice.toFixed(4)}
• 📈 <b>24h Change:</b> ${marketData.priceChangePercent24h >= 0 ? '+' : ''}${marketData.priceChangePercent24h.toFixed(2)}%
• 📊 <b>Volume:</b> ${this.formatVolume(marketData.volume24h)}
• 🎯 <b>Resistance Hit:</b> $${marketData.technicalIndicators?.resistance.toFixed(4) || 'N/A'}

💎 <b>Portfolio Impact:</b>
• 💰 <b>Profit Contribution:</b> ${calculations.profitLossPercent.toFixed(2)}%
• 📊 <b>Position Value:</b> $${calculations.positionValue.toLocaleString()}
• 🎯 <b>Strategy Performance:</b> Excellent execution!

🎉 <b>Achievement Unlocked:</b>
${position.realizedPnL > 1000 ? '🚀 <b>Big Winner!</b> Over $1000 profit!' : ''}
${returnPercent > 20 ? '💎 <b>Exceptional Return!</b> Over 20% gain!' : ''}
${position.duration < 60 ? '⚡ <b>Quick Profit!</b> Under 1 hour!' : ''}

⏰ <i>${systemMetrics.timestamp.toLocaleString()}</i>
    `.trim();
  }

  /**
   * Generate API error template with system context
   */
  public static generateAPIErrorTemplate(context: TemplateContext): string {
    const { alert, systemMetrics } = context;
    
    if (!alert.errorContext) {
      throw new Error('Error context required for API error template');
    }

    const error = alert.errorContext;
    const severityEmoji = this.getSeverityEmoji(alert.severity);
    const componentEmoji = this.getComponentEmoji(error.component);
    const statusEmoji = error.retryAttempts < error.maxRetries ? '🔄' : '🚨';

    return `
${severityEmoji} <b>API CONNECTION ERROR</b> ❌ <i>[Intel NUC]</i>

🔧 <b>Error Details:</b>
• ${componentEmoji} <b>Component:</b> ${error.component}
• ⚠️ <b>Error:</b> ${error.errorMessage}
• 🔢 <b>Code:</b> ${error.errorCode}
• 📊 <b>Type:</b> ${error.errorType}

🔄 <b>Recovery Status:</b>
• ${statusEmoji} <b>Retry:</b> ${error.retryAttempts}/${error.maxRetries}
• ⏰ <b>Next Attempt:</b> ${error.nextRetryTime?.toLocaleTimeString() || 'Immediate'}
• 🛠️ <b>Action:</b> ${error.recoveryAction || 'Automatic retry'}
• ⏱️ <b>First Seen:</b> ${error.firstOccurrence.toLocaleTimeString()}

🖥️ <b>System Health:</b>
• 💻 <b>CPU Load:</b> ${error.systemLoad?.toFixed(1) || systemMetrics.systemLoad.toFixed(1)}%
• 💾 <b>Memory:</b> ${error.memoryUsage?.toFixed(1) || 'N/A'}%
• 🌐 <b>Network:</b> ${error.networkLatency || systemMetrics.networkLatency}ms
• 🔒 <b>SSH Tunnel:</b> ${systemMetrics.tunnelStatus}

💼 <b>Trading Impact:</b>
• 🤖 <b>Trading Status:</b> ${systemMetrics.tradingStatus}
• ⚠️ <b>Operations:</b> ${error.component.includes('trading') ? 'May be affected' : 'Continuing normally'}
• 📊 <b>Data Feed:</b> ${error.component.includes('market') ? 'Degraded' : 'Normal'}

🔧 <b>Automatic Actions:</b>
• 🔄 Retry mechanism active
• 📊 Monitoring system health
• 🚨 Escalation if retries fail
• 📧 Admin notification sent

${error.retryAttempts >= error.maxRetries ? '🚨 <b>CRITICAL:</b> Max retries exceeded! Manual intervention required.' : ''}

⏰ <i>${systemMetrics.timestamp.toLocaleString()}</i>
    `.trim();
  }

  // Helper methods for emoji selection
  private static getConfidenceEmoji(confidence: number): string {
    if (confidence >= 0.9) return '🎯';
    if (confidence >= 0.8) return '✅';
    if (confidence >= 0.7) return '👍';
    if (confidence >= 0.6) return '⚖️';
    return '❓';
  }

  private static getSentimentEmoji(sentiment: string): string {
    switch (sentiment.toLowerCase()) {
      case 'very positive': return '😊';
      case 'positive': return '🙂';
      case 'neutral': return '😐';
      case 'negative': return '😕';
      case 'very negative': return '😰';
      default: return '❓';
    }
  }

  private static getTrendEmoji(trend: string): string {
    switch (trend.toLowerCase()) {
      case 'strong bullish': return '🚀';
      case 'bullish': return '📈';
      case 'neutral': return '➡️';
      case 'bearish': return '📉';
      case 'strong bearish': return '💥';
      default: return '❓';
    }
  }

  private static getVolatilityEmoji(volatility: string): string {
    switch (volatility.toLowerCase()) {
      case 'very high': return '🌪️';
      case 'high': return '⚡';
      case 'medium': return '📊';
      case 'low': return '😴';
      case 'very low': return '🧊';
      default: return '❓';
    }
  }

  private static getSeverityEmoji(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }

  private static getComponentEmoji(component: string): string {
    if (component.toLowerCase().includes('api')) return '🔌';
    if (component.toLowerCase().includes('database')) return '🗄️';
    if (component.toLowerCase().includes('network')) return '🌐';
    if (component.toLowerCase().includes('trading')) return '💹';
    if (component.toLowerCase().includes('market')) return '📊';
    return '🔧';
  }

  private static formatVolume(volume: number): string {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(2)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  }

  private static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) return `${days}d ${remainingHours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }
}

/**
 * Enhanced Email template generator
 */
export class EnhancedEmailTemplates {
  /**
   * Generate new trade order email template
   */
  public static generateNewTradeOrderEmailTemplate(context: TemplateContext): string {
    const { alert, tradeOrder, marketData, calculations, systemMetrics } = context;
    
    if (!tradeOrder || !marketData) {
      throw new Error('Trade order and market data required for email template');
    }

    const sideColor = tradeOrder.side === 'BUY' ? '#28a745' : '#dc3545';
    const profitColor = calculations.profitLoss >= 0 ? '#28a745' : '#dc3545';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Trade Order - ${tradeOrder.symbol}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .trade-card { background: #f8f9fa; border-radius: 12px; padding: 25px; margin: 20px 0; border-left: 5px solid ${sideColor}; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #666; font-size: 14px; }
        .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .status-success { background: #d4edda; color: #155724; }
        .status-warning { background: #fff3cd; color: #856404; }
        .status-danger { background: #f8d7da; color: #721c24; }
        .footer { background: #343a40; color: white; padding: 20px; text-align: center; font-size: 12px; }
        .chart-placeholder { background: #e9ecef; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6c757d; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 New Trade Order Placed</h1>
            <p>AI Crypto Trading Agent - Intel NUC</p>
            <div class="status-badge status-success">Order Placed Successfully</div>
        </div>
        
        <div class="content">
            <div class="trade-card">
                <h2 style="margin-top: 0; color: ${sideColor};">${tradeOrder.side} ${tradeOrder.symbol}</h2>
                <div class="metric-grid">
                    <div class="metric-card">
                        <div class="metric-label">Quantity</div>
                        <div class="metric-value">${tradeOrder.quantity.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Price</div>
                        <div class="metric-value">$${tradeOrder.price?.toFixed(4) || 'Market'}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Total Value</div>
                        <div class="metric-value">$${calculations.positionValue.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Confidence</div>
                        <div class="metric-value">${(tradeOrder.confidence * 100).toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            <h3>📊 Real-Time Market Analysis</h3>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">Current Price</div>
                    <div class="metric-value">$${marketData.currentPrice.toFixed(4)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">24h Change</div>
                    <div class="metric-value" style="color: ${marketData.priceChangePercent24h >= 0 ? '#28a745' : '#dc3545'};">
                        ${marketData.priceChangePercent24h >= 0 ? '+' : ''}${marketData.priceChangePercent24h.toFixed(2)}%
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Volume (24h)</div>
                    <div class="metric-value">${this.formatVolume(marketData.volume24h)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Market Sentiment</div>
                    <div class="metric-value">${calculations.marketSentiment}</div>
                </div>
            </div>

            <h3>⚠️ Risk Management</h3>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                    <div>
                        <strong>Stop Loss:</strong> $${tradeOrder.stopLoss?.toFixed(4) || 'N/A'}<br>
                        <strong>Take Profit:</strong> $${tradeOrder.takeProfit?.toFixed(4) || 'N/A'}
                    </div>
                    <div>
                        <strong>Risk/Reward:</strong> 1:${calculations.riskReward.toFixed(2)}<br>
                        <strong>Max Risk:</strong> $${tradeOrder.maxRisk.toFixed(2)}
                    </div>
                </div>
            </div>

            <h3>📈 Technical Indicators</h3>
            <div class="chart-placeholder">
                📊 Technical Analysis Chart<br>
                <small>RSI: ${marketData.technicalIndicators?.rsi.toFixed(1) || 'N/A'} | 
                Support: $${marketData.technicalIndicators?.support.toFixed(4) || 'N/A'} | 
                Resistance: $${marketData.technicalIndicators?.resistance.toFixed(4) || 'N/A'}</small>
            </div>

            <h3>🖥️ System Status</h3>
            <div style="background: #e9ecef; padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div><strong>System Load:</strong> ${systemMetrics.systemLoad.toFixed(1)}%</div>
                    <div><strong>Network Latency:</strong> ${systemMetrics.networkLatency}ms</div>
                    <div><strong>SSH Tunnel:</strong> ${systemMetrics.tunnelStatus}</div>
                    <div><strong>Trading Status:</strong> ${systemMetrics.tradingStatus}</div>
                </div>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #d1ecf1; border-radius: 8px;">
                <h4 style="margin-top: 0;">📋 Order Summary</h4>
                <p><strong>Strategy:</strong> ${tradeOrder.strategy}</p>
                <p><strong>Order Type:</strong> ${tradeOrder.type}</p>
                <p><strong>Time in Force:</strong> ${tradeOrder.timeInForce}</p>
                <p><strong>Execution Time:</strong> ${systemMetrics.timestamp.toLocaleString()}</p>
            </div>
        </div>

        <div class="footer">
            <p>AI Crypto Trading Agent - Intel NUC Deployment</p>
            <p>Generated at ${systemMetrics.timestamp.toLocaleString()}</p>
            <p style="margin-top: 10px; font-size: 10px; opacity: 0.7;">
                This is an automated notification. Please do not reply to this email.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate trade closed profit email template
   */
  public static generateTradeClosedProfitEmailTemplate(context: TemplateContext): string {
    const { alert, position, marketData, calculations, systemMetrics } = context;
    
    if (!position || !marketData) {
      throw new Error('Position and market data required for email template');
    }

    const profitColor = position.realizedPnL >= 0 ? '#28a745' : '#dc3545';
    const returnPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice * 100);

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profit Target Hit - ${position.symbol}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 800px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white; }
        .content { padding: 30px; }
        .profit-highlight { background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
        .profit-amount { font-size: 36px; font-weight: bold; color: ${profitColor}; margin: 15px 0; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; margin: 10px 0; }
        .metric-label { color: #666; font-size: 14px; }
        .performance-chart { background: #e9ecef; height: 250px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6c757d; margin: 20px 0; }
        .footer { background: #343a40; color: white; padding: 20px; text-align: center; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Profit Target Hit!</h1>
            <p>Congratulations! Your trade has reached its profit target</p>
        </div>
        
        <div class="content">
            <div class="profit-highlight">
                <h2 style="margin-top: 0;">${position.symbol} Trade Completed</h2>
                <div class="profit-amount">$${position.realizedPnL.toFixed(2)}</div>
                <p style="font-size: 18px; margin: 0;">Realized Profit (${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(2)}%)</p>
            </div>

            <h3>📊 Trade Performance</h3>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">Entry Price</div>
                    <div class="metric-value">$${position.entryPrice.toFixed(4)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Exit Price</div>
                    <div class="metric-value">$${position.currentPrice.toFixed(4)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Duration</div>
                    <div class="metric-value">${this.formatDuration(position.duration)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Return %</div>
                    <div class="metric-value" style="color: ${profitColor};">${returnPercent >= 0 ? '+' : ''}${returnPercent.toFixed(2)}%</div>
                </div>
            </div>

            <h3>📈 Performance Metrics</h3>
            <div class="performance-chart">
                📊 Trade Performance Chart<br>
                <small>Max Profit: $${position.maxProfit.toFixed(2)} | Max Drawdown: $${position.maxDrawdown.toFixed(2)}</small>
            </div>

            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-label">Max Profit</div>
                    <div class="metric-value" style="color: #28a745;">$${position.maxProfit.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Max Drawdown</div>
                    <div class="metric-value" style="color: #dc3545;">$${position.maxDrawdown.toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Profit Factor</div>
                    <div class="metric-value">${(position.maxProfit / Math.abs(position.maxDrawdown) || 1).toFixed(2)}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Risk/Reward</div>
                    <div class="metric-value">1:${calculations.riskReward.toFixed(2)}</div>
                </div>
            </div>

            <h3>📊 Market Context at Exit</h3>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <div class="metric-grid">
                    <div>
                        <strong>Market Price:</strong> $${marketData.currentPrice.toFixed(4)}<br>
                        <strong>24h Change:</strong> <span style="color: ${marketData.priceChangePercent24h >= 0 ? '#28a745' : '#dc3545'};">
                            ${marketData.priceChangePercent24h >= 0 ? '+' : ''}${marketData.priceChangePercent24h.toFixed(2)}%
                        </span>
                    </div>
                    <div>
                        <strong>Volume:</strong> ${this.formatVolume(marketData.volume24h)}<br>
                        <strong>Trend:</strong> ${calculations.trendDirection}
                    </div>
                </div>
            </div>

            ${position.realizedPnL > 1000 ? `
            <div style="background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h4 style="margin-top: 0;">🏆 Achievement Unlocked!</h4>
                <p style="margin: 0; font-size: 16px;"><strong>Big Winner!</strong> Profit over $1,000!</p>
            </div>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background: #d1ecf1; border-radius: 8px;">
                <h4 style="margin-top: 0;">📋 Trade Summary</h4>
                <p><strong>Position Size:</strong> ${position.size.toLocaleString()}</p>
                <p><strong>Total Value:</strong> $${(position.size * position.currentPrice).toLocaleString()}</p>
                <p><strong>Execution Time:</strong> ${systemMetrics.timestamp.toLocaleString()}</p>
            </div>
        </div>

        <div class="footer">
            <p>🎉 Excellent execution! Keep up the great work!</p>
            <p>AI Crypto Trading Agent - Intel NUC Deployment</p>
            <p>Generated at ${systemMetrics.timestamp.toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  private static formatVolume(volume: number): string {
    if (volume >= 1000000000) return `${(volume / 1000000000).toFixed(2)}B`;
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(2)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(2)}K`;
    return volume.toFixed(2);
  }

  private static formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) return `${days}d ${remainingHours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }
}

/**
 * Template context calculator for real-time data
 */
export class TemplateContextCalculator {
  /**
   * Calculate template context with real-time data
   */
  public static calculateContext(
    alert: EnhancedAlert,
    marketData?: RealTimeMarketData,
    systemMetrics?: any
  ): TemplateContext {
    const calculations = this.calculateMetrics(alert, marketData);
    const defaultSystemMetrics = systemMetrics || this.getDefaultSystemMetrics();

    return {
      alert,
      marketData,
      tradeOrder: alert.tradeOrder,
      position: alert.position,
      calculations,
      systemMetrics: defaultSystemMetrics
    };
  }

  /**
   * Calculate profit/loss and other metrics
   */
  private static calculateMetrics(alert: EnhancedAlert, marketData?: RealTimeMarketData) {
    let profitLoss = 0;
    let profitLossPercent = 0;
    let riskReward = 1;
    let positionValue = 0;

    // Calculate based on trade order
    if (alert.tradeOrder && marketData) {
      const order = alert.tradeOrder;
      positionValue = order.quantity * (order.price || marketData.currentPrice);
      riskReward = order.riskReward;
    }

    // Calculate based on position
    if (alert.position) {
      const position = alert.position;
      profitLoss = position.unrealizedPnL || position.realizedPnL || 0;
      profitLossPercent = position.unrealizedPnLPercent || 0;
      positionValue = position.size * position.currentPrice;
    }

    // Calculate market sentiment
    const marketSentiment = this.calculateMarketSentiment(marketData);
    const trendDirection = this.calculateTrendDirection(marketData);
    const volatilityLevel = this.calculateVolatilityLevel(marketData);

    return {
      profitLoss,
      profitLossPercent,
      riskReward,
      positionValue,
      marketSentiment,
      trendDirection,
      volatilityLevel
    };
  }

  private static calculateMarketSentiment(marketData?: RealTimeMarketData): string {
    if (!marketData?.sentiment) return 'Neutral';
    
    const sentiment = marketData.sentiment.overall;
    if (sentiment >= 0.6) return 'Very Positive';
    if (sentiment >= 0.2) return 'Positive';
    if (sentiment >= -0.2) return 'Neutral';
    if (sentiment >= -0.6) return 'Negative';
    return 'Very Negative';
  }

  private static calculateTrendDirection(marketData?: RealTimeMarketData): string {
    if (!marketData) return 'Neutral';
    
    const change = marketData.priceChangePercent24h;
    if (change >= 10) return 'Strong Bullish';
    if (change >= 3) return 'Bullish';
    if (change >= -3) return 'Neutral';
    if (change >= -10) return 'Bearish';
    return 'Strong Bearish';
  }

  private static calculateVolatilityLevel(marketData?: RealTimeMarketData): string {
    if (!marketData) return 'Medium';
    
    const range = ((marketData.high24h - marketData.low24h) / marketData.currentPrice) * 100;
    if (range >= 15) return 'Very High';
    if (range >= 8) return 'High';
    if (range >= 3) return 'Medium';
    if (range >= 1) return 'Low';
    return 'Very Low';
  }

  private static getDefaultSystemMetrics() {
    return {
      timestamp: new Date(),
      systemLoad: 45.2,
      networkLatency: 23,
      tunnelStatus: 'Healthy',
      tradingStatus: 'Active'
    };
  }
}

export default {
  EnhancedTelegramTemplates,
  EnhancedEmailTemplates,
  TemplateContextCalculator
};