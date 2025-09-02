/**
 * =============================================================================
 * NOTIFICATION SYSTEM EXPORTS
 * =============================================================================
 * 
 * Central export file for the comprehensive notification system of the
 * AI crypto trading agent. Provides easy access to all notification
 * services and utilities.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

// Main notification manager
export { default as NotificationManager } from './notification-manager';
export type { NotificationManagerConfig, ServiceHealthStatus } from './notification-manager';

// Email service
export { default as EmailService } from './email-service';
export {
  EmailNotificationType,
  EmailPriority,
  type EmailNotification,
  type EmailAttachment,
  type EmailDeliveryStatus,
  type SMTPConfig,
  type EmailTemplateData
} from './email-service';

// Telegram service
export { default as TelegramService } from './telegram-service';
export {
  TelegramNotificationType,
  TelegramPriority,
  type TelegramNotification,
  type TelegramDeliveryStatus,
  type BotCommand,
  type TelegramTradingData,
  type TelegramSystemData
} from './telegram-service';

// Notification router
export { default as NotificationRouter } from './notification-router';
export {
  NotificationChannel,
  AlertPriority,
  AlertCategory,
  type NotificationRule,
  type NotificationCondition,
  type EscalationRule,
  type RateLimitRule,
  type Alert,
  type DeliveryResult
} from './notification-router';

// Trading notifications
export { default as TradingNotifications } from './trading-notifications';
export {
  TradingEventType,
  SystemEventType,
  type TradeExecutionData,
  type PositionData,
  type PerformanceSummaryData,
  type StrategyPerformance,
  type SystemHealthData
} from './trading-notifications';

/**
 * Convenience function to create and initialize notification manager
 */
export async function createNotificationManager(config?: Partial<NotificationManagerConfig>): Promise<NotificationManager> {
  const manager = new NotificationManager(config);
  await manager.initialize();
  return manager;
}

/**
 * Default notification manager instance (singleton pattern)
 */
let defaultNotificationManager: NotificationManager | null = null;

/**
 * Get or create the default notification manager instance
 */
export async function getNotificationManager(config?: Partial<NotificationManagerConfig>): Promise<NotificationManager> {
  if (!defaultNotificationManager) {
    defaultNotificationManager = await createNotificationManager(config);
  }
  return defaultNotificationManager;
}

/**
 * Reset the default notification manager (useful for testing)
 */
export function resetNotificationManager(): void {
  defaultNotificationManager = null;
}

// Re-export types for convenience
export type {
  NotificationManagerConfig,
  ServiceHealthStatus,
  EmailNotification,
  EmailAttachment,
  EmailDeliveryStatus,
  SMTPConfig,
  EmailTemplateData,
  TelegramNotification,
  TelegramDeliveryStatus,
  BotCommand,
  TelegramTradingData,
  TelegramSystemData,
  NotificationRule,
  NotificationCondition,
  EscalationRule,
  RateLimitRule,
  Alert,
  DeliveryResult,
  TradeExecutionData,
  PositionData,
  PerformanceSummaryData,
  StrategyPerformance,
  SystemHealthData
};
