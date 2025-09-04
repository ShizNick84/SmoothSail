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
export { EmailNotificationType, EmailPriority } from './email-service';
export type { EmailConfig, EmailData } from './email-service';

// Telegram service
export { default as TelegramService } from './telegram-service';
export { TelegramNotificationType, TelegramPriority } from './telegram-service';
export type { TelegramNotification, TelegramDeliveryStatus, BotCommand, TelegramTradingData, TelegramSystemData } from './telegram-service';

// Notification router
export { default as NotificationRouter } from './notification-router';
export { NotificationChannel, AlertPriority, AlertCategory } from './notification-router';
export type { NotificationRule, NotificationCondition, EscalationRule, RateLimitRule, Alert, DeliveryResult } from './notification-router';

// Trading notifications
export { default as TradingNotifications } from './trading-notifications';
export { TradingEventType, SystemEventType } from './trading-notifications';
export type { TradeExecutionData, PositionData, PerformanceSummaryData, StrategyPerformance, SystemHealthData } from './trading-notifications';
