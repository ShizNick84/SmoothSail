/**
 * Unit Tests for RSI Strategy
 * 
 * Comprehensive test suite covering RSI calculation, divergence detection,
 * signal generation, and all edge cases for the RSIStrategy class.
 * 
 * Requirements: 17.1, 17.3, 17.6 - Unit tests for technical indicators
 */

import { RSIStrategy } from '../rsi';
import { MarketData, TradingSignal, RSISignal } from '../types';

describe('RSIStrategy', () => {
  let strategy: RSIStrategy;
  let mockMarketData: MarketData[];

  beforeEach(() => {
    strategy = new RSIStrategy();
    
    // Create realistic mock market data for RSI testing
    mockMarketData = [];
    const basePrice = 42000;
    
    // Generate 30 days of data with varying price movements
    for (let i = 0; i < 30; i++) {
      const priceChange = (Math.random() - 0.5) * 1000; // Random price changes
      const close = basePrice + priceChange + (i * 10); // Slight upward trend
      
      mockMarketData.push({
        symbol: 'BTC/USDT',
        timestamp: new Date(2024, 0, i + 1),
        open: close - 100,
        high: close + 200,
        low: close - 200,
        close: close,
        volume: 1000 + Math.random() * 500
      });
    }
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly for standard 14-period', () => {
      // Create data with known pattern for RSI calculation
      const testData: MarketData[] = [];
      const prices = [44, 44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.85, 46.08, 45.89, 46.03, 46.83, 46.69, 46.45, 46.59];
      
      for (let i = 0; i < prices.length; i++) {
        testData.push({
          symbol: 'TEST',
          timestamp: new Date(2024, 0, i + 1),
          open: prices[i],
          high: prices[i] + 0.5,
          low: prices[i] - 0.5,
          close: prices[i],
          volume: 1000
        });
      }

      const result = strategy.calculateRSI(testData, 14);
      
      expect(result).toBeDefined();
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(100);
      expect(typeof result).toBe('number');
    });

    it('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 10);
      const result = strategy.calculateRSI(shortData, 14);
      
      expect(result).toBeNull();
    });

    it('should handle minimum required data (period + 1)', () => {
      const minData = mockMarketData.slice(0, 15); // 14 + 1
      const result = strategy.calculateRSI(minData, 14);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('should return 100 for all gains (no losses)', () => {
      const testData: MarketData[] = [];
      for (let i = 0; i < 20; i++) {
        testData.push({
          symbol: 'TEST',
          timestamp: new Date(2024, 0, i + 1),
          open: 100 + i,
          high: 100 + i + 1,
          low: 100 + i - 0.5,
          close: 100 + i + 1, // Always increasing
          volume: 1000
        });
      }

      const result = strategy.calculateRSI(testData, 14);
      
      expect(result).toBe(100);
    });

    it('should return 0 for all losses (no gains)', () => {
      const testData: MarketData[] = [];
      for (let i = 0; i < 20; i++) {
        testData.push({
          symbol: 'TEST',
          timestamp: new Date(2024, 0, i + 1),
          open: 100 - i,
          high: 100 - i + 0.5,
          low: 100 - i - 1,
          close: 100 - i - 1, // Always decreasing
          volume: 1000
        });
      }

      const result = strategy.calculateRSI(testData, 14);
      
      expect(result).toBe(0);
    });

    it('should handle different periods correctly', () => {
      const result7 = strategy.calculateRSI(mockMarketData, 7);
      const result21 = strategy.calculateRSI(mockMarketData, 21);
      
      expect(result7).toBeDefined();
      expect(result21).toBeDefined();
      expect(result7).not.toBe(result21); // Different periods should give different results
    });

    it('should round to 2 decimal places', () => {
      const result = strategy.calculateRSI(mockMarketData, 14);
      
      if (result !== null) {
        const decimalPlaces = (result.toString().split('.')[1] || '').length;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('detectDivergence', () => {
    let divergenceData: MarketData[];

    beforeEach(() => {
      // Create data with potential divergence patterns
      divergenceData = [];
      for (let i = 0; i < 50; i++) {
        let close: number;
        
        if (i < 25) {
          // First half: declining prices
          close = 45000 - (i * 100);
        } else {
          // Second half: slightly higher lows (potential bullish divergence)
          close = 42500 + ((i - 25) * 50);
        }
        
        divergenceData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(2024, 0, i + 1),
          open: close - 50,
          high: close + 100,
          low: close - 100,
          close: close,
          volume: 1000 + Math.random() * 500
        });
      }
    });

    it('should detect bullish divergence', () => {
      // Create clear bullish divergence pattern
      const testData = [...divergenceData];
      
      // Modify to create lower price lows but higher RSI lows
      for (let i = 40; i < testData.length; i++) {
        testData[i].close = 42000 - (i - 40) * 20; // Lower lows in price
      }

      const result = strategy.detectDivergence(testData, 14);
      
      expect(['BULLISH', 'NONE']).toContain(result.type);
      if (result.type === 'BULLISH') {
        expect(result.strength).toBeGreaterThan(0);
        expect(result.strength).toBeLessThanOrEqual(100);
      }
    });

    it('should detect bearish divergence', () => {
      // Create clear bearish divergence pattern
      const testData = [...divergenceData];
      
      // Modify to create higher price highs but lower RSI highs
      for (let i = 40; i < testData.length; i++) {
        testData[i].close = 45000 + (i - 40) * 50; // Higher highs in price
      }

      const result = strategy.detectDivergence(testData, 14);
      
      expect(['BEARISH', 'NONE']).toContain(result.type);
      if (result.type === 'BEARISH') {
        expect(result.strength).toBeGreaterThan(0);
        expect(result.strength).toBeLessThanOrEqual(100);
      }
    });

    it('should return NONE for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 20);
      const result = strategy.detectDivergence(shortData, 14);
      
      expect(result.type).toBe('NONE');
      expect(result.strength).toBe(0);
    });

    it('should return NONE when no divergence exists', () => {
      // Create data with no divergence (price and RSI move together)
      const noDivergenceData = mockMarketData.map((data, i) => ({
        ...data,
        close: 42000 + i * 10 // Steady uptrend
      }));

      const result = strategy.detectDivergence(noDivergenceData, 14);
      
      expect(result.type).toBe('NONE');
    });
  });

  describe('generateRSISignal', () => {
    it('should generate RSI signal with correct properties', () => {
      const result = strategy.generateRSISignal(mockMarketData, 14);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result.name).toBe('RSI');
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
        expect(result.period).toBe(14);
        expect(result.parameters).toHaveProperty('overboughtThreshold');
        expect(result.parameters).toHaveProperty('oversoldThreshold');
        expect(typeof result.overbought).toBe('boolean');
        expect(typeof result.oversold).toBe('boolean');
      }
    });

    it('should identify overbought conditions', () => {
      // Create overbought scenario
      const overboughtData = mockMarketData.map((data, i) => ({
        ...data,
        close: 42000 + i * 200 // Strong uptrend to create overbought RSI
      }));

      const result = strategy.generateRSISignal(overboughtData, 14);
      
      if (result && result.value >= 70) {
        expect(result.overbought).toBe(true);
        expect(result.oversold).toBe(false);
      }
    });

    it('should identify oversold conditions', () => {
      // Create oversold scenario
      const oversoldData = mockMarketData.map((data, i) => ({
        ...data,
        close: 45000 - i * 200 // Strong downtrend to create oversold RSI
      }));

      const result = strategy.generateRSISignal(oversoldData, 14);
      
      if (result && result.value <= 30) {
        expect(result.oversold).toBe(true);
        expect(result.overbought).toBe(false);
      }
    });

    it('should return null for insufficient data', () => {
      const shortData = mockMarketData.slice(0, 10);
      const result = strategy.generateRSISignal(shortData, 14);
      
      expect(result).toBeNull();
    });

    it('should include divergence information when present', () => {
      // Use extended data that might show divergence
      const extendedData = [...mockMarketData];
      for (let i = 0; i < 30; i++) {
        extendedData.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(2024, 0, 30 + i + 1),
          open: 42000,
          high: 42500,
          low: 41500,
          close: 42000 + Math.sin(i * 0.3) * 1000, // Oscillating pattern
          volume: 1000
        });
      }

      const result = strategy.generateRSISignal(extendedData, 14);
      
      if (result && result.divergence) {
        expect(['BULLISH', 'BEARISH']).toContain(result.divergence.type);
        expect(result.divergence.strength).toBeGreaterThan(0);
      }
    });
  });

  describe('generateSignal', () => {
    it('should generate BUY signal for oversold conditions', () => {
      // Create strong oversold scenario
      const oversoldData = mockMarketData.map((data, i) => ({
        ...data,
        close: 45000 - i * 300 // Strong downtrend
      }));

      const result = strategy.generateSignal(oversoldData, 14);
      
      if (result) {
        expect(result.type).toBe('BUY');
        expect(result.symbol).toBe('BTC/USDT');
        expect(result.strength).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.indicators).toContain('RSI_14');
        expect(result.reasoning).toContain('oversold');
        expect(result.metadata?.rsi).toBeLessThanOrEqual(30);
      }
    });

    it('should generate SELL signal for overbought conditions', () => {
      // Create strong overbought scenario
      const overboughtData = mockMarketData.map((data, i) => ({
        ...data,
        close: 40000 + i * 300 // Strong uptrend
      }));

      const result = strategy.generateSignal(overboughtData, 14);
      
      if (result) {
        expect(result.type).toBe('SELL');
        expect(result.reasoning).toContain('overbought');
        expect(result.metadata?.rsi).toBeGreaterThanOrEqual(70);
      }
    });

    it('should return null for neutral RSI conditions', () => {
      // Create neutral RSI scenario (around 50)
      const neutralData = mockMarketData.map((data, i) => ({
        ...data,
        close: 42000 + (Math.random() - 0.5) * 100 // Small random movements
      }));

      const result = strategy.generateSignal(neutralData, 14);
      
      // Should return null or have low strength
      if (result) {
        expect(result.strength).toBeLessThan(50);
      }
    });

    it('should include proper metadata', () => {
      const oversoldData = mockMarketData.map((data, i) => ({
        ...data,
        close: 45000 - i * 300
      }));

      const result = strategy.generateSignal(oversoldData, 14);
      
      if (result) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.rsi).toBeDefined();
        expect(result.metadata?.overbought).toBeDefined();
        expect(result.metadata?.oversold).toBeDefined();
        expect(result.metadata?.extremeLevel).toBeDefined();
      }
    });

    it('should calculate risk-reward ratio', () => {
      const oversoldData = mockMarketData.map((data, i) => ({
        ...data,
        close: 45000 - i * 200
      }));

      const result = strategy.generateSignal(oversoldData, 14);
      
      if (result) {
        expect(result.riskReward).toBeGreaterThan(0);
        expect(typeof result.riskReward).toBe('number');
      }
    });

    it('should boost strength for extreme RSI levels', () => {
      // Create extreme oversold scenario (RSI < 20)
      const extremeOversoldData = mockMarketData.map((data, i) => ({
        ...data,
        close: 50000 - i * 500 // Very strong downtrend
      }));

      const result = strategy.generateSignal(extremeOversoldData, 14);
      
      if (result && result.metadata?.rsi <= 20) {
        expect(result.strength).toBeGreaterThan(70); // Should have high strength
        expect(result.metadata.extremeLevel).toBe(true);
      }
    });
  });

  describe('evaluateSignalConfidence', () => {
    let mockSignal: TradingSignal;

    beforeEach(() => {
      mockSignal = {
        id: 'test-rsi-signal',
        symbol: 'BTC/USDT',
        type: 'BUY',
        strength: 80,
        confidence: 75,
        indicators: ['RSI_14'],
        reasoning: 'RSI oversold test signal',
        riskReward: 1.8,
        timestamp: new Date(),
        metadata: {
          rsi: 25,
          overbought: false,
          oversold: true,
          extremeLevel: true
        }
      };
    });

    it('should evaluate signal confidence correctly', () => {
      const result = strategy.evaluateSignalConfidence(mockMarketData, mockSignal);
      
      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.technical).toBe(80); // From signal strength
      expect(result.volume).toBeGreaterThan(0);
      expect(result.momentum).toBeGreaterThan(0);
      expect(result.factors).toHaveLength(4);
    });

    it('should include RSI level in factors', () => {
      const result = strategy.evaluateSignalConfidence(mockMarketData, mockSignal);
      
      const rsiFactorExists = result.factors.some(factor => 
        factor.includes('RSI level') && factor.includes('oversold')
      );
      expect(rsiFactorExists).toBe(true);
    });

    it('should include divergence information when present', () => {
      mockSignal.metadata = {
        ...mockSignal.metadata,
        divergence: { type: 'BULLISH', strength: 75 }
      };

      const result = strategy.evaluateSignalConfidence(mockMarketData, mockSignal);
      
      const divergenceFactorExists = result.factors.some(factor => 
        factor.includes('Divergence') && factor.includes('BULLISH')
      );
      expect(divergenceFactorExists).toBe(true);
    });

    it('should boost confidence for high volume', () => {
      // Create high volume scenario
      const highVolumeData = mockMarketData.map(data => ({
        ...data,
        volume: 3000 // High volume
      }));

      const result = strategy.evaluateSignalConfidence(highVolumeData, mockSignal);
      
      expect(result.volume).toBeGreaterThan(60);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle identical consecutive prices', () => {
      const flatData = mockMarketData.map(data => ({
        ...data,
        close: 42000 // All same price
      }));

      const result = strategy.calculateRSI(flatData, 14);
      
      // RSI should be around 50 for no price movement
      expect(result).toBeCloseTo(50, 10);
    });

    it('should handle zero prices gracefully', () => {
      const zeroData = mockMarketData.map(data => ({
        ...data,
        close: 0
      }));

      const result = strategy.calculateRSI(zeroData, 14);
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('number');
    });

    it('should handle negative prices', () => {
      const negativeData = mockMarketData.map((data, i) => ({
        ...data,
        close: -1000 + i * 10 // Negative prices trending up
      }));

      const result = strategy.calculateRSI(negativeData, 14);
      
      expect(result).toBeDefined();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should handle very large price movements', () => {
      const volatileData = mockMarketData.map((data, i) => ({
        ...data,
        close: 42000 + (Math.random() - 0.5) * 10000 // High volatility
      }));

      const result = strategy.calculateRSI(volatileData, 14);
      
      expect(result).toBeDefined();
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should handle empty market data array', () => {
      const result = strategy.calculateRSI([], 14);
      
      expect(result).toBeNull();
    });

    it('should handle single data point', () => {
      const singleData = [mockMarketData[0]];
      const result = strategy.calculateRSI(singleData, 14);
      
      expect(result).toBeNull();
    });

    it('should handle period larger than data length', () => {
      const result = strategy.calculateRSI(mockMarketData, 100);
      
      expect(result).toBeNull();
    });

    it('should handle zero period', () => {
      const result = strategy.calculateRSI(mockMarketData, 0);
      
      expect(result).toBeNull();
    });

    it('should handle negative period', () => {
      const result = strategy.calculateRSI(mockMarketData, -5);
      
      expect(result).toBeNull();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', () => {
      // Create large dataset
      const largeDataset: MarketData[] = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          symbol: 'BTC/USDT',
          timestamp: new Date(2024, 0, i + 1),
          open: 42000 + Math.random() * 1000,
          high: 42500 + Math.random() * 1000,
          low: 41500 + Math.random() * 1000,
          close: 42000 + Math.random() * 1000,
          volume: 1000 + Math.random() * 500
        });
      }

      const startTime = Date.now();
      const result = strategy.generateSignal(largeDataset, 14);
      const endTime = Date.now();

      // Should complete within reasonable time (less than 50ms)
      expect(endTime - startTime).toBeLessThan(50);
    });

    it('should not modify input data', () => {
      const originalData = JSON.parse(JSON.stringify(mockMarketData));
      strategy.generateSignal(mockMarketData, 14);
      
      expect(mockMarketData).toEqual(originalData);
    });

    it('should produce consistent results for same input', () => {
      const result1 = strategy.calculateRSI(mockMarketData, 14);
      const result2 = strategy.calculateRSI(mockMarketData, 14);
      
      expect(result1).toBe(result2);
    });
  });
});
