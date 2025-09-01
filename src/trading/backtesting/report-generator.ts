/**
 * =============================================================================
 * BACKTESTING REPORT GENERATOR
 * =============================================================================
 * 
 * This module generates comprehensive backtesting reports in multiple formats
 * including JSON, HTML, and detailed analysis reports. The reports include
 * performance metrics, trade analysis, risk assessment, and visual charts.
 * 
 * REPORT FEATURES:
 * - Comprehensive performance analysis
 * - Strategy breakdown and comparison
 * - Risk metrics and drawdown analysis
 * - Trade-by-trade detailed analysis
 * - Visual charts and equity curves
 * - Monthly and yearly performance breakdown
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/core/logging/logger';
import { 
  BacktestResult, 
  BacktestReportConfig,
  BenchmarkComparison,
  MonthlyReturn 
} from './types';

/**
 * Report section interface
 */
interface ReportSection {
  title: string;
  content: string;
  charts?: ChartData[];
}

/**
 * Chart data interface
 */
interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  data: any[];
  xAxis?: string;
  yAxis?: string;
}

/**
 * Comprehensive Backtesting Report Generator
 */
export class BacktestReportGenerator {
  
  /**
   * Generate comprehensive backtesting report
   */
  public static async generateReport(
    result: BacktestResult,
    config: BacktestReportConfig,
    benchmark?: BenchmarkComparison
  ): Promise<string> {
    logger.info('📊 Generating comprehensive backtesting report...');
    
    try {
      const sections = await this.generateReportSections(result, config, benchmark);
      
      let report: string;
      
      switch (config.format) {
        case 'HTML':
          report = await this.generateHTMLReport(sections, result);
          break;
        case 'JSON':
          report = await this.generateJSONReport(result);
          break;
        case 'PDF':
          // PDF generation would require additional libraries
          report = await this.generateHTMLReport(sections, result);
          logger.warn('⚠️ PDF generation not implemented, generated HTML instead');
          break;
        default:
          report = await this.generateJSONReport(result);
      }
      
      // Save report to file if output path specified
      if (config.outputPath) {
        await this.saveReport(report, config.outputPath, config.format);
      }
      
      logger.info('✅ Backtesting report generated successfully');
      return report;
      
    } catch (error) {
      logger.error('❌ Failed to generate backtesting report:', error);
      throw error;
    }
  }

  /**
   * Generate report sections
   */
  private static async generateReportSections(
    result: BacktestResult,
    config: BacktestReportConfig,
    benchmark?: BenchmarkComparison
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];
    
    // Executive Summary
    sections.push(await this.generateExecutiveSummary(result, benchmark));
    
    // Performance Metrics
    sections.push(await this.generatePerformanceSection(result));
    
    // Risk Analysis
    if (config.includeRiskMetrics) {
      sections.push(await this.generateRiskSection(result));
    }
    
    // Trade Analysis
    if (config.includeTradeDetails) {
      sections.push(await this.generateTradeAnalysisSection(result));
    }
    
    // Strategy Breakdown
    if (config.includeStrategyBreakdown) {
      sections.push(await this.generateStrategySection(result));
    }
    
    // Monthly Returns
    if (config.includeMonthlyReturns) {
      sections.push(await this.generateMonthlyReturnsSection(result));
    }
    
    // Benchmark Comparison
    if (config.includeBenchmarkComparison && benchmark) {
      sections.push(await this.generateBenchmarkSection(result, benchmark));
    }
    
    // Charts and Visualizations
    if (config.includeCharts) {
      sections.push(await this.generateChartsSection(result));
    }
    
