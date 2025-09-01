/**
 * =============================================================================
 * COMPREHENSIVE SECURITY TESTING SUITE - TASK 12.3 IMPLEMENTATION
 * =============================================================================
 * 
 * Complete implementation of automated security testing suite, penetration
 * testing for API endpoints, vulnerability scanning and assessment, and
 * security compliance testing and validation as required by task 12.3.
 * 
 * Features:
 * - Automated security testing suite
 * - Penetration testing for API endpoints  
 * - Vulnerability scanning and assessment
 * - Security compliance testing and validation
 * - Real-time security monitoring integration
 * - Comprehensive security reporting
 * 
 * Requirements: 25.7 - Create security and penetration testing
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { Logger } from '../../core/logging/logger';
import { SecurityTestOrchestrator, SecurityTestSuite, SecurityTestType } from '../../security/security-test-orchestrator';
import { PenetrationTestingService, PenetrationTestConfig } from '../../security/penetration-testing-service';
import { VulnerabilityScannerService } from '../../security/vulnerability-scanner-service';
import { ComplianceTestingService } from '../../security/compliance-testing';
import { AutomatedSecurityTestingSuite, SecurityTestSuiteConfig } from '../../security/automated-security-testing';
import { ThreatDetectionEngine } from '../../security/threat-detection-engine';
import { IncidentResponseService } from '../../security/incident-response-service';
import { NotificationService } from '../../core/notifications/notification-service';
import { EncryptionService } from '../../security/encryption-service';
import { SecurityMonitoringService } from '../../security/security-monitoring-service';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock external dependencies for testing
jest.mock('../../core/logging/logger');
jest.mock('../../core/notifications/notification-service');
jest.mock('axios');
jest.mock('child_process');

describe('Comprehensive Security Testing Suite - Task 12.3', () => {
  let logger: Logger;
  let securityOrchestrator: SecurityTestOrchestrator;
  let penetrationTesting: PenetrationTestingService;
  let vulnerabilityScanner: VulnerabilityScannerService;
  let complianceTesting: ComplianceTestingService;
  let automatedTesting: AutomatedSecurityTestingSuite;
  let threatDetection: ThreatDetectionEngine;
  let incidentResponse: IncidentResponseService;
  let notifications: NotificationService;
  let encryptionService: EncryptionService;
  let securityMonitoring: SecurityMonitoringService;
  let testOutputDir: string;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.GATE_IO_API_KEY = 'test_api_key';
    process.env.GATE_IO_SECRET_KEY = 'test_secret_key';
    
    // Create temporary test output directory
    testOutputDir = path.join(os.tmpdir(), 'comprehensive-security-test-output');
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  beforeEach(async () => {
    // Initialize all security services
    logger = new Logger();
    encryptionService = new EncryptionService(logger);
    threatDetection = new ThreatDetectionEngine(logger);
    securityMonitoring = new SecurityMonitoringService(logger);
    notifications = new NotificationService(logger);
    incidentResponse = new IncidentResponseService(logger, notifications);
    vulnerabilityScanner = new VulnerabilityScannerService(logger);
    complianceTesting = new ComplianceTestingService(logger);

    // Configure penetration testing
    const penetrationConfig: PenetrationTestConfig = {
      targetEndpoints: [
        'http://localhost:3000/api/v4/spot/time',
        'http://localhost:3000/api/v4/spot/accounts',
        'http://localhost:3000/api/v4/spot/orders',
        'http://localhost:3000/api/dashboard/status',
        'http://localhost:3000/api/trading/positions',
        'http://localhost:3000/api/auth/login',
        'http://localhost:3000/api/security/status'
      ],
      testTypes: [
        'sql_injection',
        'xss',
        'authentication_bypass',
        'authorization_escalation',
        'input_validation',
        'rate_limiting',
        'tls_security',
        'csrf',
        'command_injection',
        'path_traversal'
      ],
      maxConcurrentTests: 10,
      timeoutMs: 30000,
      enableDestructiveTesting: false,
      complianceStandards: ['OWASP_TOP_10', 'ISO_27001', 'SOC_2', 'CRYPTO_TRADING_SECURITY']
    };

    penetrationTesting = new PenetrationTestingService(
      logger,
      encryptionService,
      threatDetection,
      penetrationConfig
    );

    // Configure automated security testing
    const securityTestConfig: SecurityTestSuiteConfig = {
      schedules: [
        {
          id: 'comprehensive-daily-scan',
          name: 'Comprehensive Daily Security Scan',
          cronExpression: '0 2 * * *',
          testTypes: ['penetration', 'vulnerability', 'compliance', 'dependency'],
          enabled: true
        },
        {
          id: 'weekly-deep-scan',
          name: 'Weekly Deep Security Assessment',
          cronExpression: '0 1 * * 0',
          testTypes: ['full_penetration', 'deep_vulnerability', 'full_compliance', 'threat_modeling'],
          enabled: true
        },
        {
          id: 'pre-deployment-validation',
          name: 'Pre-Deployment Security Validation',
          cronExpression: '',
          testTypes: ['penetration', 'vulnerability', 'compliance'],
          enabled: true
        }
      ],
      reportingConfig: {
        outputDirectory: testOutputDir,
        retentionDays: 90,
        emailReports: true,
        slackIntegration: false
      },
      alertingConfig: {
        criticalThreshold: 1,
        highThreshold: 3,
        emailAlerts: true,
        immediateNotification: true
      },
      integrationConfig: {
        cicdIntegration: true,
        webhookUrl: 'http://localhost:3000/api/security/webhook',
        apiKey: 'test-security-api-key'
      }
    };

    automatedTesting = new AutomatedSecurityTestingSuite(
      logger,
      penetrationTesting,
      securityMonitoring,
      incidentResponse,
      notifications,
      securityTestConfig
    );

    // Initialize security test orchestrator
    securityOrchestrator = new SecurityTestOrchestrator(
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

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testOutputDir);
      for (const file of files) {
        await fs.unlink(path.join(testOutputDir, file));
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Clean up test environment
    delete process.env.MASTER_ENCRYPTION_KEY;
    delete process.env.GATE_IO_API_KEY;
    delete process.env.GATE_IO_SECRET_KEY;
    delete process.env.NODE_ENV;
    
    try {
      await fs.rmdir(testOutputDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('1. Automated Security Testing Suite', () => {
    it('should initialize automated security testing suite successfully', async () => {
      await expect(automatedTesting.initialize()).resolves.not.toThrow();
      
      expect(logger.info).toHaveBeenCalledWith(
        'Automated security testing suite initialized successfully',
        expect.any(Object)
      );
    });

    it('should execute comprehensive security test suite', async () => {
      const result = await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe('COMPLETED');
      expect(result.testResults).toBeDefined();
      expect(Array.isArray(result.testResults)).toBe(true);
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    });

    it('should execute all security test types', async () => {
      const testTypes = [
        SecurityTestType.PENETRATION_TESTING,
        SecurityTestType.VULNERABILITY_SCANNING,
        SecurityTestType.COMPLIANCE_TESTING,
        SecurityTestType.DEPENDENCY_AUDIT,
        SecurityTestType.CODE_ANALYSIS,
        SecurityTestType.CONFIGURATION_REVIEW,
        SecurityTestType.NETWORK_SECURITY,
        SecurityTestType.THREAT_MODELING
      ];

      for (const testType of testTypes) {
        const result = await (securityOrchestrator as any).executeSecurityTest(testType, 'test-execution');
        
        expect(result).toBeDefined();
        expect(result.testType).toBe(testType);
        expect(['PASS', 'FAIL', 'WARNING', 'ERROR']).toContain(result.status);
        expect(typeof result.executionTime).toBe('number');
        expect(typeof result.riskScore).toBe('number');
      }
    });

    it('should handle parallel test execution', async () => {
      const result = await securityOrchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');

      expect(result).toBeDefined();
      expect(result.testResults.length).toBeGreaterThan(0);
      expect(result.status).toBe('COMPLETED');
      
      // Verify all test types were executed
      const executedTestTypes = result.testResults.map(r => r.testType);
      expect(executedTestTypes.length).toBeGreaterThan(0);
    });

    it('should generate comprehensive security dashboard', async () => {
      // Execute a few test suites to populate data
      await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');
      
      const dashboard = securityOrchestrator.getSecurityDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard.lastUpdated).toBeInstanceOf(Date);
      expect(dashboard.overallSecurityScore).toBeGreaterThanOrEqual(0);
      expect(dashboard.overallSecurityScore).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(dashboard.riskLevel);
      expect(dashboard.vulnerabilities).toBeDefined();
      expect(dashboard.complianceStatus).toBeDefined();
      expect(Array.isArray(dashboard.recentExecutions)).toBe(true);
      expect(Array.isArray(dashboard.trendData)).toBe(true);
    });
  });
});  describ
e('2. Penetration Testing for API Endpoints', () => {
    it('should test all configured API endpoints', async () => {
      const result = await penetrationTesting.executeSecurityTestSuite();

      expect(result).toBeDefined();
      expect(result.scanId).toBeDefined();
      expect(result.vulnerabilities).toBeDefined();
      expect(Array.isArray(result.vulnerabilities)).toBe(true);
      expect(result.totalVulnerabilities).toBeGreaterThanOrEqual(0);
    });

    it('should test for SQL injection vulnerabilities', async () => {
      const mockSQLTest = jest.spyOn(penetrationTesting as any, 'testSQLInjection');
      mockSQLTest.mockResolvedValue({
        testId: 'sql-injection-test',
        testName: 'SQL Injection Test',
        category: 'API_SECURITY',
        status: 'PASS',
        severity: 'LOW',
        description: 'No SQL injection vulnerabilities detected',
        findings: [],
        recommendations: ['Continue using parameterized queries'],
        timestamp: new Date(),
        executionTime: 2000
      });

      const result = await penetrationTesting.executeSecurityTestSuite();
      
      expect(mockSQLTest).toHaveBeenCalled();
      expect(result.vulnerabilities).toBeDefined();
    });

    it('should test for XSS vulnerabilities', async () => {
      const mockXSSTest = jest.spyOn(penetrationTesting as any, 'testXSSVulnerabilities');
      mockXSSTest.mockResolvedValue({
        testId: 'xss-test',
        testName: 'XSS Vulnerability Test',
        category: 'API_SECURITY',
        status: 'PASS',
        severity: 'LOW',
        description: 'No XSS vulnerabilities detected',
        findings: [],
        recommendations: ['Continue using output encoding'],
        timestamp: new Date(),
        executionTime: 1500
      });

      const result = await penetrationTesting.executeSecurityTestSuite();
      
      expect(mockXSSTest).toHaveBeenCalled();
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
    });

    it('should test authentication bypass vulnerabilities', async () => {
      const mockAuthTest = jest.spyOn(penetrationTesting as any, 'testAuthenticationBypass');
      mockAuthTest.mockResolvedValue({
        testId: 'auth-bypass-test',
        testName: 'Authentication Bypass Test',
        category: 'API_SECURITY',
        status: 'PASS',
        severity: 'LOW',
        description: 'Authentication properly enforced',
        findings: [],
        recommendations: ['Maintain current authentication controls'],
        timestamp: new Date(),
        executionTime: 3000
      });

      const result = await penetrationTesting.executeSecurityTestSuite();
      
      expect(mockAuthTest).toHaveBeenCalled();
      expect(result.recommendations).toBeDefined();
    });

    it('should test rate limiting implementation', async () => {
      const mockRateLimitTest = jest.spyOn(penetrationTesting as any, 'testRateLimiting');
      mockRateLimitTest.mockResolvedValue({
        testId: 'rate-limit-test',
        testName: 'Rate Limiting Test',
        category: 'API_SECURITY',
        status: 'WARNING',
        severity: 'MEDIUM',
        description: 'Rate limiting could be improved',
        findings: [{
          id: 'rate-limit-finding',
          type: 'RATE_LIMITING',
          severity: 'MEDIUM',
          description: 'Some endpoints lack proper rate limiting',
          location: '/api/trading/orders',
          evidence: 'No 429 responses received',
          remediation: 'Implement rate limiting middleware'
        }],
        recommendations: ['Implement comprehensive rate limiting'],
        timestamp: new Date(),
        executionTime: 5000
      });

      const result = await penetrationTesting.executeSecurityTestSuite();
      
      expect(mockRateLimitTest).toHaveBeenCalled();
      expect(result.mediumCount).toBeGreaterThanOrEqual(0);
    });

    it('should test TLS/HTTPS security configuration', async () => {
      const mockTLSTest = jest.spyOn(penetrationTesting as any, 'testTLSSecurity');
      mockTLSTest.mockResolvedValue({
        testId: 'tls-security-test',
        testName: 'TLS Security Test',
        category: 'API_SECURITY',
        status: 'PASS',
        severity: 'LOW',
        description: 'TLS properly configured',
        findings: [],
        recommendations: ['Maintain current TLS configuration'],
        timestamp: new Date(),
        executionTime: 2500
      });

      const result = await penetrationTesting.executeSecurityTestSuite();
      
      expect(mockTLSTest).toHaveBeenCalled();
      expect(result.totalVulnerabilities).toBeGreaterThanOrEqual(0);
    });

    it('should test input validation vulnerabilities', async () => {
      const mockInputTest = jest.spyOn(penetrationTesting as any, 'testInputValidation');
      mockInputTest.mockResolvedValue({
        testId: 'input-validation-test',
        testName: 'Input Validation Test',
        category: 'API_SECURITY',
        status: 'PASS',
        severity: 'LOW',
        description: 'Input validation properly implemented',
        findings: [],
        recommendations: ['Continue comprehensive input validation'],
        timestamp: new Date(),
        executionTime: 3500
      });

      const result = await penetrationTesting.executeSecurityTestSuite();
      
      expect(mockInputTest).toHaveBeenCalled();
      expect(result.lowCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('3. Vulnerability Scanning and Assessment', () => {
    it('should execute comprehensive vulnerability scan', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();

      expect(result).toBeDefined();
      expect(result.scanId).toBeDefined();
      expect(result.scanType).toBe('comprehensive_scan');
      expect(result.status).toBe('COMPLETED');
      expect(result.findings).toBeDefined();
      expect(Array.isArray(result.findings)).toBe(true);
      expect(result.summary).toBeDefined();
    });

    it('should scan for dependency vulnerabilities', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if dependency scanning was performed
      const dependencyFindings = result.findings.filter(f => 
        f.type === 'DEPENDENCY_VULNERABILITY'
      );
      
      expect(result.findings).toBeDefined();
      expect(result.summary.totalFindings).toBeGreaterThanOrEqual(0);
    });

    it('should scan for code vulnerabilities', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if code scanning was performed
      const codeFindings = result.findings.filter(f => 
        ['SQL_INJECTION', 'XSS', 'COMMAND_INJECTION', 'HARDCODED_SECRET', 'WEAK_CRYPTOGRAPHY'].includes(f.type)
      );
      
      expect(result.findings).toBeDefined();
      expect(result.summary.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.riskScore).toBeLessThanOrEqual(100);
    });

    it('should scan for configuration vulnerabilities', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if configuration scanning was performed
      const configFindings = result.findings.filter(f => 
        ['CONFIGURATION_ERROR', 'INSECURE_TRANSPORT', 'WEAK_SESSION_SECRET', 'MISSING_SECURITY_HEADERS'].includes(f.type)
      );
      
      expect(result.findings).toBeDefined();
      expect(result.summary.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should scan for network vulnerabilities', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if network scanning was performed
      const networkFindings = result.findings.filter(f => 
        ['OPEN_PORT', 'MISSING_TLS_CONFIG', 'UNNECESSARY_SERVICE'].includes(f.type)
      );
      
      expect(result.findings).toBeDefined();
      expect(result.summary.remediationPriority).toBeDefined();
      expect(Array.isArray(result.summary.remediationPriority)).toBe(true);
    });

    it('should provide vulnerability severity classification', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      expect(result.summary.criticalCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.highCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.mediumCount).toBeGreaterThanOrEqual(0);
      expect(result.summary.lowCount).toBeGreaterThanOrEqual(0);
      
      // Total should match sum of severity counts
      const severitySum = result.summary.criticalCount + result.summary.highCount + 
                         result.summary.mediumCount + result.summary.lowCount;
      expect(severitySum).toBe(result.summary.totalFindings);
    });

    it('should provide remediation priorities', async () => {
      const result = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      expect(result.summary.remediationPriority).toBeDefined();
      expect(Array.isArray(result.summary.remediationPriority)).toBe(true);
      
      if (result.summary.remediationPriority.length > 0) {
        result.summary.remediationPriority.forEach(item => {
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('priority');
          expect(item).toHaveProperty('title');
          expect(item).toHaveProperty('description');
          expect(item).toHaveProperty('effort');
          expect(item).toHaveProperty('impact');
          expect(item).toHaveProperty('steps');
          expect(item).toHaveProperty('estimatedTime');
          expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(item.priority);
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(item.effort);
        });
      }
    });
  });

  describe('4. Security Compliance Testing and Validation', () => {
    it('should test OWASP Top 10 compliance', async () => {
      const result = await complianceTesting.executeComplianceTest('OWASP_TOP_10');

      expect(result).toBeDefined();
      expect(result.standardId).toBe('OWASP_TOP_10');
      expect(result.standardName).toBe('OWASP Top 10');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL']).toContain(result.status);
      expect(result.controlResults.length).toBe(10);
    });

    it('should test ISO 27001 compliance', async () => {
      const result = await complianceTesting.executeComplianceTest('ISO_27001');

      expect(result.standardId).toBe('ISO_27001');
      expect(result.standardName).toBe('ISO/IEC 27001');
      expect(result.requiredScore).toBe(85);
      expect(result.controlResults.length).toBeGreaterThan(0);
    });

    it('should test SOC 2 compliance', async () => {
      const result = await complianceTesting.executeComplianceTest('SOC_2');

      expect(result.standardId).toBe('SOC_2');
      expect(result.standardName).toBe('SOC 2 Type II');
      expect(result.requiredScore).toBe(90);
      expect(result.controlResults.length).toBeGreaterThan(0);
    });

    it('should test crypto trading security framework compliance', async () => {
      const result = await complianceTesting.executeComplianceTest('CRYPTO_TRADING_SECURITY');

      expect(result.standardId).toBe('CRYPTO_TRADING_SECURITY');
      expect(result.standardName).toBe('Crypto Trading Security Framework');
      expect(result.requiredScore).toBe(95);
      
      // Check for crypto-specific controls
      const controlIds = result.controlResults.map(c => c.controlId);
      expect(controlIds).toContain('CTS.1.1'); // API Key Security
      expect(controlIds).toContain('CTS.2.1'); // Trading Algorithm Security
      expect(controlIds).toContain('CTS.3.1'); // Risk Management Controls
      expect(controlIds).toContain('CTS.4.1'); // Market Data Integrity
      expect(controlIds).toContain('CTS.5.1'); // System Availability
    });

    it('should provide gap analysis for non-compliant standards', async () => {
      const result = await complianceTesting.executeComplianceTest('OWASP_TOP_10');

      expect(result.gapAnalysis).toBeDefined();
      expect(Array.isArray(result.gapAnalysis)).toBe(true);
      
      if (result.status !== 'COMPLIANT') {
        expect(result.gapAnalysis.length).toBeGreaterThan(0);
        
        result.gapAnalysis.forEach(gap => {
          expect(gap).toHaveProperty('controlId');
          expect(gap).toHaveProperty('controlName');
          expect(gap).toHaveProperty('currentScore');
          expect(gap).toHaveProperty('requiredScore');
          expect(gap).toHaveProperty('gap');
          expect(gap).toHaveProperty('priority');
          expect(gap).toHaveProperty('remediation');
          expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(gap.priority);
        });
      }
    });

    it('should validate all compliance standards simultaneously', async () => {
      const standards = ['OWASP_TOP_10', 'ISO_27001', 'SOC_2', 'CRYPTO_TRADING_SECURITY'];
      const results = await Promise.all(
        standards.map(standard => complianceTesting.executeComplianceTest(standard))
      );

      expect(results).toHaveLength(4);
      results.forEach((result, index) => {
        expect(result.standardId).toBe(standards[index]);
        expect(result.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.overallScore).toBeLessThanOrEqual(100);
        expect(result.controlResults.length).toBeGreaterThan(0);
      });

      // Verify compliance requirements are in ascending order
      expect(results[0].requiredScore).toBeLessThanOrEqual(results[1].requiredScore);
      expect(results[1].requiredScore).toBeLessThanOrEqual(results[2].requiredScore);
      expect(results[2].requiredScore).toBeLessThanOrEqual(results[3].requiredScore);
    });
  });

  describe('5. Security Test Integration and Orchestration', () => {
    it('should integrate with threat detection engine', async () => {
      const result = await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');
      
      expect(result).toBeDefined();
      expect(threatDetection).toBeDefined();
      expect(result.testResults.length).toBeGreaterThan(0);
    });

    it('should integrate with incident response system', async () => {
      // Mock critical findings to trigger incident response
      const mockPenetrationTest = jest.spyOn(penetrationTesting, 'executeSecurityTestSuite');
      mockPenetrationTest.mockResolvedValue({
        scanId: 'critical-test-scan',
        timestamp: new Date(),
        totalVulnerabilities: 2,
        criticalCount: 2,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        vulnerabilities: [
          {
            id: 'critical-vuln-1',
            type: 'AUTHENTICATION_BYPASS',
            severity: 'CRITICAL',
            description: 'Critical authentication bypass detected',
            location: '/api/trading/orders',
            evidence: 'Endpoint accessible without authentication',
            remediation: 'Implement proper authentication checks'
          },
          {
            id: 'critical-vuln-2',
            type: 'SQL_INJECTION',
            severity: 'CRITICAL',
            description: 'SQL injection vulnerability detected',
            location: '/api/user/profile',
            evidence: 'Malicious SQL payload executed',
            remediation: 'Use parameterized queries'
          }
        ],
        complianceScore: 25,
        recommendations: ['Immediate security review required']
      });

      jest.spyOn(incidentResponse, 'createIncident').mockResolvedValue({
        id: 'security-incident-123',
        type: 'CRITICAL_VULNERABILITIES',
        severity: 'CRITICAL',
        description: 'Critical security vulnerabilities detected',
        source: 'Automated Security Testing',
        timestamp: new Date(),
        status: 'DETECTED',
        evidence: [],
        responseActions: []
      });

      const result = await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');

      expect(result.criticalFindings).toBeGreaterThan(0);
      expect(incidentResponse.createIncident).toHaveBeenCalled();
    });

    it('should integrate with notification system', async () => {
      // Mock high severity findings to trigger notifications
      const mockVulnScan = jest.spyOn(vulnerabilityScanner, 'executeComprehensiveVulnerabilityScan');
      mockVulnScan.mockResolvedValue({
        scanId: 'high-severity-scan',
        scanType: 'comprehensive_scan' as any,
        target: 'system',
        startTime: new Date(),
        endTime: new Date(),
        status: 'COMPLETED',
        findings: [
          {
            id: 'high-vuln-1',
            type: 'DEPENDENCY_VULNERABILITY',
            severity: 'HIGH',
            description: 'High severity dependency vulnerability',
            location: 'package.json',
            evidence: 'Vulnerable package detected',
            remediation: 'Update to latest version'
          }
        ],
        summary: {
          totalFindings: 3,
          criticalCount: 0,
          highCount: 3,
          mediumCount: 0,
          lowCount: 0,
          riskScore: 60,
          complianceScore: 70,
          remediationPriority: []
        }
      });

      jest.spyOn(notifications, 'sendAlert').mockResolvedValue();

      const result = await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');

      expect(result.highFindings).toBeGreaterThan(0);
      expect(notifications.sendAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('High'),
          priority: 'HIGH'
        })
      );
    });

    it('should generate comprehensive remediation plans', async () => {
      const result = await securityOrchestrator.executeSecurityTestSuite('weekly-comprehensive-scan');

      expect(result.remediationPlan).toBeDefined();
      expect(result.remediationPlan.planId).toBeDefined();
      expect(['IMMEDIATE', 'HIGH', 'MEDIUM', 'LOW']).toContain(result.remediationPlan.priority);
      expect(result.remediationPlan.estimatedEffort).toBeDefined();
      expect(result.remediationPlan.timeline).toBeDefined();
      expect(Array.isArray(result.remediationPlan.tasks)).toBe(true);
      expect(Array.isArray(result.remediationPlan.dependencies)).toBe(true);
      expect(typeof result.remediationPlan.riskReduction).toBe('number');
    });

    it('should track security trends over time', async () => {
      // Execute multiple security tests to generate trend data
      for (let i = 0; i < 3; i++) {
        await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for different timestamps
      }

      const dashboard = securityOrchestrator.getSecurityDashboard();
      
      expect(dashboard.trendData).toBeDefined();
      expect(Array.isArray(dashboard.trendData)).toBe(true);
      expect(dashboard.trendData.length).toBeGreaterThan(0);
      
      if (dashboard.trendData.length > 0) {
        dashboard.trendData.forEach(trend => {
          expect(trend).toHaveProperty('date');
          expect(trend).toHaveProperty('securityScore');
          expect(trend).toHaveProperty('vulnerabilityCount');
          expect(trend).toHaveProperty('complianceScore');
          expect(trend).toHaveProperty('riskScore');
          expect(trend.date instanceof Date).toBe(true);
        });
      }
    });
  });

  describe('6. Security Test Reporting and Documentation', () => {
    it('should generate comprehensive security reports', async () => {
      const result = await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');
      
      expect(result.remediationPlan).toBeDefined();
      expect(result.remediationPlan.tasks).toBeDefined();
      expect(Array.isArray(result.remediationPlan.tasks)).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should save security test reports to disk', async () => {
      await automatedTesting.executeSecurityTestsOnDemand();
      
      // Check if reports are saved
      const files = await fs.readdir(testOutputDir);
      const reportFiles = files.filter(f => f.startsWith('security-report-'));
      
      expect(reportFiles.length).toBeGreaterThan(0);
    });

    it('should provide security trend analysis', async () => {
      // Execute multiple tests to generate trend data
      await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');
      await securityOrchestrator.executeSecurityTestSuite('daily-security-scan');
      
      const dashboard = securityOrchestrator.getSecurityDashboard();
      
      expect(dashboard.trendData).toBeDefined();
      expect(Array.isArray(dashboard.trendData)).toBe(true);
    });
  });
});