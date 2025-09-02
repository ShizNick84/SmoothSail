#!/usr/bin/env tsx
/**
 * =============================================================================
 * TASK 8.2 TEST RUNNER SCRIPT
 * =============================================================================
 * 
 * Comprehensive test runner for Task 8.2: Test Trading System Functionality
 * 
 * This script runs all tests related to:
 * - Trading bot functionality with paper trading
 * - Dashboard access from local network with all UI features
 * - Notification delivery (Telegram and email) with rich templates
 * - Emoji and icon displays across devices
 * - Dashboard responsiveness on mobile devices
 * - Database operations and data persistence
 * 
 * Requirements: 1.3, 4.1, 5.1, 5.2
 * =============================================================================
 */

import { execSync } from 'child_process';
import { Logger } from '../../core/logging/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('Task8.2TestRunner');

interface TestResult {
  testFile: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
}

interface TestSuite {
  name: string;
  description: string;
  testFiles: string[];
  requirements: string[];
}

class Task82TestRunner {
  private testSuites: TestSuite[] = [
    {
      name: 'Trading System Functionality',
      description: 'Core trading system integration tests including paper trading',
      testFiles: [
        'src/tests/integration/trading-system-functionality.test.ts'
      ],
      requirements: ['1.3', '4.1', '5.1', '5.2']
    },
    {
      name: 'Dashboard Responsiveness',
      description: 'Dashboard UI, mobile responsiveness, and emoji display tests',
      testFiles: [
        'src/tests/dashboard/dashboard-responsiveness.test.ts'
      ],
      requirements: ['4.1', '4.2']
    },
    {
      name: 'Database Persistence',
      description: 'Database operations and data persistence validation',
      testFiles: [
        'src/tests/database/database-persistence.test.ts'
      ],
      requirements: ['3.2', '5.4']
    },
    {
      name: 'Notification System',
      description: 'Telegram and email notification delivery with rich templates',
      testFiles: [
        'src/tests/notifications/intel-nuc-notification-testing.test.ts'
      ],
      requirements: ['5.1', '5.2']
    }
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    logger.info('🧪 Starting Task 8.2: Test Trading System Functionality');
    logger.info('=' .repeat(80));

    const startTime = Date.now();

    try {
      // Set up test environment
      await this.setupTestEnvironment();

      // Run each test suite
      for (const suite of this.testSuites) {
        await this.runTestSuite(suite);
      }

      // Generate comprehensive report
      await this.generateReport();

      const totalDuration = Date.now() - startTime;
      logger.info(`✅ Task 8.2 testing completed in ${totalDuration}ms`);

    } catch (error) {
      logger.error('❌ Task 8.2 testing failed:', error);
      process.exit(1);
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    logger.info('🔧 Setting up test environment...');

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.GATE_IO_SANDBOX = 'true';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_NAME = 'trading_agent_test';
    process.env.DASHBOARD_PORT = '3001';
    process.env.DASHBOARD_HOST = '0.0.0.0';
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.EMAIL_FROM = 'test@example.com';

    // Ensure test directories exist
    const testDirs = [
      'src/tests/integration',
      'src/tests/dashboard',
      'src/tests/database',
      'src/tests/notifications'
    ];

    for (const dir of testDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`📁 Created test directory: ${dir}`);
      }
    }

    logger.info('✅ Test environment setup complete');
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    logger.info(`\n📋 Running Test Suite: ${suite.name}`);
    logger.info(`📝 Description: ${suite.description}`);
    logger.info(`🎯 Requirements: ${suite.requirements.join(', ')}`);
    logger.info('-'.repeat(60));

