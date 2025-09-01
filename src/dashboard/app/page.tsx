'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ResponsiveLayout, useResponsive } from '@/components/layout/responsive-layout';
import { PortfolioOverview } from '@/components/portfolio/portfolio-overview';
import { TradingChart } from '@/components/charts/trading-chart';
import { SystemHealth } from '@/components/system/system-health';
import { RecentTrades } from '@/components/trading/recent-trades';
import { SentimentAnalysis } from '@/components/sentiment/sentiment-analysis';
import { RiskMetrics } from '@/components/risk/risk-metrics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileGrid, MobileCard } from '@/components/mobile/mobile-layout';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    // Simulate loading dashboard data
    const loadDashboardData = async () => {
      try {
        // In a real implementation, this would fetch from your API
        await new Promise(resolve => setTimeout(resolve, 1500));
        setDashboardData({
          portfolio: {
            totalBalance: 125000.50,
            dailyPnL: 2450.75,
            totalPnL: 25000.00,
            positions: 3,
          },
          systemHealth: {
            status: 'healthy',
            uptime: '7d 14h 32m',
            cpu: 45,
            memory: 68,
            network: 'connected',
          },
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading AI Trading Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const renderMobileContent = () => (
    <div className="space-y-4">
      {/* Portfolio Overview - Mobile optimized */}
      <MobileCard title="Portfolio" subtitle="Current balance and performance">
        <PortfolioOverview data={dashboardData?.portfolio} />
      </MobileCard>

      {/* Quick Stats Grid */}
      <MobileGrid columns={2} gap="sm">
        <MobileCard padding="sm">
          <SystemHealth data={dashboardData?.systemHealth} />
        </MobileCard>
        <MobileCard padding="sm">
          <SentimentAnalysis />
        </MobileCard>
      </MobileGrid>

      {/* Trading Chart - Full width on mobile */}
      <MobileCard title="Price Chart" subtitle="BTC/USDT 5m">
        <TradingChart />
      </MobileCard>

      {/* Recent Activity */}
      <MobileGrid columns={1}>
        <MobileCard title="Recent Trades">
          <RecentTrades />
        </MobileCard>
        <MobileCard title="Risk Management">
          <RiskMetrics />
        </MobileCard>
      </MobileGrid>
    </div>
  );

  const renderDesktopContent = () => (
    <div className="space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              AI Trading Dashboard 🚀
            </h1>
            <p className="text-muted-foreground mt-2">
              Military-grade cryptocurrency trading with capital preservation
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl">📈</div>
            <p className="text-sm text-muted-foreground">Status: Active</p>
          </div>
        </div>
      </motion.div>

      {/* Portfolio Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PortfolioOverview data={dashboardData?.portfolio} />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trading Chart - Takes 2 columns on large screens */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <TradingChart />
        </motion.div>

        {/* System Health - Takes 1 column */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <SystemHealth data={dashboardData?.systemHealth} />
        </motion.div>
      </div>

      {/* Secondary Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <RecentTrades />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <SentimentAnalysis />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <RiskMetrics />
        </motion.div>
      </div>
    </div>
  );

  return (
    <ResponsiveLayout
      title="AI Trading Dashboard"
      subtitle="Military-grade cryptocurrency trading system"
      showBalance={true}
      balance={dashboardData?.portfolio?.totalBalance || 125000.50}
      balanceChange={dashboardData?.portfolio?.dailyPnL || 2450.75}
    >
      {isMobile ? renderMobileContent() : renderDesktopContent()}
    </ResponsiveLayout>
  );
}