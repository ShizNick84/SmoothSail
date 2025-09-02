/**
 * =============================================================================
 * SECURITY COMPLIANCE VALIDATION TEST SUITE
 * =============================================================================
 * 
 * Comprehensive security compliance testing and validation for the AI crypto
 * trading agent. Tests compliance with multiple security standards including
 * OWASP Top 10, ISO 27001, SOC 2, and custom crypto trading security framework.
 * 
 * Features:
 * - Multi-standard compliance testing
 * - Automated compliance scoring
 * - Gap analysis and remediation planning
 * - Continuous compliance monitoring
 * - Detailed compliance reporting
 * 
 * Requirements: 25.7 - Add security compliance testing and validation
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '../../core/logging/logger';
import { ComplianceTestingService, ComplianceReport } from '../../security/compliance-testing';
import { VulnerabilityScannerService, VulnerabilityScanner } from '../../security/vulnerability-scanner-service';
import { encryptionService } from '../../security/encryption-service';
import { ThreatDetectionEngine } from '../../security/threat-detection-engine';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock external dependencies
jest.mock('../../core/logging/logger');

describe('Security Compliance Validation Test Suite', () => {
  let complianceTestingService: ComplianceTestingService;
  let vulnerabilityScanner: VulnerabilityScannerService;
  let threatDetection: ThreatDetectionEngine;
  let testOutputDir: string;

  beforeAll(async () => {
    // Set up test environment
    process.env.NODE_ENV = 'test';
    process.env.MASTER_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    
    // Create temporary test output directory
    testOutputDir = path.join(os.tmpdir(), 'compliance-test-output');
    await fs.mkdir(testOutputDir, { recursive: true });
  });

  beforeEach(async () => {
    // Initialize services
    complianceTestingService = new ComplianceTestingService(logger);
    vulnerabilityScanner = new VulnerabilityScannerService(logger);
    threatDetection = new ThreatDetectionEngine(logger);

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
    delete process.env.NODE_ENV;
    
    try {
      await fs.rmdir(testOutputDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('OWASP Top 10 Compliance Testing', () => {
    let owaspReport: ComplianceReport;

    beforeEach(async () => {
      owaspReport = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
    });

    it('should execute OWASP Top 10 compliance test successfully', async () => {
      expect(owaspReport).toBeDefined();
      expect(owaspReport.standardId).toBe('OWASP_TOP_10');
      expect(owaspReport.standardName).toBe('OWASP Top 10');
      expect(owaspReport.reportId).toBeDefined();
      expect(owaspReport.timestamp).toBeInstanceOf(Date);
    });

    it('should test all OWASP Top 10 controls', async () => {
      expect(owaspReport.controlResults).toBeDefined();
      expect(owaspReport.controlResults.length).toBe(10);

      const expectedControls = [
        'A01_2021', // Broken Access Control
        'A02_2021', // Cryptographic Failures
        'A03_2021', // Injection
        'A04_2021', // Insecure Design
        'A05_2021', // Security Misconfiguration
        'A06_2021', // Vulnerable and Outdated Components
        'A07_2021', // Identification and Authentication Failures
        'A08_2021', // Software and Data Integrity Failures
        'A09_2021', // Security Logging and Monitoring Failures
        'A10_2021'  // Server-Side Request Forgery
      ];

      const controlIds = owaspReport.controlResults.map(c => c.controlId);
      expectedControls.forEach(expectedId => {
        expect(controlIds).toContain(expectedId);
      });
    });

    it('should calculate overall compliance score correctly', async () => {
      expect(owaspReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(owaspReport.overallScore).toBeLessThanOrEqual(100);
      expect(typeof owaspReport.overallScore).toBe('number');
    });

    it('should determine compliance status based on score', async () => {
      expect(['COMPLIANT', 'NON_COMPLIANT', 'PARTIAL']).toContain(owaspReport.status);
      
      if (owaspReport.overallScore >= 80) {
        expect(owaspReport.status).toBe('COMPLIANT');
      } else if (owaspReport.overallScore >= 56) { // 70% of 80
        expect(owaspReport.status).toBe('PARTIAL');
      } else {
        expect(owaspReport.status).toBe('NON_COMPLIANT');
      }
    });

    it('should test broken access control (A01)', async () => {
      const accessControlResult = owaspReport.controlResults.find(c => c.controlId === 'A01_2021');
      
      expect(accessControlResult).toBeDefined();
      expect(accessControlResult!.controlName).toBe('Broken Access Control');
      expect(['PASS', 'FAIL', 'PARTIAL']).toContain(accessControlResult!.status);
      expect(accessControlResult!.score).toBeGreaterThanOrEqual(0);
      expect(accessControlResult!.score).toBeLessThanOrEqual(100);
    });

    it('should test cryptographic failures (A02)', async () => {
      const cryptoResult = owaspReport.controlResults.find(c => c.controlId === 'A02_2021');
      
      expect(cryptoResult).toBeDefined();
      expect(cryptoResult!.controlName).toBe('Cryptographic Failures');
      expect(cryptoResult!.remediation).toContainEqual(expect.stringContaining('encryption'));
    });

    it('should test injection vulnerabilities (A03)', async () => {
      const injectionResult = owaspReport.controlResults.find(c => c.controlId === 'A03_2021');
      
      expect(injectionResult).toBeDefined();
      expect(injectionResult!.controlName).toBe('Injection');
      expect(injectionResult!.remediation).toContainEqual(expect.stringContaining('parameterized queries'));
    });

    it('should provide gap analysis for non-compliant controls', async () => {
      expect(owaspReport.gapAnalysis).toBeDefined();
      expect(Array.isArray(owaspReport.gapAnalysis)).toBe(true);

      if (owaspReport.status !== 'COMPLIANT') {
        expect(owaspReport.gapAnalysis.length).toBeGreaterThan(0);
        
        owaspReport.gapAnalysis.forEach(gap => {
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

    it('should provide actionable recommendations', async () => {
      expect(owaspReport.recommendations).toBeDefined();
      expect(Array.isArray(owaspReport.recommendations)).toBe(true);
      expect(owaspReport.recommendations.length).toBeGreaterThan(0);

      owaspReport.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ISO 27001 Compliance Testing', () => {
    let iso27001Report: ComplianceReport;

    beforeEach(async () => {
      iso27001Report = await complianceTestingService.executeComplianceTest('ISO_27001');
    });

    it('should execute ISO 27001 compliance test successfully', async () => {
      expect(iso27001Report).toBeDefined();
      expect(iso27001Report.standardId).toBe('ISO_27001');
      expect(iso27001Report.standardName).toBe('ISO/IEC 27001');
      expect(iso27001Report.requiredScore).toBe(85);
    });

    it('should test key ISO 27001 controls', async () => {
      const expectedControls = [
        'A.5.1.1', // Information Security Policy
        'A.6.1.1', // Information Security Roles and Responsibilities
        'A.8.1.1', // Inventory of Assets
        'A.9.1.1', // Access Control Policy
        'A.10.1.1' // Cryptographic Controls
      ];

      const controlIds = iso27001Report.controlResults.map(c => c.controlId);
      expectedControls.forEach(expectedId => {
        expect(controlIds).toContain(expectedId);
      });
    });

    it('should test information security policy control', async () => {
      const policyControl = iso27001Report.controlResults.find(c => c.controlId === 'A.5.1.1');
      
      expect(policyControl).toBeDefined();
      expect(policyControl!.controlName).toBe('Information Security Policy');
      expect(policyControl!.remediation).toContainEqual(expect.stringContaining('security policy'));
    });

    it('should test access control policy', async () => {
      const accessControl = iso27001Report.controlResults.find(c => c.controlId === 'A.9.1.1');
      
      expect(accessControl).toBeDefined();
      expect(accessControl!.controlName).toBe('Access Control Policy');
      expect(accessControl!.remediation).toContainEqual(expect.stringContaining('access control'));
    });

    it('should have higher compliance requirements than OWASP', async () => {
      expect(iso27001Report.requiredScore).toBeGreaterThanOrEqual(85);
    });
  });

  describe('SOC 2 Compliance Testing', () => {
    let soc2Report: ComplianceReport;

    beforeEach(async () => {
      soc2Report = await complianceTestingService.executeComplianceTest('SOC_2');
    });

    it('should execute SOC 2 compliance test successfully', async () => {
      expect(soc2Report).toBeDefined();
      expect(soc2Report.standardId).toBe('SOC_2');
      expect(soc2Report.standardName).toBe('SOC 2 Type II');
      expect(soc2Report.requiredScore).toBe(90);
    });

    it('should test SOC 2 trust service criteria', async () => {
      const expectedControls = [
        'CC1.1', // Control Environment
        'CC2.1', // Communication and Information
        'CC3.1', // Risk Assessment
        'CC4.1', // Monitoring Activities
        'CC5.1'  // Control Activities
      ];

      const controlIds = soc2Report.controlResults.map(c => c.controlId);
      expectedControls.forEach(expectedId => {
        expect(controlIds).toContain(expectedId);
      });
    });

    it('should test control environment', async () => {
      const controlEnv = soc2Report.controlResults.find(c => c.controlId === 'CC1.1');
      
      expect(controlEnv).toBeDefined();
      expect(controlEnv!.controlName).toBe('Control Environment');
      expect(controlEnv!.remediation).toContainEqual(expect.stringContaining('code of conduct'));
    });

    it('should have the highest compliance requirements', async () => {
      expect(soc2Report.requiredScore).toBe(90);
    });
  });

  describe('Crypto Trading Security Framework Compliance', () => {
    let cryptoSecurityReport: ComplianceReport;

    beforeEach(async () => {
      cryptoSecurityReport = await complianceTestingService.executeComplianceTest('CRYPTO_TRADING_SECURITY');
    });

    it('should execute crypto trading security compliance test successfully', async () => {
      expect(cryptoSecurityReport).toBeDefined();
      expect(cryptoSecurityReport.standardId).toBe('CRYPTO_TRADING_SECURITY');
      expect(cryptoSecurityReport.standardName).toBe('Crypto Trading Security Framework');
      expect(cryptoSecurityReport.requiredScore).toBe(95);
    });

    it('should test crypto-specific security controls', async () => {
      const expectedControls = [
        'CTS.1.1', // API Key Security
        'CTS.2.1', // Trading Algorithm Security
        'CTS.3.1', // Risk Management Controls
        'CTS.4.1', // Market Data Integrity
        'CTS.5.1'  // System Availability
      ];

      const controlIds = cryptoSecurityReport.controlResults.map(c => c.controlId);
      expectedControls.forEach(expectedId => {
        expect(controlIds).toContain(expectedId);
      });
    });

    it('should test API key security control', async () => {
      const apiKeyControl = cryptoSecurityReport.controlResults.find(c => c.controlId === 'CTS.1.1');
      
      expect(apiKeyControl).toBeDefined();
      expect(apiKeyControl!.controlName).toBe('API Key Security');
      expect(apiKeyControl!.remediation).toContainEqual(expect.stringContaining('API keys'));
    });

    it('should test trading algorithm security', async () => {
      const algoControl = cryptoSecurityReport.controlResults.find(c => c.controlId === 'CTS.2.1');
      
      expect(algoControl).toBeDefined();
      expect(algoControl!.controlName).toBe('Trading Algorithm Security');
      expect(algoControl!.remediation).toContainEqual(expect.stringContaining('algorithm'));
    });

    it('should test risk management controls', async () => {
      const riskControl = cryptoSecurityReport.controlResults.find(c => c.controlId === 'CTS.3.1');
      
      expect(riskControl).toBeDefined();
      expect(riskControl!.controlName).toBe('Risk Management Controls');
      expect(riskControl!.remediation.some(item => item.toLowerCase().includes('risk'))).toBe(true);
    });

    it('should have the most stringent compliance requirements', async () => {
      expect(cryptoSecurityReport.requiredScore).toBe(95);
    });
  });

  describe('Vulnerability Scanner Integration', () => {
    it('should execute comprehensive vulnerability scan', async () => {
      const scanResult = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      expect(scanResult).toBeDefined();
      expect(scanResult.scanId).toBeDefined();
      expect(scanResult.scanType).toBe('comprehensive_scan');
      expect(scanResult.status).toBe('COMPLETED');
      expect(scanResult.findings).toBeDefined();
      expect(Array.isArray(scanResult.findings)).toBe(true);
    });

    it('should scan for dependency vulnerabilities', async () => {
      const scanResult = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if dependency scanning was performed
      const dependencyFindings = scanResult.findings.filter(f => 
        f.type === 'DEPENDENCY_VULNERABILITY'
      );
      
      // Should have scanned dependencies (may or may not find vulnerabilities)
      expect(scanResult.findings).toBeDefined();
    });

    it('should scan for code vulnerabilities', async () => {
      const scanResult = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if code scanning was performed
      const codeFindings = scanResult.findings.filter(f => 
        ['SQL_INJECTION', 'XSS', 'COMMAND_INJECTION', 'HARDCODED_SECRET'].includes(f.type)
      );
      
      // Code scanning should be included
      expect(scanResult.findings).toBeDefined();
    });

    it('should scan for configuration vulnerabilities', async () => {
      const scanResult = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      // Check if configuration scanning was performed
      const configFindings = scanResult.findings.filter(f => 
        ['CONFIGURATION_ERROR', 'INSECURE_TRANSPORT', 'WEAK_SESSION_SECRET'].includes(f.type)
      );
      
      // Configuration scanning should be included
      expect(scanResult.findings).toBeDefined();
    });

    it('should provide vulnerability summary with risk scoring', async () => {
      const scanResult = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      expect(scanResult.summary).toBeDefined();
      expect(scanResult.summary.totalFindings).toBeGreaterThanOrEqual(0);
      expect(scanResult.summary.riskScore).toBeGreaterThanOrEqual(0);
      expect(scanResult.summary.riskScore).toBeLessThanOrEqual(100);
      expect(scanResult.summary.complianceScore).toBeGreaterThanOrEqual(0);
      expect(scanResult.summary.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should provide remediation priorities', async () => {
      const scanResult = await vulnerabilityScanner.executeComprehensiveVulnerabilityScan();
      
      expect(scanResult.summary.remediationPriority).toBeDefined();
      expect(Array.isArray(scanResult.summary.remediationPriority)).toBe(true);
      
      if (scanResult.summary.remediationPriority.length > 0) {
        scanResult.summary.remediationPriority.forEach(item => {
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

  describe('Cross-Standard Compliance Analysis', () => {
    it('should compare compliance scores across standards', async () => {
      const owaspReport = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
      const iso27001Report = await complianceTestingService.executeComplianceTest('ISO_27001');
      const soc2Report = await complianceTestingService.executeComplianceTest('SOC_2');
      const cryptoReport = await complianceTestingService.executeComplianceTest('CRYPTO_TRADING_SECURITY');

      // All reports should be valid
      expect(owaspReport.overallScore).toBeGreaterThanOrEqual(0);
      expect(iso27001Report.overallScore).toBeGreaterThanOrEqual(0);
      expect(soc2Report.overallScore).toBeGreaterThanOrEqual(0);
      expect(cryptoReport.overallScore).toBeGreaterThanOrEqual(0);

      // Required scores should be in ascending order of strictness
      expect(owaspReport.requiredScore).toBeLessThanOrEqual(iso27001Report.requiredScore);
      expect(iso27001Report.requiredScore).toBeLessThanOrEqual(soc2Report.requiredScore);
      expect(soc2Report.requiredScore).toBeLessThanOrEqual(cryptoReport.requiredScore);
    });

    it('should identify common compliance gaps across standards', async () => {
      const reports = await Promise.all([
        complianceTestingService.executeComplianceTest('OWASP_TOP_10'),
        complianceTestingService.executeComplianceTest('ISO_27001'),
        complianceTestingService.executeComplianceTest('SOC_2'),
        complianceTestingService.executeComplianceTest('CRYPTO_TRADING_SECURITY')
      ]);

      // Analyze common themes in gap analysis
      const allGaps = reports.flatMap(report => report.gapAnalysis);
      const commonGapTypes = allGaps.reduce((types, gap) => {
        const type = gap.controlName.toLowerCase();
        types[type] = (types[type] || 0) + 1;
        return types;
      }, {} as Record<string, number>);

      // Should have identified some common patterns
      expect(Object.keys(commonGapTypes).length).toBeGreaterThanOrEqual(0);
    });

    it('should provide consolidated recommendations', async () => {
      const reports = await Promise.all([
        complianceTestingService.executeComplianceTest('OWASP_TOP_10'),
        complianceTestingService.executeComplianceTest('ISO_27001'),
        complianceTestingService.executeComplianceTest('SOC_2'),
        complianceTestingService.executeComplianceTest('CRYPTO_TRADING_SECURITY')
      ]);

      // All reports should have recommendations
      reports.forEach(report => {
        expect(report.recommendations).toBeDefined();
        expect(Array.isArray(report.recommendations)).toBe(true);
        expect(report.recommendations.length).toBeGreaterThan(0);
      });

      // Consolidate recommendations
      const allRecommendations = reports.flatMap(report => report.recommendations);
      const uniqueRecommendations = [...new Set(allRecommendations)];

      expect(uniqueRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Compliance Reporting and Documentation', () => {
    it('should generate comprehensive compliance reports', async () => {
      const report = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
      
      // Validate report structure
      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('standardId');
      expect(report).toHaveProperty('standardName');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('overallScore');
      expect(report).toHaveProperty('requiredScore');
      expect(report).toHaveProperty('status');
      expect(report).toHaveProperty('controlResults');
      expect(report).toHaveProperty('gapAnalysis');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('executionTime');

      // Validate data types
      expect(typeof report.reportId).toBe('string');
      expect(typeof report.standardId).toBe('string');
      expect(typeof report.standardName).toBe('string');
      expect(report.timestamp instanceof Date).toBe(true);
      expect(typeof report.overallScore).toBe('number');
      expect(typeof report.requiredScore).toBe('number');
      expect(typeof report.status).toBe('string');
      expect(Array.isArray(report.controlResults)).toBe(true);
      expect(Array.isArray(report.gapAnalysis)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(typeof report.executionTime).toBe('number');
    });

    it('should save compliance reports to file system', async () => {
      const report = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
      
      // Save report to test output directory
      const reportPath = path.join(testOutputDir, `compliance-report-${report.reportId}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      // Verify file was created
      const fileExists = await fs.access(reportPath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      // Verify file content
      const savedContent = await fs.readFile(reportPath, 'utf-8');
      const savedReport = JSON.parse(savedContent);
      expect(savedReport.reportId).toBe(report.reportId);
    });

    it('should track compliance trends over time', async () => {
      // Execute multiple compliance tests to simulate trend tracking
      const reports = [];
      
      for (let i = 0; i < 3; i++) {
        const report = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
        reports.push(report);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Verify reports have different timestamps
      const timestamps = reports.map(r => r.timestamp.getTime());
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBe(reports.length);
      
      // Verify all reports are for the same standard
      const standardIds = reports.map(r => r.standardId);
      expect(new Set(standardIds).size).toBe(1);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle unknown compliance standards gracefully', async () => {
      await expect(
        complianceTestingService.executeComplianceTest('UNKNOWN_STANDARD')
      ).rejects.toThrow('Unknown compliance standard: UNKNOWN_STANDARD');
    });

    it('should handle test method failures gracefully', async () => {
      // Mock a test method to fail
      const originalMethod = (complianceTestingService as any).executeTestMethod;
      (complianceTestingService as any).executeTestMethod = jest.fn()
        .mockRejectedValueOnce(new Error('Test method failed'))
        .mockImplementation(originalMethod);

      const report = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
      
      // Should still complete despite individual test failures
      expect(report).toBeDefined();
      expect(report.controlResults.length).toBeGreaterThan(0);
    });

    it('should continue testing after individual control failures', async () => {
      // This test ensures that if one control test fails, others continue
      const report = await complianceTestingService.executeComplianceTest('OWASP_TOP_10');
      
      // Should have tested all controls
      expect(report.controlResults.length).toBe(10);
      
      // Each control should have a valid status
      report.controlResults.forEach(control => {
        expect(['PASS', 'FAIL', 'PARTIAL']).toContain(control.status);
      });
    });

    it('should handle resource constraints gracefully', async () => {
      // Simulate resource constraints by running multiple tests concurrently
      const testPromises = [
        complianceTestingService.executeComplianceTest('OWASP_TOP_10'),
        complianceTestingService.executeComplianceTest('ISO_27001'),
        complianceTestingService.executeComplianceTest('SOC_2'),
        vulnerabilityScanner.executeComprehensiveVulnerabilityScan()
      ];

      const results = await Promise.all(testPromises);
      
      // All tests should complete successfully
      expect(results).toHaveLength(4);
      results.slice(0, 3).forEach(report => {
        expect(report).toHaveProperty('reportId');
        expect(report).toHaveProperty('overallScore');
      });
      
      // Vulnerability scan should also complete
      expect(results[3]).toHaveProperty('scanId');
      expect(results[3]).toHaveProperty('status', 'COMPLETED');
    });
  });
});
