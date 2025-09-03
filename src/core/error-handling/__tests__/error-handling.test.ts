/**
 * =============================================================================
 * ERROR HANDLING TESTING AND VALIDATION
 * =============================================================================
 * 
 * Comprehensive test suite for all error handling components including:
 * - Error scenario testing for all failure conditions
 * - Error recovery mechanism validation
 * - Performance testing under high load
 * - Error escalation and notification delivery testing
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { TradingErrorHandler, TradingErrorType, ErrorSeverity } from '../trading-error-handler';
import { AIErrorHandler, AIErrorType } from '../ai-error-handler';
import { NetworkErrorHandler, NetworkErrorType } from '../network-error-handler';
import { SystemErrorManager, SystemComponent, SystemErrorSeverity } from '../system-error-manager';

// Mock dependencies
jest.mock('../../logging/logger');
jest.mock('../../notifications/notification-service');

describe('Trading Error Handler', () => {
  let tradingErrorHandler: TradingErrorHandler;
  let mockOperation: jest.Mock;

  beforeEach(() => {
    tradingErrorHandler = new TradingErrorHandler();
    mockOperation = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should handle order execution failure with retry', async () => {
    // Setup: Mock operation that fails twice then succeeds
    mockOperation
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockRejectedValueOnce(new Error('Rate limit exceeded'))
      .mockResolvedValueOnce({ orderId: '12345', status: 'filled' });

    const error = {
      type: TradingErrorType.ORDER_EXECUTION_FAILED,
      severity: ErrorSeverity.HIGH,
      message: 'Order execution failed',
      component: 'OrderManager'
    };

    // Execute
    const result = await tradingErrorHandler.handleError(error, mockOperation);

    // Verify
    expect(result).toEqual({ orderId: '12345', status: 'filled' });
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  test('should escalate error after max retries exceeded', async () => {
    // Setup: Mock operation that always fails
    mockOperation.mockRejectedValue(new Error('Persistent failure'));

    const error = {
      type: TradingErrorType.ORDER_EXECUTION_FAILED,
      severity: ErrorSeverity.HIGH,
      message: 'Order execution failed',
      component: 'OrderManager'
    };

    // Execute & Verify
    await expect(tradingErrorHandler.handleError(error, mockOperation)).rejects.toThrow('Persistent failure');
    expect(mockOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
  });

  test('should implement exponential backoff for retries', async () => {
    const startTime = Date.now();
    mockOperation.mockRejectedValue(new Error('Always fails'));

    const error = {
      type: TradingErrorType.API_CONNECTION_LOST,
      severity: ErrorSeverity.CRITICAL,
      message: 'API connection lost',
      component: 'GateIOClient'
    };

    try {
      await tradingErrorHandler.handleError(error, mockOperation);
    } catch (e) {
      // Expected to fail
    }

    const totalTime = Date.now() - startTime;
    // Should take at least 2000ms (2s + 4s + 8s base delays, but with jitter)
    expect(totalTime).toBeGreaterThan(1500);
  });

  test('should open circuit breaker after consecutive failures', async () => {
    mockOperation.mockRejectedValue(new Error('Service unavailable'));

    const error = {
      type: TradingErrorType.EXCHANGE_ERROR,
      severity: ErrorSeverity.HIGH,
      message: 'Exchange error',
      component: 'ExchangeAPI'
    };

    // Trigger multiple failures to open circuit breaker
    for (let i = 0; i < 6; i++) {
      try {
        await tradingErrorHandler.handleError(error, mockOperation);
      } catch (e) {
        // Expected failures
      }
    }

    // Next call should fail immediately due to circuit breaker
    const startTime = Date.now();
    try {
      await tradingErrorHandler.handleError(error, mockOperation);
    } catch (e) {
      expect(e.message).toContain('Circuit breaker is open');
    }
    const executionTime = Date.now() - startTime;
    expect(executionTime).toBeLessThan(100); // Should fail fast
  });

  test('should validate position safety before execution', async () => {
    const operation = {
      type: 'order',
      side: 'buy',
      symbol: 'BTC_USDT',
      amount: 1000,
      maxPositionSize: 500
    };

    await expect(tradingErrorHandler.validatePositionSafety(operation))
      .rejects.toThrow('Position would exceed limit');
  });
});

describe('AI Error Handler', () => {
  let aiErrorHandler: AIErrorHandler;

  beforeEach(() => {
    aiErrorHandler = new AIErrorHandler();
  });

  afterEach(() => {
    aiErrorHandler.shutdown();
  });

  test('should fallback to alternative model on failure', async () => {
    const request = {
      id: 'test-request-1',
      prompt: 'Analyze market conditions',
      requiredCapabilities: ['trading', 'analysis'],
      fallbackAllowed: true
    };

    // Mock primary model failure and fallback success
    jest.spyOn(aiErrorHandler as any, 'performInference')
      .mockRejectedValueOnce(new Error('Model timeout'))
      .mockResolvedValueOnce({
        text: 'Market analysis from fallback model',
        confidence: 0.8,
        tokensUsed: 150
      });

    const response = await aiErrorHandler.processRequest(request);

    expect(response.fallbackUsed).toBe(true);
    expect(response.response).toContain('Market analysis from fallback model');
  });

  test('should provide degraded response when all models fail', async () => {
    const request = {
      id: 'test-request-2',
      prompt: 'Generate trading signal',
      requiredCapabilities: ['trading'],
      fallbackAllowed: true
    };

    // Mock all models failing
    jest.spyOn(aiErrorHandler as any, 'performInference')
      .mockRejectedValue(new Error('All models unavailable'));

    const response = await aiErrorHandler.processRequest(request);

    expect(response.fallbackUsed).toBe(true);
    expect(response.confidence).toBe(0);
    expect(response.response).toContain('AI services are currently unavailable');
  });

  test('should handle model timeout correctly', async () => {
    const request = {
      id: 'test-request-3',
      prompt: 'Long analysis task',
      requiredCapabilities: ['analysis'],
      timeout: 1000, // 1 second timeout
      fallbackAllowed: false
    };

    // Mock slow model response
    jest.spyOn(aiErrorHandler as any, 'performInference')
      .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));

    await expect(aiErrorHandler.processRequest(request)).rejects.toThrow();
  });

  test('should mark model as unavailable after multiple failures', async () => {
    const request = {
      id: 'test-request-4',
      prompt: 'Test prompt',
      requiredCapabilities: ['analysis'],
      fallbackAllowed: false
    };

    // Mock multiple failures
    jest.spyOn(aiErrorHandler as any, 'performInference')
      .mockRejectedValue(new Error('Model error'));

    // Trigger multiple failures
    for (let i = 0; i < 4; i++) {
      try {
        await aiErrorHandler.processRequest(request);
      } catch (e) {
        // Expected failures
      }
    }

    const status = aiErrorHandler.getSystemStatus();
    const failedModel = status.models.find(m => m.errorCount >= 3);
    expect(failedModel?.isAvailable).toBe(false);
  });
});

describe('Network Error Handler', () => {
  let networkErrorHandler: NetworkErrorHandler;

  beforeEach(() => {
    networkErrorHandler = new NetworkErrorHandler();
  });

  afterEach(async () => {
    await networkErrorHandler.shutdown();
  });

  test('should detect SSH tunnel disconnection', async () => {
    const mockConfig = {
      localPort: 8443,
      remoteHost: 'api.gateio.ws',
      remotePort: 443,
      sshHost: 'proxy.example.com',
      sshPort: 22,
      sshUser: 'user',
      sshKeyPath: '/path/to/key',
      keepAlive: true,
      maxRetries: 3
    };

    // Mock SSH process that exits immediately
    jest.spyOn(require('child_process'), 'spawn').mockReturnValue({
      on: jest.fn((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(1, 'SIGTERM'), 100);
        }
      }),
      stderr: { on: jest.fn() },
      kill: jest.fn(),
      killed: false
    });

    const result = await networkErrorHandler.setupSSHTunnel(mockConfig);
    expect(result).toBe(false);
  });

  test('should handle database connection errors with retry', async () => {
    const mockConfig = {
      host: 'localhost',
      port: 5432,
      database: 'trading_db',
      user: 'trader',
      password: 'password',
      maxConnections: 10,
      connectionTimeout: 5000,
      queryTimeout: 30000,
      retryAttempts: 3
    };

    const dbError = new Error('Connection refused');
    await networkErrorHandler.handleDatabaseError(dbError, mockConfig);

    // Verify error was handled and retry was scheduled
    const status = networkErrorHandler.getNetworkStatus();
    const dbService = status.services.find(s => s.name === 'database');
    expect(dbService?.isHealthy).toBe(false);
    expect(dbService?.errorCount).toBeGreaterThan(0);
  });

  test('should detect cascading failures', async () => {
    // Mock multiple service failures
    const services = ['database', 'gate-io-tunnel', 'ollama'];
    
    for (const serviceName of services) {
      jest.spyOn(networkErrorHandler as any, 'testConnectivity')
        .mockResolvedValue(false);
    }

    // Trigger health checks
    await (networkErrorHandler as any).performHealthChecks();

    // Should emit cascading failure event
    const status = networkErrorHandler.getNetworkStatus();
    const unhealthyServices = status.services.filter(s => !s.isHealthy);
    expect(unhealthyServices.length).toBeGreaterThan(1);
  });
});

describe('System Error Manager', () => {
  let systemErrorManager: SystemErrorManager;

  beforeEach(() => {
    systemErrorManager = new SystemErrorManager();
  });

  afterEach(() => {
    systemErrorManager.shutdown();
  });

  test('should detect error patterns and enable auto-resolution', async () => {
    const error = {
      type: 'CONNECTION_TIMEOUT',
      severity: 'HIGH',
      message: 'Connection timeout occurred',
      component: 'API_CLIENT'
    };

    // Trigger the same error multiple times
    for (let i = 0; i < 12; i++) {
      await systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, error);
    }

    const dashboard = systemErrorManager.getErrorDashboard();
    const pattern = dashboard.activePatterns.find(p => p.pattern.includes('CONNECTION_TIMEOUT'));
    
    expect(pattern).toBeDefined();
    expect(pattern?.frequency).toBeGreaterThanOrEqual(10);
    expect(pattern?.autoResolution?.enabled).toBe(true);
  });

  test('should escalate critical errors immediately', async () => {
    const criticalError = {
      type: 'SYSTEM_FAILURE',
      severity: 'CRITICAL',
      message: 'Critical system failure',
      component: 'CORE_ENGINE'
    };

    const escalationSpy = jest.spyOn(systemErrorManager as any, 'escalateError');
    
    await systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, criticalError);

    expect(escalationSpy).toHaveBeenCalled();
  });

  test('should update health metrics correctly', async () => {
    const initialHealth = systemErrorManager.getErrorDashboard().healthMetrics.overallHealth;
    
    const error = {
      type: 'MINOR_ERROR',
      severity: 'ERROR',
      message: 'Minor error occurred',
      component: 'SUBSYSTEM'
    };

    await systemErrorManager.handleComponentError(SystemComponent.AI_SYSTEM, error);

    const updatedHealth = systemErrorManager.getErrorDashboard().healthMetrics.overallHealth;
    expect(updatedHealth).toBeLessThan(initialHealth);
  });

  test('should attempt auto-recovery for known patterns', async () => {
    const recoverableError = {
      type: 'SERVICE_RESTART_NEEDED',
      severity: 'HIGH',
      message: 'Service needs restart',
      component: 'AI_SERVICE'
    };

    // Create a pattern with auto-resolution enabled
    const patternKey = `${SystemComponent.AI_SYSTEM}_SERVICE_RESTART_NEEDED`;
    (systemErrorManager as any).errorPatterns.set(patternKey, {
      id: patternKey,
      pattern: 'AI_SYSTEM: SERVICE_RESTART_NEEDED',
      component: SystemComponent.AI_SYSTEM,
      frequency: 15,
      lastOccurrence: new Date(),
      severity: SystemErrorSeverity.ERROR,
      autoResolution: {
        enabled: true,
        action: 'restart_ai_service',
        successRate: 80
      }
    });

    const recoverySpy = jest.spyOn(systemErrorManager as any, 'executeRecoveryAction')
      .mockResolvedValue(true);

    await systemErrorManager.handleComponentError(SystemComponent.AI_SYSTEM, recoverableError);

    expect(recoverySpy).toHaveBeenCalledWith('restart_ai_service', expect.any(Object));
  });

  test('should handle high load error scenarios', async () => {
    const startTime = Date.now();
    const errorPromises = [];

    // Generate 100 concurrent errors
    for (let i = 0; i < 100; i++) {
      const error = {
        type: `LOAD_TEST_ERROR_${i % 10}`,
        severity: 'WARNING',
        message: `Load test error ${i}`,
        component: 'LOAD_TEST'
      };

      errorPromises.push(
        systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, error)
      );
    }

    await Promise.all(errorPromises);
    const processingTime = Date.now() - startTime;

    // Should handle 100 errors in reasonable time (< 5 seconds)
    expect(processingTime).toBeLessThan(5000);

    const dashboard = systemErrorManager.getErrorDashboard();
    expect(dashboard.recentErrors.length).toBeGreaterThan(0);
  });

  test('should maintain error history within limits', async () => {
    // Generate more errors than the storage limit
    const maxErrors = (systemErrorManager as any).maxStoredErrors;
    
    for (let i = 0; i < maxErrors + 100; i++) {
      const error = {
        type: 'HISTORY_TEST_ERROR',
        severity: 'INFO',
        message: `History test error ${i}`,
        component: 'HISTORY_TEST'
      };

      await systemErrorManager.handleComponentError(SystemComponent.MONITORING, error);
    }

    const storedErrors = (systemErrorManager as any).errors.size;
    expect(storedErrors).toBeLessThanOrEqual(maxErrors);
  });
});

describe('Error Handling Integration Tests', () => {
  let systemErrorManager: SystemErrorManager;
  let tradingErrorHandler: TradingErrorHandler;
  let aiErrorHandler: AIErrorHandler;
  let networkErrorHandler: NetworkErrorHandler;

  beforeEach(() => {
    systemErrorManager = new SystemErrorManager();
    tradingErrorHandler = new TradingErrorHandler();
    aiErrorHandler = new AIErrorHandler();
    networkErrorHandler = new NetworkErrorHandler();
  });

  afterEach(() => {
    systemErrorManager.shutdown();
    aiErrorHandler.shutdown();
    networkErrorHandler.shutdown();
  });

  test('should coordinate error handling across all components', async () => {
    // Simulate errors from different components
    const tradingError = {
      type: TradingErrorType.ORDER_EXECUTION_FAILED,
      severity: ErrorSeverity.HIGH,
      message: 'Trading error',
      component: 'TradingEngine'
    };

    const aiError = {
      type: AIErrorType.MODEL_TIMEOUT,
      severity: 'HIGH',
      message: 'AI model timeout',
      component: 'AISystem'
    };

    const networkError = {
      type: NetworkErrorType.SSH_TUNNEL_DISCONNECTED,
      severity: 'CRITICAL',
      message: 'SSH tunnel disconnected',
      component: 'NetworkInfrastructure'
    };

    // Handle errors through system manager
    await Promise.all([
      systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, tradingError),
      systemErrorManager.handleComponentError(SystemComponent.AI_SYSTEM, aiError),
      systemErrorManager.handleComponentError(SystemComponent.NETWORK_INFRASTRUCTURE, networkError)
    ]);

    const dashboard = systemErrorManager.getErrorDashboard();
    
    expect(dashboard.recentErrors.length).toBe(3);
    expect(dashboard.errorsByComponent[SystemComponent.TRADING_ENGINE]).toBe(1);
    expect(dashboard.errorsByComponent[SystemComponent.AI_SYSTEM]).toBe(1);
    expect(dashboard.errorsByComponent[SystemComponent.NETWORK_INFRASTRUCTURE]).toBe(1);
  });

  test('should handle notification delivery failures gracefully', async () => {
    // Mock notification service to fail
    jest.spyOn(require('../../notifications/notification-service').prototype, 'sendCriticalAlert')
      .mockRejectedValue(new Error('Notification service unavailable'));

    const criticalError = {
      type: 'CRITICAL_SYSTEM_ERROR',
      severity: 'CRITICAL',
      message: 'Critical error with notification failure',
      component: 'CORE_SYSTEM'
    };

    // Should not throw even if notification fails
    await expect(
      systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, criticalError)
    ).resolves.not.toThrow();
  });

  test('should provide comprehensive error statistics', async () => {
    // Generate various types of errors
    const errorTypes = [
      { type: 'TYPE_A', severity: 'LOW', component: SystemComponent.TRADING_ENGINE },
      { type: 'TYPE_B', severity: 'MEDIUM', component: SystemComponent.AI_SYSTEM },
      { type: 'TYPE_C', severity: 'HIGH', component: SystemComponent.NETWORK_INFRASTRUCTURE },
      { type: 'TYPE_D', severity: 'CRITICAL', component: SystemComponent.DATABASE }
    ];

    for (let i = 0; i < 20; i++) {
      const errorType = errorTypes[i % errorTypes.length];
      await systemErrorManager.handleComponentError(errorType.component, {
        type: errorType.type,
        severity: errorType.severity,
        message: `Test error ${i}`,
        component: 'TestComponent'
      });
    }

    const dashboard = systemErrorManager.getErrorDashboard();
    
    expect(dashboard.healthMetrics).toBeDefined();
    expect(dashboard.recentErrors.length).toBeGreaterThan(0);
    expect(Object.keys(dashboard.errorsBySeverity).length).toBeGreaterThan(0);
    expect(Object.keys(dashboard.errorsByComponent).length).toBeGreaterThan(0);
  });
});

// Performance benchmarks
describe('Error Handling Performance', () => {
  test('should handle errors within acceptable time limits', async () => {
    const systemErrorManager = new SystemErrorManager();
    
    const startTime = Date.now();
    
    const error = {
      type: 'PERFORMANCE_TEST_ERROR',
      severity: 'WARNING',
      message: 'Performance test error',
      component: 'PerformanceTest'
    };

    await systemErrorManager.handleComponentError(SystemComponent.MONITORING, error);
    
    const processingTime = Date.now() - startTime;
    
    // Error handling should complete within 100ms
    expect(processingTime).toBeLessThan(100);
    
    systemErrorManager.shutdown();
  });

  test('should maintain performance under concurrent error load', async () => {
    const systemErrorManager = new SystemErrorManager();
    const concurrentErrors = 50;
    
    const startTime = Date.now();
    
    const errorPromises = Array.from({ length: concurrentErrors }, (_, i) => 
      systemErrorManager.handleComponentError(SystemComponent.TRADING_ENGINE, {
        type: `CONCURRENT_ERROR_${i}`,
        severity: 'INFO',
        message: `Concurrent error ${i}`,
        component: 'ConcurrencyTest'
      })
    );

    await Promise.all(errorPromises);
    
    const totalTime = Date.now() - startTime;
    const avgTimePerError = totalTime / concurrentErrors;
    
    // Average time per error should be less than 20ms
    expect(avgTimePerError).toBeLessThan(20);
    
    systemErrorManager.shutdown();
  });
});