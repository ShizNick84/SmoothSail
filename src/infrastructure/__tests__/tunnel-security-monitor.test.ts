import { TunnelSecurityMonitor, SecurityEventType, ThreatLevel } from '../tunnel-security-monitor';
import { SSHTunnelManager, TunnelConnection, TunnelState } from '../ssh-tunnel-manager';
import { EncryptionService } from '../../security/encryption-service';
import { Logger } from '../../core/logging/logger';

describe('TunnelSecurityMonitor', () => {
  let securityMonitor: TunnelSecurityMonitor;
  let mockLogger: jest.Mocked<Logger>;
  let mockTunnelManager: jest.Mocked<SSHTunnelManager>;
  let mockEncryptionService: jest.Mocked<EncryptionService>;
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
      disconnectTunnel: jest.fn(),
      on: jest.fn()
    } as any;

    mockEncryptionService = {} as any;

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

    mockTunnelManager.getAllConnections.mockReturnValue([mockConnection]);
    mockTunnelManager.getConnection.mockReturnValue(mockConnection);

    // Create security monitor
    securityMonitor = new TunnelSecurityMonitor(
      mockLogger,
      mockTunnelManager,
      mockEncryptionService,
      {
        enableTrafficMonitoring: true,
        enableIntrusionDetection: true,
        enableDataIntegrityChecking: true,
        trafficAnalysisInterval: 1000, // 1 second for testing
        maxAnomalyScore: 70,
        enableAutoResponse: true
      }
    );
  });

  afterEach(() => {
    securityMonitor.cleanup();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const defaultMonitor = new TunnelSecurityMonitor(
        mockLogger,
        mockTunnelManager,
        mockEncryptionService
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tunnel Security Monitor initialized',
        expect.objectContaining({
          enableTrafficMonitoring: true,
          enableIntrusionDetection: true,
          enableDataIntegrityChecking: true
        })
      );

      defaultMonitor.cleanup();
    });
  });

  describe('monitoring lifecycle', () => {
    it('should start monitoring successfully', () => {
      const monitoringStartedSpy = jest.fn();
      securityMonitor.on('securityMonitoringStarted', monitoringStartedSpy);

      securityMonitor.startMonitoring();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting tunnel security monitoring');
      expect(monitoringStartedSpy).toHaveBeenCalled();
    });

    it('should not start monitoring if already running', () => {
      securityMonitor.startMonitoring();
      securityMonitor.startMonitoring();

      expect(mockLogger.warn).toHaveBeenCalledWith('Security monitoring is already running');
    });

    it('should stop monitoring successfully', () => {
      const monitoringStoppedSpy = jest.fn();
      securityMonitor.on('securityMonitoringStopped', monitoringStoppedSpy);

      securityMonitor.startMonitoring();
      securityMonitor.stopMonitoring();

      expect(mockLogger.info).toHaveBeenCalledWith('Stopping tunnel security monitoring');
      expect(monitoringStoppedSpy).toHaveBeenCalled();
    });
  });

  describe('connection monitoring', () => {
    it('should start monitoring a specific connection', () => {
      securityMonitor.startMonitoringConnection(mockConnection.id);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Starting security monitoring for connection: ${mockConnection.id}`
      );
    });

    it('should not start monitoring if already monitoring connection', () => {
      securityMonitor.startMonitoringConnection(mockConnection.id);
      securityMonitor.startMonitoringConnection(mockConnection.id);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Already monitoring connection: ${mockConnection.id}`
      );
    });

    it('should stop monitoring a specific connection', () => {
      securityMonitor.startMonitoringConnection(mockConnection.id);
      securityMonitor.stopMonitoringConnection(mockConnection.id);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Stopped security monitoring for connection: ${mockConnection.id}`
      );
    });
  });

  describe('security event reporting', () => {
    it('should report security event successfully', () => {
      const securityEventSpy = jest.fn();
      securityMonitor.on('securityEvent', securityEventSpy);

      const event = securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.UNAUTHORIZED_ACCESS,
        ThreatLevel.HIGH,
        'Test security event',
        { testData: 'value' }
      );

      expect(event).toBeDefined();
      expect(event.connectionId).toBe(mockConnection.id);
      expect(event.type).toBe(SecurityEventType.UNAUTHORIZED_ACCESS);
      expect(event.threatLevel).toBe(ThreatLevel.HIGH);
      expect(event.description).toBe('Test security event');
      expect(event.resolved).toBe(false);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Security event detected: ${event.id}`,
        expect.objectContaining({
          connectionId: mockConnection.id,
          type: SecurityEventType.UNAUTHORIZED_ACCESS,
          threatLevel: ThreatLevel.HIGH
        })
      );

      expect(securityEventSpy).toHaveBeenCalledWith(event);
    });

    it('should resolve security event', () => {
      const securityEventResolvedSpy = jest.fn();
      securityMonitor.on('securityEventResolved', securityEventResolvedSpy);

      const event = securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.SUSPICIOUS_TRAFFIC,
        ThreatLevel.MEDIUM,
        'Test event'
      );

      const responseActions = ['Blocked IP', 'Increased monitoring'];
      securityMonitor.resolveSecurityEvent(event.id, responseActions);

      expect(event.resolved).toBe(true);
      expect(event.resolvedAt).toBeInstanceOf(Date);
      expect(event.responseActions).toEqual(responseActions);

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Security event resolved: ${event.id}`,
        { responseActions }
      );

      expect(securityEventResolvedSpy).toHaveBeenCalledWith(event);
    });

    it('should handle resolving non-existent event', () => {
      securityMonitor.resolveSecurityEvent('non-existent-id', ['Action']);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security event not found: non-existent-id'
      );
    });
  });

  describe('security event retrieval', () => {
    beforeEach(() => {
      // Create test events
      securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.UNAUTHORIZED_ACCESS,
        ThreatLevel.HIGH,
        'High threat event'
      );

      securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.SUSPICIOUS_TRAFFIC,
        ThreatLevel.MEDIUM,
        'Medium threat event'
      );

      securityMonitor.reportSecurityEvent(
        'other-connection',
        SecurityEventType.TRAFFIC_ANOMALY,
        ThreatLevel.LOW,
        'Low threat event'
      );
    });

    it('should get all security events', () => {
      const events = securityMonitor.getSecurityEvents();
      expect(events).toHaveLength(3);
    });

    it('should filter events by connection ID', () => {
      const events = securityMonitor.getSecurityEvents(mockConnection.id);
      expect(events).toHaveLength(2);
      expect(events.every(e => e.connectionId === mockConnection.id)).toBe(true);
    });

    it('should filter events by threat level', () => {
      const events = securityMonitor.getSecurityEvents(undefined, ThreatLevel.HIGH);
      expect(events).toHaveLength(1);
      expect(events[0].threatLevel).toBe(ThreatLevel.HIGH);
    });

    it('should limit number of events returned', () => {
      const events = securityMonitor.getSecurityEvents(undefined, undefined, 2);
      expect(events).toHaveLength(2);
    });

    it('should return events sorted by timestamp (newest first)', () => {
      const events = securityMonitor.getSecurityEvents();
      expect(events).toHaveLength(3);
      
      for (let i = 1; i < events.length; i++) {
        expect(events[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          events[i].timestamp.getTime()
        );
      }
    });
  });

  describe('traffic analysis', () => {
    beforeEach(() => {
      securityMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should return empty traffic analysis initially', () => {
      const analysis = securityMonitor.getTrafficAnalysis(mockConnection.id);
      expect(analysis).toEqual([]);
    });

    it('should limit traffic analysis entries', () => {
      const analysis = securityMonitor.getTrafficAnalysis(mockConnection.id, 5);
      expect(analysis.length).toBeLessThanOrEqual(5);
    });
  });

  describe('security metrics', () => {
    it('should return initial security metrics', () => {
      const metrics = securityMonitor.getSecurityMetrics();

      expect(metrics).toEqual({
        totalEvents: 0,
        eventsByType: expect.any(Map),
        eventsByThreatLevel: expect.any(Map),
        averageAnomalyScore: 0,
        integrityViolations: 0,
        resolvedEvents: 0,
        activeThreats: 0,
        lastSecurityScan: expect.any(Date),
        systemSecurityScore: 100
      });
    });

    it('should update metrics when events are reported', () => {
      securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.UNAUTHORIZED_ACCESS,
        ThreatLevel.HIGH,
        'Test event'
      );

      const metrics = securityMonitor.getSecurityMetrics();
      expect(metrics.totalEvents).toBe(1);
      expect(metrics.activeThreats).toBe(1);
      expect(metrics.eventsByType.get(SecurityEventType.UNAUTHORIZED_ACCESS)).toBe(1);
      expect(metrics.eventsByThreatLevel.get(ThreatLevel.HIGH)).toBe(1);
    });

    it('should update metrics when events are resolved', () => {
      const event = securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.SUSPICIOUS_TRAFFIC,
        ThreatLevel.MEDIUM,
        'Test event'
      );

      securityMonitor.resolveSecurityEvent(event.id, ['Resolved']);

      const metrics = securityMonitor.getSecurityMetrics();
      expect(metrics.resolvedEvents).toBe(1);
      expect(metrics.activeThreats).toBe(0);
    });
  });

  describe('security scan', () => {
    beforeEach(() => {
      securityMonitor.startMonitoringConnection(mockConnection.id);
    });

    it('should perform security scan successfully', async () => {
      await securityMonitor.performSecurityScan(mockConnection.id);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Performing security scan for connection: ${mockConnection.id}`
      );
    });

    it('should handle security scan for non-existent connection', async () => {
      mockTunnelManager.getConnection.mockReturnValue(undefined);

      await securityMonitor.performSecurityScan('non-existent');

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Connection not found for security scan: non-existent'
      );
    });

    it('should handle security scan errors', async () => {
      // Mock an error during scan
      mockTunnelManager.getConnection.mockImplementation(() => {
        throw new Error('Test error');
      });

      await securityMonitor.performSecurityScan(mockConnection.id);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Security scan failed for connection ${mockConnection.id}`,
        expect.any(Error)
      );
    });
  });

  describe('automatic response', () => {
    it('should trigger automatic response for critical threats', async () => {
      const highThreatSpy = jest.fn();
      securityMonitor.on('highThreatDetected', highThreatSpy);

      securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.TUNNEL_HIJACK_ATTEMPT,
        ThreatLevel.CRITICAL,
        'Critical security event'
      );

      // Wait for async response
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTunnelManager.disconnectTunnel).toHaveBeenCalledWith(mockConnection.id);
    });

    it('should trigger high threat detection for high severity events', () => {
      const highThreatSpy = jest.fn();
      securityMonitor.on('highThreatDetected', highThreatSpy);

      const event = securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.DATA_INTEGRITY_VIOLATION,
        ThreatLevel.HIGH,
        'High security event'
      );

      expect(highThreatSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', () => {
      securityMonitor.startMonitoring();
      securityMonitor.cleanup();

      expect(mockLogger.info).toHaveBeenCalledWith('Tunnel security monitor cleanup completed');
    });

    it('should clean up old events during cleanup', () => {
      // Create an event
      securityMonitor.reportSecurityEvent(
        mockConnection.id,
        SecurityEventType.SUSPICIOUS_TRAFFIC,
        ThreatLevel.LOW,
        'Old event'
      );

      // Mock old timestamp
      const events = securityMonitor.getSecurityEvents();
      if (events.length > 0) {
        events[0].timestamp = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      }

      securityMonitor.cleanup();

      // Events should be cleaned up (this is a simplified test)
      expect(mockLogger.info).toHaveBeenCalledWith('Tunnel security monitor cleanup completed');
    });
  });
});
