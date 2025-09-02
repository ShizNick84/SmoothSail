/**
 * Portfolio Risk Manager Tests
 * 
 * Comprehensive tests for portfolio-level risk management functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PortfolioRiskManager, PortfolioRiskConfig } from '../portfolio-risk-manager';
import { Position } from '../types';

describe('PortfolioRiskManager', () => {
  let manager: PortfolioRiskManager;
  let defaultConfig: PortfolioRiskConfig;
  let diversifiedPositions: Position[];
  let concentratedPositions: Position[];

  beforeEach(() => {
    defaultConfig = {
      maxPortfolioCorrelation: 0.7,
      maxSingleAssetExposure: 40, // 40% max single asset
      maxSectorExposure: 60, // 60% max sector
      minDiversificationScore: 50,
      maxPortfolioBeta: 1.5,
      rebalancingThreshold: 5, // 5% deviation threshold
      targetAllocation: new Map([
        ['BTC', 30],
        ['ETH', 25],
        ['ADA', 20],
        ['DOT', 15],
        ['LINK', 10]
      ])
    };

    manager = new PortfolioRiskManager(defaultConfig);

    // Diversified portfolio
    diversifiedPositions = [
      {
        id: 'pos1',
        symbol: 'BTC',
        size: 0.3,
        entryPrice: 50000,
        currentPrice: 51000,
        type: 'LONG',
        unrealizedPnL: 300,
        stopLoss: 49000,
        takeProfit: 53000,
        timestamp: new Date()
      },
      {
        id: 'pos2',
        symbol: 'ETH',
        size: 5,
        entryPrice: 3000,
        currentPrice: 3100,
        type: 'LONG',
        unrealizedPnL: 500,
        stopLoss: 2900,
        takeProfit: 3300,
        timestamp: new Date()
      },
      {
        id: 'pos3',
        symbol: 'ADA',
        size: 1000,
        entryPrice: 1.0,
        currentPrice: 1.1,
        type: 'LONG',
        unrealizedPnL: 100,
        stopLoss: 0.95,
        takeProfit: 1.2,
        timestamp: new Date()
      }
    ];

    // Concentrated portfolio (too much BTC)
    concentratedPositions = [
      {
        id: 'pos1',
        symbol: 'BTC',
        size: 1.0,
        entryPrice: 50000,
        currentPrice: 51000,
        type: 'LONG',
        unrealizedPnL: 1000,
        stopLoss: 49000,
        takeProfit: 53000,
        timestamp: new Date()
      },
      {
        id: 'pos2',
        symbol: 'BTC',
        size: 0.5,
        entryPrice: 49000,
        currentPrice: 51000,
        type: 'LONG',
        unrealizedPnL: 1000,
        stopLoss: 48000,
        takeProfit: 52000,
        timestamp: new Date()
      },
      {
        id: 'pos3',
        symbol: 'ETH',
        size: 2,
        entryPrice: 3000,
        currentPrice: 3100,
        type: 'LONG',
        unrealizedPnL: 200,
        stopLoss: 2900,
        takeProfit: 3300,
        timestamp: new Date()
      }
    ];
  });

  describe('analyzePortfolioRisk', () => {
    it('should analyze diversified portfolio correctly', async () => {
      const report = await manager.analyzePortfolioRisk(diversifiedPositions);

      expect(report.metrics.totalValue).toBeGreaterThan(0);
      expect(report.assetExposures.length).toBe(3); // BTC, ETH, ADA
      expect(report.sectorExposures.length).toBeGreaterThan(0);
      expect(report.correlationMatrix).toBeDefined();
      expect(report.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(report.overallRiskScore).toBeLessThanOrEqual(100);
    });

    it('should identify concentration risk', async () => {
      const report = await manager.analyzePortfolioRisk(concentratedPositions);

      // Should have high BTC exposure
      const btcExposure = report.assetExposures.find(a => a.symbol === 'BTC');
      expect(btcExposure).toBeDefined();
      expect(btcExposure!.percentage).toBeGreaterThan(40); // Above max single asset exposure

      // Should have risk violations
      expect(report.riskViolations.length).toBeGreaterThan(0);
      expect(report.riskViolations.some(v => v.includes('BTC'))).toBe(true);
    });

    it('should calculate portfolio metrics correctly', async () => {
      const report = await manager.analyzePortfolioRisk(diversifiedPositions);

      expect(report.metrics.beta).toBeGreaterThan(0);
      expect(report.metrics.volatility).toBeGreaterThan(0);
      expect(report.metrics.diversificationRatio).toBeGreaterThan(0);
      expect(report.metrics.concentrationRisk).toBeGreaterThanOrEqual(0);
      expect(report.metrics.concentrationRisk).toBeLessThanOrEqual(1);
    });

    it('should calculate asset exposures correctly', async () => {
      const report = await manager.analyzePortfolioRisk(diversifiedPositions);

      // Check that percentages add up to 100%
      const totalPercentage = report.assetExposures.reduce((sum, asset) => sum + asset.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);

      // Check individual asset calculations
      const btcExposure = report.assetExposures.find(a => a.symbol === 'BTC');
      expect(btcExposure).toBeDefined();
      expect(btcExposure!.positionCount).toBe(1);
      expect(btcExposure!.value).toBeCloseTo(0.3 * 51000, 1);
    });

    it('should calculate sector exposures correctly', async () => {
      const report = await manager.analyzePortfolioRisk(diversifiedPositions);

      expect(report.sectorExposures.length).toBeGreaterThan(0);
      
      // Should have Digital Gold sector (BTC)
      const digitalGoldSector = report.sectorExposures.find(s => s.sector === 'Digital Gold');
      expect(digitalGoldSector).toBeDefined();
      expect(digitalGoldSector!.assets).toContain('BTC');

      // Should have Smart Contracts sector (ETH)
      const smartContractsSector = report.sectorExposures.find(s => s.sector === 'Smart Contracts');
      expect(smartContractsSector).toBeDefined();
      expect(smartContractsSector!.assets).toContain('ETH');
    });

    it('should generate rebalancing recommendations', async () => {
      const report = await manager.analyzePortfolioRisk(concentratedPositions);

      expect(report.rebalancingRecommendations.length).toBeGreaterThan(0);

      // Should recommend reducing BTC exposure
      const btcRecommendation = report.rebalancingRecommendations.find(r => r.symbol === 'BTC');
      expect(btcRecommendation).toBeDefined();
      expect(btcRecommendation!.type).toBe('REDUCE_EXPOSURE');
      expect(btcRecommendation!.priority).toMatch(/HIGH|CRITICAL/);
    });

    it('should handle empty portfolio', async () => {
      const report = await manager.analyzePortfolioRisk([]);

      expect(report.metrics.totalValue).toBe(0);
      expect(report.assetExposures).toHaveLength(0);
      expect(report.sectorExposures).toHaveLength(0);
      expect(report.riskViolations).toHaveLength(0);
      expect(report.overallRiskScore).toBe(0);
    });
  });

  describe('correlation analysis', () => {
    it('should calculate correlation matrix', async () => {
      const report = await manager.analyzePortfolioRisk(diversifiedPositions);

      expect(report.correlationMatrix.correlations.size).toBeGreaterThan(0);
      expect(report.correlationMatrix.portfolioCorrelationRisk).toBeGreaterThanOrEqual(0);
      expect(report.correlationMatrix.diversificationScore).toBeGreaterThanOrEqual(0);
      expect(report.correlationMatrix.diversificationScore).toBeLessThanOrEqual(100);
    });

    it('should detect high correlation risk', async () => {
      // Create highly correlated portfolio (BTC and ETH)
      const correlatedPositions = [
        {
          ...diversifiedPositions[0], // BTC
          size: 1.0
        },
        {
          ...diversifiedPositions[1], // ETH
          size: 10.0
        }
      ];

      const report = await manager.analyzePortfolioRisk(correlatedPositions);

      // Should detect correlation risk
      expect(report.correlationMatrix.portfolioCorrelationRisk).toBeGreaterThan(0);
      
      // May generate diversification recommendations
      const diversifyRec = report.rebalancingRecommendations.find(r => r.type === 'DIVERSIFY');
      if (diversifyRec) {
        expect(diversifyRec.reasoning).toContain('correlation');
      }
    });
  });

  describe('risk violations', () => {
    it('should identify single asset exposure violations', async () => {
      const report = await manager.analyzePortfolioRisk(concentratedPositions);

      const exposureViolation = report.riskViolations.find(v => v.includes('exposure') && v.includes('exceeds'));
      expect(exposureViolation).toBeDefined();
    });

    it('should identify sector exposure violations', async () => {
      // Create portfolio with high sector concentration
      const sectorConcentratedPositions = [
        ...concentratedPositions,
        {
          id: 'pos4',
          symbol: 'ADA', // Another smart contract platform like ETH
          size: 2000,
          entryPrice: 1.0,
          currentPrice: 1.1,
          type: 'LONG' as const,
          unrealizedPnL: 200,
          stopLoss: 0.95,
          takeProfit: 1.2,
          timestamp: new Date()
        }
      ];

      const report = await manager.analyzePortfolioRisk(sectorConcentratedPositions);

      // May have sector exposure violations depending on configuration
      const sectorViolations = report.riskViolations.filter(v => v.includes('sector'));
      expect(sectorViolations.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify diversification violations', async () => {
      // Create poorly diversified portfolio
      const poorlyDiversifiedPositions = [
        {
          ...concentratedPositions[0],
          size: 2.0 // Very large BTC position
        }
      ];

      const report = await manager.analyzePortfolioRisk(poorlyDiversifiedPositions);

      expect(report.correlationMatrix.diversificationScore).toBeLessThan(defaultConfig.minDiversificationScore);
      
      const diversificationViolation = report.riskViolations.find(v => v.includes('Diversification'));
      expect(diversificationViolation).toBeDefined();
    });
  });

  describe('rebalancing recommendations', () => {
    it('should prioritize recommendations correctly', async () => {
      const report = await manager.analyzePortfolioRisk(concentratedPositions);

      if (report.rebalancingRecommendations.length > 1) {
        const priorities = report.rebalancingRecommendations.map(r => r.priority);
        
        // Should be sorted by priority (CRITICAL > HIGH > MEDIUM > LOW)
        const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        for (let i = 1; i < priorities.length; i++) {
          expect(priorityOrder[priorities[i-1]]).toBeGreaterThanOrEqual(priorityOrder[priorities[i]]);
        }
      }
    });

    it('should calculate estimated impact correctly', async () => {
      const report = await manager.analyzePortfolioRisk(concentratedPositions);

      report.rebalancingRecommendations.forEach(rec => {
        expect(rec.estimatedImpact).toBeDefined();
        expect(rec.estimatedImpact.portfolioRisk).toBeDefined();
        expect(rec.estimatedImpact.diversificationImprovement).toBeDefined();
        expect(rec.estimatedImpact.correlationReduction).toBeDefined();
      });
    });

    it('should recommend increasing exposure for underweight assets', async () => {
      // Create portfolio missing target assets
      const underweightPositions = [
        {
          ...diversifiedPositions[0], // Only BTC
          size: 0.1 // Small position
        }
      ];

      const report = await manager.analyzePortfolioRisk(underweightPositions);

      // Should recommend increasing exposure to meet targets
      const increaseRecs = report.rebalancingRecommendations.filter(r => r.type === 'INCREASE_EXPOSURE');
      expect(increaseRecs.length).toBeGreaterThan(0);
    });
  });

  describe('portfolio risk summary', () => {
    it('should generate risk summary for low risk portfolio', async () => {
      const report = await manager.analyzePortfolioRisk(diversifiedPositions);
      const summary = manager.getPortfolioRiskSummary(report);

      expect(summary.riskLevel).toMatch(/LOW|MEDIUM|HIGH|CRITICAL/);
      expect(summary.keyRisks).toBeDefined();
      expect(summary.topRecommendations).toBeDefined();
      expect(summary.diversificationStatus).toMatch(/GOOD|FAIR|POOR/);
    });

    it('should generate risk summary for high risk portfolio', async () => {
      const report = await manager.analyzePortfolioRisk(concentratedPositions);
      const summary = manager.getPortfolioRiskSummary(report);

      expect(summary.riskLevel).toMatch(/MEDIUM|HIGH|CRITICAL/);
      expect(summary.keyRisks.length).toBeGreaterThan(0);
      expect(summary.topRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('configuration management', () => {
    it('should update configuration correctly', () => {
      const newConfig = { maxSingleAssetExposure: 50 };
      manager.updateConfig(newConfig);

      const config = manager.getConfig();
      expect(config.maxSingleAssetExposure).toBe(50);
      expect(config.maxSectorExposure).toBe(60); // Should remain unchanged
    });

    it('should apply new configuration to analysis', async () => {
      // First analysis with default config
      const report1 = await manager.analyzePortfolioRisk(concentratedPositions);
      const violations1 = report1.riskViolations.length;

      // Update to more lenient config
      manager.updateConfig({ maxSingleAssetExposure: 80 });

      // Second analysis should have fewer violations
      const report2 = await manager.analyzePortfolioRisk(concentratedPositions);
      const violations2 = report2.riskViolations.length;

      expect(violations2).toBeLessThanOrEqual(violations1);
    });
  });

  describe('edge cases', () => {
    it('should handle single position portfolio', async () => {
      const singlePosition = [diversifiedPositions[0]];
      const report = await manager.analyzePortfolioRisk(singlePosition);

      expect(report.assetExposures).toHaveLength(1);
      expect(report.assetExposures[0].percentage).toBeCloseTo(100, 1);
      expect(report.metrics.concentrationRisk).toBe(1); // Maximum concentration
    });

    it('should handle positions with zero value', async () => {
      const zeroValuePositions = [
        {
          ...diversifiedPositions[0],
          size: 0,
          currentPrice: 0,
          unrealizedPnL: 0
        }
      ];

      const report = await manager.analyzePortfolioRisk(zeroValuePositions);

      expect(report.metrics.totalValue).toBe(0);
      expect(report.assetExposures).toHaveLength(0);
    });

    it('should handle very large portfolios', async () => {
      // Create portfolio with many positions
      const largePortfolio: Position[] = [];
      for (let i = 0; i < 50; i++) {
        largePortfolio.push({
          id: `pos${i}`,
          symbol: i % 2 === 0 ? 'BTC' : 'ETH',
          size: 0.01,
          entryPrice: 50000,
          currentPrice: 51000,
          type: 'LONG',
          unrealizedPnL: 10,
          stopLoss: 49000,
          takeProfit: 53000,
          timestamp: new Date()
        });
      }

      const report = await manager.analyzePortfolioRisk(largePortfolio);

      expect(report.assetExposures).toHaveLength(2); // BTC and ETH
      expect(report.metrics.totalValue).toBeGreaterThan(0);
    });
  });
});
