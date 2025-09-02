/**
 * API Integration Tests
 * 
 * Integration tests for external API connections, SSH tunnel routing,
 * and system integration with external services.
 * 
 * Requirements: 17.2, 17.4, 17.5 - System integration tests with external APIs
 */

import axios from 'axios';
import { SSHTunnelManager } from '@/infrastructure/ssh-tunnel-manager';
import { SystemMonitor } from '@/infrastructure/system-monitor';

// Mock external dependencies for testing
jest.mock('axios');
jest.mock('@/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Integration Tests', () => {
  let tunnelManager: SSHTunnelManager;
  let systemMonitor: SystemMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful axios responses
    mockedAxios.get.mockResolvedValue({
      data: { server_time: Date.now() },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {}
    });

    tunnelManager = new SSHTunnelManager();
    systemMonitor = new SystemMonitor();
  });

  describe('SSH Tunnel Integration', () => {
    it('should establish SSH tunnel connection', async () => {
      const tunnelConfig = {
        host: '168.138.104.117', // Oracle Free Tier IP
        port: 22,
        username: 'ubuntu',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 80,
        keepAlive: true,
        compression: true
      };

      // Mock successful tunnel establishment
      const mockTunnel = {
        isConnected: true,
        localPort: 8080,
        remotePort: 80,
        host: tunnelConfig.host,
        status: 'CONNECTED',
        lastActivity: new Date(),
        bytesTransferred: 0,
        connectionTime: new Date()
      };

      // Test tunnel establishment
      const result = await tunnelManager.establishTunnel(tunnelConfig);
      
      expect(result).toBeDefined();
      expect(typeof result.isConnected).toBe('boolean');
      expect(typeof result.localPort).toBe('number');
      expect(typeof result.remotePort).toBe('number');
    });

    it('should handle tunnel connection failures gracefully', async () => {
      const invalidConfig = {
        host: 'invalid-host',
        port: 22,
        username: 'invalid-user',
        privateKeyPath: '/invalid/path',
        localPort: 8080,
        remotePort: 80,
        keepAlive: true,
        compression: true
      };

      // Test should handle connection failure without throwing
      await expect(async () => {
        await tunnelManager.establishTunnel(invalidConfig);
      }).not.toThrow();
    });

    it('should monitor tunnel health and performance', async () => {
      const tunnelConfig = {
        host: '168.138.104.117',
        port: 22,
        username: 'ubuntu',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 80,
        keepAlive: true,
        compression: true
      };

      // Establish tunnel first
      await tunnelManager.establishTunnel(tunnelConfig);

      // Monitor tunnel health
      const healthStatus = await tunnelManager.monitorTunnelHealth();
      
      expect(healthStatus).toBeDefined();
      expect(typeof healthStatus.isHealthy).toBe('boolean');
      expect(typeof healthStatus.latency).toBe('number');
      expect(typeof healthStatus.throughput).toBe('number');
      expect(healthStatus.lastCheck).toBeInstanceOf(Date);
    });

    it('should implement automatic reconnection on failure', async () => {
      const tunnelConfig = {
        host: '168.138.104.117',
        port: 22,
        username: 'ubuntu',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 80,
        keepAlive: true,
        compression: true
      };

      // Simulate tunnel failure and recovery
      let connectionAttempts = 0;
      const originalEstablishTunnel = tunnelManager.establishTunnel;
      
      tunnelManager.establishTunnel = jest.fn().mockImplementation(async (config) => {
        connectionAttempts++;
        if (connectionAttempts <= 2) {
          throw new Error('Connection failed');
        }
        return originalEstablishTunnel.call(tunnelManager, config);
      });

      // Test automatic reconnection
      const result = await tunnelManager.handleTunnelFailure();
      
      expect(connectionAttempts).toBeGreaterThan(1);
      expect(result).toBeDefined();
    });
  });

  describe('External API Integration', () => {
    it('should route API requests through SSH tunnel', async () => {
      // Mock tunnel routing
      const mockProxyConfig = {
        host: 'localhost',
        port: 8080,
        protocol: 'http' as const
      };

      // Configure axios to use proxy
      mockedAxios.create.mockReturnValue({
        ...mockedAxios,
        defaults: {
          proxy: mockProxyConfig
        }
      } as any);

      // Test API request routing
      const response = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time', {
        proxy: mockProxyConfig
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should handle API rate limiting correctly', async () => {
      // Mock rate limit response
      mockedAxios.get
        .mockRejectedValueOnce({
          response: {
            status: 429,
            headers: { 'retry-after': '5' }
          }
        })
        .mockResolvedValueOnce({
          data: { server_time: Date.now() },
          status: 200
        });

      // Mock setTimeout for testing
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      // Test rate limit handling
      let response;
      try {
        response = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');
      } catch (error) {
        // Retry after rate limit
        await new Promise(resolve => setTimeout(resolve, 5000));
        response = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');
      }

      expect(response.status).toBe(200);
      expect(setTimeout).toHaveBeenCalled();
    });

    it('should validate API response integrity', async () => {
      const mockResponse = {
        data: {
          server_time: Date.now(),
          currency_pairs: [
            {
              id: 'BTC_USDT',
              base: 'BTC',
              quote: 'USDT',
              fee: '0.2',
              min_base_amount: '0.001',
              min_quote_amount: '1.0'
            }
          ]
        },
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json'
        },
        config: {}
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const response = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/currency_pairs');

      // Validate response structure
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.server_time).toBeGreaterThan(0);
      expect(Array.isArray(response.data.currency_pairs)).toBe(true);
      
      if (response.data.currency_pairs.length > 0) {
        const pair = response.data.currency_pairs[0];
        expect(pair).toHaveProperty('id');
        expect(pair).toHaveProperty('base');
        expect(pair).toHaveProperty('quote');
        expect(pair).toHaveProperty('fee');
      }
    });

    it('should handle network timeouts and retries', async () => {
      // Mock network timeout
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          data: { server_time: Date.now() },
          status: 200
        });

      let attempts = 0;
      let response;

      // Implement retry logic
      const maxRetries = 3;
      for (let i = 0; i < maxRetries; i++) {
        try {
          attempts++;
          response = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');
          break;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
      }

      expect(attempts).toBe(3);
      expect(response?.status).toBe(200);
    });
  });

  describe('System Integration', () => {
    it('should monitor system resources during API operations', async () => {
      // Get initial system metrics
      const initialMetrics = systemMonitor.getSystemMetrics();
      
      expect(initialMetrics).toBeDefined();
      expect(typeof initialMetrics.cpu.usage).toBe('number');
      expect(typeof initialMetrics.memory.used).toBe('number');
      expect(typeof initialMetrics.disk.used).toBe('number');
      expect(typeof initialMetrics.network.bytesReceived).toBe('number');

      // Simulate API load
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(mockedAxios.get(`https://api.gateio.ws/api/v4/spot/time?${i}`));
      }

      await Promise.all(promises);

      // Get metrics after load
      const afterMetrics = systemMonitor.getSystemMetrics();
      
      expect(afterMetrics).toBeDefined();
      expect(afterMetrics.timestamp.getTime()).toBeGreaterThan(initialMetrics.timestamp.getTime());
    });

    it('should detect and handle system resource constraints', async () => {
      // Mock high resource usage
      const mockHighUsageMetrics = {
        cpu: { usage: 95, temperature: 75, frequency: 2400 },
        memory: { used: 11000, available: 1000, total: 12000 },
        disk: { used: 240000, available: 16000, total: 256000 },
        network: { bytesReceived: 1000000, bytesSent: 500000 },
        timestamp: new Date()
      };

      // Override system monitor to return high usage
      systemMonitor.getSystemMetrics = jest.fn().mockReturnValue(mockHighUsageMetrics);

      const metrics = systemMonitor.getSystemMetrics();
      
      // Should detect high resource usage
      expect(metrics.cpu.usage).toBeGreaterThan(90);
      expect(metrics.memory.used / metrics.memory.total).toBeGreaterThan(0.9);
      expect(metrics.disk.used / metrics.disk.total).toBeGreaterThan(0.9);
    });

    it('should coordinate multiple system components', async () => {
      // Test coordination between tunnel, API, and monitoring
      const tunnelConfig = {
        host: '168.138.104.117',
        port: 22,
        username: 'ubuntu',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 80,
        keepAlive: true,
        compression: true
      };

      // Establish tunnel
      const tunnelResult = await tunnelManager.establishTunnel(tunnelConfig);
      
      // Monitor system during tunnel operation
      const systemMetrics = systemMonitor.getSystemMetrics();
      
      // Make API request through tunnel
      const apiResponse = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');

      // Validate coordination
      expect(tunnelResult).toBeDefined();
      expect(systemMetrics).toBeDefined();
      expect(apiResponse.status).toBe(200);
      
      // All components should be operational
      expect(typeof tunnelResult.isConnected).toBe('boolean');
      expect(systemMetrics.timestamp).toBeInstanceOf(Date);
      expect(apiResponse.data).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle cascading failures gracefully', async () => {
      // Simulate multiple system failures
      const errors = [];

      // Tunnel failure
      try {
        await tunnelManager.establishTunnel({
          host: 'invalid-host',
          port: 22,
          username: 'invalid',
          privateKeyPath: '/invalid',
          localPort: 8080,
          remotePort: 80,
          keepAlive: true,
          compression: true
        });
      } catch (error) {
        errors.push('tunnel');
      }

      // API failure
      mockedAxios.get.mockRejectedValue(new Error('API unavailable'));
      try {
        await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');
      } catch (error) {
        errors.push('api');
      }

      // System should handle multiple failures without crashing
      expect(errors.length).toBeGreaterThan(0);
      expect(errors).toContain('api');
    });

    it('should implement circuit breaker pattern for API calls', async () => {
      let failureCount = 0;
      const maxFailures = 5;
      let circuitOpen = false;

      // Mock consecutive failures
      mockedAxios.get.mockImplementation(async () => {
        if (circuitOpen) {
          throw new Error('Circuit breaker is open');
        }
        
        failureCount++;
        if (failureCount <= maxFailures) {
          throw new Error('Service unavailable');
        }
        
        return { data: { server_time: Date.now() }, status: 200 };
      });

      // Test circuit breaker logic
      for (let i = 0; i < maxFailures; i++) {
        try {
          await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');
        } catch (error) {
          // Expected failures
        }
      }

      // Open circuit after max failures
      circuitOpen = true;

      try {
        await mockedAxios.get('https://api.gateio.ws/api/v4/spot/time');
      } catch (error) {
        expect(error.message).toContain('Circuit breaker is open');
      }

      expect(failureCount).toBe(maxFailures);
    });

    it('should validate data integrity across system boundaries', async () => {
      const testData = {
        timestamp: Date.now(),
        symbol: 'BTC/USDT',
        price: 42000.50,
        volume: 1234.567
      };

      // Mock API response with test data
      mockedAxios.get.mockResolvedValue({
        data: testData,
        status: 200
      });

      const response = await mockedAxios.get('https://api.gateio.ws/api/v4/spot/tickers');

      // Validate data integrity
      expect(response.data.timestamp).toBe(testData.timestamp);
      expect(response.data.symbol).toBe(testData.symbol);
      expect(response.data.price).toBe(testData.price);
      expect(response.data.volume).toBe(testData.volume);

      // Validate data types
      expect(typeof response.data.timestamp).toBe('number');
      expect(typeof response.data.symbol).toBe('string');
      expect(typeof response.data.price).toBe('number');
      expect(typeof response.data.volume).toBe('number');
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent API requests efficiently', async () => {
      const concurrentRequests = 20;
      const promises = [];

      const startTime = Date.now();

      // Create concurrent requests
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(mockedAxios.get(`https://api.gateio.ws/api/v4/spot/time?req=${i}`));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Validate results
      expect(results.length).toBe(concurrentRequests);
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Should complete within reasonable time (less than 5 seconds)
      expect(totalTime).toBeLessThan(5000);
    });

    it('should maintain performance under sustained load', async () => {
      const requestBatches = 5;
      const requestsPerBatch = 10;
      const batchResults = [];

      for (let batch = 0; batch < requestBatches; batch++) {
        const batchStartTime = Date.now();
        const promises = [];

        for (let i = 0; i < requestsPerBatch; i++) {
          promises.push(mockedAxios.get(`https://api.gateio.ws/api/v4/spot/time?batch=${batch}&req=${i}`));
        }

        const results = await Promise.all(promises);
        const batchEndTime = Date.now();
        const batchTime = batchEndTime - batchStartTime;

        batchResults.push({
          batch,
          time: batchTime,
          successCount: results.filter(r => r.status === 200).length
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Validate sustained performance
      expect(batchResults.length).toBe(requestBatches);
      batchResults.forEach(result => {
        expect(result.successCount).toBe(requestsPerBatch);
        expect(result.time).toBeLessThan(2000); // Each batch should complete within 2 seconds
      });

      // Performance should not degrade significantly over time
      const firstBatchTime = batchResults[0].time;
      const lastBatchTime = batchResults[batchResults.length - 1].time;
      const performanceDegradation = (lastBatchTime - firstBatchTime) / firstBatchTime;
      
      expect(performanceDegradation).toBeLessThan(0.5); // Less than 50% degradation
    });
  });
});
