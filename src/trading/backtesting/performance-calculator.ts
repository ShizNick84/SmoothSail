/**
 * =============================================================================
 * PERFORMANCE CALCULATOR - COMPREHENSIVE TRADING METRICS
 * =============================================================================
 * 
 * This module calculates comprehensive performance metrics for backtesting
 * results, including Sharpe ratio, Sortino ratio, maximum drawdown, and
 * other advanced risk-adjusted performance measures.
 * 
 * METRICS CALCULATED:
 * - Return metrics: Total return, annualized return, CAGR
 * - Risk metrics: Sharpe ratio, Sortino ratio, Calmar ratio
 * - Drawdown metrics: Maximum drawdown, average drawdown, recovery factor
 * - Trade metrics: Win rate, profit factor, payoff ratio
 * - Advanced metrics: VaR, CVaR, Beta, Alpha, Information ratio
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import { logger } from '@/core/logging/logger';
import { 
  BacktestResult, 
  BacktestTrade, 
  BacktestPortfolio,
  EquityPoint,
  DrawdownPoint,
  MonthlyReturn,
  BenchmarkComparison
} from './types';

/**
 * Risk-free rate for Sharpe ratio calculation (US Treasury 3-month rate)
 */
const RISK_FREE_RATE = 0.05; // 5% annual

/**
 * Trading days per year for annualization
 */
const TRADING_DAYS_PER_YEAR = 365; // Crypto markets trade 24/7

/**
 * Performance Calculator for comprehensive backtesting metrics
 */
export class PerformanceCalculator {
  
  /**
   * Calculate comprehensive performance metrics
   */
  public static calculatePerformanceMetrics(
    trades: BacktestTrade[],
    portfolioHistory: BacktestPortfolio[],
    initialBalance: number,
    benchmarkReturns?: number[]
  ): BacktestResult['performance'] {
    logger.info('📊 Calculating comprehensive performance metrics...');
    
    if (portfolioHistory.length === 0) {
      throw new Error('Portfolio history is required for performance calculation');
    }
    
    const finalPortfolio = portfolioHistory[portfolioHistory.length - 1];
    const totalReturn = finalPortfolio.equity - initialBalance;
    const totalReturnPercentage = (totalReturn / initialBalance) * 100;
    
    // Calculate time period
    const startDate = portfolioHistory[0].timestamp;
    const endDate = finalPortfolio.timestamp;
    const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const durationYears = durationDays / TRADING_DAYS_PER_YEAR;
    
    // Calculate returns array for advanced metrics
    const returns = this.calculateReturns(portfolioHistory);
    const negativeReturns = returns.filter(r => r < 0);
    
    // Calculate annualized return (CAGR)
    const annualizedReturn = durationYears > 0 
      ? Math.pow(finalPortfolio.equity / initialBalance, 1 / durationYears) - 1
      : 0;
    
    // Calculate Sharpe ratio
    const sharpeRatio = this.calculateSharpeRatio(returns, RISK_FREE_RATE);
    
    // Calculate Sortino ratio (using downside deviation)
    const sortinoRatio = this.calculateSortinoRatio(returns, RISK_FREE_RATE);
    
    // Calculate Calmar ratio
    const maxDrawdownPercent = Math.max(...portfolioHistory.map(p => p.maxDrawdownPercentage));
    const calmarRatio = maxDrawdownPercent > 0 ? (annualizedReturn * 100) / maxDrawdownPercent : 0;
    
    // Calculate recovery factor
    const recoveryFactor = totalReturnPercentage / maxDrawdownPercent;
    
    // Calculate profit factor
    const profitFactor = this.calculateProfitFactor(trades);
    
    // Calculate payoff ratio
    const payoffRatio = this.calculatePayoffRatio(trades);
    
    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(trades);
    
    // Calculate volatility (annualized)
    const volatility = this.calculateVolatility(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    
    // Calculate downside deviation
    const downsideDeviation = this.calculateDownsideDeviation(returns, RISK_FREE_RATE / TRADING_DAYS_PER_YEAR);
    
    // Calculate VaR and CVaR
    const var95 = this.calculateVaR(returns, 0.95);
    const cvar95 = this.calculateCVaR(returns, 0.95);
    
    // Calculate Beta and Alpha (if benchmark provided)
    let beta = 0;
    let alpha = 0;
    let informationRatio = 0;
    
    if (benchmarkReturns && benchmarkReturns.length === returns.length) {
      beta = this.calculateBeta(returns, benchmarkReturns);
      alpha = this.calculateAlpha(returns, benchmarkReturns, RISK_FREE_RATE / TRADING_DAYS_PER_YEAR, beta);
      informationRatio = this.calculateInformationRatio(returns, benchmarkReturns);
    }
    
    const performance = {
      totalReturn,
      totalReturnPercentage,
      annualizedReturn: annualizedReturn * 100,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      maxDrawdown: Math.max(...portfolioHistory.map(p => p.maxDrawdown)),
      maxDrawdownPercentage: maxDrawdownPercent,
      averageDrawdown: this.calculateAverageDrawdown(portfolioHistory),
      recoveryFactor,
      profitFactor,
      payoffRatio,
      expectedValue,
    };
    
    logger.info('✅ Performance metrics calculated successfully');
    logger.info(`📈 Total Return: ${totalReturnPercentage.toFixed(2)}%`);
    logger.info(`📊 Sharpe Ratio: ${sharpeRatio.toFixed(2)}`);
    logger.info(`📉 Max Drawdown: ${maxDrawdownPercent.toFixed(2)}%`);
    
    return performance;
  }

  /**
   * Calculate risk metrics
   */
  public static calculateRiskMetrics(
    returns: number[],
    benchmarkReturns?: number[]
  ): BacktestResult['risk'] {
    logger.info('⚠️ Calculating risk metrics...');
    
    const volatility = this.calculateVolatility(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    const downsideDeviation = this.calculateDownsideDeviation(returns, RISK_FREE_RATE / TRADING_DAYS_PER_YEAR);
    const var95 = this.calculateVaR(returns, 0.95);
    const cvar95 = this.calculateCVaR(returns, 0.95);
    
    let beta = 0;
    let alpha = 0;
    let informationRatio = 0;
    
    if (benchmarkReturns && benchmarkReturns.length === returns.length) {
      beta = this.calculateBeta(returns, benchmarkReturns);
      alpha = this.calculateAlpha(returns, benchmarkReturns, RISK_FREE_RATE / TRADING_DAYS_PER_YEAR, beta);
      informationRatio = this.calculateInformationRatio(returns, benchmarkReturns);
    }
    
    return {
      volatility: volatility * 100,
      downside_deviation: downsideDeviation * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100,
      var95: var95 * 100,
      cvar95: cvar95 * 100,
      beta,
      alpha: alpha * 100,
      informationRatio,
    };
  }

  /**
   * Calculate trade statistics
   */
  public static calculateTradeStatistics(trades: BacktestTrade[]): BacktestResult['trades'] {
    logger.info('📋 Calculating trade statistics...');
    
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    const winningTrades = closedTrades.filter(t => t.pnl! > 0);
    const losingTrades = closedTrades.filter(t => t.pnl! < 0);
    
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0;
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl!, 0) / winningTrades.length 
      : 0;
    const averageLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl!, 0) / losingTrades.length)
      : 0;
    
