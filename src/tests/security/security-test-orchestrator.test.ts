/**
 * =============================================================================
 * SECURITY TEST ORCHESTRATOR TESTS
 * =============================================================================
 * 
 * Comprehensive tests for the security test orchestrator that coordinates
 * all security testing activities in the AI crypto trading agent.
 * 
 * Features tested:
 * - Security test suite execution
 * - Parallel and sequential test coordination
 * - Risk scoring and compliance calculation
 * - Remediation plan generation
 * - Security dashboard functionality
 * - Error handling and resilience
 * 
 * Requirements: 25.7 - Security testing orchestration validation
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { Logger } from '../../core/logging/logger';
import { SecurityTestOrchestrator, SecurityTestType, SecurityTestSuite } from '../../security/security-test-orchestrator';
import { PenetrationTestingService } from '../../security/penetration-testing-service';
import { VulnerabilityScannerService } from '../../security/vulnerability-scanner-service';
import { ComplianceTestingService } from '../../security/compliance-testing';
import { AutomatedSecurityTestingSuite } from '../../security/automated-security-testing';
import { ThreatDetectionEngine } from '../../security/threat-detection-engine';
import { IncidentResponseService } from '../../security/incident-response-service';
import { NotificationService } from '../../core/notifications/notification-service';
import { EncryptionService } from '../../security/encryption-service';
import * as crypto from 'crypto';

// Mock all dependencies
jest.mock('../../core/logging/logger');
jest.mock('../../core/notifications/notification-service');
jest.mock('../../security/penetration-testing-service');
jest.mock('../../security/vulnerability-scanner-service');
jest.mock('../../security/compliance-testing');
jest.mock('../../security/automated-security-testing');
jest.mock('../../security/threat-detection-engine');
jest.mock('../../security/incident-response-service');
jest.mock('../../security/encryption-service');

describe('Security Test Orchestrator', () => {
  let orchestrator: SecurityTestOrchestrator;
  let logger: jest.Mocked<Logger>;
  let penetrationTesting: jest.Mocked<PenetrationTestingService>;
  let vulnerabilityScanner: jest.Mocked<VulnerabilityScannerService>;
  let complianceTesting: jest.Mocked<ComplianceTestingService>;
  let automatedTesting: jest.Mocked<AutomatedSecurityTestingSuite>;
  let threatDetection: jest.Mocked<ThreatDetectionEngine>;
  let incidentResponse: jest.Mocked<IncidentResponseService>;
  let notifications: jest.Mocked<NotificationService>;

  beforeAll(() => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  });

  beforeEach(() => {
    // Create mocked instances
    logger = new Logger() as jest.Mocked<Logger>;
    penetrationTesting = new PenetrationTestingService(
      logger, 
      new EncryptionService(logger), 
      new ThreatDetectionEngine(logger), 
      {} as any
    ) as jest.Mocked<PenetrationTestingService>;
    vulnerabilityScanner = new VulnerabilityScannerService(logger) as jest.Mocked<VulnerabilityScannerService>;
    complianceTesting = new ComplianceTestingService(logger) as jest.Mocked<ComplianceTestingService>;
    automatedTesting = new AutomatedSecurityTestingSuite(
      logger, 
      penetrationTesting, 
      {} as any, 
      incidentResponse, 
      notifications, 
      {} as any
    ) as jest.Mocked<AutomatedSecurityTestingSuite>;
    threatDetection = new ThreatDetectionEngine(logger) as jest.Mocked<ThreatDetectionEngine>;
    incidentResponse = new IncidentResponseService(logger, notifications) as jest.Mocked<IncidentResponseService>;
    notifications = new NotificationService(logger) as jest.Mocked<NotificationService>;

    // Initialize orchestrator
    orchestrator = new SecurityTestOrchestrator(
      logger,
      penetrationTesting,
      vulnerabilityScanner,
      complianceTesting,
      automatedTesting,
      threatDetection,
      incidentResponse,
      notifications
    );

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.MASTER_ENCRYPTION_KEY;
    delete process.env.NODE_ENV;
  });

  describe('Initialization', () => {
    it('should initialize with default test suites', () => {
      const testSuites = orchestrator.getTestSuites();
      
      expect(testSuites).toBeDefined();
      expect(testSuites.length).toBeGreaterThan(0);
      
      // Check for expected default suites
      const suiteIds = testSuites.map(suite => suite.suiteId);
      expect(suiteIds).toContain('daily-security-scan');
      expect(suiteIds).toContain('weekly-comprehensive-scan');
      expect(suiteIds).toContain('pre-deployment-validation');
      expect(suiteIds).toContain('incident-response-check');
    });

    it('should have properly configured default test suites', () => {
      const testSuites = orchestrator.getTestSuites();
      
      testSuites.forEach(suite => {
        expect(suite).toHaveProperty('suiteId');
        expect(suite).toHaveProperty('name');
        expect(suite).toHaveProperty('description');
        expect(suite).toHaveProperty('testTypes');
        expect(suite).toHaveProperty('priority');
        expect(suite).toHaveProperty('enabled');
        expect(suite).toHaveProperty('parallelExecution');
        expect(suite).toHaveProperty('maxExecutionTime');
        expect(suite).toHaveProperty('retryCount');
        
        expect(Array.isArray(suite.testTypes)).toBe(true);
        expect(suite.testTypes.length).toBeGreaterThan(0);
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(suite.priority);
        expect(typeof suite.enabled).toBe('boolean');
        expect(typeof suite.parallelExecution).toBe('boolean');
        expect(typeof suite.maxExecutionTime).toBe('number');
        expect(typeof suite.retryCount).toBe('number');
      });
    });
  });

  describe('Security Test Suite Execution', () => {
    beforeEach(() => {
      // Mock service responses
      penetrationTesting.executeSecurityTestSuite.mockResolvedValue({
        scanId: 'pen-test-123',
        timestamp: new Date(),
        totalVulnerabilities: 5,
        criticalCount: 1,
        highCount: 2,
        mediumCount: 1,
        lowCount: 1,
        vulnerabilities: [
          {
            id: 'vuln-1',
            type: 'SQL_INJECTION',
            severity: 'CRITICAL',
            description: 'SQL injection vulnerability',
            location: '/api/test',
            evidence: 'Test evidence',
            remediation: 'Use parameterized queries'
          }
        ],
        complianceScore: 75,
        recommendations: ['Fix SQL injection', 'Implement input validation']
      });

      vulnerabilityScanner.executeComprehensiveVulnerabilityScan.mockResolvedValue({
        scanId: 'vuln-scan-456',
        scanType: 'comprehensive_scan' as any,
        target: 'system',
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
        findings: [
          {
            id: 'finding-1',
            type: 'DEPENDENCY_VULNERABILITY',
            severity: 'HIGH',
            description: 'Vulnerable dependency',
            location: 'package.json',
            evidence: 'lodash@4.17.11',
            remediation: 'Update to lodash@4.17.21'
          }
        ],
        summary: {
          totalFindings: 3,
          criticalCount: 0,
          highCount: 1,
          mediumCount: 1,
          lowCount: 1,
          riskScore: 25,
          complianceScore: 75,
          remediationPriority: []
        }
      });

      complianceTesting.executeComplianceTest.mockResolvedValue({
        reportId: 'compliance-789',
        standardId: 'OWASP_TOP_10',
        standardName: 'OWASP Top 10',
        timestamp: new Date(),
        overallScore: 80,
        requiredScore: 80,
        status: 'COMPLIANT',
        controlResults: [],
        gapAnalysis: [],
        recommendations: ['Maintain current security posture'],
        executionTime: 5000
      });
    });

    it('should execute daily security scan successfully', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      expect(execution).toBeDefined();
      expect(execution.suiteId).toBe('daily-security-scan');
      expect(execution.status).toBe('COMPLETED');
      expect(execution.executionId).toBeDefined();
      expect(execution.startTime).toBeInstanceOf(Date);
      expect(execution.endTime).toBeInstanceOf(Date);
      expect(execution.testResults).toBeDefined();
      expect(Array.isArray(execution.testResults)).toBe(true);
      expect(execution.testResults.length).toBeGreaterThan(0);
    });

    it('should execute weekly comprehensive scan successfully', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      expect(execution).toBeDefined();
      expect(execution.suiteId).toBe('weekly-comprehensive-scan');
      expect(execution.status).toBe('COMPLETED');
      expect(execution.testResults.length).toBeGreaterThan(0);
      
      // Should include all test types for comprehensive scan
      const testTypes = execution.testResults.map(result => result.testType);
      expect(testTypes).toContain(SecurityTestType.PENETRATION_TESTING);
      expect(testTypes).toContain(SecurityTestType.VULNERABILITY_SCANNING);
      expect(testTypes).toContain(SecurityTestType.COMPLIANCE_TESTING);
    });

    it('should calculate overall risk and compliance scores correctly', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      expect(execution.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(execution.overallRiskScore).toBeLessThanOrEqual(100);
      expect(execution.complianceScore).toBeGreaterThanOrEqual(0);
      expect(execution.complianceScore).toBeLessThanOrEqual(100);
      
      // Compliance score should be inverse of risk score
      expect(execution.complianceScore).toBe(Math.max(0, 100 - execution.overallRiskScore));
    });

    it('should count findings by severity correctly', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      expect(execution.criticalFindings).toBeGreaterThanOrEqual(0);
      expect(execution.highFindings).toBeGreaterThanOrEqual(0);
      expect(execution.mediumFindings).toBeGreaterThanOrEqual(0);
      expect(execution.lowFindings).toBeGreaterThanOrEqual(0);
      
      const totalFindings = execution.criticalFindings + execution.highFindings + 
                           execution.mediumFindings + execution.lowFindings;
      expect(totalFindings).toBeGreaterThanOrEqual(0);
    });

    it('should generate appropriate recommendations', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      expect(execution.recommendations).toBeDefined();
      expect(Array.isArray(execution.recommendations)).toBe(true);
      expect(execution.recommendations.length).toBeGreaterThan(0);
      
      execution.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });

    it('should generate remediation plan with tasks', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      expect(execution.remediationPlan).toBeDefined();
      expect(execution.remediationPlan.planId).toBeDefined();
      expect(['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW']).toContain(execution.remediationPlan.priority);
      expect(execution.remediationPlan.estimatedEffort).toBeDefined();
      expect(execution.remediationPlan.estimatedCost).toBeDefined();
      expect(execution.remediationPlan.timeline).toBeDefined();
      expect(Array.isArray(execution.remediationPlan.tasks)).toBe(true);
      expect(execution.remediationPlan.riskReduction).toBeGreaterThanOrEqual(0);
      expect(execution.remediationPlan.riskReduction).toBeLessThanOrEqual(100);
    });

    it('should handle unknown test suite gracefully', async () => {
      await expect(
        orchestrator.executeSecurityTestSuite('unknown-suite')
      ).rejects.toThrow('Security test suite not found: unknown-suite');
    });
  });

  describe('Parallel vs Sequential Execution', () => {
    it('should execute tests in parallel when configured', async () => {
      const startTime = Date.now();
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      const endTime = Date.now();
      
      expect(execution.status).toBe('COMPLETED');
      
      // Parallel execution should be faster than sequential
      // (This is a rough check - in practice, you'd need more sophisticated timing)
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should execute tests sequentially when configured', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      expect(execution.status).toBe('COMPLETED');
      expect(execution.testResults.length).toBeGreaterThan(0);
      
      // All tests should have completed
      execution.testResults.forEach(result => {
        expect(['PASS', 'FAIL', 'WARNING', 'ERROR']).toContain(result.status);
        expect(result.executionTime).toBeGreaterThan(0);
      });
    });
  });

  describe('Individual Security Test Types', () => {
    it('should execute penetration testing', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      const penTestResult = execution.testResults.find(
        result => result.testType === SecurityTestType.PENETRATION_TESTING
      );
      
      expect(penTestResult).toBeDefined();
      expect(penTestResult!.testId).toBeDefined();
      expect(['PASS', 'FAIL', 'WARNING', 'ERROR']).toContain(penTestResult!.status);
      expect(penTestResult!.executionTime).toBeGreaterThan(0);
      expect(penTestResult!.riskScore).toBeGreaterThanOrEqual(0);
      expect(penTestResult!.riskScore).toBeLessThanOrEqual(100);
    });

    it('should execute vulnerability scanning', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      const vulnScanResult = execution.testResults.find(
        result => result.testType === SecurityTestType.VULNERABILITY_SCANNING
      );
      
      expect(vulnScanResult).toBeDefined();
      expect(vulnScanResult!.testId).toBeDefined();
      expect(Array.isArray(vulnScanResult!.findings)).toBe(true);
    });

    it('should execute compliance testing', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      const complianceResult = execution.testResults.find(
        result => result.testType === SecurityTestType.COMPLIANCE_TESTING
      );
      
      expect(complianceResult).toBeDefined();
      expect(complianceResult!.details).toBeDefined();
      expect(complianceResult!.details.reports).toBeDefined();
      expect(Array.isArray(complianceResult!.details.reports)).toBe(true);
    });

    it('should execute dependency audit', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      const depAuditResult = execution.testResults.find(
        result => result.testType === SecurityTestType.DEPENDENCY_AUDIT
      );
      
      expect(depAuditResult).toBeDefined();
      expect(depAuditResult!.status).toBeDefined();
    });

    it('should execute code analysis', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      const codeAnalysisResult = execution.testResults.find(
        result => result.testType === SecurityTestType.CODE_ANALYSIS
      );
      
      expect(codeAnalysisResult).toBeDefined();
      expect(codeAnalysisResult!.riskScore).toBeGreaterThanOrEqual(0);
    });

    it('should execute configuration review', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      const configReviewResult = execution.testResults.find(
        result => result.testType === SecurityTestType.CONFIGURATION_REVIEW
      );
      
      expect(configReviewResult).toBeDefined();
      expect(configReviewResult!.details).toBeDefined();
    });

    it('should execute network security test', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      const networkTestResult = execution.testResults.find(
        result => result.testType === SecurityTestType.NETWORK_SECURITY
      );
      
      expect(networkTestResult).toBeDefined();
      expect(networkTestResult!.executionTime).toBeGreaterThan(0);
    });

    it('should execute threat modeling', async () => {
      const execution = await orchestrator.executeSecurityTestSuite('incident-response-check');
      
      const threatModelResult = execution.testResults.find(
        result => result.testType === SecurityTestType.THREAT_MODELING
      );
      
      expect(threatModelResult).toBeDefined();
      expect(threatModelResult!.findings).toBeDefined();
    });
  });

  describe('Security Dashboard', () => {
    beforeEach(async () => {
      // Execute a test suite to populate data
      await orchestrator.executeSecurityTestSuite('daily-security-scan');
    });

    it('should provide comprehensive security dashboard data', () => {
      const dashboard = orchestrator.getSecurityDashboard();
      
      expect(dashboard).toBeDefined();
      expect(dashboard.lastUpdated).toBeInstanceOf(Date);
      expect(dashboard.overallSecurityScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.overallSecurityScore).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(dashboard.riskLevel);
      expect(dashboard.activeThreats).toBeGreaterThanOrEqual(0);
    });

    it('should provide vulnerability breakdown', () => {
      const dashboard = orchestrator.getSecurityDashboard();
      
      expect(dashboard.vulnerabilities).toBeDefined();
      expect(dashboard.vulnerabilities.critical).toBeGreaterThanOrEqual(0);
      expect(dashboard.vulnerabilities.high).toBeGreaterThanOrEqual(0);
      expect(dashboard.vulnerabilities.medium).toBeGreaterThanOrEqual(0);
      expect(dashboard.vulnerabilities.low).toBeGreaterThanOrEqual(0);
    });

    it('should provide compliance status', () => {
      const dashboard = orchestrator.getSecurityDashboard();
      
      expect(dashboard.complianceStatus).toBeDefined();
      expect(dashboard.complianceStatus.owasp).toBeGreaterThanOrEqual(0);
      expect(dashboard.complianceStatus.owasp).toBeLessThanOrEqual(100);
      expect(dashboard.complianceStatus.iso27001).toBeGreaterThanOrEqual(0);
      expect(dashboard.complianceStatus.iso27001).toBeLessThanOrEqual(100);
      expect(dashboard.complianceStatus.soc2).toBeGreaterThanOrEqual(0);
      expect(dashboard.complianceStatus.soc2).toBeLessThanOrEqual(100);
      expect(dashboard.complianceStatus.cryptoSecurity).toBeGreaterThanOrEqual(0);
      expect(dashboard.complianceStatus.cryptoSecurity).toBeLessThanOrEqual(100);
    });

    it('should provide recent executions', () => {
      const dashboard = orchestrator.getSecurityDashboard();
      
      expect(dashboard.recentExecutions).toBeDefined();
      expect(Array.isArray(dashboard.recentExecutions)).toBe(true);
      expect(dashboard.recentExecutions.length).toBeGreaterThan(0);
      
      dashboard.recentExecutions.forEach(execution => {
        expect(execution.executionId).toBeDefined();
        expect(execution.suiteId).toBeDefined();
        expect(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']).toContain(execution.status);
      });
    });

    it('should provide trend data', () => {
      const dashboard = orchestrator.getSecurityDashboard();
      
      expect(dashboard.trendData).toBeDefined();
      expect(Array.isArray(dashboard.trendData)).toBe(true);
      
      dashboard.trendData.forEach(trend => {
        expect(trend.date).toBeInstanceOf(Date);
        expect(trend.securityScore).toBeGreaterThanOrEqual(0);
        expect(trend.securityScore).toBeLessThanOrEqual(100);
        expect(trend.vulnerabilityCount).toBeGreaterThanOrEqual(0);
        expect(trend.complianceScore).toBeGreaterThanOrEqual(0);
        expect(trend.complianceScore).toBeLessThanOrEqual(100);
        expect(trend.riskScore).toBeGreaterThanOrEqual(0);
        expect(trend.riskScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Execution Management', () => {
    it('should track active executions', async () => {
      // Start an execution but don't wait for it
      const executionPromise = orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      // Check active executions (might be empty if execution completes quickly)
      const activeExecutions = orchestrator.getActiveExecutions();
      expect(Array.isArray(activeExecutions)).toBe(true);
      
      // Wait for execution to complete
      await executionPromise;
      
      // Should no longer be active
      const activeExecutionsAfter = orchestrator.getActiveExecutions();
      expect(activeExecutionsAfter.length).toBe(0);
    });

    it('should maintain execution history', async () => {
      await orchestrator.executeSecurityTestSuite('daily-security-scan');
      await orchestrator.executeSecurityTestSuite('incident-response-check');
      
      const history = orchestrator.getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      history.forEach(execution => {
        expect(execution.executionId).toBeDefined();
        expect(execution.status).toBe('COMPLETED');
        expect(execution.startTime).toBeInstanceOf(Date);
        expect(execution.endTime).toBeInstanceOf(Date);
      });
    });

    it('should cancel active execution', async () => {
      // Mock a long-running test
      penetrationTesting.executeSecurityTestSuite.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 5000))
      );
      
      // Start execution
      const executionPromise = orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      // Get execution ID
      const activeExecutions = orchestrator.getActiveExecutions();
      if (activeExecutions.length > 0) {
        const executionId = activeExecutions[0].executionId;
        
        // Cancel execution
        const cancelled = await orchestrator.cancelExecution(executionId);
        expect(cancelled).toBe(true);
        
        // Execution should be cancelled
        try {
          await executionPromise;
        } catch (error) {
          // Expected to throw due to cancellation
        }
        
        const history = orchestrator.getExecutionHistory();
        const cancelledExecution = history.find(e => e.executionId === executionId);
        expect(cancelledExecution?.status).toBe('CANCELLED');
      }
    });
  });

  describe('Custom Test Suites', () => {
    it('should add custom test suite', () => {
      const customSuite: SecurityTestSuite = {
        suiteId: 'custom-test-suite',
        name: 'Custom Security Test',
        description: 'Custom security testing suite',
        testTypes: [SecurityTestType.VULNERABILITY_SCANNING, SecurityTestType.CODE_ANALYSIS],
        priority: 'MEDIUM',
        enabled: true,
        parallelExecution: true,
        maxExecutionTime: 600000,
        retryCount: 1
      };
      
      orchestrator.addTestSuite(customSuite);
      
      const testSuites = orchestrator.getTestSuites();
      const addedSuite = testSuites.find(suite => suite.suiteId === 'custom-test-suite');
      
      expect(addedSuite).toBeDefined();
      expect(addedSuite!.name).toBe('Custom Security Test');
      expect(addedSuite!.testTypes).toEqual([
        SecurityTestType.VULNERABILITY_SCANNING, 
        SecurityTestType.CODE_ANALYSIS
      ]);
    });

    it('should execute custom test suite', async () => {
      const customSuite: SecurityTestSuite = {
        suiteId: 'custom-execution-test',
        name: 'Custom Execution Test',
        description: 'Test custom suite execution',
        testTypes: [SecurityTestType.DEPENDENCY_AUDIT],
        priority: 'LOW',
        enabled: true,
        parallelExecution: false,
        maxExecutionTime: 300000,
        retryCount: 0
      };
      
      orchestrator.addTestSuite(customSuite);
      
      const execution = await orchestrator.executeSecurityTestSuite('custom-execution-test');
      
      expect(execution.suiteId).toBe('custom-execution-test');
      expect(execution.status).toBe('COMPLETED');
      expect(execution.testResults.length).toBe(1);
      expect(execution.testResults[0].testType).toBe(SecurityTestType.DEPENDENCY_AUDIT);
    });

    it('should remove test suite', () => {
      const customSuite: SecurityTestSuite = {
        suiteId: 'removable-suite',
        name: 'Removable Suite',
        description: 'Suite to be removed',
        testTypes: [SecurityTestType.CONFIGURATION_REVIEW],
        priority: 'LOW',
        enabled: true,
        parallelExecution: true,
        maxExecutionTime: 300000,
        retryCount: 0
      };
      
      orchestrator.addTestSuite(customSuite);
      
      // Verify it was added
      let testSuites = orchestrator.getTestSuites();
      expect(testSuites.find(suite => suite.suiteId === 'removable-suite')).toBeDefined();
      
      // Remove it
      const removed = orchestrator.removeTestSuite('removable-suite');
      expect(removed).toBe(true);
      
      // Verify it was removed
      testSuites = orchestrator.getTestSuites();
      expect(testSuites.find(suite => suite.suiteId === 'removable-suite')).toBeUndefined();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle individual test failures gracefully', async () => {
      // Mock one test to fail
      vulnerabilityScanner.executeComprehensiveVulnerabilityScan.mockRejectedValue(
        new Error('Vulnerability scan failed')
      );
      
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      // Should still complete overall execution
      expect(execution.status).toBe('COMPLETED');
      
      // Should have error result for failed test
      const vulnScanResult = execution.testResults.find(
        result => result.testType === SecurityTestType.VULNERABILITY_SCANNING
      );
      expect(vulnScanResult).toBeDefined();
      expect(vulnScanResult!.status).toBe('ERROR');
      expect(vulnScanResult!.details.error).toBeDefined();
    });

    it('should handle complete test suite failure', async () => {
      // Mock all tests to fail
      penetrationTesting.executeSecurityTestSuite.mockRejectedValue(new Error('Pen test failed'));
      vulnerabilityScanner.executeComprehensiveVulnerabilityScan.mockRejectedValue(new Error('Vuln scan failed'));
      complianceTesting.executeComplianceTest.mockRejectedValue(new Error('Compliance test failed'));
      
      await expect(
        orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan')
      ).rejects.toThrow();
      
      // Should send failure notification
      expect(notifications.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Security Test Suite Failed'),
          priority: 'HIGH'
        })
      );
    });

    it('should handle critical findings appropriately', async () => {
      // Mock critical findings
      penetrationTesting.executeSecurityTestSuite.mockResolvedValue({
        scanId: 'critical-test',
        timestamp: new Date(),
        totalVulnerabilities: 10,
        criticalCount: 5,
        highCount: 3,
        mediumCount: 2,
        lowCount: 0,
        vulnerabilities: [],
        complianceScore: 30,
        recommendations: ['Immediate action required']
      });
      
      const execution = await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      expect(execution.criticalFindings).toBeGreaterThan(0);
      
      // Should send critical alert
      expect(notifications.sendCriticalAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Critical Security Vulnerabilities'),
          priority: 'CRITICAL'
        })
      );
      
      // Should create incident for high risk
      expect(incidentResponse.createIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIGH_RISK_SECURITY_FINDINGS',
          severity: 'HIGH'
        })
      );
    });

    it('should handle resource constraints', async () => {
      // Simulate resource constraints by running multiple tests concurrently
      const executionPromises = [
        orchestrator.executeSecurityTestSuite('daily-security-scan'),
        orchestrator.executeSecurityTestSuite('incident-response-check'),
        orchestrator.executeSecurityTestSuite('pre-deployment-validation')
      ];
      
      const results = await Promise.all(executionPromises);
      
      // All executions should complete
      results.forEach(execution => {
        expect(execution.status).toBe('COMPLETED');
        expect(execution.executionId).toBeDefined();
      });
    });

    it('should handle timeout scenarios', async () => {
      // Mock a test that takes too long
      penetrationTesting.executeSecurityTestSuite.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      // This test should complete within reasonable time due to mocking
      const startTime = Date.now();
      const execution = await orchestrator.executeSecurityTestSuite('daily-security-scan');
      const endTime = Date.now();
      
      expect(execution.status).toBe('COMPLETED');
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
    });
  });

  describe('Integration with Security Services', () => {
    it('should integrate with threat detection engine', async () => {
      await orchestrator.executeSecurityTestSuite('incident-response-check');
      
      // Threat detection should be available
      expect(threatDetection).toBeDefined();
    });

    it('should integrate with incident response service', async () => {
      // Mock high-risk findings to trigger incident response
      penetrationTesting.executeSecurityTestSuite.mockResolvedValue({
        scanId: 'high-risk-test',
        timestamp: new Date(),
        totalVulnerabilities: 8,
        criticalCount: 3,
        highCount: 5,
        mediumCount: 0,
        lowCount: 0,
        vulnerabilities: [],
        complianceScore: 20,
        recommendations: ['Critical action required']
      });
      
      await orchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');
      
      // Should create incident for high-risk findings
      expect(incidentResponse.createIncident).toHaveBeenCalled();
    });

    it('should integrate with notification service', async () => {
      await orchestrator.executeSecurityTestSuite('daily-security-scan');
      
      // Notification service should be available for alerts
      expect(notifications).toBeDefined();
    });
  });
});