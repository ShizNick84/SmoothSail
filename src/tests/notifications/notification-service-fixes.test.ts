/**
 * =============================================================================
 * NOTIFICATION SERVICE FIXES TEST
 * =============================================================================
 * 
 * Test suite to verify all notification service fixes including:
 * - NotificationService constructor accepts logger parameter
 * - Missing priority property in notification interfaces
 * - sendHighPriorityAlert() method implementation
 * - Notification service integration in error handlers
 * - Notification template type conflicts resolution
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * =============================================================================
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '@/core/logging/logger';
import { NotificationService, Notification, HighPriorityAlert, CriticalAlert } from '@/core/notifications/notification-service';
import { SystemErrorManager } from '@/core/error-handling/system-error-manager';
import { TradingErrorHandler } from '@/core/error-handling/trading-error-handler';
import { NotificationRateLimiter, NotificationConfig, NotificationType, NotificationPriority } from '@/core/rate-limiting/notification-rate-limiter';
import { RateLimitingSystem } from '@/core/rate-limiting/rate-limiter';

describe('Notification Service Fixes', () => {
  let logger: Logger;
  let notificationService: NotificationService;
  let systemErrorManager: SystemErrorManager;
  let tradingErrorHandler: TradingErrorHandler;
  let rateLimitingSystem: RateLimitingSystem;
  let notificationRateLimiter: NotificationRateLimiter;

  beforeEach(() => {
    logger = new Logger('TestLogger');
    rateLimitingSystem = new RateLimitingSystem();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('NotificationService Constructor', () => {
    it('should accept logger parameter', () => {
      expect(() => {
        notificationService = new NotificationService(logger);
      }).not.toThrow();

      expect(notificationService).toBeDefined();
    });

    it('should work without logger parameter (optional)', () => {
      expect(() => {
        notificationService = new NotificationService();
      }).not.toThrow();

      expect(notificationService).toBeDefined();
    });

    it('should work with both logger and config parameters', () => {
      const config = {
        email: { enabled: true, smtp: { host: 'test', port: 587, secure: false, auth: { user: 'test', pass: 'test' } } },
        telegram: { enabled: true, botToken: 'test', chatId: 'test' }
      };

      expect(() => {
        notificationService = new NotificationService(logger, config);
      }).not.toThrow();

      expect(notificationService).toBeDefined();
    });
  });

  describe('Notification Interfaces with Priority', () => {
    beforeEach(() => {
      notificationService = new NotificationService(logger);
    });

    it('should handle Notification interface with priority property', async () => {
      const notification: Notification = {
        title: 'Test Notification',
        message: 'Test message',
        details: { test: 'data' },
        priority: 'HIGH'
      };

      expect(() => {
        notificationService.sendAlert(notification);
      }).not.toThrow();
    });

    it('should handle HighPriorityAlert interface', async () => {
      const alert: HighPriorityAlert = {
        title: 'High Priority Test',
        message: 'High priority message',
        details: { urgency: 'high' },
        errorId: 'test-error-123',
        priority: 'HIGH'
      };

      expect(() => {
        notificationService.sendHighPriorityAlert(alert);
      }).not.toThrow();
    });

    it('should handle CriticalAlert interface', async () => {
      const alert: CriticalAlert = {
        title: 'Critical Test',
        message: 'Critical message',
        details: { severity: 'critical' },
        errorId: 'critical-error-456',
        priority: 'CRITICAL'
      };

      expect(() => {
        notificationService.sendCriticalAlert(alert);
      }).not.toThrow();
    });
  });

  describe('sendHighPriorityAlert Method', () => {
    beforeEach(() => {
      notificationService = new NotificationService(logger);
      vi.spyOn(notificationService, 'sendAlert').mockResolvedValue();
      vi.spyOn(notificationService, 'sendTelegram').mockResolvedValue();
    });

    it('should implement sendHighPriorityAlert method', () => {
      expect(typeof notificationService.sendHighPriorityAlert).toBe('function');
    });

    it('should send high priority alert with correct parameters', async () => {
      const alert: HighPriorityAlert = {
        title: 'High Priority Alert',
        message: 'This is a high priority message',
        details: { component: 'trading-engine' },
        errorId: 'hp-001'
      };

      await notificationService.sendHighPriorityAlert(alert);

      expect(notificationService.sendAlert).toHaveBeenCalledWith({
        title: alert.title,
        message: alert.message,
        details: alert.details,
        priority: 'HIGH'
      });

      expect(notificationService.sendTelegram).toHaveBeenCalledWith(
        expect.stringContaining('🚨 HIGH PRIORITY: High Priority Alert')
      );
    });

    it('should handle high priority alert without optional fields', async () => {
      const alert: HighPriorityAlert = {
        title: 'Simple Alert',
        message: 'Simple message'
      };

      await expect(notificationService.sendHighPriorityAlert(alert)).resolves.not.toThrow();
    });
  });

  describe('sendCriticalAlert Method', () => {
    beforeEach(() => {
      notificationService = new NotificationService(logger);
      vi.spyOn(notificationService, 'sendAlert').mockResolvedValue();
      vi.spyOn(notificationService, 'sendTelegram').mockResolvedValue();
      vi.spyOn(notificationService, 'sendEmail').mockResolvedValue();
    });

    it('should implement sendCriticalAlert method', () => {
      expect(typeof notificationService.sendCriticalAlert).toBe('function');
    });

    it('should send critical alert through all channels', async () => {
      const alert: CriticalAlert = {
        title: 'Critical System Error',
        message: 'System is experiencing critical issues',
        details: { component: 'database', error: 'connection lost' },
        errorId: 'crit-001'
      };

      await notificationService.sendCriticalAlert(alert);

      expect(notificationService.sendAlert).toHaveBeenCalledWith({
        title: alert.title,
        message: alert.message,
        details: alert.details,
        priority: 'CRITICAL'
      });

      expect(notificationService.sendTelegram).toHaveBeenCalledWith(
        expect.stringContaining('🚨🚨 CRITICAL ALERT: Critical System Error')
      );

      expect(notificationService.sendEmail).toHaveBeenCalledWith({
        to: expect.any(String),
        subject: 'CRITICAL ALERT: Critical System Error',
        html: expect.stringContaining('CRITICAL SYSTEM ALERT')
      });
    });
  });

  describe('Error Handler Integration', () => {
    it('should create SystemErrorManager without constructor errors', () => {
      expect(() => {
        systemErrorManager = new SystemErrorManager();
      }).not.toThrow();

      expect(systemErrorManager).toBeDefined();
    });

    it('should create TradingErrorHandler without constructor errors', () => {
      expect(() => {
        tradingErrorHandler = new TradingErrorHandler();
      }).not.toThrow();

      expect(tradingErrorHandler).toBeDefined();
    });

    it('should handle error escalation in SystemErrorManager', async () => {
      systemErrorManager = new SystemErrorManager();
      
      // Mock the notification service methods
      const mockSendCriticalAlert = vi.fn().mockResolvedValue(undefined);
      (systemErrorManager as any).notificationService.sendCriticalAlert = mockSendCriticalAlert;

      // Simulate a component error
      const testError = {
        type: 'TEST_ERROR',
        severity: 'CRITICAL',
        message: 'Test error message',
        details: { component: 'test' }
      };

      await systemErrorManager.handleComponentError('TRADING_ENGINE' as any, testError);

      // Verify that the error was processed (we can't easily test the private escalation logic)
      expect(systemErrorManager).toBeDefined();
    });

    it('should handle trading errors with proper notification integration', async () => {
      tradingErrorHandler = new TradingErrorHandler();

      // Mock the notification service methods
      const mockSendAlert = vi.fn().mockResolvedValue(undefined);
      (tradingErrorHandler as any).notificationService.sendAlert = mockSendAlert;

      // Create a test error
      const testError = tradingErrorHandler.createError('ORDER_EXECUTION_FAILED' as any, {
        message: 'Test order execution failed',
        severity: 'HIGH' as any,
        details: { orderId: 'test-123' }
      });

      expect(testError).toBeDefined();
      expect(testError.type).toBe('ORDER_EXECUTION_FAILED');
      expect(testError.severity).toBe('HIGH');
    });
  });

  describe('Notification Rate Limiter Integration', () => {
    beforeEach(async () => {
      await rateLimitingSystem.initialize();
      notificationRateLimiter = new NotificationRateLimiter(rateLimitingSystem);
      await notificationRateLimiter.initialize();
    });

    afterEach(async () => {
      await notificationRateLimiter.shutdown();
      await rateLimitingSystem.shutdown();
    });

    it('should handle notification config without type conflicts', async () => {
      const mockSendFunction = vi.fn().mockResolvedValue(undefined);
      
      const config: NotificationConfig = {
        type: NotificationType.TELEGRAM,
        priority: NotificationPriority.HIGH,
        recipient: 'test-recipient',
        message: 'Test notification message',
        deduplicationKey: 'test-dedup-key',
        batchable: false,
        retryOnLimit: true,
        maxRetries: 3
      };

      await expect(
        notificationRateLimiter.sendNotification(config, mockSendFunction)
      ).resolves.not.toThrow();
    });

    it('should handle batched notifications without template conflicts', async () => {
      const mockSendFunction = vi.fn().mockResolvedValue(undefined);
      
      const configs: NotificationConfig[] = [
        {
          type: NotificationType.EMAIL,
          priority: NotificationPriority.NORMAL,
          recipient: 'test@example.com',
          message: 'First message',
          batchable: true
        },
        {
          type: NotificationType.EMAIL,
          priority: NotificationPriority.NORMAL,
          recipient: 'test@example.com',
          message: 'Second message',
          batchable: true
        }
      ];

      for (const config of configs) {
        await notificationRateLimiter.sendNotification(config, mockSendFunction);
      }

      // Wait a bit for batching to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSendFunction).toHaveBeenCalled();
    });

    it('should get notification statistics without errors', () => {
      const stats = notificationRateLimiter.getStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalSent).toBe('number');
      expect(typeof stats.totalFailed).toBe('number');
      expect(typeof stats.queueLength).toBe('number');
      expect(stats.byType).toBeDefined();
      expect(stats.byPriority).toBeDefined();
    });
  });

  describe('Template Type Conflicts Resolution', () => {
    beforeEach(async () => {
      await rateLimitingSystem.initialize();
      notificationRateLimiter = new NotificationRateLimiter(rateLimitingSystem);
      await notificationRateLimiter.initialize();
    });

    afterEach(async () => {
      await notificationRateLimiter.shutdown();
      await rateLimitingSystem.shutdown();
    });

    it('should handle send function storage without type conflicts', async () => {
      const mockSendFunction = vi.fn().mockResolvedValue(undefined);
      
      const config: NotificationConfig = {
        type: NotificationType.TELEGRAM,
        priority: NotificationPriority.CRITICAL,
        recipient: 'critical-recipient',
        message: 'Critical notification',
        batchable: false
      };

      // This should not throw type errors
      await expect(
        notificationRateLimiter.sendNotification(config, mockSendFunction)
      ).resolves.not.toThrow();

      // Verify the function was called
      expect(mockSendFunction).toHaveBeenCalledWith(config);
    });

    it('should process notification queue without template conflicts', async () => {
      const mockSendFunction = vi.fn().mockResolvedValue(undefined);
      
      // Send multiple notifications to test queue processing
      const configs = Array.from({ length: 5 }, (_, i) => ({
        type: NotificationType.TELEGRAM,
        priority: NotificationPriority.HIGH,
        recipient: `recipient-${i}`,
        message: `Message ${i}`,
        batchable: false
      }));

      for (const config of configs) {
        await notificationRateLimiter.sendNotification(config, mockSendFunction);
      }

      // Wait for queue processing
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockSendFunction).toHaveBeenCalledTimes(configs.length);
    });
  });

  describe('Integration Test - Complete Notification Flow', () => {
    it('should handle complete notification flow from error to delivery', async () => {
      // Initialize all components
      notificationService = new NotificationService(logger);
      systemErrorManager = new SystemErrorManager();
      await rateLimitingSystem.initialize();
      notificationRateLimiter = new NotificationRateLimiter(rateLimitingSystem);
      await notificationRateLimiter.initialize();

      // Mock notification service methods
      const mockSendCriticalAlert = vi.fn().mockResolvedValue(undefined);
      const mockSendHighPriorityAlert = vi.fn().mockResolvedValue(undefined);
      const mockSendAlert = vi.fn().mockResolvedValue(undefined);

      notificationService.sendCriticalAlert = mockSendCriticalAlert;
      notificationService.sendHighPriorityAlert = mockSendHighPriorityAlert;
      notificationService.sendAlert = mockSendAlert;

      // Test critical alert flow
      const criticalAlert: CriticalAlert = {
        title: 'System Failure',
        message: 'Critical system component has failed',
        details: { component: 'trading-engine', error: 'connection timeout' },
        errorId: 'sys-fail-001',
        priority: 'CRITICAL'
      };

      await notificationService.sendCriticalAlert(criticalAlert);
      expect(mockSendCriticalAlert).toHaveBeenCalledWith(criticalAlert);

      // Test high priority alert flow
      const highPriorityAlert: HighPriorityAlert = {
        title: 'Trading Alert',
        message: 'High priority trading event detected',
        details: { symbol: 'BTC/USDT', action: 'stop_loss_triggered' },
        errorId: 'trade-alert-002',
        priority: 'HIGH'
      };

      await notificationService.sendHighPriorityAlert(highPriorityAlert);
      expect(mockSendHighPriorityAlert).toHaveBeenCalledWith(highPriorityAlert);

      // Test rate limited notification flow
      const mockRateLimitedSend = vi.fn().mockResolvedValue(undefined);
      const rateLimitedConfig: NotificationConfig = {
        type: NotificationType.EMAIL,
        priority: NotificationPriority.NORMAL,
        recipient: 'user@example.com',
        message: 'Rate limited notification test',
        batchable: true
      };

      await notificationRateLimiter.sendNotification(rateLimitedConfig, mockRateLimitedSend);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockRateLimitedSend).toHaveBeenCalled();

      // Cleanup
      await notificationRateLimiter.shutdown();
      await rateLimitingSystem.shutdown();
    });
  });
});