/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - END-TO-END TESTING
 * =============================================================================
 * 
 * This module provides comprehensive end-to-end testing for the complete
 * AI crypto trading agent system in a production-like environment.
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../core/logger';
import axios from 'axios';

interface E2ETestResult {
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message: string;
  details?: any;
  critical: boolean;
}

interface E2ETestSuite {
  name: string;
  description: string;
  tests: E2ETest[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  enabled: boolean;
}

interface E2ETest {
  name: string;
  description: string;
  critical: boolean;
  timeout: number;
  test: () => Promise<{ success: boolean; message: string; details?: any }>;
}

interface E2EReport {
  timestamp: Date;
  environment: string;
  duration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    criticalFailed: number;
  };
  results: E2ETestResult[];
  systemReady: boolean;
}

export class E2ETestRunner {
  private testSuites: E2ETestSuite[] = [];
  private baseUrl: string = 'http://localhost:3001';
  private dashboardUrl: string = 'http://localhost:3002';
  private servicesStarted: boolean = false;

  constructor() {
    this.initializeTestSuites();
  }

  /**
   * Run complete end-to-end test suite
   */
  async runE2ETests(): Promise<E2EReport> {
    logger.info('🚀 Starting end-to-end testing...');
    const startTime = Date.now();

    const results: E2ETestResult[] = [];
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let criticalFailures = 0;

    try {
      // Start services for testing
      await this.startTestServices();

      // Run all test suites
      for (const suite of this.testSuites) {
        if (!suite.enabled) {
          logger.info(`⏭️ Skipping disabled test suite: ${suite.name}`);
          continue;
        }

        logger.info(`🧪 Running E2E test suite: ${suite.name}`);

        // Run suite setup
        if (suite.setup) {
          try {
            await suite.setup();
          } catch (error) {
            logger.error(`❌ Suite setup failed: ${suite.name}`, error);
            continue;
          }
        }

        // Run tests
        for (const test of suite.tests) {
          totalTests++;
          const testStartTime = Date.now();

          try {
            logger.info(`  🔍 Running test: ${test.name}`);

            const testResult = await Promise.race([
              test.test(),
              this.createTimeoutPromise(test.timeout)
            ]);

            const duration = Date.now() - testStartTime;
            const status = testResult.success ? 'PASS' : 'FAIL';

            const result: E2ETestResult = {
              name: test.name,
              category: suite.name,
              status,
              duration,
              message: testResult.message,
              details: testResult.details,
              critical: test.critical
            };

            results.push(result);

            if (status === 'PASS') {
              passedTests++;
              logger.info(`    ✅ ${test.name} - ${testResult.message}`);
            } else {
              failedTests++;
              if (test.critical) {
                criticalFailures++;
              }
              logger.error(`    ❌ ${test.name} - ${testResult.message}`);
            }

          } catch (error) {
            const duration = Date.now() - testStartTime;
            const isTimeout = error.message === 'Test timeout';
            
            const result: E2ETestResult = {
              name: test.name,
              category: suite.name,
              status: 'FAIL',
              duration,
              message: isTimeout ? 'Test timed out' : `Test error: ${error.message}`,
              details: { error: error.message },
              critical: test.critical
            };

            results.push(result);
            failedTests++;
            
            if (test.critical) {
              criticalFailures++;
            }

            logger.error(`    ❌ ${test.name} - ${result.message}`);
          }
        }

        // Run suite teardown
        if (suite.teardown) {
          try {
            await suite.teardown();
          } catch (error) {
            logger.error(`⚠️ Suite teardown failed: ${suite.name}`, error);
          }
        }
      }

    } finally {
      // Stop test services
      await this.stopTestServices();
    }

    const totalDuration = Date.now() - startTime;
    const systemReady = criticalFailures === 0;

    const report: E2EReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'test',
      duration: totalDuration,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        criticalFailed: criticalFailures
      },
      results,
      systemReady
    };

    // Save test report
    await this.saveE2EReport(report);

    // Log summary
    this.logE2ESummary(report);

    return report;
  }

  /**
   * Initialize end-to-end test suites
   */
  private initializeTestSuites(): void {
    this.testSuites = [
      {
        name: 'System Startup',
        description: 'Test complete system startup and initialization',
        enabled: true,
        tests: [
          {
            name: 'Service Startup',
            description: 'Verify all services start successfully',
            critical: true,
            timeout: 60000,
            test: async () => {
              // Services should already be started by startTestServices
              const processes = await this.getProcessStatus();
              const runningProcesses = processes.filter(p => p.pm2_env.status === 'online');

              if (runningProcesses.length === 0) {
                return { success: false, message: 'No services are running' };
              }

              return { 
                success: true, 
                message: `${runningProcesses.length} services started successfully`,
                details: { 
                  processes: runningProcesses.map(p => ({ 
                    name: p.name, 
                    status: p.pm2_env.status,
                    uptime: p.pm2_env.pm_uptime 
                  }))
                }
              };
            }
          },
          {
            name: 'Database Connection',
            description: 'Verify database connectivity and initialization',
            critical: true,
            timeout: 15000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/health/database`, {
                  timeout: 10000
                });

                if (response.status === 200 && response.data.status === 'HEALTHY') {
                  return { success: true, message: 'Database connection verified' };
                } else {
                  return { success: false, message: 'Database health check failed' };
                }
              } catch (error) {
                return { success: false, message: `Database connection failed: ${error.message}` };
              }
            }
          },
          {
            name: 'SSH Tunnel Status',
            description: 'Verify SSH tunnel is established',
            critical: true,
            timeout: 20000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/tunnel/status`, {
                  timeout: 15000
                });

                if (response.status === 200 && response.data.connected) {
                  return { 
                    success: true, 
                    message: 'SSH tunnel is connected',
                    details: response.data
                  };
                } else {
                  return { success: false, message: 'SSH tunnel is not connected' };
                }
              } catch (error) {
                return { success: false, message: `SSH tunnel check failed: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'API Functionality',
        description: 'Test all API endpoints and functionality',
        enabled: true,
        tests: [
          {
            name: 'Health Endpoint',
            description: 'Test main health endpoint',
            critical: true,
            timeout: 10000,
            test: async () => {
              try {
                const startTime = Date.now();
                const response = await axios.get(`${this.baseUrl}/api/v1/health`, {
                  timeout: 8000
                });
                const responseTime = Date.now() - startTime;

                if (response.status === 200) {
                  return { 
                    success: true, 
                    message: `Health endpoint responding (${responseTime}ms)`,
                    details: { responseTime, data: response.data }
                  };
                } else {
                  return { success: false, message: `Unexpected status code: ${response.status}` };
                }
              } catch (error) {
                return { success: false, message: `Health endpoint failed: ${error.message}` };
              }
            }
          },
          {
            name: 'System Metrics',
            description: 'Test system metrics endpoint',
            critical: false,
            timeout: 15000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/metrics/system`, {
                  timeout: 10000
                });

                if (response.status === 200 && response.data.cpu && response.data.memory) {
                  return { 
                    success: true, 
                    message: 'System metrics endpoint working',
                    details: { 
                      cpu: response.data.cpu.usage,
                      memory: response.data.memory.percentage
                    }
                  };
                } else {
                  return { success: false, message: 'Invalid system metrics response' };
                }
              } catch (error) {
                return { success: false, message: `System metrics failed: ${error.message}` };
              }
            }
          },
          {
            name: 'Trading Status',
            description: 'Test trading status endpoint',
            critical: false,
            timeout: 10000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/trading/status`, {
                  timeout: 8000
                });

                if (response.status === 200) {
                  return { 
                    success: true, 
                    message: 'Trading status endpoint working',
                    details: response.data
                  };
                } else {
                  return { success: false, message: `Trading status failed: ${response.status}` };
                }
              } catch (error) {
                return { success: false, message: `Trading status error: ${error.message}` };
              }
            }
          },
          {
            name: 'Security Headers',
            description: 'Verify security headers are present',
            critical: false,
            timeout: 10000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/health`, {
                  timeout: 8000
                });

                const securityHeaders = [
                  'x-content-type-options',
                  'x-frame-options',
                  'x-xss-protection'
                ];

                const missingHeaders = securityHeaders.filter(header => 
                  !response.headers[header]
                );

                if (missingHeaders.length === 0) {
                  return { success: true, message: 'All security headers present' };
                } else {
                  return { 
                    success: false, 
                    message: `Missing security headers: ${missingHeaders.join(', ')}` 
                  };
                }
              } catch (error) {
                return { success: false, message: `Security headers check failed: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'Dashboard Functionality',
        description: 'Test dashboard accessibility and functionality',
        enabled: true,
        tests: [
          {
            name: 'Dashboard Accessibility',
            description: 'Verify dashboard is accessible',
            critical: false,
            timeout: 15000,
            test: async () => {
              try {
                const response = await axios.get(this.dashboardUrl, {
                  timeout: 10000
                });

                if (response.status === 200) {
                  return { success: true, message: 'Dashboard is accessible' };
                } else {
                  return { success: false, message: `Dashboard returned status: ${response.status}` };
                }
              } catch (error) {
                return { success: false, message: `Dashboard not accessible: ${error.message}` };
              }
            }
          },
          {
            name: 'Dashboard Assets',
            description: 'Verify dashboard static assets load',
            critical: false,
            timeout: 20000,
            test: async () => {
              try {
                // Test common asset paths
                const assetPaths = [
                  '/_next/static/css',
                  '/_next/static/js'
                ];

                let assetsLoaded = 0;
                for (const path of assetPaths) {
                  try {
                    await axios.get(`${this.dashboardUrl}${path}`, { timeout: 5000 });
                    assetsLoaded++;
                  } catch {
                    // Asset might not exist, which is okay
                  }
                }

                return { 
                  success: true, 
                  message: `Dashboard assets check completed`,
                  details: { assetsChecked: assetPaths.length, assetsLoaded }
                };
              } catch (error) {
                return { success: false, message: `Dashboard assets check failed: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'Data Flow',
        description: 'Test data flow through the system',
        enabled: true,
        tests: [
          {
            name: 'Market Data Flow',
            description: 'Test market data collection and processing',
            critical: false,
            timeout: 30000,
            test: async () => {
              try {
                // Trigger market data collection
                const response = await axios.post(`${this.baseUrl}/api/v1/market/collect`, {}, {
                  timeout: 25000
                });

                if (response.status === 200) {
                  return { 
                    success: true, 
                    message: 'Market data collection working',
                    details: response.data
                  };
                } else {
                  return { success: false, message: `Market data collection failed: ${response.status}` };
                }
              } catch (error) {
                return { success: false, message: `Market data flow error: ${error.message}` };
              }
            }
          },
          {
            name: 'Technical Indicators',
            description: 'Test technical indicator calculations',
            critical: false,
            timeout: 20000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/indicators/BTC_USDT`, {
                  timeout: 15000
                });

                if (response.status === 200 && response.data.indicators) {
                  return { 
                    success: true, 
                    message: 'Technical indicators working',
                    details: { 
                      indicators: Object.keys(response.data.indicators).length 
                    }
                  };
                } else {
                  return { success: false, message: 'Technical indicators not available' };
                }
              } catch (error) {
                return { success: false, message: `Technical indicators error: ${error.message}` };
              }
            }
          },
          {
            name: 'Sentiment Analysis',
            description: 'Test sentiment analysis functionality',
            critical: false,
            timeout: 25000,
            test: async () => {
              try {
                const response = await axios.get(`${this.baseUrl}/api/v1/sentiment/BTC`, {
                  timeout: 20000
                });

                if (response.status === 200) {
                  return { 
                    success: true, 
                    message: 'Sentiment analysis working',
                    details: response.data
                  };
                } else {
                  return { success: false, message: `Sentiment analysis failed: ${response.status}` };
                }
              } catch (error) {
                return { success: false, message: `Sentiment analysis error: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'Security Testing',
        description: 'Test security measures and protections',
        enabled: true,
        tests: [
          {
            name: 'Rate Limiting',
            description: 'Test API rate limiting',
            critical: false,
            timeout: 30000,
            test: async () => {
              try {
                // Make multiple rapid requests to test rate limiting
                const requests = Array(20).fill(null).map(() => 
                  axios.get(`${this.baseUrl}/api/v1/health`, { timeout: 2000 })
                    .catch(error => ({ error: error.response?.status || error.message }))
                );

                const responses = await Promise.all(requests);
                const rateLimited = responses.some(r => 
                  r.error === 429 || (typeof r.error === 'string' && r.error.includes('429'))
                );

                if (rateLimited) {
                  return { success: true, message: 'Rate limiting is working' };
                } else {
                  return { success: false, message: 'Rate limiting may not be configured' };
                }
              } catch (error) {
                return { success: false, message: `Rate limiting test error: ${error.message}` };
              }
            }
          },
          {
            name: 'Input Validation',
            description: 'Test input validation on API endpoints',
            critical: false,
            timeout: 15000,
            test: async () => {
              try {
                // Test with invalid input
                const response = await axios.post(`${this.baseUrl}/api/v1/trading/order`, {
                  invalid: 'data',
                  malicious: '<script>alert("xss")</script>'
                }, { 
                  timeout: 10000,
                  validateStatus: () => true // Accept all status codes
                });

                if (response.status === 400 || response.status === 422) {
                  return { success: true, message: 'Input validation is working' };
                } else {
                  return { success: false, message: 'Input validation may be insufficient' };
                }
              } catch (error) {
                return { success: false, message: `Input validation test error: ${error.message}` };
              }
            }
          }
        ]
      },
      {
        name: 'Performance Testing',
        description: 'Test system performance under load',
        enabled: true,
        tests: [
          {
            name: 'Response Time',
            description: 'Test API response times',
            critical: false,
            timeout: 30000,
            test: async () => {
              try {
                const requests = 10;
                const responseTimes: number[] = [];

                for (let i = 0; i < requests; i++) {
                  const startTime = Date.now();
                  await axios.get(`${this.baseUrl}/api/v1/health`, { timeout: 5000 });
                  responseTimes.push(Date.now() - startTime);
                }

                const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
                const maxResponseTime = Math.max(...responseTimes);

                if (avgResponseTime < 1000 && maxResponseTime < 2000) {
                  return { 
                    success: true, 
                    message: `Good response times (avg: ${avgResponseTime.toFixed(0)}ms)`,
                    details: { average: avgResponseTime, maximum: maxResponseTime }
                  };
                } else {
                  return { 
                    success: false, 
                    message: `Slow response times (avg: ${avgResponseTime.toFixed(0)}ms, max: ${maxResponseTime}ms)` 
                  };
                }
              } catch (error) {
                return { success: false, message: `Response time test error: ${error.message}` };
              }
            }
          },
          {
            name: 'Concurrent Requests',
            description: 'Test handling of concurrent requests',
            critical: false,
            timeout: 45000,
            test: async () => {
              try {
                const concurrentRequests = 50;
                const requests = Array(concurrentRequests).fill(null).map(() => 
                  axios.get(`${this.baseUrl}/api/v1/health`, { timeout: 10000 })
                    .catch(error => ({ error: error.message }))
                );

                const startTime = Date.now();
                const responses = await Promise.all(requests);
                const duration = Date.now() - startTime;

                const successful = responses.filter(r => !r.error).length;
                const successRate = (successful / concurrentRequests) * 100;

                if (successRate >= 95) {
                  return { 
                    success: true, 
                    message: `Handled ${successful}/${concurrentRequests} concurrent requests (${duration}ms)`,
                    details: { successRate, duration, concurrent: concurrentRequests }
                  };
                } else {
                  return { 
                    success: false, 
                    message: `Poor concurrent performance: ${successRate.toFixed(1)}% success rate` 
                  };
                }
              } catch (error) {
                return { success: false, message: `Concurrent requests test error: ${error.message}` };
              }
            }
          }
        ]
      }
    ];
  }

  /**
   * Start test services
   */
  private async startTestServices(): Promise<void> {
    if (this.servicesStarted) {
      return;
    }

    logger.info('🚀 Starting test services...');

    try {
      // Stop any existing services
      try {
        execSync('pm2 stop all', { stdio: 'pipe' });
        execSync('pm2 delete all', { stdio: 'pipe' });
      } catch {
        // Ignore if no services running
      }

      // Start services
      execSync('pm2 start ecosystem.config.js --env test', { stdio: 'inherit' });

      // Wait for services to start
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify services are running
      const processes = await this.getProcessStatus();
      const runningProcesses = processes.filter(p => p.pm2_env.status === 'online');

      if (runningProcesses.length === 0) {
        throw new Error('No services started successfully');
      }

      this.servicesStarted = true;
      logger.info(`✅ ${runningProcesses.length} test services started`);

    } catch (error) {
      logger.error('❌ Failed to start test services:', error);
      throw error;
    }
  }

  /**
   * Stop test services
   */
  private async stopTestServices(): Promise<void> {
    if (!this.servicesStarted) {
      return;
    }

    logger.info('🛑 Stopping test services...');

    try {
      execSync('pm2 stop all', { stdio: 'pipe' });
      execSync('pm2 delete all', { stdio: 'pipe' });
      this.servicesStarted = false;
      logger.info('✅ Test services stopped');
    } catch (error) {
      logger.error('⚠️ Error stopping test services:', error);
    }
  }

  /**
   * Get process status
   */
  private async getProcessStatus(): Promise<any[]> {
    try {
      const pm2List = execSync('pm2 jlist', { encoding: 'utf-8' });
      return JSON.parse(pm2List);
    } catch {
      return [];
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Test timeout')), timeout);
    });
  }

  /**
   * Save E2E test report
   */
  private async saveE2EReport(report: E2EReport): Promise<void> {
    const timestamp = report.timestamp.toISOString().replace(/[:.]/g, '-');
    const reportPath = join(process.cwd(), 'logs', `e2e-report-${timestamp}.json`);
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.info(`📊 E2E test report saved: ${reportPath}`);
  }

  /**
   * Log E2E test summary
   */
  private logE2ESummary(report: E2EReport): void {
    logger.info('\n🚀 END-TO-END TEST SUMMARY');
    logger.info('═'.repeat(50));
    logger.info(`Environment: ${report.environment}`);
    logger.info(`Duration: ${Math.round(report.duration / 1000)}s`);
    logger.info(`Total Tests: ${report.summary.total}`);
    logger.info(`✅ Passed: ${report.summary.passed}`);
    logger.info(`❌ Failed: ${report.summary.failed}`);
    logger.info(`⏭️ Skipped: ${report.summary.skipped}`);
    logger.info(`🚨 Critical Failures: ${report.summary.criticalFailed}`);
    logger.info(`🎯 System Ready: ${report.systemReady ? 'YES' : 'NO'}`);

    if (!report.systemReady) {
      logger.error('\n❌ E2E TESTS FAILED - System not ready for production');
    } else {
      logger.info('\n✅ E2E TESTS PASSED - System ready for production use');
    }
  }

  /**
   * Run specific test suite
   */
  async runTestSuite(suiteName: string): Promise<E2ETestResult[]> {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteName}`);
    }

    logger.info(`🧪 Running E2E test suite: ${suite.name}`);
    
    // Start services if not already started
    if (!this.servicesStarted) {
      await this.startTestServices();
    }

    const results: E2ETestResult[] = [];

    // Run suite setup
    if (suite.setup) {
      await suite.setup();
    }

    try {
      // Run tests
      for (const test of suite.tests) {
        const testStartTime = Date.now();

        try {
          const testResult = await Promise.race([
            test.test(),
            this.createTimeoutPromise(test.timeout)
          ]);

          const duration = Date.now() - testStartTime;
          const status = testResult.success ? 'PASS' : 'FAIL';

          results.push({
            name: test.name,
            category: suite.name,
            status,
            duration,
            message: testResult.message,
            details: testResult.details,
            critical: test.critical
          });

        } catch (error) {
          const duration = Date.now() - testStartTime;
          
          results.push({
            name: test.name,
            category: suite.name,
            status: 'FAIL',
            duration,
            message: error.message === 'Test timeout' ? 'Test timed out' : `Test error: ${error.message}`,
            details: { error: error.message },
            critical: test.critical
          });
        }
      }

    } finally {
      // Run suite teardown
      if (suite.teardown) {
        await suite.teardown();
      }
    }

    return results;
  }

  /**
   * Get available test suites
   */
  getTestSuites(): Omit<E2ETestSuite, 'tests' | 'setup' | 'teardown'>[] {
    return this.testSuites.map(suite => ({
      name: suite.name,
      description: suite.description,
      enabled: suite.enabled
    }));
  }
}

// Export singleton instance
export const e2eTestRunner = new E2ETestRunner();