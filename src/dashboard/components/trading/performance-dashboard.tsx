'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, Calendar } from 'lucide-react';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

interface PerformanceData {
  date: string;
  profit: number;
  loss: number;
  netPnL: number;
  trades: number;
  winRate: number;
  volume: number;
}

interface PerformanceDashboardProps {
  className?: string;
  timeframe?: '1D' | '1W' | '1M' | '3M' | '1Y';
}

// Generate sample performance data
function generatePerformanceData(days: number): PerformanceData[] {
  const data: PerformanceData[] = [];
  let cumulativePnL = 0;
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const trades = Math.floor(Math.random() * 20) + 5;
    const winRate = 0.6 + (Math.random() - 0.5) * 0.3; // 45-75% win rate
    const profit = Math.random() * 2000 + 500;
    const loss = Math.random() * 1500 + 200;
    const netPnL = profit - loss;
    cumulativePnL += netPnL;
    
    data.push({
      date: date.toISOString().split('T')[0],
      profit,
      loss,
      netPnL: cumulativePnL,
      trades,
      winRate: winRate * 100,
      volume: Math.random() * 50000 + 10000,
    });
  }
  
  return data;
}

// Custom tooltip for charts
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 border rounded-lg shadow-lg">
        <p className="text-sm font-medium">{new Date(label).toLocaleDateString()}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.name.includes('Rate') ? `${entry.value.toFixed(1)}%` : formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function PerformanceDashboard({ className = '', timeframe = '1M' }: PerformanceDashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = React.useState(timeframe);
  const [performanceData, setPerformanceData] = React.useState<PerformanceData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load data based on timeframe
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const days = {
        '1D': 1,
        '1W': 7,
        '1M': 30,
        '3M': 90,
        '1Y': 365,
      }[selectedTimeframe];
      
      setPerformanceData(generatePerformanceData(days));
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [selectedTimeframe]);

  // Calculate summary metrics
  const totalTrades = performanceData.reduce((sum, day) => sum + day.trades, 0);
  const totalProfit = performanceData.reduce((sum, day) => sum + day.profit, 0);
  const totalLoss = performanceData.reduce((sum, day) => sum + day.loss, 0);
  const netPnL = totalProfit - totalLoss;
  const avgWinRate = performanceData.length > 0 
    ? performanceData.reduce((sum, day) => sum + day.winRate, 0) / performanceData.length 
    : 0;
  const currentBalance = performanceData[performanceData.length - 1]?.netPnL || 0;

  // Prepare data for different chart types
  const pnlData = performanceData.map(day => ({
    date: day.date,
    'Cumulative P&L': day.netPnL,
    'Daily P&L': day.profit - day.loss,
  }));

  const tradesData = performanceData.map(day => ({
    date: day.date,
    'Win Rate': day.winRate,
    'Trades': day.trades,
  }));

  const profitLossData = [
    { name: 'Profit', value: totalProfit, color: '#22c55e' },
    { name: 'Loss', value: Math.abs(totalLoss), color: '#ef4444' },
  ];

  if (isLoading) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="xl" />
            <p className="mt-4 text-muted-foreground">Loading performance data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <AnimatedEmoji emoji={TradingEmojis.chart} animation="pulse" />
            <span>Trading Performance</span>
          </h2>
          <p className="text-muted-foreground">Comprehensive profit & loss analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          {(['1D', '1W', '1M', '3M', '1Y'] as const).map((tf) => (
            <Button
              key={tf}
              variant={selectedTimeframe === tf ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'trading-card p-4',
            netPnL > 0 ? 'pulse-profit' : 'pulse-loss'
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Net P&L</p>
              <p className={cn(
                'text-2xl font-bold',
                netPnL > 0 ? 'text-green-500' : 'text-red-500'
              )}>
                {formatCurrency(netPnL)}
              </p>
            </div>
            <AnimatedEmoji 
              emoji={netPnL > 0 ? TradingEmojis.money : TradingEmojis.loss} 
              animation={netPnL > 0 ? 'bounce' : 'shake'} 
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="trading-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-2xl font-bold">{totalTrades}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="trading-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold text-green-500">
                {avgWinRate.toFixed(1)}%
              </p>
            </div>
            <AnimatedEmoji emoji={TradingEmojis.trophy} animation="bounce" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="trading-card p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(currentBalance)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* P&L Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="trading-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Profit & Loss Trend</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlData}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Cumulative P&L"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#pnlGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="Daily P&L"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Win Rate Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="trading-card p-6"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-500" />
            <span>Win Rate & Trade Volume</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={tradesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(value) => `${value}%`}
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="rgba(255,255,255,0.5)"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="Win Rate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="Trades"
                  fill="#3b82f6"
                  opacity={0.6}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Profit/Loss Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="trading-card p-6"
      >
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-yellow-500" />
          <span>Profit vs Loss Distribution</span>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profitLossData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {profitLossData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-green-500 rounded-full" />
                <span className="font-medium">Total Profit</span>
              </div>
              <span className="text-green-500 font-bold">{formatCurrency(totalProfit)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 bg-red-500 rounded-full" />
                <span className="font-medium">Total Loss</span>
              </div>
              <span className="text-red-500 font-bold">{formatCurrency(Math.abs(totalLoss))}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10">
              <div className="flex items-center space-x-2">
                <AnimatedEmoji emoji={TradingEmojis.target} size="sm" />
                <span className="font-medium">Profit Factor</span>
              </div>
              <span className="text-primary font-bold">
                {(totalProfit / Math.abs(totalLoss)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}