    for (const testFile of suite.testFiles) {
      await this.runSingleTest(testFile);
    }
  }

  private async runSingleTest(testFile: string): Promise<void> {
    const startTime = Date.now();
    logger.info(`🧪 Running: ${testFile}`);

    try {
      // Check if test file exists
      if (!fs.existsSync(testFile)) {
        logger.warn(`⚠️  Test file not found: ${testFile}`);
        this.results.push({
          testFile,
          passed: false,
          duration: 0,
          errors: ['Test file not found']
        });
        return;
      }

      // Run the test with Jest
      const jestCommand = `npx jest "${testFile}" --verbose --coverage --testTimeout=30000`;
      
      try {
        const output = execSync(jestCommand, { 
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 60000 // 60 second timeout
        });

        const duration = Date.now() - startTime;
        
        // Parse Jest output for coverage information
        const coverageMatch = output.match(/All files[^|]*\|[^|]*\|[^|]*\|[^|]*\|[^|]*(\d+\.?\d*)/);
        const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : undefined;

        this.results.push({
          testFile,
          passed: true,
          duration,
          coverage
        });

        logger.info(`✅ PASSED: ${testFile} (${duration}ms)`);
        if (coverage !== undefined) {
          logger.info(`📊 Coverage: ${coverage}%`);
        }

      } catch (execError: any) {
        const duration = Date.now() - startTime;
        const errorOutput = execError.stdout || execError.stderr || execError.message;
        
        this.results.push({
          testFile,
          passed: false,
          duration,
          errors: [errorOutput]
        });

        logger.error(`❌ FAILED: ${testFile} (${duration}ms)`);
        logger.error(`Error: ${errorOutput}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.push({
        testFile,
        passed: false,
        duration,
        errors: [error instanceof Error ? error.message : String(error)]
      });

      logger.error(`❌ FAILED: ${testFile} (${duration}ms)`);
      logger.error('Error:', error);
    }
  }

  private async generateReport(): Promise<void> {
    logger.info('\n📊 TASK 8.2 TEST RESULTS SUMMARY');
    logger.info('=' .repeat(80));

    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgCoverage = this.results
      .filter(r => r.coverage !== undefined)
      .reduce((sum, r, _, arr) => sum + (r.coverage! / arr.length), 0);

    // Overall statistics
    logger.info(`📈 Total Tests: ${totalTests}`);
    logger.info(`✅ Passed: ${passedTests}`);
    logger.info(`❌ Failed: ${failedTests}`);
    logger.info(`⏱️  Total Duration: ${totalDuration}ms`);
    logger.info(`📊 Average Coverage: ${avgCoverage.toFixed(2)}%`);
    logger.info(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);

    // Detailed results by test suite
    logger.info('\n📋 DETAILED RESULTS BY TEST SUITE:');
    logger.info('-'.repeat(80));

    for (const suite of this.testSuites) {
      const suiteResults = this.results.filter(r => 
        suite.testFiles.some(file => r.testFile.includes(file))
      );
      
      const suitePassed = suiteResults.filter(r => r.passed).length;
      const suiteTotal = suiteResults.length;
      const suiteStatus = suitePassed === suiteTotal ? '✅' : '❌';

      logger.info(`${suiteStatus} ${suite.name}: ${suitePassed}/${suiteTotal} tests passed`);
      logger.info(`   Requirements: ${suite.requirements.join(', ')}`);
      
      // Show failed tests
      const failedInSuite = suiteResults.filter(r => !r.passed);
      if (failedInSuite.length > 0) {
        logger.info('   Failed tests:');
        failedInSuite.forEach(result => {
          logger.info(`     - ${path.basename(result.testFile)}`);
          if (result.errors) {
            result.errors.forEach(error => {
              logger.info(`       Error: ${error.substring(0, 100)}...`);
            });
          }
        });
      }
    }

    // Task 8.2 specific validation
    logger.info('\n🎯 TASK 8.2 REQUIREMENT VALIDATION:');
    logger.info('-'.repeat(80));

    const requirementTests = {
      '1.3': 'Trading bot functionality with paper trading',
      '4.1': 'Dashboard access from local network with all UI features',
      '4.2': 'Dashboard responsiveness on mobile devices',
      '5.1': 'Telegram notification delivery with rich templates',
      '5.2': 'Email notification delivery with rich templates',
      '3.2': 'Database operations and data persistence',
      '5.4': 'Data integrity and backup procedures'
    };

    Object.entries(requirementTests).forEach(([req, description]) => {
      const relatedSuites = this.testSuites.filter(suite => 
        suite.requirements.includes(req)
      );
      
      const relatedResults = this.results.filter(result =>
        relatedSuites.some(suite => 
          suite.testFiles.some(file => result.testFile.includes(file))
        )
      );

      const reqPassed = relatedResults.filter(r => r.passed).length;
      const reqTotal = relatedResults.length;
      const reqStatus = reqPassed === reqTotal ? '✅' : '❌';

      logger.info(`${reqStatus} Requirement ${req}: ${description}`);
      logger.info(`   Tests: ${reqPassed}/${reqTotal} passed`);
    });

    // Generate JSON report for CI/CD
    const jsonReport = {
      task: '8.2',
      name: 'Test Trading System Functionality',
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passedTests,
        failedTests,
        totalDuration,
        avgCoverage,
        successRate: (passedTests / totalTests) * 100
      },
      testSuites: this.testSuites.map(suite => ({
        name: suite.name,
        requirements: suite.requirements,
        results: this.results.filter(r => 
          suite.testFiles.some(file => r.testFile.includes(file))
        )
      })),
      requirements: Object.entries(requirementTests).map(([req, description]) => {
        const relatedResults = this.results.filter(result =>
          this.testSuites
            .filter(suite => suite.requirements.includes(req))
            .some(suite => suite.testFiles.some(file => result.testFile.includes(file)))
        );
        
        return {
          requirement: req,
          description,
          passed: relatedResults.filter(r => r.passed).length,
          total: relatedResults.length,
          status: relatedResults.filter(r => r.passed).length === relatedResults.length ? 'PASSED' : 'FAILED'
        };
      })
    };

    // Save JSON report
    const reportPath = 'coverage/task-8-2-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    logger.info(`📄 JSON report saved to: ${reportPath}`);

    // Final status
    if (passedTests === totalTests) {
      logger.info('\n🎉 TASK 8.2 TESTING: ALL TESTS PASSED!');
      logger.info('✅ Trading System Functionality validation complete');
    } else {
      logger.error('\n❌ TASK 8.2 TESTING: SOME TESTS FAILED');
      logger.error(`${failedTests} out of ${totalTests} tests failed`);
      logger.error('Please review the failed tests and fix the issues');
    }
  }
}

// Main execution
if (require.main === module) {
  const runner = new Task82TestRunner();
  runner.runAllTests().catch((error) => {
    console.error('Fatal error in test runner:', error);
    process.exit(1);
  });
}

export { Task82TestRunner };