'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

interface ChartData {
  timestamp: string;
  price: number;
  volume: number;
  ma20?: number;
  ma50?: number;
  rsi?: number;
}

interface TradingChartProps {
  symbol?: string;
  timeframe?: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  data?: ChartData[];
  className?: string;
}

// Generate sample data for demo
function generateSampleData(): ChartData[] {
  const data: ChartData[] = [];
  let basePrice = 45000;
  const now = new Date();
  
  for (let i = 100; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility;
    basePrice = basePrice * (1 + change);
    
    data.push({
      timestamp: timestamp.toISOString(),
      price: basePrice,
      volume: Math.random() * 1000000 + 500000,
      ma20: basePrice * (1 + (Math.random() - 0.5) * 0.01),
      ma50: basePrice * (1 + (Math.random() - 0.5) * 0.015),
      rsi: Math.random() * 40 + 30,
    });
  }
  
  return data;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const price = payload[0].value;
    const time = new Date(label).toLocaleTimeString();
    
    return (
      <div className="glass-card p-3 border rounded-lg shadow-lg">
        <p className="text-sm font-medium">{time}</p>
        <p className="text-lg font-bold text-primary">
          ${price?.toFixed(2)}
        </p>
        {data.volume && (
          <p className="text-xs text-muted-foreground">
            Vol: {(data.volume / 1000000).toFixed(2)}M
          </p>
        )}
      </div>
    );
  }
  return null;
}

export function TradingChart({ 
  symbol = 'BTC/USDT', 
  timeframe = '5m', 
  data, 
  className = '' 
}: TradingChartProps) {
  const [chartType, setChartType] = React.useState<'line' | 'area'>('area');
  const [showIndicators, setShowIndicators] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(true);
  const [chartData, setChartData] = React.useState<ChartData[]>([]);

  // Simulate loading and data fetching
  React.useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setChartData(data || generateSampleData());
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, symbol, timeframe]);

  // Calculate price change
  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const previousPrice = chartData[chartData.length - 2]?.price || 0;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  const isPositive = priceChange > 0;

  if (isLoading) {
    return (
      <div className={cn('glass-card p-6 rounded-xl', className)}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AnimatedEmoji emoji={TradingEmojis.loading} animation="spin" size="xl" />
            <p className="mt-4 text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('trading-card chart-container relative', className)}
    >
      {/* Enhanced Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-2xl font-bold flex items-center space-x-3">
              <AnimatedEmoji emoji={TradingEmojis.chart} animation="pulse" size="lg" />
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                {symbol}
              </span>
              <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs">
                <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                <span>LIVE</span>
              </div>
            </h3>
            <div className="flex items-center space-x-3 mt-2">
              <motion.span 
                className="text-3xl font-mono font-bold"
                key={currentPrice}
                initial={{ scale: 1.1, color: isPositive ? '#22c55e' : '#ef4444' }}
                animate={{ scale: 1, color: 'inherit' }}
                transition={{ duration: 0.3 }}
              >
                ${currentPrice.toFixed(2)}
              </motion.span>
              <motion.div 
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium border',
                  isPositive 
                    ? 'bg-green-500/10 text-green-500 border-green-500/20 pulse-profit' 
                    : 'bg-red-500/10 text-red-500 border-red-500/20 pulse-loss'
                )}
                whileHover={{ scale: 1.05 }}
              >
                <AnimatedEmoji 
                  emoji={isPositive ? TradingEmojis.bullish : TradingEmojis.bearish} 
                  size="sm" 
                  animation={isPositive ? 'bounce' : 'shake'} 
                />
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                </span>
                {Math.abs(priceChangePercent) > 5 && (
                  <AnimatedEmoji 
                    emoji={TradingEmojis.fire} 
                    size="sm" 
                    animation="bounce" 
                  />
                )}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant={chartType === 'line' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('line')}
          >
            <Activity className="h-4 w-4 mr-1" />
            Line
          </Button>
          <Button
            variant={chartType === 'area' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('area')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Area
          </Button>
          <Button
            variant={showIndicators ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowIndicators(!showIndicators)}
          >
            MA
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <YAxis 
                domain={['dataMin - 100', 'dataMax + 100']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
              {showIndicators && (
                <>
                  <Line
                    type="monotone"
                    dataKey="ma20"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ma50"
                    stroke="#ef4444"
                    strokeWidth={1}
                    dot={false}
                  />
                </>
              )}
            </AreaChart>
          ) : (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <YAxis 
                domain={['dataMin - 100', 'dataMax + 100']}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              {showIndicators && (
                <>
                  <Line
                    type="monotone"
                    dataKey="ma20"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ma50"
                    stroke="#ef4444"
                    strokeWidth={1}
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 bg-blue-500 rounded-full" />
            <span>Price</span>
          </div>
          {showIndicators && (
            <>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                <span>MA20</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-red-500 rounded-full" />
                <span>MA50</span>
              </div>
            </>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Timeframe: {timeframe} • Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
}