    return sections;
  }

  /**
   * Generate executive summary section
   */
  private static async generateExecutiveSummary(
    result: BacktestResult,
    benchmark?: BenchmarkComparison
  ): Promise<ReportSection> {
    const perf = result.performance;
    const trades = result.trades;
    
    const summary = `
## Executive Summary

**Strategy Performance Overview**
- **Total Return**: ${perf.totalReturnPercentage.toFixed(2)}% (${perf.totalReturn.toFixed(2)} USDT)
- **Annualized Return**: ${perf.annualizedReturn.toFixed(2)}%
- **Sharpe Ratio**: ${perf.sharpeRatio.toFixed(2)}
- **Maximum Drawdown**: ${perf.maxDrawdownPercentage.toFixed(2)}%
- **Win Rate**: ${trades.winRate.toFixed(1)}%
- **Profit Factor**: ${perf.profitFactor.toFixed(2)}

**Trading Activity**
- **Total Trades**: ${trades.total}
- **Winning Trades**: ${trades.winning}
- **Losing Trades**: ${trades.losing}
- **Average Win**: $${trades.averageWin.toFixed(2)}
- **Average Loss**: $${trades.averageLoss.toFixed(2)}
- **Largest Win**: $${trades.largestWin.toFixed(2)}
- **Largest Loss**: $${trades.largestLoss.toFixed(2)}

**Risk Assessment**
- **Volatility**: ${result.risk.volatility.toFixed(2)}%
- **Value at Risk (95%)**: ${result.risk.var95.toFixed(2)}%
- **Conditional VaR (95%)**: ${result.risk.cvar95.toFixed(2)}%
- **Recovery Factor**: ${perf.recoveryFactor.toFixed(2)}

**Data Quality**
- **Total Data Points**: ${result.dataQuality.totalDataPoints.toLocaleString()}
- **Data Integrity Score**: ${result.dataQuality.dataIntegrityScore.toFixed(1)}%
- **Data Source**: ${result.dataQuality.dataSource}
- **Gaps Detected**: ${result.dataQuality.gapsDetected}

${benchmark ? `
**Benchmark Comparison**
- **Outperformance**: ${benchmark.outperformance.totalReturn.toFixed(2)}%
- **Risk-Adjusted Outperformance**: ${benchmark.outperformance.riskAdjustedReturn.toFixed(2)}%
- **Information Ratio**: ${benchmark.outperformance.informationRatio.toFixed(2)}
` : ''}

**Period**: ${result.period.start.toISOString().split('T')[0]} to ${result.period.end.toISOString().split('T')[0]} (${result.period.durationDays.toFixed(0)} days)
`;
    
    return {
      title: 'Executive Summary',
      content: summary,
    };
  }

  /**
   * Generate performance metrics section
   */
  private static async generatePerformanceSection(result: BacktestResult): Promise<ReportSection> {
    const perf = result.performance;
    
    const content = `
## Performance Metrics

### Return Metrics
| Metric | Value |
|--------|-------|
| Total Return | ${perf.totalReturnPercentage.toFixed(2)}% |
| Total Return (USDT) | $${perf.totalReturn.toFixed(2)} |
| Annualized Return | ${perf.annualizedReturn.toFixed(2)}% |
| Expected Value per Trade | $${perf.expectedValue.toFixed(2)} |

### Risk-Adjusted Returns
| Metric | Value | Description |
|--------|-------|-------------|
| Sharpe Ratio | ${perf.sharpeRatio.toFixed(2)} | Risk-adjusted return vs risk-free rate |
| Sortino Ratio | ${perf.sortinoRatio.toFixed(2)} | Return vs downside deviation |
| Calmar Ratio | ${perf.calmarRatio.toFixed(2)} | Annual return vs maximum drawdown |

### Drawdown Analysis
| Metric | Value |
|--------|-------|
| Maximum Drawdown | ${perf.maxDrawdownPercentage.toFixed(2)}% |
| Maximum Drawdown (USDT) | $${perf.maxDrawdown.toFixed(2)} |
| Average Drawdown | ${perf.averageDrawdown.toFixed(2)}% |
| Recovery Factor | ${perf.recoveryFactor.toFixed(2)} |

### Trading Efficiency
| Metric | Value |
|--------|-------|
| Profit Factor | ${perf.profitFactor.toFixed(2)} |
| Payoff Ratio | ${perf.payoffRatio.toFixed(2)} |
`;
    
    return {
      title: 'Performance Metrics',
      content,
    };
  }

  /**
   * Generate risk analysis section
   */
  private static async generateRiskSection(result: BacktestResult): Promise<ReportSection> {
    const risk = result.risk;
    
    const content = `
## Risk Analysis

### Volatility Metrics
| Metric | Value | Description |
|--------|-------|-------------|
| Volatility (Annualized) | ${risk.volatility.toFixed(2)}% | Standard deviation of returns |
| Downside Deviation | ${risk.downside_deviation.toFixed(2)}% | Volatility of negative returns |

### Value at Risk (VaR)
| Confidence Level | Value | Description |
|------------------|-------|-------------|
| VaR 95% | ${risk.var95.toFixed(2)}% | Maximum expected loss (95% confidence) |
| CVaR 95% | ${risk.cvar95.toFixed(2)}% | Expected loss beyond VaR |

### Market Correlation
| Metric | Value | Description |
|--------|-------|-------------|
| Beta | ${risk.beta.toFixed(2)} | Correlation with market benchmark |
| Alpha | ${risk.alpha.toFixed(2)}% | Excess return over benchmark |
| Information Ratio | ${risk.informationRatio.toFixed(2)} | Risk-adjusted excess return |

### Risk Assessment
${this.generateRiskAssessment(result)}
`;
    
    return {
      title: 'Risk Analysis',
      content,
    };
  }

  /**
   * Generate trade analysis section
   */
  private static async generateTradeAnalysisSection(result: BacktestResult): Promise<ReportSection> {
    const trades = result.trades;
    
    const content = `
## Trade Analysis

### Trade Statistics
| Metric | Value |
|--------|-------|
| Total Trades | ${trades.total} |
| Winning Trades | ${trades.winning} |
| Losing Trades | ${trades.losing} |
| Win Rate | ${trades.winRate.toFixed(1)}% |

### Win/Loss Analysis
| Metric | Value |
|--------|-------|
| Average Win | $${trades.averageWin.toFixed(2)} |
| Average Loss | $${trades.averageLoss.toFixed(2)} |
| Largest Win | $${trades.largestWin.toFixed(2)} |
| Largest Loss | $${trades.largestLoss.toFixed(2)} |
| Payoff Ratio | ${(trades.averageWin / Math.max(trades.averageLoss, 0.01)).toFixed(2)} |

### Consecutive Trades
| Metric | Value |
|--------|-------|
| Max Consecutive Wins | ${trades.maxConsecutiveWins} |
| Max Consecutive Losses | ${trades.maxConsecutiveLosses} |

### Trade Distribution
${this.generateTradeDistribution(result.executionDetails)}

### Top 10 Best Trades
${this.generateTopTrades(result.executionDetails, 'best')}

### Top 10 Worst Trades
${this.generateTopTrades(result.executionDetails, 'worst')}
`;
    
    return {
      title: 'Trade Analysis',
      content,
    };
  }

  /**
   * Generate strategy breakdown section
   */
  private static async generateStrategySection(result: BacktestResult): Promise<ReportSection> {
    const strategies = Object.entries(result.strategyPerformance);
    
    let content = `
## Strategy Performance Breakdown

### Strategy Comparison
| Strategy | Trades | Win Rate | Total Return | Profit Factor | Avg Holding |
|----------|--------|----------|--------------|---------------|-------------|
`;
    
    for (const [name, perf] of strategies) {
      content += `| ${name} | ${perf.trades} | ${perf.winRate.toFixed(1)}% | $${perf.totalReturn.toFixed(2)} | ${perf.profitFactor.toFixed(2)} | ${perf.averageHoldingPeriod.toFixed(1)}h |\n`;
    }
    
    content += `\n### Strategy Analysis\n`;
    
    for (const [name, perf] of strategies) {
      content += `
#### ${name}
- **Signal Accuracy**: ${(perf.signalAccuracy * 100).toFixed(1)}%
- **Average Holding Period**: ${perf.averageHoldingPeriod.toFixed(1)} hours
- **Contribution to Performance**: ${perf.contribution.toFixed(2)}%
`;
    }
    
    return {
      title: 'Strategy Performance',
      content,
    };
  }

  /**
   * Generate monthly returns section
   */
  private static async generateMonthlyReturnsSection(result: BacktestResult): Promise<ReportSection> {
    const monthlyReturns = result.monthlyReturns;
    
    let content = `
## Monthly Performance Analysis

### Monthly Returns Table
| Year | Month | Return | Return % | Trades | Win Rate | Max DD |
|------|-------|--------|----------|--------|----------|--------|
`;
    
    for (const month of monthlyReturns) {
      const monthName = new Date(month.year, month.month).toLocaleString('default', { month: 'long' });
      content += `| ${month.year} | ${monthName} | $${month.return.toFixed(2)} | ${month.returnPercentage.toFixed(2)}% | ${month.trades} | ${month.winRate.toFixed(1)}% | ${month.maxDrawdown.toFixed(2)}% |\n`;
    }
    
    // Calculate yearly summaries
    const yearlyData = this.calculateYearlySummaries(monthlyReturns);
    
    content += `\n### Yearly Performance Summary\n`;
    content += `| Year | Total Return | Return % | Trades | Win Rate | Best Month | Worst Month |\n`;
    content += `|------|--------------|----------|--------|----------|------------|-------------|\n`;
    
    for (const [year, data] of Object.entries(yearlyData)) {
      content += `| ${year} | $${data.totalReturn.toFixed(2)} | ${data.returnPercentage.toFixed(2)}% | ${data.totalTrades} | ${data.avgWinRate.toFixed(1)}% | ${data.bestMonth.toFixed(2)}% | ${data.worstMonth.toFixed(2)}% |\n`;
    }
    
    return {
      title: 'Monthly Performance',
      content,
    };
  }

  /**
   * Generate benchmark comparison section
   */
  private static async generateBenchmarkSection(
    result: BacktestResult,
    benchmark: BenchmarkComparison
  ): Promise<ReportSection> {
    const content = `
## Benchmark Comparison

### Performance vs ${benchmark.benchmark.name}
| Metric | Strategy | Benchmark | Outperformance |
|--------|----------|-----------|----------------|
| Total Return | ${benchmark.strategy.totalReturn.toFixed(2)}% | ${benchmark.benchmark.totalReturn.toFixed(2)}% | ${benchmark.outperformance.totalReturn.toFixed(2)}% |
| Sharpe Ratio | ${benchmark.strategy.sharpeRatio.toFixed(2)} | ${benchmark.benchmark.sharpeRatio.toFixed(2)} | ${benchmark.outperformance.sharpeRatio.toFixed(2)} |
| Max Drawdown | ${benchmark.strategy.maxDrawdown.toFixed(2)}% | ${benchmark.benchmark.maxDrawdown.toFixed(2)}% | ${(benchmark.strategy.maxDrawdown - benchmark.benchmark.maxDrawdown).toFixed(2)}% |
| Volatility | ${benchmark.strategy.volatility.toFixed(2)}% | ${benchmark.benchmark.volatility.toFixed(2)}% | ${(benchmark.strategy.volatility - benchmark.benchmark.volatility).toFixed(2)}% |

### Risk-Adjusted Performance
- **Risk-Adjusted Outperformance**: ${benchmark.outperformance.riskAdjustedReturn.toFixed(2)}%
- **Information Ratio**: ${benchmark.outperformance.informationRatio.toFixed(2)}

### Analysis
${this.generateBenchmarkAnalysis(benchmark)}
`;
    
    return {
      title: 'Benchmark Comparison',
      content,
    };
  }

  /**
   * Generate charts section
   */
  private static async generateChartsSection(result: BacktestResult): Promise<ReportSection> {
    const charts: ChartData[] = [
      {
        type: 'line',
        title: 'Equity Curve',
        data: result.equityCurve.map(point => ({
          x: point.timestamp.toISOString().split('T')[0],
          y: point.equity,
        })),
        xAxis: 'Date',
        yAxis: 'Equity (USDT)',
      },
      {
        type: 'line',
        title: 'Drawdown Curve',
        data: result.drawdownCurve.map(point => ({
          x: point.timestamp.toISOString().split('T')[0],
          y: -point.drawdownPercentage,
        })),
        xAxis: 'Date',
        yAxis: 'Drawdown (%)',
      },
      {
        type: 'bar',
        title: 'Monthly Returns',
        data: result.monthlyReturns.map(month => ({
          x: `${month.year}-${String(month.month + 1).padStart(2, '0')}`,
          y: month.returnPercentage,
        })),
        xAxis: 'Month',
        yAxis: 'Return (%)',
      },
    ];
    
    const content = `
## Charts and Visualizations

### Equity Curve
The equity curve shows the growth of the portfolio over time, including both realized and unrealized profits/losses.

### Drawdown Analysis
The drawdown curve illustrates periods when the portfolio value was below its previous peak, helping identify risk periods.

### Monthly Performance
Monthly returns distribution shows the consistency of the strategy across different market conditions.

*Note: Interactive charts would be generated in the HTML version of this report.*
`;
    
    return {
      title: 'Charts and Visualizations',
      content,
      charts,
    };
  }

  /**
   * Generate HTML report
   */
  private static async generateHTMLReport(sections: ReportSection[], result: BacktestResult): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backtesting Report - ${result.config.symbol}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        .section {
            background: white;
            padding: 25px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .metric-positive { color: #28a745; font-weight: bold; }
        .metric-negative { color: #dc3545; font-weight: bold; }
        .metric-neutral { color: #6c757d; }
        .chart-placeholder {
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            padding: 40px;
            text-align: center;
            margin: 20px 0;
            border-radius: 5px;
        }
        h1 { color: white; margin: 0; }
        h2 { color: #495057; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
        h3 { color: #6c757d; }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Backtesting Report</h1>
        <p><strong>${result.config.symbol}</strong> | ${result.period.start.toISOString().split('T')[0]} to ${result.period.end.toISOString().split('T')[0]}</p>
        <p>Generated on ${new Date().toISOString().split('T')[0]}</p>
    </div>
    
    ${sections.map(section => `
    <div class="section">
        <h2>${section.title}</h2>
        ${this.markdownToHTML(section.content)}
        ${section.charts ? section.charts.map(chart => `
        <div class="chart-placeholder">
            <h3>${chart.title}</h3>
            <p>📊 Interactive ${chart.type} chart would be displayed here</p>
            <small>Chart Type: ${chart.type} | Data Points: ${chart.data.length}</small>
        </div>
        `).join('') : ''}
    </div>
    `).join('')}
    
    <div class="footer">
        <p>Report generated by AI Crypto Trading System</p>
        <p><small>This report is based on historical backtesting and does not guarantee future performance.</small></p>
    </div>
</body>
</html>
`;
    
    return html;
  }

  /**
   * Generate JSON report
   */
  private static async generateJSONReport(result: BacktestResult): Promise<string> {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Save report to file
   */
  private static async saveReport(report: string, outputPath: string, format: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });
      
      // Determine file extension
      const ext = format.toLowerCase() === 'html' ? '.html' : 
                  format.toLowerCase() === 'json' ? '.json' : '.txt';
      
      const fullPath = outputPath.endsWith(ext) ? outputPath : `${outputPath}${ext}`;
      
      await fs.writeFile(fullPath, report, 'utf-8');
      logger.info(`📄 Report saved to: ${fullPath}`);
      
    } catch (error) {
      logger.error('❌ Failed to save report:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private static generateRiskAssessment(result: BacktestResult): string {
    const risk = result.risk;
    const perf = result.performance;
    
    let assessment = '';
    
    if (perf.sharpeRatio > 2) {
      assessment += '✅ **Excellent** risk-adjusted returns (Sharpe > 2)\n';
    } else if (perf.sharpeRatio > 1) {
      assessment += '✅ **Good** risk-adjusted returns (Sharpe > 1)\n';
    } else if (perf.sharpeRatio > 0.5) {
      assessment += '⚠️ **Moderate** risk-adjusted returns (Sharpe > 0.5)\n';
    } else {
      assessment += '❌ **Poor** risk-adjusted returns (Sharpe < 0.5)\n';
    }
    
    if (perf.maxDrawdownPercentage < 10) {
      assessment += '✅ **Low** maximum drawdown (< 10%)\n';
    } else if (perf.maxDrawdownPercentage < 20) {
      assessment += '⚠️ **Moderate** maximum drawdown (< 20%)\n';
    } else {
      assessment += '❌ **High** maximum drawdown (> 20%)\n';
    }
    
    if (risk.volatility < 20) {
      assessment += '✅ **Low** volatility (< 20%)\n';
    } else if (risk.volatility < 40) {
      assessment += '⚠️ **Moderate** volatility (< 40%)\n';
    } else {
      assessment += '❌ **High** volatility (> 40%)\n';
    }
    
    return assessment;
  }

  private static generateTradeDistribution(trades: any[]): string {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    const pnlRanges = [
      { min: -Infinity, max: -1000, label: '< -$1000' },
      { min: -1000, max: -500, label: '-$1000 to -$500' },
      { min: -500, max: -100, label: '-$500 to -$100' },
      { min: -100, max: 0, label: '-$100 to $0' },
      { min: 0, max: 100, label: '$0 to $100' },
      { min: 100, max: 500, label: '$100 to $500' },
      { min: 500, max: 1000, label: '$500 to $1000' },
      { min: 1000, max: Infinity, label: '> $1000' },
    ];
    
    let distribution = '| P&L Range | Count | Percentage |\n|-----------|-------|------------|\n';
    
    for (const range of pnlRanges) {
      const count = closedTrades.filter(t => t.pnl >= range.min && t.pnl < range.max).length;
      const percentage = closedTrades.length > 0 ? (count / closedTrades.length * 100).toFixed(1) : '0.0';
      distribution += `| ${range.label} | ${count} | ${percentage}% |\n`;
    }
    
    return distribution;
  }

  private static generateTopTrades(trades: any[], type: 'best' | 'worst'): string {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    const sortedTrades = closedTrades.sort((a, b) => type === 'best' ? b.pnl - a.pnl : a.pnl - b.pnl);
    const topTrades = sortedTrades.slice(0, 10);
    
    let table = '| Date | Symbol | Type | P&L | P&L % | Strategy |\n|------|--------|------|-----|-------|----------|\n';
    
    for (const trade of topTrades) {
      const date = trade.entryTime.toISOString().split('T')[0];
      const pnlClass = trade.pnl > 0 ? '+' : '';
      table += `| ${date} | ${trade.symbol} | ${trade.type} | ${pnlClass}$${trade.pnl.toFixed(2)} | ${pnlClass}${trade.pnlPercentage.toFixed(2)}% | ${trade.strategy} |\n`;
    }
    
    return table;
  }

  private static calculateYearlySummaries(monthlyReturns: MonthlyReturn[]): Record<string, any> {
    const yearlyData: Record<string, any> = {};
    
    for (const month of monthlyReturns) {
      const year = month.year.toString();
      
      if (!yearlyData[year]) {
        yearlyData[year] = {
          totalReturn: 0,
          returnPercentage: 0,
          totalTrades: 0,
          avgWinRate: 0,
          bestMonth: -Infinity,
          worstMonth: Infinity,
          months: 0,
        };
      }
      
      const data = yearlyData[year];
      data.totalReturn += month.return;
      data.returnPercentage += month.returnPercentage;
      data.totalTrades += month.trades;
      data.avgWinRate += month.winRate;
      data.bestMonth = Math.max(data.bestMonth, month.returnPercentage);
      data.worstMonth = Math.min(data.worstMonth, month.returnPercentage);
      data.months++;
    }
    
    // Calculate averages
    for (const data of Object.values(yearlyData)) {
      data.avgWinRate /= data.months;
    }
    
    return yearlyData;
  }

  private static generateBenchmarkAnalysis(benchmark: BenchmarkComparison): string {
    let analysis = '';
    
    if (benchmark.outperformance.totalReturn > 0) {
      analysis += `✅ The strategy **outperformed** the benchmark by ${benchmark.outperformance.totalReturn.toFixed(2)}%.\n`;
    } else {
      analysis += `❌ The strategy **underperformed** the benchmark by ${Math.abs(benchmark.outperformance.totalReturn).toFixed(2)}%.\n`;
    }
    
    if (benchmark.outperformance.riskAdjustedReturn > 0) {
      analysis += `✅ **Risk-adjusted outperformance** of ${benchmark.outperformance.riskAdjustedReturn.toFixed(2)}% indicates superior risk management.\n`;
    } else {
      analysis += `❌ **Risk-adjusted underperformance** of ${Math.abs(benchmark.outperformance.riskAdjustedReturn).toFixed(2)}% suggests poor risk management.\n`;
    }
    
    if (benchmark.outperformance.informationRatio > 0.5) {
      analysis += `✅ **High Information Ratio** (${benchmark.outperformance.informationRatio.toFixed(2)}) indicates consistent outperformance.\n`;
    } else if (benchmark.outperformance.informationRatio > 0) {
      analysis += `⚠️ **Moderate Information Ratio** (${benchmark.outperformance.informationRatio.toFixed(2)}) shows some outperformance.\n`;
    } else {
      analysis += `❌ **Negative Information Ratio** (${benchmark.outperformance.informationRatio.toFixed(2)}) indicates poor performance vs benchmark.\n`;
    }
    
    return analysis;
  }

  private static markdownToHTML(markdown: string): string {
    return markdown
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/# (.*)/g, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map(cell => cell.trim());
        const isHeader = match.includes('---');
        if (isHeader) return '';
        
        const tag = cells[0] === cells[0].toUpperCase() ? 'th' : 'td';
        return `<tr>${cells.map(cell => `<${tag}>${cell}</${tag}>`).join('')}</tr>`;
      })
      .replace(/(<tr>.*<\/tr>)/g, '<table>$1</table>')
      .replace(/<\/table>\s*<table>/g, '');
  }
}