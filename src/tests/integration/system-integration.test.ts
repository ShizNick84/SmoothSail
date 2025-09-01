/**
 * System Integration Tests
 * 
 * End-to-end system integration tests covering the complete trading system
 * including hardware monitoring, security, and performance validation.
 * 
 * Requirements: 17.2, 17.4, 17.5 - System integration and performance testing
 */

import { SystemMonitor } from '@/infrastructure/system-monitor';
import { PerformanceOptimizer } from '@/infrastructure/performance-optimizer';
import { AutoRestartManager } from '@/infrastructure/auto-restart-manager';
import { AdminTools } from '@/infrastructure/admin-tools';

// Mock external dependencies
jest.mock('@/core/logging/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('systeminformation', () => ({
  cpu: jest.fn().mockResolvedValue({
    manufacturer: 'Intel',
    brand: 'Intel(R) Core(TM) i5-1135G7',
    speed: 2.4,
    cores: 4,
    physicalCores: 4,
    processors: 1
  }),
  mem: jest.fn().mockResolvedValue({
    total: 12884901888, // 12GB
    free: 2147483648,   // 2GB
    used: 10737418240,  // 10GB
    active: 8589934592  // 8GB
  }),
  fsSize: jest.fn().mockResolvedValue([{
    fs: '/dev/nvme0n1p1',
    type: 'ext4',
    size: 274877906944, // 256GB
    used: 137438953472, // 128GB
    available: 137438953472, // 128GB
    use: 50.0,
    mount: '/'
  }]),
  networkStats: jest.fn().mockResolvedValue([{
    iface: 'eth0',
    operstate: 'up',
    rx_bytes: 1073741824, // 1GB
    tx_bytes: 536870912,  // 512MB
    rx_sec: 1048576,      // 1MB/s
    tx_sec: 524288        // 512KB/s
  }]),
  currentLoad: jest.fn().mockResolvedValue({
    avgLoad: 1.5,
    currentLoad: 25.5,
    currentLoadUser: 15.2,
    currentLoadSystem: 10.3,
    currentLoadNice: 0.0,
    currentLoadIdle: 74.5
  }),
  cpuTemperature: jest.fn().mockResolvedValue({
    main: 45.0,
    cores: [42.0, 43.0, 45.0, 44.0],
    max: 45.0,
    socket: [],
    chipset: null
  })
}));