    const largestWin = winningTrades.length > 0 
      ? Math.max(...winningTrades.map(t => t.pnl!)) 
      : 0;
    const largestLoss = losingTrades.length > 0 
      ? Math.abs(Math.min(...losingTrades.map(t => t.pnl!)))
      : 0;
    
    // Calculate consecutive wins/losses
    const { maxConsecutiveWins, maxConsecutiveLosses } = this.calculateConsecutiveWinsLosses(closedTrades);
    
    return {
      total: closedTrades.length,
      winning: winningTrades.length,
      losing: losingTrades.length,
      winRate,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      consecutiveWins: 0, // Current streak (would be calculated in real-time)
      consecutiveLosses: 0, // Current streak (would be calculated in real-time)
      maxConsecutiveWins,
      maxConsecutiveLosses,
    };
  }

  /**
   * Generate equity curve data
   */
  public static generateEquityCurve(portfolioHistory: BacktestPortfolio[]): EquityPoint[] {
    return portfolioHistory.map(portfolio => ({
      timestamp: portfolio.timestamp,
      equity: portfolio.equity,
      balance: portfolio.balance,
      unrealizedPnL: portfolio.unrealizedPnL,
      drawdown: portfolio.drawdown,
      drawdownPercentage: portfolio.drawdownPercentage,
    }));
  }

  /**
   * Generate drawdown curve data
   */
  public static generateDrawdownCurve(portfolioHistory: BacktestPortfolio[]): DrawdownPoint[] {
    const drawdownCurve: DrawdownPoint[] = [];
    let inDrawdown = false;
    let drawdownStart: Date | null = null;
    
    for (let i = 0; i < portfolioHistory.length; i++) {
      const portfolio = portfolioHistory[i];
      const isUnderwater = portfolio.drawdownPercentage > 0;
      
      if (!inDrawdown && isUnderwater) {
        inDrawdown = true;
        drawdownStart = portfolio.timestamp;
      } else if (inDrawdown && !isUnderwater) {
        inDrawdown = false;
        // Calculate recovery time for previous drawdown points
        if (drawdownStart) {
          const recoveryTime = portfolio.timestamp.getTime() - drawdownStart.getTime();
          for (let j = drawdownCurve.length - 1; j >= 0; j--) {
            if (drawdownCurve[j].timestamp >= drawdownStart) {
              drawdownCurve[j].recoveryTime = recoveryTime;
            } else {
              break;
            }
          }
        }
        drawdownStart = null;
      }
      
      drawdownCurve.push({
        timestamp: portfolio.timestamp,
        drawdown: portfolio.drawdown,
        drawdownPercentage: portfolio.drawdownPercentage,
        underwater: isUnderwater,
      });
    }
    
    return drawdownCurve;
  }

  /**
   * Generate monthly returns breakdown
   */
  public static generateMonthlyReturns(
    portfolioHistory: BacktestPortfolio[],
    trades: BacktestTrade[]
  ): MonthlyReturn[] {
    const monthlyReturns: MonthlyReturn[] = [];
    const monthlyData = new Map<string, {
      startEquity: number;
      endEquity: number;
      trades: BacktestTrade[];
      maxDrawdown: number;
    }>();
    
    // Group data by month
    for (const portfolio of portfolioHistory) {
      const monthKey = `${portfolio.timestamp.getFullYear()}-${portfolio.timestamp.getMonth()}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          startEquity: portfolio.equity,
          endEquity: portfolio.equity,
          trades: [],
          maxDrawdown: 0,
        });
      } else {
        const data = monthlyData.get(monthKey)!;
        data.endEquity = portfolio.equity;
        data.maxDrawdown = Math.max(data.maxDrawdown, portfolio.drawdownPercentage);
      }
    }
    
    // Group trades by month
    for (const trade of trades) {
      if (trade.exitTime) {
        const monthKey = `${trade.exitTime.getFullYear()}-${trade.exitTime.getMonth()}`;
        const data = monthlyData.get(monthKey);
        if (data) {
          data.trades.push(trade);
        }
      }
    }
    
    // Calculate monthly returns
    for (const [monthKey, data] of monthlyData) {
      const [year, month] = monthKey.split('-').map(Number);
      const returnAmount = data.endEquity - data.startEquity;
      const returnPercentage = data.startEquity > 0 ? (returnAmount / data.startEquity) * 100 : 0;
      
      const winningTrades = data.trades.filter(t => t.pnl && t.pnl > 0);
      const winRate = data.trades.length > 0 ? (winningTrades.length / data.trades.length) * 100 : 0;
      
      monthlyReturns.push({
        year,
        month,
        return: returnAmount,
        returnPercentage,
        trades: data.trades.length,
        winRate,
        maxDrawdown: data.maxDrawdown,
      });
    }
    
    return monthlyReturns.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  /**
   * Calculate returns array from portfolio history
   */
  private static calculateReturns(portfolioHistory: BacktestPortfolio[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < portfolioHistory.length; i++) {
      const prevEquity = portfolioHistory[i - 1].equity;
      const currEquity = portfolioHistory[i].equity;
      
      if (prevEquity > 0) {
        const returnRate = (currEquity - prevEquity) / prevEquity;
        returns.push(returnRate);
      }
    }
    
    return returns;
  }

  /**
   * Calculate Sharpe ratio
   */
  private static calculateSharpeRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const annualizedReturn = avgReturn * TRADING_DAYS_PER_YEAR;
    const volatility = this.calculateVolatility(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    
    return volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;
  }

  /**
   * Calculate Sortino ratio
   */
  private static calculateSortinoRatio(returns: number[], riskFreeRate: number): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const annualizedReturn = avgReturn * TRADING_DAYS_PER_YEAR;
    const downsideDeviation = this.calculateDownsideDeviation(returns, riskFreeRate / TRADING_DAYS_PER_YEAR);
    const annualizedDownsideDeviation = downsideDeviation * Math.sqrt(TRADING_DAYS_PER_YEAR);
    
    return annualizedDownsideDeviation > 0 ? (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation : 0;
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private static calculateVolatility(returns: number[]): number {
    if (returns.length <= 1) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
    
    return Math.sqrt(variance);
  }

  /**
   * Calculate downside deviation
   */
  private static calculateDownsideDeviation(returns: number[], targetReturn: number): number {
    const downsideReturns = returns.filter(r => r < targetReturn);
    
    if (downsideReturns.length === 0) return 0;
    
    const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r - targetReturn, 2), 0) / downsideReturns.length;
    
    return Math.sqrt(downsideVariance);
  }

  /**
   * Calculate Value at Risk (VaR)
   */
  private static calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    
    return sortedReturns[index] || 0;
  }

  /**
   * Calculate Conditional Value at Risk (CVaR)
   */
  private static calculateCVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidence) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex + 1);
    
    if (tailReturns.length === 0) return 0;
    
    return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
  }

  /**
   * Calculate Beta (correlation with benchmark)
   */
  private static calculateBeta(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length || returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const avgBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    
    let covariance = 0;
    let benchmarkVariance = 0;
    
    for (let i = 0; i < returns.length; i++) {
      const returnDiff = returns[i] - avgReturn;
      const benchmarkDiff = benchmarkReturns[i] - avgBenchmark;
      
      covariance += returnDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }
    
    covariance /= returns.length - 1;
    benchmarkVariance /= returns.length - 1;
    
    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 0;
  }

  /**
   * Calculate Alpha (excess return over benchmark)
   */
  private static calculateAlpha(
    returns: number[], 
    benchmarkReturns: number[], 
    riskFreeRate: number, 
    beta: number
  ): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const avgBenchmark = benchmarkReturns.reduce((sum, r) => sum + r, 0) / benchmarkReturns.length;
    
    return avgReturn - (riskFreeRate + beta * (avgBenchmark - riskFreeRate));
  }

  /**
   * Calculate Information Ratio
   */
  private static calculateInformationRatio(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length !== benchmarkReturns.length || returns.length === 0) return 0;
    
    const excessReturns = returns.map((r, i) => r - benchmarkReturns[i]);
    const avgExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    const trackingError = this.calculateVolatility(excessReturns);
    
    return trackingError > 0 ? avgExcessReturn / trackingError : 0;
  }

  /**
   * Calculate profit factor
   */
  private static calculateProfitFactor(trades: BacktestTrade[]): number {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    
    const grossProfit = closedTrades
      .filter(t => t.pnl! > 0)
      .reduce((sum, t) => sum + t.pnl!, 0);
    
    const grossLoss = Math.abs(closedTrades
      .filter(t => t.pnl! < 0)
      .reduce((sum, t) => sum + t.pnl!, 0));
    
    return grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  }

  /**
   * Calculate payoff ratio (average win / average loss)
   */
  private static calculatePayoffRatio(trades: BacktestTrade[]): number {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    const winningTrades = closedTrades.filter(t => t.pnl! > 0);
    const losingTrades = closedTrades.filter(t => t.pnl! < 0);
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + t.pnl!, 0) / winningTrades.length 
      : 0;
    
    const averageLoss = losingTrades.length > 0 
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl!, 0) / losingTrades.length)
      : 0;
    
    return averageLoss > 0 ? averageWin / averageLoss : averageWin > 0 ? Infinity : 0;
  }

  /**
   * Calculate expected value per trade
   */
  private static calculateExpectedValue(trades: BacktestTrade[]): number {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    
    if (closedTrades.length === 0) return 0;
    
    return closedTrades.reduce((sum, t) => sum + t.pnl!, 0) / closedTrades.length;
  }

  /**
   * Calculate average drawdown
   */
  private static calculateAverageDrawdown(portfolioHistory: BacktestPortfolio[]): number {
    const drawdowns = portfolioHistory.map(p => p.drawdownPercentage).filter(d => d > 0);
    
    if (drawdowns.length === 0) return 0;
    
    return drawdowns.reduce((sum, d) => sum + d, 0) / drawdowns.length;
  }

  /**
   * Calculate consecutive wins and losses
   */
  private static calculateConsecutiveWinsLosses(trades: BacktestTrade[]): {
    maxConsecutiveWins: number;
    maxConsecutiveLosses: number;
  } {
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentWins = 0;
    let currentLosses = 0;
    
    for (const trade of trades) {
      if (trade.pnl && trade.pnl > 0) {
        currentWins++;
        currentLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWins);
      } else if (trade.pnl && trade.pnl < 0) {
        currentLosses++;
        currentWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLosses);
      }
    }
    
    return { maxConsecutiveWins, maxConsecutiveLosses };
  }
}
