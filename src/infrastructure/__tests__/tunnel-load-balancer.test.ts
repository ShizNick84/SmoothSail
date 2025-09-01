import { TunnelLoadBalancer, LoadBalancingStrategy, TunnelPoolConfig } from '../tunnel-load-balancer';
import { SSHTunnelManager, TunnelConnection, TunnelState } from '../ssh-tunnel-manager';
import { TunnelHealthMonitor, TunnelHealthMetrics } from '../tunnel-health-monitor';
import { TunnelStateTracker } from '../tunnel-state-tracker';
import { Logger } from '../../core/logging/logger';

describe('TunnelLoadBalancer', () => {
  let loadBalancer: TunnelLoadBalancer;
  let mockLogger: jest.Mocked<Logger>;
  let mockTunnelManager: jest.Mocked<SSHTunnelManager>;
  let mockHealthMonitor: jest.Mocked<TunnelHealthMonitor>;
  let mockStateTracker: jest.Mocked<TunnelStateTracker>;
  let mockConnections: TunnelConnection[];

  beforeEach(() => {
    // Setup mocks
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    mockTunnelManager = {
      getAllConnections: jest.fn(),
      on: jest.fn()
    } as any;

    mockHealthMonitor = {
      getHealthMetrics: jest.fn(),
      on: jest.fn()
    } as any;

    mockStateTracker = {} as any;

    // Create mock connections
    mockConnections = [
      {
        id: 'tunnel-1',
        config: { localPort: 8080, remotePort: 3000 } as any,
        state: TunnelState.CONNECTED,
        connectedAt: new Date(),
        lastActivity: new Date(),
        process: null,
        stats: { bytesTransferred: 0, uptime: 0, reconnectAttempts: 0, lastError: null, qualityScore: 100 }
      },
      {
        id: 'tunnel-2',
        config: { localPort: 8081, remotePort: 3001 } as any,
        state: TunnelState.CONNECTED,
        connectedAt: new Date(),
        lastActivity: new Date(),
        process: null,
        stats: { bytesTransferred: 0, uptime: 0, reconnectAttempts: 0, lastError: null, qualityScore: 90 }
      },
      {
        id: 'tunnel-3',
        config: { localPort: 8082, remotePort: 3002 } as any,
        state: TunnelState.CONNECTED,
        connectedAt: new Date(),
        lastActivity: new Date(),
        process: null,
        stats: { bytesTransferred: 0, uptime: 0, reconnectAttempts: 0, lastError: null, qualityScore: 80 }
      }
    ];

    mockTunnelManager.getAllConnections.mockReturnValue(mockConnections);

    // Setup health metrics
    mockHealthMonitor.getHealthMetrics.mockImplementation((connectionId: string) => {
      const healthScores = { 'tunnel-1': 95, 'tunnel-2': 85, 'tunnel-3': 75 };
      const latencies = { 'tunnel-1': 50, 'tunnel-2': 100, 'tunnel-3': 150 };
      
      return {
        connectionId,
        isHealthy: true,
        healthScore: healthScores[connectionId as keyof typeof healthScores] || 50,
        latency: latencies[connectionId as keyof typeof latencies] || 200,
        throughput: 1000,
        packetLoss: 0,
        uptime: 60000,
        lastHealthCheck: new Date(),
        consecutiveFailures: 0,
        issues: []
      } as TunnelHealthMetrics;
    });

    // Create load balancer with test configuration
    const config: Partial<TunnelPoolConfig> = {
      minActiveTunnels: 1,
      maxActiveTunnels: 3,
      strategy: LoadBalancingStrategy.ROUND_ROBIN,
      healthThreshold: 50,
      maxLatencyThreshold: 1000,
      enableFailover: true,
      enableDynamicWeights: false // Disable for predictable testing
    };

    loadBalancer = new TunnelLoadBalancer(
      mockLogger,
      mockTunnelManager,
      mockHealthMonitor,
      mockStateTracker,
      config
    );
  });

  afterEach(() => {
    loadBalancer.cleanup();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultBalancer = new TunnelLoadBalancer(
        mockLogger,
        mockTunnelManager,
        mockHealthMonitor,
        mockStateTracker
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tunnel Load Balancer initialized',
        expect.objectContaining({
          strategy: LoadBalancingStrategy.HEALTH_BASED,
          healthThreshold: 70
        })
      );

      defaultBalancer.cleanup();
    });

    it('should merge custom configuration with defaults', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tunnel Load Balancer initialized',
        expect.objectContaining({
          strategy: LoadBalancingStrategy.ROUND_ROBIN,
          healthThreshold: 50
        })
      );
    });
  });

  describe('enable/disable', () => {
    it('should enable load balancing successfully', () => {
      const enabledSpy = jest.fn();
      loadBalancer.on('loadBalancingEnabled', enabledSpy);

      loadBalancer.enable();

      expect(mockLogger.info).toHaveBeenCalledWith('Load balancing enabled');
      expect(enabledSpy).toHaveBeenCalled();
    });

    it('should not enable if already enabled', () => {
      loadBalancer.enable();
      loadBalancer.enable();

      expect(mockLogger.warn).toHaveBeenCalledWith('Load balancing is already enabled');
    });

    it('should disable load balancing successfully', () => {
      const disabledSpy = jest.fn();
      loadBalancer.on('loadBalancingDisabled', disabledSpy);

      loadBalancer.enable();
      loadBalancer.disable();

      expect(mockLogger.info).toHaveBeenCalledWith('Load balancing disabled');
      expect(disabledSpy).toHaveBeenCalled();
    });
  });

  describe('tunnel selection', () => {
    beforeEach(() => {
      loadBalancer.enable();
    });

    it('should throw error if not enabled', () => {
      loadBalancer.disable();
      expect(() => loadBalancer.selectTunnel()).toThrow('Load balancing is not enabled');
    });

    it('should return null if no available tunnels', () => {
      mockTunnelManager.getAllConnections.mockReturnValue([]);
      const selection = loadBalancer.selectTunnel();
      expect(selection).toBeNull();
    });

    it('should exclude specified connections', () => {
      const selection = loadBalancer.selectTunnel(['tunnel-1', 'tunnel-2']);
      expect(selection).not.toBeNull();
      expect(selection!.connection.id).toBe('tunnel-3');
    });

    it('should filter unhealthy tunnels', () => {
      // Make tunnel-1 unhealthy
      mockHealthMonitor.getHealthMetrics.mockImplementation((connectionId: string) => {
        if (connectionId === 'tunnel-1') {
          return {
            connectionId,
            isHealthy: false,
            healthScore: 30, // Below threshold
            latency: 50,
            throughput: 1000,
            packetLoss: 0,
            uptime: 60000,
            lastHealthCheck: new Date(),
            consecutiveFailures: 0,
            issues: []
          } as TunnelHealthMetrics;
        }
        return {
          connectionId,
          isHealthy: true,
          healthScore: 80,
          latency: 100,
          throughput: 1000,
          packetLoss: 0,
          uptime: 60000,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
          issues: []
        } as TunnelHealthMetrics;
      });

      const availableTunnels = loadBalancer.getAvailableTunnels();
      expect(availableTunnels).toHaveLength(2);
      expect(availableTunnels.find(t => t.id === 'tunnel-1')).toBeUndefined();
    });

    it('should filter high latency tunnels', () => {
      // Make tunnel-1 have high latency
      mockHealthMonitor.getHealthMetrics.mockImplementation((connectionId: string) => {
        if (connectionId === 'tunnel-1') {
          return {
            connectionId,
            isHealthy: true,
            healthScore: 80,
            latency: 2000, // Above threshold
            throughput: 1000,
            packetLoss: 0,
            uptime: 60000,
            lastHealthCheck: new Date(),
            consecutiveFailures: 0,
            issues: []
          } as TunnelHealthMetrics;
        }
        return {
          connectionId,
          isHealthy: true,
          healthScore: 80,
          latency: 100,
          throughput: 1000,
          packetLoss: 0,
          uptime: 60000,
          lastHealthCheck: new Date(),
          consecutiveFailures: 0,
          issues: []
        } as TunnelHealthMetrics;
      });

      const availableTunnels = loadBalancer.getAvailableTunnels();
      expect(availableTunnels).toHaveLength(2);
      expect(availableTunnels.find(t => t.id === 'tunnel-1')).toBeUndefined();
    });
  });

  describe('load balancing strategies', () => {
    beforeEach(() => {
      loadBalancer.enable();
    });

    it('should use round robin strategy', () => {
      loadBalancer.updateStrategy(LoadBalancingStrategy.ROUND_ROBIN);

      const selections = [];
      for (let i = 0; i < 6; i++) {
        const selection = loadBalancer.selectTunnel();
        selections.push(selection!.connection.id);
      }

      // Should cycle through tunnels
      expect(selections).toEqual([
        'tunnel-1', 'tunnel-2', 'tunnel-3',
        'tunnel-1', 'tunnel-2', 'tunnel-3'
      ]);
    });

    it('should use health-based strategy', () => {
      loadBalancer.updateStrategy(LoadBalancingStrategy.HEALTH_BASED);

      const selection = loadBalancer.selectTunnel();
      
      // Should select tunnel with highest health score (tunnel-1: 95)
      expect(selection!.connection.id).toBe('tunnel-1');
    });

    it('should use latency-based strategy', () => {
      loadBalancer.updateStrategy(LoadBalancingStrategy.LATENCY_BASED);

      const selection = loadBalancer.selectTunnel();
      
      // Should select tunnel with lowest latency (tunnel-1: 50ms)
      expect(selection!.connection.id).toBe('tunnel-1');
    });

    it('should use random strategy', () => {
      loadBalancer.updateStrategy(LoadBalancingStrategy.RANDOM);

      const selections = new Set();
      for (let i = 0; i < 20; i++) {
        const selection = loadBalancer.selectTunnel();
        selections.add(selection!.connection.id);
      }

      // Should eventually select different tunnels (probabilistic test)
      expect(selections.size).toBeGreaterThan(1);
    });

    it('should use least connections strategy', () => {
      loadBalancer.updateStrategy(LoadBalancingStrategy.LEAST_CONNECTIONS);

      // First selection should be any tunnel (all have 0 connections)
      const firstSelection = loadBalancer.selectTunnel();
      expect(firstSelection).not.toBeNull();

      // Second selection should prefer a different tunnel
      const secondSelection = loadBalancer.selectTunnel();
      expect(secondSelection).not.toBeNull();
    });
  });

  describe('failover', () => {
    beforeEach(() => {
      loadBalancer.enable();
    });

    it('should perform failover successfully', async () => {
      const failoverSpy = jest.fn();
      loadBalancer.on('failoverSuccessful', failoverSpy);

      const result = await loadBalancer.performFailover('tunnel-1');
      
      expect(result).not.toBeNull();
      expect(result!.connection.id).not.toBe('tunnel-1');
      expect(failoverSpy).toHaveBeenCalled();
    });

    it('should fail if no alternative tunnels available', async () => {
      const failoverFailedSpy = jest.fn();
      loadBalancer.on('failoverFailed', failoverFailedSpy);

      // Only one tunnel available
      mockTunnelManager.getAllConnections.mockReturnValue([mockConnections[0]]);

      const result = await loadBalancer.performFailover('tunnel-1');
      
      expect(result).toBeNull();
      expect(failoverFailedSpy).toHaveBeenCalled();
    });

    it('should not perform failover if disabled', async () => {
      loadBalancer.updateConfig({ enableFailover: false });

      const result = await loadBalancer.performFailover('tunnel-1');
      
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Failover is disabled');
    });
  });

  describe('statistics', () => {
    beforeEach(() => {
      loadBalancer.enable();
    });

    it('should track selection statistics', () => {
      // Make several selections
      for (let i = 0; i < 5; i++) {
        loadBalancer.selectTunnel();
      }

      const stats = loadBalancer.getLoadBalancingStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.requestsPerTunnel.size).toBeGreaterThan(0);
    });

    it('should calculate tunnel utilization', () => {
      // Make selections to generate utilization data
      for (let i = 0; i < 10; i++) {
        loadBalancer.selectTunnel();
      }

      const stats = loadBalancer.getLoadBalancingStats();
      const totalUtilization = Array.from(stats.tunnelUtilization.values())
        .reduce((sum, util) => sum + util, 0);
      
      expect(totalUtilization).toBeCloseTo(100, 1); // Should sum to ~100%
    });
  });

  describe('tunnel weights', () => {
    beforeEach(() => {
      loadBalancer.enable();
    });

    it('should initialize tunnel weights', () => {
      const weights = loadBalancer.getTunnelWeights();
      expect(weights.size).toBe(3);
      
      for (const weight of weights.values()) {
        expect(weight.weight).toBe(1.0);
        expect(weight.baseWeight).toBe(1.0);
      }
    });

    it('should update tunnel weight manually', () => {
      const weightUpdatedSpy = jest.fn();
      loadBalancer.on('tunnelWeightUpdated', weightUpdatedSpy);

      loadBalancer.updateTunnelWeight('tunnel-1', 2.5);

      const weights = loadBalancer.getTunnelWeights();
      const tunnel1Weight = weights.get('tunnel-1');
      
      expect(tunnel1Weight?.weight).toBe(2.5);
      expect(weightUpdatedSpy).toHaveBeenCalledWith('tunnel-1', tunnel1Weight);
    });

    it('should clamp weight values', () => {
      loadBalancer.updateTunnelWeight('tunnel-1', 15); // Above max
      loadBalancer.updateTunnelWeight('tunnel-2', -1); // Below min

      const weights = loadBalancer.getTunnelWeights();
      
      expect(weights.get('tunnel-1')?.weight).toBe(10); // Clamped to max
      expect(weights.get('tunnel-2')?.weight).toBe(0.1); // Clamped to min
    });
  });

  describe('strategy updates', () => {
    beforeEach(() => {
      loadBalancer.enable();
    });

    it('should update strategy successfully', () => {
      const strategyUpdatedSpy = jest.fn();
      loadBalancer.on('strategyUpdated', strategyUpdatedSpy);

      loadBalancer.updateStrategy(LoadBalancingStrategy.LATENCY_BASED);

      const stats = loadBalancer.getLoadBalancingStats();
      expect(stats.activeStrategy).toBe(LoadBalancingStrategy.LATENCY_BASED);
      expect(strategyUpdatedSpy).toHaveBeenCalledWith(
        LoadBalancingStrategy.ROUND_ROBIN,
        LoadBalancingStrategy.LATENCY_BASED
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      loadBalancer.enable();
      loadBalancer.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith('Tunnel load balancer cleanup completed');
    });
  });
});