describe('System Integration Tests', () => {
  let systemMonitor: SystemMonitor;
  let performanceOptimizer: PerformanceOptimizer;
  let autoRestartManager: AutoRestartManager;
  let adminTools: AdminTools;

  beforeEach(() => {
    jest.clearAllMocks();
    
    systemMonitor = new SystemMonitor();
    performanceOptimizer = new PerformanceOptimizer();
    autoRestartManager = new AutoRestartManager();
    adminTools = new AdminTools();
  });

  describe('Intel NUC Hardware Integration', () => {
    it('should monitor Intel NUC hardware components', async () => {
      const metrics = await systemMonitor.getDetailedSystemMetrics();
      
      // Validate CPU monitoring
      expect(metrics.cpu).toBeDefined();
      expect(metrics.cpu.brand).toContain('Intel');
      expect(metrics.cpu.cores).toBeGreaterThan(0);
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.usage).toBeLessThanOrEqual(100);
      expect(metrics.cpu.temperature).toBeGreaterThan(0);
      expect(metrics.cpu.temperature).toBeLessThan(100);

      // Validate memory monitoring (12GB expected)
      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.total).toBeGreaterThan(10 * 1024 * 1024 * 1024); // > 10GB
      expect(metrics.memory.total).toBeLessThan(16 * 1024 * 1024 * 1024);    // < 16GB
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.available).toBeGreaterThan(0);
      expect(metrics.memory.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.usage).toBeLessThanOrEqual(100);

      // Validate storage monitoring (256GB M.2 SSD expected)
      expect(metrics.storage).toBeDefined();
      expect(metrics.storage.total).toBeGreaterThan(200 * 1024 * 1024 * 1024); // > 200GB
      expect(metrics.storage.total).toBeLessThan(300 * 1024 * 1024 * 1024);    // < 300GB
      expect(metrics.storage.used).toBeGreaterThan(0);
      expect(metrics.storage.available).toBeGreaterThan(0);
      expect(metrics.storage.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.storage.usage).toBeLessThanOrEqual(100);

      // Validate network monitoring
      expect(metrics.network).toBeDefined();
      expect(metrics.network.interfaces).toBeDefined();
      expect(Array.isArray(metrics.network.interfaces)).toBe(true);
      expect(metrics.network.bytesReceived).toBeGreaterThanOrEqual(0);
      expect(metrics.network.bytesSent).toBeGreaterThanOrEqual(0);
    });

    it('should detect hardware performance issues', async () => {
      // Mock high resource usage scenario
      const mockHighUsageMetrics = {
        cpu: {
          brand: 'Intel(R) Core(TM) i5-1135G7',
          cores: 4,
          usage: 95.5,
          temperature: 85.0,
          frequency: 2400
        },
        memory: {
          total: 12884901888,
          used: 12347418240, // 95% usage
          available: 537483648,
          usage: 95.8
        },
        storage: {
          total: 274877906944,
          used: 261993005056, // 95% usage
          available: 12884901888,
          usage: 95.3
        },
        network: {
          interfaces: ['eth0', 'wlan0'],
          bytesReceived: 1073741824,
          bytesSent: 536870912,
          currentSpeed: 1000
        },
        timestamp: new Date()
      };

      // Override system monitor to return high usage
      systemMonitor.getDetailedSystemMetrics = jest.fn().mockResolvedValue(mockHighUsageMetrics);

      const metrics = await systemMonitor.getDetailedSystemMetrics();
      const issues = await systemMonitor.detectPerformanceIssues(metrics);

      // Should detect high resource usage
      expect(issues.length).toBeGreaterThan(0);
      
      const cpuIssue = issues.find(issue => issue.component === 'CPU');
      const memoryIssue = issues.find(issue => issue.component === 'MEMORY');
      const storageIssue = issues.find(issue => issue.component === 'STORAGE');

      expect(cpuIssue).toBeDefined();
      expect(memoryIssue).toBeDefined();
      expect(storageIssue).toBeDefined();

      if (cpuIssue) {
        expect(cpuIssue.severity).toMatch(/^(MEDIUM|HIGH|CRITICAL)$/);
        expect(cpuIssue.description).toContain('CPU');
      }
    });

    it('should optimize system performance for trading', async () => {
      const currentMetrics = await systemMonitor.getDetailedSystemMetrics();
      const optimizations = await performanceOptimizer.optimizeForTrading(currentMetrics);

      expect(optimizations).toBeDefined();
      expect(Array.isArray(optimizations.appliedOptimizations)).toBe(true);
      expect(typeof optimizations.performanceGain).toBe('number');
      expect(optimizations.recommendations).toBeDefined();

      // Should have applied some optimizations
      if (optimizations.appliedOptimizations.length > 0) {
        optimizations.appliedOptimizations.forEach(optimization => {
          expect(optimization).toHaveProperty('type');
          expect(optimization).toHaveProperty('description');
          expect(optimization).toHaveProperty('impact');
        });
      }
    });

    it('should handle thermal management', async () => {
      // Mock high temperature scenario
      const mockHighTempMetrics = {
        cpu: {
          brand: 'Intel(R) Core(TM) i5-1135G7',
          cores: 4,
          usage: 75.0,
          temperature: 85.0, // High temperature
          frequency: 2400
        },
        memory: { total: 12884901888, used: 6442450944, available: 6442450944, usage: 50.0 },
        storage: { total: 274877906944, used: 137438953472, available: 137438953472, usage: 50.0 },
        network: { interfaces: ['eth0'], bytesReceived: 1073741824, bytesSent: 536870912, currentSpeed: 1000 },
        timestamp: new Date()
      };

      systemMonitor.getDetailedSystemMetrics = jest.fn().mockResolvedValue(mockHighTempMetrics);

      const metrics = await systemMonitor.getDetailedSystemMetrics();
      const thermalAction = await performanceOptimizer.implementThermalThrottling(metrics);

      expect(thermalAction).toBeDefined();
      expect(typeof thermalAction.throttlingApplied).toBe('boolean');
      expect(typeof thermalAction.newFrequency).toBe('number');
      expect(thermalAction.reason).toBeDefined();

      if (thermalAction.throttlingApplied) {
        expect(thermalAction.newFrequency).toBeLessThan(2400);
        expect(thermalAction.reason).toContain('temperature');
      }
    });
  });

  describe('System Reliability and Auto-Restart', () => {
    it('should implement auto-restart functionality', async () => {
      const restartConfig = {
        maxRestarts: 3,
        restartDelay: 5000,
        healthCheckInterval: 30000,
        failureThreshold: 5
      };

      const restartResult = await autoRestartManager.configureAutoRestart(restartConfig);

      expect(restartResult).toBeDefined();
      expect(restartResult.configured).toBe(true);
      expect(restartResult.config).toEqual(restartConfig);
    });

    it('should detect system failures and trigger restart', async () => {
      // Mock system failure scenario
      const mockFailureConditions = {
        processRunning: false,
        memoryLeakDetected: true,
        networkConnectivity: false,
        diskSpaceAvailable: true,
        cpuResponsive: true
      };

      const failureDetected = await autoRestartManager.detectSystemFailure(mockFailureConditions);

      expect(failureDetected).toBe(true);

      if (failureDetected) {
        const restartAction = await autoRestartManager.executeRestart('SYSTEM_FAILURE');
        
        expect(restartAction).toBeDefined();
        expect(restartAction.restartInitiated).toBe(true);
        expect(restartAction.reason).toBe('SYSTEM_FAILURE');
        expect(restartAction.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should implement graceful shutdown procedures', async () => {
      const shutdownResult = await autoRestartManager.gracefulShutdown({
        saveState: true,
        closeConnections: true,
        notifyUsers: true,
        timeout: 30000
      });

      expect(shutdownResult).toBeDefined();
      expect(shutdownResult.shutdownCompleted).toBe(true);
      expect(shutdownResult.stateSaved).toBe(true);
      expect(shutdownResult.connectionsClosed).toBe(true);
      expect(shutdownResult.duration).toBeGreaterThan(0);
    });

    it('should maintain system uptime statistics', async () => {
      const uptimeStats = await autoRestartManager.getUptimeStatistics();

      expect(uptimeStats).toBeDefined();
      expect(typeof uptimeStats.currentUptime).toBe('number');
      expect(typeof uptimeStats.totalRestarts).toBe('number');
      expect(typeof uptimeStats.averageUptime).toBe('number');
      expect(uptimeStats.lastRestart).toBeInstanceOf(Date);
      expect(Array.isArray(uptimeStats.restartHistory)).toBe(true);

      // Validate uptime is reasonable
      expect(uptimeStats.currentUptime).toBeGreaterThanOrEqual(0);
      expect(uptimeStats.totalRestarts).toBeGreaterThanOrEqual(0);
    });
  });

  describe('System Administration and Maintenance', () => {
    it('should provide comprehensive system diagnostics', async () => {
      const diagnostics = await adminTools.runSystemDiagnostics();

      expect(diagnostics).toBeDefined();
      expect(diagnostics.systemHealth).toBeDefined();
      expect(diagnostics.performanceMetrics).toBeDefined();
      expect(diagnostics.securityStatus).toBeDefined();
      expect(diagnostics.networkConnectivity).toBeDefined();
      expect(diagnostics.diskHealth).toBeDefined();

      // Validate diagnostic results
      expect(typeof diagnostics.systemHealth.overall).toBe('string');
      expect(['HEALTHY', 'WARNING', 'CRITICAL']).toContain(diagnostics.systemHealth.overall);
      
      expect(typeof diagnostics.performanceMetrics.score).toBe('number');
      expect(diagnostics.performanceMetrics.score).toBeGreaterThanOrEqual(0);
      expect(diagnostics.performanceMetrics.score).toBeLessThanOrEqual(100);
    });

    it('should create and manage system backups', async () => {
      const backupConfig = {
        includeConfigurations: true,
        includeLogs: true,
        includeData: true,
        compressionLevel: 6,
        encryptBackup: true
      };

      const backupResult = await adminTools.createSystemBackup(backupConfig);

      expect(backupResult).toBeDefined();
      expect(backupResult.backupCreated).toBe(true);
      expect(backupResult.backupPath).toBeDefined();
      expect(backupResult.backupSize).toBeGreaterThan(0);
      expect(backupResult.timestamp).toBeInstanceOf(Date);
      expect(backupResult.checksum).toBeDefined();

      // Validate backup integrity
      const integrityCheck = await adminTools.verifyBackupIntegrity(backupResult.backupPath);
      expect(integrityCheck.isValid).toBe(true);
      expect(integrityCheck.checksumMatch).toBe(true);
    });

    it('should manage system updates and patches', async () => {
      const updateCheck = await adminTools.checkForUpdates();

      expect(updateCheck).toBeDefined();
      expect(typeof updateCheck.updatesAvailable).toBe('boolean');
      expect(Array.isArray(updateCheck.availableUpdates)).toBe(true);
      expect(typeof updateCheck.securityUpdates).toBe('number');
      expect(typeof updateCheck.systemUpdates).toBe('number');

      if (updateCheck.updatesAvailable) {
        updateCheck.availableUpdates.forEach(update => {
          expect(update).toHaveProperty('package');
          expect(update).toHaveProperty('currentVersion');
          expect(update).toHaveProperty('availableVersion');
          expect(update).toHaveProperty('priority');
        });
      }
    });

    it('should monitor and manage system logs', async () => {
      const logManagement = await adminTools.manageSystemLogs();

      expect(logManagement).toBeDefined();
      expect(typeof logManagement.totalLogSize).toBe('number');
      expect(typeof logManagement.oldestLogDate).toBe('object');
      expect(typeof logManagement.newestLogDate).toBe('object');
      expect(Array.isArray(logManagement.logFiles)).toBe(true);

      // Validate log rotation
      const rotationResult = await adminTools.rotateSystemLogs();
      expect(rotationResult.rotationCompleted).toBe(true);
      expect(rotationResult.filesRotated).toBeGreaterThanOrEqual(0);
      expect(rotationResult.spaceSaved).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Benchmarking', () => {
    it('should benchmark system performance for trading operations', async () => {
      const benchmarkResults = await performanceOptimizer.runTradingBenchmark();

      expect(benchmarkResults).toBeDefined();
      expect(typeof benchmarkResults.overallScore).toBe('number');
      expect(benchmarkResults.overallScore).toBeGreaterThan(0);
      expect(benchmarkResults.overallScore).toBeLessThanOrEqual(100);

      // Validate individual benchmark metrics
      expect(benchmarkResults.cpuPerformance).toBeDefined();
      expect(benchmarkResults.memoryPerformance).toBeDefined();
      expect(benchmarkResults.diskPerformance).toBeDefined();
      expect(benchmarkResults.networkPerformance).toBeDefined();

      // CPU benchmark
      expect(typeof benchmarkResults.cpuPerformance.score).toBe('number');
      expect(typeof benchmarkResults.cpuPerformance.operationsPerSecond).toBe('number');
      expect(benchmarkResults.cpuPerformance.operationsPerSecond).toBeGreaterThan(0);

      // Memory benchmark
      expect(typeof benchmarkResults.memoryPerformance.score).toBe('number');
      expect(typeof benchmarkResults.memoryPerformance.throughputMBps).toBe('number');
      expect(benchmarkResults.memoryPerformance.throughputMBps).toBeGreaterThan(0);

      // Disk benchmark
      expect(typeof benchmarkResults.diskPerformance.score).toBe('number');
      expect(typeof benchmarkResults.diskPerformance.readSpeedMBps).toBe('number');
      expect(typeof benchmarkResults.diskPerformance.writeSpeedMBps).toBe('number');
      expect(benchmarkResults.diskPerformance.readSpeedMBps).toBeGreaterThan(0);
      expect(benchmarkResults.diskPerformance.writeSpeedMBps).toBeGreaterThan(0);

      // Network benchmark
      expect(typeof benchmarkResults.networkPerformance.score).toBe('number');
      expect(typeof benchmarkResults.networkPerformance.latencyMs).toBe('number');
      expect(typeof benchmarkResults.networkPerformance.throughputMbps).toBe('number');
      expect(benchmarkResults.networkPerformance.latencyMs).toBeGreaterThan(0);
      expect(benchmarkResults.networkPerformance.throughputMbps).toBeGreaterThan(0);
    });

    it('should validate system meets trading performance requirements', async () => {
      const performanceRequirements = {
        minCpuScore: 70,
        minMemoryThroughput: 1000, // MB/s
        minDiskReadSpeed: 500,     // MB/s
        minDiskWriteSpeed: 200,    // MB/s
        maxNetworkLatency: 50,     // ms
        minNetworkThroughput: 100  // Mbps
      };

      const benchmarkResults = await performanceOptimizer.runTradingBenchmark();
      const validationResult = await performanceOptimizer.validatePerformanceRequirements(
        benchmarkResults,
        performanceRequirements
      );

      expect(validationResult).toBeDefined();
      expect(typeof validationResult.meetsRequirements).toBe('boolean');
      expect(Array.isArray(validationResult.failedRequirements)).toBe(true);
      expect(Array.isArray(validationResult.recommendations)).toBe(true);

      // Log performance validation results
      console.log('Performance Validation:', {
        meetsRequirements: validationResult.meetsRequirements,
        failedRequirements: validationResult.failedRequirements,
        recommendations: validationResult.recommendations
      });

      // If requirements are not met, should provide recommendations
      if (!validationResult.meetsRequirements) {
        expect(validationResult.failedRequirements.length).toBeGreaterThan(0);
        expect(validationResult.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should stress test system under trading load', async () => {
      const stressTestConfig = {
        duration: 30000,        // 30 seconds
        concurrentOperations: 50,
        memoryPressure: true,
        cpuIntensive: true,
        diskIO: true,
        networkRequests: true
      };

      const stressTestResults = await performanceOptimizer.runStressTest(stressTestConfig);

      expect(stressTestResults).toBeDefined();
      expect(typeof stressTestResults.testCompleted).toBe('boolean');
      expect(typeof stressTestResults.duration).toBe('number');
      expect(typeof stressTestResults.operationsCompleted).toBe('number');
      expect(typeof stressTestResults.operationsPerSecond).toBe('number');
      expect(typeof stressTestResults.errorRate).toBe('number');

      // Validate stress test results
      expect(stressTestResults.testCompleted).toBe(true);
      expect(stressTestResults.duration).toBeGreaterThan(0);
      expect(stressTestResults.operationsCompleted).toBeGreaterThan(0);
      expect(stressTestResults.operationsPerSecond).toBeGreaterThan(0);
      expect(stressTestResults.errorRate).toBeGreaterThanOrEqual(0);
      expect(stressTestResults.errorRate).toBeLessThan(0.1); // Less than 10% error rate

      // System should remain stable under stress
      expect(stressTestResults.systemStability).toBeDefined();
      expect(stressTestResults.systemStability.cpuStable).toBe(true);
      expect(stressTestResults.systemStability.memoryStable).toBe(true);
      expect(stressTestResults.systemStability.diskStable).toBe(true);
    });
  });

  describe('System Integration Edge Cases', () => {
    it('should handle system resource exhaustion gracefully', async () => {
      // Mock resource exhaustion scenario
      const mockExhaustedMetrics = {
        cpu: { usage: 99.9, temperature: 95.0 },
        memory: { usage: 99.5, available: 52428800 }, // 50MB available
        storage: { usage: 99.8, available: 536870912 }, // 512MB available
        network: { interfaces: [], bytesReceived: 0, bytesSent: 0 }
      };

      systemMonitor.getDetailedSystemMetrics = jest.fn().mockResolvedValue(mockExhaustedMetrics);

      const metrics = await systemMonitor.getDetailedSystemMetrics();
      const emergencyActions = await performanceOptimizer.handleResourceExhaustion(metrics);

      expect(emergencyActions).toBeDefined();
      expect(Array.isArray(emergencyActions.actionsPerformed)).toBe(true);
      expect(typeof emergencyActions.systemStabilized).toBe('boolean');
      expect(emergencyActions.emergencyMode).toBe(true);

      // Should have performed emergency actions
      expect(emergencyActions.actionsPerformed.length).toBeGreaterThan(0);
      emergencyActions.actionsPerformed.forEach(action => {
        expect(action).toHaveProperty('type');
        expect(action).toHaveProperty('description');
        expect(action).toHaveProperty('success');
      });
    });

    it('should recover from system crashes and maintain data integrity', async () => {
      // Simulate system crash recovery
      const crashRecoveryResult = await autoRestartManager.recoverFromCrash({
        crashType: 'SYSTEM_CRASH',
        crashTime: new Date(Date.now() - 60000), // 1 minute ago
        dataCorruption: false,
        configurationIntact: true
      });

      expect(crashRecoveryResult).toBeDefined();
      expect(typeof crashRecoveryResult.recoverySuccessful).toBe('boolean');
      expect(typeof crashRecoveryResult.dataIntegrityVerified).toBe('boolean');
      expect(typeof crashRecoveryResult.systemStable).toBe('boolean');
      expect(crashRecoveryResult.recoveryActions).toBeDefined();

      // Recovery should be successful
      expect(crashRecoveryResult.recoverySuccessful).toBe(true);
      expect(crashRecoveryResult.dataIntegrityVerified).toBe(true);
      expect(crashRecoveryResult.systemStable).toBe(true);
    });

    it('should handle concurrent system operations safely', async () => {
      const concurrentOperations = [
        systemMonitor.getDetailedSystemMetrics(),
        performanceOptimizer.optimizeForTrading({}),
        adminTools.runSystemDiagnostics(),
        autoRestartManager.getUptimeStatistics(),
        adminTools.manageSystemLogs()
      ];

      const results = await Promise.all(concurrentOperations);

      // All operations should complete successfully
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Validate specific results
      const [metrics, optimizations, diagnostics, uptime, logs] = results;
      
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(Array.isArray(optimizations.appliedOptimizations)).toBe(true);
      expect(diagnostics.systemHealth).toBeDefined();
      expect(typeof uptime.currentUptime).toBe('number');
      expect(Array.isArray(logs.logFiles)).toBe(true);
    });
  });
});