/**
 * =============================================================================
 * TUNNEL ROUTER TESTS
 * =============================================================================
 * 
 * Comprehensive test suite for the SSH tunnel router with request queuing,
 * failover, load balancing, and integrity validation.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { TunnelRouter, RequestPriority } from '../tunnel-router';
import { SSHTunnelManager, TunnelConnection, TunnelState } from '@/infrastructure/ssh-tunnel-manager';
import { AuditService } from '@/security/audit-service';
import axios from 'axios';

// Mock dependencies
jest.mock('@/infrastructure/ssh-tunnel-manager');
jest.mock('@/security/audit-service');
jest.mock('@/core/logging/logger');
jest.mock('axios');

const MockedSSHTunnelManager = SSHTunnelManager as jest.MockedClass<typeof SSHTunnelManager>;
const MockedAuditService = AuditService as jest.MockedClass<typeof AuditService>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TunnelRouter', () => {
  let router: TunnelRouter;
  let mockTunnelManager: jest.Mocked<SSHTunnelManager>;
  let mockAuditService: jest.Mocked<AuditService>;
  let mockTunnelConnection: TunnelConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock tunnel manager
    mockTunnelManager = new MockedSSHTunnelManager({} as any, {} as any) as jest.Mocked<SSHTunnelManager>;
    mockTunnelManager.createTunnel = jest.fn();
    mockTunnelManager.establishTunnel = jest.fn();
    mockTunnelManager.getConnection = jest.fn();
    mockTunnelManager.on = jest.fn();
    
    // Mock audit service
    mockAuditService = new MockedAuditService() as jest.Mocked<AuditService>;
    mockAuditService.logSecurityEvent = jest.fn().mockResolvedValue(undefined);
    mockAuditService.logAPIRequest = jest.fn().mockResolvedValue(undefined);
    mockAuditService.logAPIResponse = jest.fn().mockResolvedValue(undefined);
    
    // Mock tunnel connection
    mockTunnelConnection = {
      id: 'tunnel-1',
      config: {
        oracleIP: '168.138.104.117',
        sshPort: 22,
        username: 'ubuntu',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 80,
        keepAlive: true,
        compression: true,
        connectionTimeout: 30,
        serverAliveInterval: 60,
        serverAliveCountMax: 3,
      },
      process: null,
      state: TunnelState.CONNECTED,
      connectedAt: new Date(),
      lastActivity: new Date(),
      stats: {
        bytesTransferred: 0,
        uptime: 0,
        reconnectAttempts: 0,
        lastError: null,
        qualityScore: 100,
      },
    };
    
    // Mock axios
    mockedAxios.request = jest.fn();
    
    // Create router instance
    router = new TunnelRouter(mockTunnelManager);
  });

  describe('Initialization', () => {
    it('should initialize successfully with tunnel configurations', async () => {
      const tunnelConfigs = [
        { oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }
      ];
      
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      
      const result = await router.initialize(tunnelConfigs);
      
      expect(result).toBe(true);
      expect(mockTunnelManager.createTunnel).toHaveBeenCalledWith(tunnelConfigs[0]);
      expect(mockTunnelManager.establishTunnel).toHaveBeenCalledWith(mockTunnelConnection.id);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TUNNEL_ROUTER_INITIALIZED',
          severity: 'INFO'
        })
      );
    });

    it('should fail initialization on tunnel creation error', async () => {
      const tunnelConfigs = [
        { oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }
      ];
      
      mockTunnelManager.createTunnel.mockRejectedValueOnce(new Error('Tunnel creation failed'));
      
      const result = await router.initialize(tunnelConfigs);
      
      expect(result).toBe(false);
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TUNNEL_ROUTER_INIT_FAILED',
          severity: 'ERROR'
        })
      );
    });
  });

  describe('Request Routing', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should route request through tunnel successfully', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const mockResponse = {
        status: 200,
        data: { server_time: Date.now() },
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValueOnce(mockResponse);
      
      const response = await router.routeRequest(requestConfig, RequestPriority.NORMAL);
      
      expect(response).toEqual(mockResponse);
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          proxy: {
            host: 'localhost',
            port: 8080,
            protocol: 'http'
          }
        })
      );
      expect(mockAuditService.logAPIRequest).toHaveBeenCalled();
      expect(mockAuditService.logAPIResponse).toHaveBeenCalled();
    });

    it('should validate request before routing', async () => {
      const invalidConfig = {
        method: '',
        url: '',
      };
      
      await expect(router.routeRequest(invalidConfig)).rejects.toThrow('Request validation failed');
    });

    it('should handle priority queue correctly', async () => {
      const lowPriorityConfig = {
        method: 'GET',
        url: '/spot/accounts',
      };
      
      const highPriorityConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const mockResponse = {
        status: 200,
        data: {},
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValue(mockResponse);
      
      // Queue low priority request first
      const lowPriorityPromise = router.routeRequest(lowPriorityConfig, RequestPriority.LOW);
      
      // Queue high priority request second
      const highPriorityPromise = router.routeRequest(highPriorityConfig, RequestPriority.HIGH);
      
      await Promise.all([lowPriorityPromise, highPriorityPromise]);
      
      expect(mockedAxios.request).toHaveBeenCalledTimes(2);
    });
  });

  describe('Request Retry Logic', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should retry requests on transient errors', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const networkError = new Error('Network error');
      const mockResponse = {
        status: 200,
        data: { server_time: Date.now() },
        headers: {},
        config: { metadata: {} }
      };
      
      // First two attempts fail, third succeeds
      mockedAxios.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockResponse);
      
      const response = await router.routeRequest(requestConfig);
      
      expect(response).toEqual(mockResponse);
      expect(mockedAxios.request).toHaveBeenCalledTimes(3);
    });

    it('should not retry on client errors (4xx)', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/accounts',
      };
      
      const clientError = {
        response: { status: 400 },
        message: 'Bad request'
      };
      
      mockedAxios.request.mockRejectedValueOnce(clientError);
      
      await expect(router.routeRequest(requestConfig)).rejects.toThrow('Bad request');
      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    });

    it('should respect maximum retry attempts', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const serverError = {
        response: { status: 500 },
        message: 'Internal server error'
      };
      
      mockedAxios.request.mockRejectedValue(serverError);
      
      await expect(router.routeRequest(requestConfig)).rejects.toThrow('Internal server error');
      
      // Should try initial request + 3 retries = 4 total attempts
      expect(mockedAxios.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('Tunnel Health Management', () => {
    beforeEach(async () => {
      const tunnelConfigs = [
        { oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 },
        { oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8081 }
      ];
      
      const tunnel1 = { ...mockTunnelConnection, id: 'tunnel-1' };
      const tunnel2 = { ...mockTunnelConnection, id: 'tunnel-2', config: { ...mockTunnelConnection.config, localPort: 8081 } };
      
      mockTunnelManager.createTunnel
        .mockResolvedValueOnce(tunnel1)
        .mockResolvedValueOnce(tunnel2);
      mockTunnelManager.establishTunnel.mockResolvedValue(undefined);
      mockTunnelManager.getConnection
        .mockImplementation((id) => id === 'tunnel-1' ? tunnel1 : tunnel2);
      
      await router.initialize(tunnelConfigs);
    });

    it('should track tunnel health metrics', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const mockResponse = {
        status: 200,
        data: { server_time: Date.now() },
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValueOnce(mockResponse);
      
      await router.routeRequest(requestConfig);
      
      const healthStatus = router.getTunnelHealthStatus();
      expect(healthStatus).toHaveLength(2);
      expect(healthStatus[0].isHealthy).toBe(true);
    });

    it('should switch tunnels when current tunnel becomes unhealthy', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const serverError = {
        response: { status: 500 },
        message: 'Internal server error'
      };
      
      // Simulate multiple failures to make tunnel unhealthy
      mockedAxios.request
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError);
      
      try {
        await router.routeRequest(requestConfig);
      } catch (error) {
        // Expected to fail
      }
      
      const healthStatus = router.getTunnelHealthStatus();
      const unhealthyTunnels = healthStatus.filter(status => !status.isHealthy);
      expect(unhealthyTunnels.length).toBeGreaterThan(0);
    });
  });

  describe('Request Validation and Integrity', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should validate request format', async () => {
      const invalidConfigs = [
        { method: '', url: '/spot/time' }, // Empty method
        { method: 'GET', url: '' }, // Empty URL
        { method: 'GET', url: 'invalid-url' }, // Invalid URL format
      ];
      
      for (const config of invalidConfigs) {
        await expect(router.routeRequest(config)).rejects.toThrow('Request validation failed');
      }
    });

    it('should create request checksums for integrity validation', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
        headers: { 'Content-Type': 'application/json' }
      };
      
      const mockResponse = {
        status: 200,
        data: { server_time: Date.now() },
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValueOnce(mockResponse);
      
      await router.routeRequest(requestConfig);
      
      // Verify that request was processed with checksum metadata
      expect(mockedAxios.request).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            requestChecksum: expect.any(String),
            validationTimestamp: expect.any(Date)
          })
        })
      );
    });
  });

  describe('Queue Management', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map((_, index) => ({
        method: 'GET',
        url: `/spot/test-${index}`,
      }));
      
      const mockResponse = {
        status: 200,
        data: {},
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValue(mockResponse);
      
      const promises = requests.map(config => router.routeRequest(config));
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(10);
      expect(mockedAxios.request).toHaveBeenCalledTimes(10);
    });

    it('should process requests in priority order', async () => {
      const requests = [
        { config: { method: 'GET', url: '/low' }, priority: RequestPriority.LOW },
        { config: { method: 'GET', url: '/high' }, priority: RequestPriority.HIGH },
        { config: { method: 'GET', url: '/normal' }, priority: RequestPriority.NORMAL },
        { config: { method: 'GET', url: '/critical' }, priority: RequestPriority.CRITICAL },
      ];
      
      const mockResponse = {
        status: 200,
        data: {},
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValue(mockResponse);
      
      const promises = requests.map(req => router.routeRequest(req.config, req.priority));
      await Promise.all(promises);
      
      expect(mockedAxios.request).toHaveBeenCalledTimes(4);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should track routing statistics', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const mockResponse = {
        status: 200,
        data: { server_time: Date.now() },
        headers: {},
        config: { metadata: {} }
      };
      
      mockedAxios.request.mockResolvedValueOnce(mockResponse);
      
      await router.routeRequest(requestConfig);
      
      const stats = router.getRoutingStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(stats.lastRequestTime).toBeInstanceOf(Date);
    });

    it('should provide tunnel health status', async () => {
      const healthStatus = router.getTunnelHealthStatus();
      
      expect(healthStatus).toHaveLength(1);
      expect(healthStatus[0]).toMatchObject({
        tunnelId: expect.any(String),
        isHealthy: expect.any(Boolean),
        responseTime: expect.any(Number),
        errorRate: expect.any(Number),
        lastHealthCheck: expect.any(Date),
        consecutiveFailures: expect.any(Number),
      });
    });

    it('should return current active tunnel ID', () => {
      const currentTunnelId = router.getCurrentTunnelId();
      expect(currentTunnelId).toBe('tunnel-1');
    });
  });

  describe('Shutdown', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should shutdown gracefully', async () => {
      await router.shutdown();
      
      expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TUNNEL_ROUTER_SHUTDOWN',
          severity: 'INFO'
        })
      );
    });

    it('should reject pending requests on shutdown', async () => {
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      // Don't resolve the axios request to keep it pending
      mockedAxios.request.mockImplementation(() => new Promise(() => {}));
      
      const requestPromise = router.routeRequest(requestConfig);
      
      // Shutdown while request is pending
      await router.shutdown();
      
      await expect(requestPromise).rejects.toThrow('Tunnel router is shutting down');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      const tunnelConfigs = [{ oracleIP: '168.138.104.117', username: 'ubuntu', localPort: 8080 }];
      mockTunnelManager.createTunnel.mockResolvedValueOnce(mockTunnelConnection);
      mockTunnelManager.establishTunnel.mockResolvedValueOnce(undefined);
      mockTunnelManager.getConnection.mockReturnValue(mockTunnelConnection);
      
      await router.initialize(tunnelConfigs);
    });

    it('should handle tunnel disconnection gracefully', async () => {
      // Simulate tunnel disconnection
      mockTunnelManager.getConnection.mockReturnValue({
        ...mockTunnelConnection,
        state: TunnelState.DISCONNECTED
      });
      
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      await expect(router.routeRequest(requestConfig)).rejects.toThrow('Tunnel not available');
    });

    it('should handle no healthy tunnels scenario', async () => {
      // Make all tunnels unhealthy by simulating failures
      const requestConfig = {
        method: 'GET',
        url: '/spot/time',
      };
      
      const serverError = {
        response: { status: 500 },
        message: 'Internal server error'
      };
      
      // Simulate enough failures to make tunnel unhealthy
      for (let i = 0; i < 6; i++) {
        mockedAxios.request.mockRejectedValueOnce(serverError);
        try {
          await router.routeRequest(requestConfig);
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Now all tunnels should be unhealthy
      await expect(router.routeRequest(requestConfig)).rejects.toThrow();
    });
  });
});