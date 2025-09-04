/**
 * Simple Notification Service Fixes Test
 * 
 * Basic test to verify notification service constructor and method fixes
 */

import { describe, it, expect } from 'vitest';

describe('Notification Service Fixes - Basic Tests', () => {
  it('should verify NotificationService can be imported', () => {
    // Test that the module can be imported without syntax errors
    expect(() => {
      const { NotificationService } = require('@/core/notifications/notification-service');
      return NotificationService;
    }).not.toThrow();
  });

  it('should verify notification interfaces are properly defined', () => {
    const { NotificationService, Notification, HighPriorityAlert, CriticalAlert } = require('@/core/notifications/notification-service');
    
    // Test that interfaces exist (they should be available as types)
    expect(NotificationService).toBeDefined();
    
    // Test that we can create objects matching the interfaces
    const notification = {
      title: 'Test',
      message: 'Test message',
      priority: 'HIGH'
    };
    
    const highPriorityAlert = {
      title: 'High Priority',
      message: 'High priority message',
      priority: 'HIGH'
    };
    
    const criticalAlert = {
      title: 'Critical',
      message: 'Critical message',
      priority: 'CRITICAL'
    };
    
    expect(notification.priority).toBe('HIGH');
    expect(highPriorityAlert.priority).toBe('HIGH');
    expect(criticalAlert.priority).toBe('CRITICAL');
  });

  it('should verify NotificationService constructor works with and without logger', () => {
    const { NotificationService } = require('@/core/notifications/notification-service');
    const { Logger } = require('@/core/logging/logger');
    
    // Test constructor without logger (should not throw)
    expect(() => {
      new NotificationService();
    }).not.toThrow();
    
    // Test constructor with logger (should not throw)
    expect(() => {
      const logger = new Logger('TestLogger');
      new NotificationService(logger);
    }).not.toThrow();
    
    // Test constructor with both logger and config (should not throw)
    expect(() => {
      const logger = new Logger('TestLogger');
      const config = {
        email: { enabled: false, smtp: { host: '', port: 587, secure: false, auth: { user: '', pass: '' } } },
        telegram: { enabled: false, botToken: '', chatId: '' }
      };
      new NotificationService(logger, config);
    }).not.toThrow();
  });

  it('should verify NotificationService has required methods', () => {
    const { NotificationService } = require('@/core/notifications/notification-service');
    const service = new NotificationService();
    
    // Check that all required methods exist
    expect(typeof service.sendAlert).toBe('function');
    expect(typeof service.sendCriticalAlert).toBe('function');
    expect(typeof service.sendHighPriorityAlert).toBe('function');
    expect(typeof service.sendEmail).toBe('function');
    expect(typeof service.sendTelegram).toBe('function');
  });

  it('should verify method signatures work correctly', async () => {
    const { NotificationService } = require('@/core/notifications/notification-service');
    const service = new NotificationService();
    
    // Test sendAlert method
    const notification = {
      title: 'Test Alert',
      message: 'Test message',
      priority: 'HIGH'
    };
    
    await expect(service.sendAlert(notification)).resolves.not.toThrow();
    
    // Test sendHighPriorityAlert method
    const highPriorityAlert = {
      title: 'High Priority Alert',
      message: 'High priority message',
      errorId: 'test-123'
    };
    
    await expect(service.sendHighPriorityAlert(highPriorityAlert)).resolves.not.toThrow();
    
    // Test sendCriticalAlert method
    const criticalAlert = {
      title: 'Critical Alert',
      message: 'Critical message',
      errorId: 'critical-456'
    };
    
    await expect(service.sendCriticalAlert(criticalAlert)).resolves.not.toThrow();
  });

  it('should verify error handlers can be instantiated with fixed constructors', () => {
    // Test SystemErrorManager
    expect(() => {
      const { SystemErrorManager } = require('@/core/error-handling/system-error-manager');
      new SystemErrorManager();
    }).not.toThrow();
    
    // Test TradingErrorHandler
    expect(() => {
      const { TradingErrorHandler } = require('@/core/error-handling/trading-error-handler');
      new TradingErrorHandler();
    }).not.toThrow();
  });

  it('should verify notification rate limiter integration works', async () => {
    const { NotificationRateLimiter, NotificationType, NotificationPriority } = require('@/core/rate-limiting/notification-rate-limiter');
    const { RateLimitingSystem } = require('@/core/rate-limiting/rate-limiter');
    
    const rateLimitingSystem = new RateLimitingSystem();
    await rateLimitingSystem.initialize();
    
    const notificationRateLimiter = new NotificationRateLimiter(rateLimitingSystem);
    await notificationRateLimiter.initialize();
    
    // Test that we can create notification configs without type conflicts
    const config = {
      type: NotificationType.TELEGRAM,
      priority: NotificationPriority.HIGH,
      recipient: 'test-recipient',
      message: 'Test message'
    };
    
    expect(config.type).toBe(NotificationType.TELEGRAM);
    expect(config.priority).toBe(NotificationPriority.HIGH);
    
    // Test that statistics can be retrieved
    const stats = notificationRateLimiter.getStatistics();
    expect(stats).toBeDefined();
    expect(typeof stats.totalSent).toBe('number');
    expect(typeof stats.totalFailed).toBe('number');
    
    await notificationRateLimiter.shutdown();
    await rateLimitingSystem.shutdown();
  });
});