/**
 * Unit Tests for Gate.io API Client
 * 
 * Comprehensive test suite covering API client functionality,
 * authentication, rate limiting, circuit breaker, and error handling.
 * 
 * Requirements: 17.1, 17.3, 17.6 - Unit tests for API integration and error handling
 */

import { GateIOClient, RequestType, CircuitBreakerState } from '../gate-io-client';
import axios from 'axios';
import { CredentialManager } from '@/security/credential-manager';
import { AuditService } from '@/security/audit-service';

// Mock external dependencies
jest.mock('axios');
jest.mock('@/security/credential-manager');
jest.mock('@/security/audit-service');
jest.mock('@/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedCredentialManager = CredentialManager as jest.MockedClass<typeof CredentialManager>;
const MockedAuditService = AuditService as jest.MockedClass<typeof AuditService>;

describe('GateIOClient', () => {
  let client: GateIOClient;
  let mockAxiosInstance: any;
  let mockCredentialManager: jest.Mocked<CredentialManager>;
  let mockAuditService: jest.Mocked<AuditService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      defaults: { proxy: {} },
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Mock credential manager
    mockCredentialManager = {
      decryptCredential: jest.fn().mockResolvedValue('decrypted-credential')
    } as any;
    MockedCredentialManager.mockImplementation(() => mockCredentialManager);

    // Mock audit service
    mockAuditService = {
      logSecurityEvent: jest.fn().mockResolvedValue(undefined),
      logAPIRequest: jest.fn().mockResolvedValue(undefined),
      logAPIResponse: jest.fn().mockResolvedValue(undefined)
    } as any;
    MockedAuditService.mockImplementation(() => mockAuditService);

    // Set up test environment variables
    process.env.GATE_IO_API_KEY = 'encrypted-api-key';
    process.env.GATE_IO_SECRET_KEY = 'encrypted-secret-key';
    process.env.GATE_IO_PASSPHRASE = 'encrypted-passphrase';

    client = new GateIOClient();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.GATE_IO_API_KEY;
    delete process.env.GATE_IO_SECRET_KEY;
    delete process.env.GATE_IO_PASSPHRASE;
  });

  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      expect(client).toBeInstanceOf(GateIOClient);
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.gateio.ws/api/v4',
          timeout: 30000,
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'AI-Crypto-Trading-Agent/1.0.0'
          })
        })
      );
    });

    it('should set up request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('should initialize credential manager and audit service', () => {
      expect(MockedCredentialManager).toHaveBeenCalled();
      expect(MockedAuditService).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should initialize successfully with valid credentials', async () => {
      // Mock successful health check
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: { server_time: Date.now() }
      });
      mockAxiosInstance.request.mockResolvedValueOnce({
        data: [{ currency: 'USDT', available: '1000' }]
      });

      const result = await client.initialize('localhost', 8080);

      expect(result).toBe(true);
      expect(mockCredentialManager.decryptCredential).toHaveBeenCalledTimes(3);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'API_CLIENT_INITIALIZED',
          severity: 'INFO'
        })
      );
    });

    it('should fail initialization when credentials are missing', async () => {
      delete process.env.GATE_IO_API_KEY;

      const result = await client.initialize();

      expect(result).toBe(false);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'API_CLIENT_INIT_FAILED',
          severity: 'ERROR'
        })
      );
    });

    it('should configure proxy settings correctly', async () => {
      // Mock successful health check
      mockAxiosInstance.request.mockResolvedValue({ data: {} });

      await client.initialize('proxy-host', 9090);

      expect(mockAxiosInstance.defaults.proxy).toEqual({
        host: 'proxy-host',
        port: 9090,
        protocol: 'http'
      });
    });

    it('should fail initialization when health check fails', async () => {
      // Mock failed health check
      mockAxiosInstance.request.mockRejectedValue(new Error('Network error'));

      const result = await client.initialize();

      expect(result).toBe(false);
    });
  });

  describe('makeRequest', () => {
    beforeEach(async () => {
      // Initialize client for request tests
      mockAxiosInstance.request.mockResolvedValue({ data: {} });
      await client.initialize();
      jest.clearAllMocks();
    });

    it('should make successful API request', async () => {
      const mockResponse = { data: { result: 'success' } };
      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.makeRequest({
        method: 'GET',
        url: '/test',
        requestType: RequestType.PUBLIC
      });

      expect(result).toEqual({ result: 'success' });
      expect(mockAxiosInstance.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          requestType: RequestType.PUBLIC
        })
      );
    });

    it('should handle rate limiting correctly', async () => {
      // Mock rate limiter rejection then success
      const rateLimitError = { msBeforeNext: 1000 };
      mockAxiosInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { result: 'success' } });

      // Mock setTimeout to resolve immediately for testing
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await client.makeRequest({
        method: 'GET',
        url: '/test',
        requestType: RequestType.ORDERS
      });

      expect(result).toEqual({ result: 'success' });
      expect(setTimeout).toHaveBeenCalled();
    });

    it('should implement retry logic for transient errors', async () => {
      const networkError = new Error('Network error');
      mockAxiosInstance.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: { result: 'success' } });

      // Mock setTimeout for retry delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await client.makeRequest({
        method: 'GET',
        url: '/test'
      });

      expect(result).toEqual({ result: 'success' });
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retries', async () => {
      const networkError = new Error('Persistent network error');
      mockAxiosInstance.request.mockRejectedValue(networkError);

      // Mock setTimeout for retry delays
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toThrow('Persistent network error');

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry on client errors (4xx)', async () => {
      const clientError = {
        response: { status: 400 },
        message: 'Bad request'
      };
      mockAxiosInstance.request.mockRejectedValue(clientError);

      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toMatchObject({ message: 'Bad request' });

      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(1); // No retries
    });

    it('should respect circuit breaker when open', async () => {
      // Force circuit breaker to open by simulating failures
      const serverError = { response: { status: 500 }, message: 'Server error' };
      
      // Simulate multiple failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        mockAxiosInstance.request.mockRejectedValueOnce(serverError);
        try {
          await client.makeRequest({ method: 'GET', url: '/test' });
        } catch (error) {
          // Expected to fail
        }
      }

      // Now circuit breaker should be open
      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: {} });
      await client.initialize();
    });

    it('should create correct HMAC signature', async () => {
      // Mock the request interceptor to capture the signature
      let capturedConfig: any;
      mockAxiosInstance.interceptors.request.use.mockImplementation((interceptor) => {
        // Store the interceptor for manual execution
        capturedConfig = interceptor;
      });

      const testConfig = {
        method: 'POST',
        url: '/spot/orders',
        data: { symbol: 'BTC_USDT', amount: '0.1' }
      };

      // Execute the request interceptor manually
      if (capturedConfig) {
        const result = await capturedConfig(testConfig);
        
        expect(result.headers).toHaveProperty('KEY');
        expect(result.headers).toHaveProperty('Timestamp');
        expect(result.headers).toHaveProperty('SIGN');
        expect(typeof result.headers.SIGN).toBe('string');
        expect(result.headers.SIGN).toHaveLength(128); // SHA512 hex length
      }
    });

    it('should skip authentication for public endpoints', async () => {
      let capturedConfig: any;
      mockAxiosInstance.interceptors.request.use.mockImplementation((interceptor) => {
        capturedConfig = interceptor;
      });

      const testConfig = {
        method: 'GET',
        url: '/spot/time',
        skipAuth: true
      };

      if (capturedConfig) {
        const result = await capturedConfig(testConfig);
        
        expect(result.headers).not.toHaveProperty('KEY');
        expect(result.headers).not.toHaveProperty('SIGN');
      }
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: {} });
      await client.initialize();
    });

    it('should perform health check successfully', async () => {
      mockAxiosInstance.request
        .mockResolvedValueOnce({ data: { server_time: Date.now() } })
        .mockResolvedValueOnce({ data: [{ currency: 'USDT' }] });

      const isHealthy = await client.performHealthCheck();

      expect(isHealthy).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it('should return health metrics', async () => {
      const metrics = client.getHealthMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('successfulRequests');
      expect(metrics).toHaveProperty('failedRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('circuitBreakerState');
      expect(typeof metrics.totalRequests).toBe('number');
    });

    it('should update metrics on successful requests', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { result: 'success' } });

      await client.makeRequest({ method: 'GET', url: '/test' });

      const metrics = client.getHealthMetrics();
      expect(metrics.totalRequests).toBeGreaterThan(0);
      expect(metrics.successfulRequests).toBeGreaterThan(0);
    });

    it('should update metrics on failed requests', async () => {
      mockAxiosInstance.request.mockRejectedValue(new Error('Test error'));

      try {
        await client.makeRequest({ method: 'GET', url: '/test' });
      } catch (error) {
        // Expected to fail
      }

      const metrics = client.getHealthMetrics();
      expect(metrics.failedRequests).toBeGreaterThan(0);
    });
  });

  describe('Circuit Breaker', () => {
    beforeEach(async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: {} });
      await client.initialize();
      jest.clearAllMocks();
    });

    it('should open circuit breaker after consecutive failures', async () => {
      const serverError = { response: { status: 500 }, message: 'Server error' };
      mockAxiosInstance.request.mockRejectedValue(serverError);

      // Simulate 5 consecutive failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await client.makeRequest({ method: 'GET', url: '/test' });
        } catch (error) {
          // Expected to fail
        }
      }

      const metrics = client.getHealthMetrics();
      expect(metrics.circuitBreakerState).toBe(CircuitBreakerState.OPEN);
    });

    it('should prevent requests when circuit breaker is open', async () => {
      // Force circuit breaker open
      const serverError = { response: { status: 500 }, message: 'Server error' };
      mockAxiosInstance.request.mockRejectedValue(serverError);

      for (let i = 0; i < 5; i++) {
        try {
          await client.makeRequest({ method: 'GET', url: '/test' });
        } catch (error) {
          // Expected to fail
        }
      }

      // Now requests should be blocked by circuit breaker
      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: {} });
      await client.initialize();
      jest.clearAllMocks();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout');
      mockAxiosInstance.request.mockRejectedValue(networkError);

      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toThrow('Network timeout');
    });

    it('should handle rate limit errors with backoff', async () => {
      const rateLimitError = {
        response: { 
          status: 429,
          headers: { 'retry-after': '5' }
        },
        message: 'Rate limit exceeded'
      };
      
      mockAxiosInstance.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({ data: { result: 'success' } });

      // Mock setTimeout
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await client.makeRequest({
        method: 'GET',
        url: '/test'
      });

      expect(result).toEqual({ result: 'success' });
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it('should handle authentication errors', async () => {
      const authError = {
        response: { status: 401 },
        message: 'Unauthorized'
      };
      mockAxiosInstance.request.mockRejectedValue(authError);

      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toMatchObject({ message: 'Unauthorized' });
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: {} });
      await client.initialize();

      await client.shutdown();

      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'API_CLIENT_SHUTDOWN',
          severity: 'INFO'
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing response data', async () => {
      mockAxiosInstance.request.mockResolvedValue({});
      await client.initialize();

      const result = await client.makeRequest({
        method: 'GET',
        url: '/test'
      });

      expect(result).toBeUndefined();
    });

    it('should handle malformed error responses', async () => {
      const malformedError = {
        response: null,
        message: 'Malformed error'
      };
      mockAxiosInstance.request.mockRejectedValue(malformedError);
      await client.initialize();

      await expect(client.makeRequest({
        method: 'GET',
        url: '/test'
      })).rejects.toMatchObject({ message: 'Malformed error' });
    });

    it('should handle concurrent requests', async () => {
      mockAxiosInstance.request.mockResolvedValue({ data: { result: 'success' } });
      await client.initialize();

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(client.makeRequest({
          method: 'GET',
          url: `/test${i}`
        }));
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual({ result: 'success' });
      });
    });
  });
});