import { TunnelHealthMonitor, HealthMonitorConfig } from '../tunnel-health-monitor';
import { SSHTunnelManager, TunnelConnection, TunnelState } from '../ssh-tunnel-manager';
import { TunnelStateTracker } from '../tunnel-state-tracker';
import { Logger } from '../../core/logging/logger';

// Mock dependencies
jest.mock('net');

describe('TunnelHealthMonitor', () => {
  let healthMonitor: TunnelHealthMonitor;
  let mockLogger: jest.Mocked<Logger>;
  let mockTunnelManager: jest.Mocked<SSHTunnelManager>;
  let mockStateTracker: jest.Mocked<TunnelStateTracker>;
  let mockConnection: TunnelConnection;

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
      getConnection: jest.fn(),
      on: jest.fn()
    } as any;

    mockStateTracker = {} as any;

    // Create mock connection
    mockConnection = {
      id: 'test-connection-1',
      config: {
        oracleIP: '168.138.104.117',
        sshPort: 22,
        username: 'testuser',
        privateKeyPath: '/path/to/key',
        localPort: 8080,
        remotePort: 3000,
        keepAlive: true,
        compression: true,
        connectionTimeout: 30,
        serverAliveInterval: 60,
        serverAliveCountMax: 3
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
        qualityScore: 100
      }
    };

    // Create health monitor with test configuration
    const config: Partial<HealthMonitorConfig> = {
      checkInterval: 1000, // 1 second for testing
      maxLatency: 100,
      maxPacketLoss: 5,
      minThroughput: 1024,
      failureThreshold: 2,
      healthCheckTimeout: 5000,
      enablePerformanceMonitoring: true
    };

    healthMonitor = new TunnelHealthMonitor(
      mockLogger,
      mockTunnelManager,
      mockStateTracker,
      config
    );
  });

  afterEach(() => {
    healthMonitor.cleanup();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultMonitor = new TunnelHealthMonitor(
        mockLogger,
        mockTunnelManager,
        mockStateTracker
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tunnel Health Monitor initialized',
        expect.objectContaining({
          checkInterval: 30000,
          maxLatency: 1000,
          maxPacketLoss: 5
        })
      );

      defaultMonitor.cleanup();
    });

    it('should merge custom configuration with defaults', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tunnel Health Monitor initialized',
        expect.objectContaining({
          checkInterval: 1000,
          maxLatency: 100,
          maxPacketLoss: 5
        })
      );
    });
  });

  describe('monitoring lifecycle', () => {
    beforeEach(() => {
      mockTunnelManager.getAllConnections.mockReturnValue([mockConnection]);
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
    });

    it('should start monitoring successfully', () => {
      const monitoringStartedSpy = jest.fn();
      healthMonitor.on('monitoringStarted', monitoringStartedSpy);

      healthMonitor.startMonitoring();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting tunnel health monitoring');
      expect(monitoringStartedSpy).toHaveBeenCalled();
    });

    it('should not start monitoring if already running', () => {
      healthMonitor.startMonitoring();
      healthMonitor.startMonitoring();

      expect(mockLogger.warn).toHaveBeenCalledWith('Health monitoring is already running');
    });

    it('should stop monitoring successfully', () => {
      const monitoringStoppedSpy = jest.fn();
      healthMonitor.on('monitoringStopped', monitoringStoppedSpy);

      healthMonitor.startMonitoring();
      healthMonitor.stopMonitoring();

      expect(mockLogger.info).toHaveBeenCalledWith('Stopping tunnel health monitoring');
      expect(monitoringStoppedSpy).toHaveBeenCalled();
    });

    it('should not stop monitoring if not running', () => {
      healthMonitor.stopMonitoring();

      expect(mockLogger.warn).toHaveBeenCalledWith('Health monitoring is not running');
    });
  });

  describe('connection monitoring', () => {
    beforeEach(() => {
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
    });

    it('should start monitoring a specific connection', () => {
      healthMonitor.startMonitoringConnection(mockConnection.id);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Starting health monitoring for connection: ${mockConnection.id}`
      );

      const metrics = healthMonitor.getHealthMetrics(mockConnection.id);
      expect(metrics).toBeDefined();
      expect(metrics?.connectionId).toBe(mockConnection.id);
    });

    it('should not start monitoring if already monitoring connection', () => {
      healthMonitor.startMonitoringConnection(mockConnection.id);
      healthMonitor.startMonitoringConnection(mockConnection.id);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Already monitoring connection: ${mockConnection.id}`
      );
    });

    it('should stop monitoring a specific connection', () => {
      healthMonitor.startMonitoringConnection(mockConnection.id);
      healthMonitor.stopMonitoringConnection(mockConnection.id);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Stopped health monitoring for connection: ${mockConnection.id}`
      );
    });
  });

  describe('health metrics', () => {
    beforeEach(() => {
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
      healthMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should initialize health metrics correctly', () => {
      const metrics = healthMonitor.getHealthMetrics(mockConnection.id);

      expect(metrics).toEqual({
        connectionId: mockConnection.id,
        isHealthy: false,
        latency: 0,
        throughput: 0,
        packetLoss: 0,
        uptime: 0,
        lastHealthCheck: expect.any(Date),
        consecutiveFailures: 0,
        healthScore: 0,
        issues: []
      });
    });

    it('should return undefined for non-existent connection', () => {
      const metrics = healthMonitor.getHealthMetrics('non-existent');
      expect(metrics).toBeUndefined();
    });

    it('should return all health metrics', () => {
      const allMetrics = healthMonitor.getAllHealthMetrics();
      expect(allMetrics.size).toBe(1);
      expect(allMetrics.has(mockConnection.id)).toBe(true);
    });
  });

  describe('system health status', () => {
    beforeEach(() => {
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
      healthMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should calculate system health status correctly', () => {
      const systemHealth = healthMonitor.getSystemHealthStatus();

      expect(systemHealth).toEqual({
        totalConnections: 1,
        healthyConnections: 0, // Initially unhealthy
        unhealthyConnections: 1,
        averageHealthScore: 0,
        criticalIssues: 0,
        systemHealthScore: 0
      });
    });

    it('should handle empty metrics', () => {
      healthMonitor.stopMonitoringConnection(mockConnection.id);
      const systemHealth = healthMonitor.getSystemHealthStatus();

      expect(systemHealth).toEqual({
        totalConnections: 0,
        healthyConnections: 0,
        unhealthyConnections: 0,
        averageHealthScore: 0,
        criticalIssues: 0,
        systemHealthScore: 0
      });
    });
  });

  describe('performance history', () => {
    beforeEach(() => {
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
      healthMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should return empty performance history initially', () => {
      const history = healthMonitor.getPerformanceHistory(mockConnection.id);
      expect(history).toEqual([]);
    });

    it('should limit performance history entries', () => {
      const history = healthMonitor.getPerformanceHistory(mockConnection.id, 5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for non-existent connection', () => {
      const history = healthMonitor.getPerformanceHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('forced health check', () => {
    beforeEach(() => {
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
      healthMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should perform forced health check', async () => {
      const result = await healthMonitor.forceHealthCheck(mockConnection.id);
      expect(result).toBeDefined();
      expect(result?.connectionId).toBe(mockConnection.id);
    });

    it('should return null for non-existent connection', async () => {
      mockTunnelManager.getConnection.mockReturnValue(undefined);
      const result = await healthMonitor.forceHealthCheck('non-existent');
      expect(result).toBeNull();
    });

    it('should handle health check errors gracefully', async () => {
      // Mock connection to throw error during health check
      const errorConnection = {
        ...mockConnection,
        state: TunnelState.FAILED
      };
      mockTunnelManager.getConnection.mockReturnValue(errorConnection);

      const result = await healthMonitor.forceHealthCheck(mockConnection.id);
      expect(result).toBeDefined();
      expect(result?.isHealthy).toBe(false);
    });
  });

  describe('event emission', () => {
    beforeEach(() => {
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);
    });

    it('should emit healthCheckCompleted event', (done) => {
      healthMonitor.on('healthCheckCompleted', (connection, metrics) => {
        expect(connection.id).toBe(mockConnection.id);
        expect(metrics.connectionId).toBe(mockConnection.id);
        done();
      });

      healthMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should emit connectionUnhealthy event for unhealthy connection', (done) => {
      // Set connection to disconnected state
      const unhealthyConnection = {
        ...mockConnection,
        state: TunnelState.DISCONNECTED
      };
      mockTunnelManager.getConnection.mockReturnValue(unhealthyConnection);

      healthMonitor.on('connectionUnhealthy', (connection, metrics) => {
        expect(connection.id).toBe(mockConnection.id);
        expect(metrics.isHealthy).toBe(false);
        done();
      });

      healthMonitor.startMonitoringConnection(mockConnection.id);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      mockTunnelManager.getAllConnections.mockReturnValue([mockConnection]);
      mockTunnelManager.getConnection.mockReturnValue(mockConnection);

      healthMonitor.startMonitoring();
      healthMonitor.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith('Tunnel health monitor cleanup completed');
    });
  });
});
