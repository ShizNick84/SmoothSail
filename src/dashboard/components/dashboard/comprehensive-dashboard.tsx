'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  Activity, 
  ScrollText, 
  Bell, 
  Settings, 
  Shield,
  TrendingUp,
  Eye,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';
import { Button } from '@/components/ui/button';

// Import all the new components
import { PerformanceDashboard } from '@/components/trading/performance-dashboard';
import { HealthMonitor } from '@/components/system/health-monitor';
import { LogViewer } from '@/components/logs/log-viewer';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { SettingsPanel } from '@/components/settings/settings-panel';
import { EmergencyControls } from '@/components/controls/emergency-controls';

// Import existing components
import { PortfolioOverview } from '@/components/portfolio/portfolio-overview';
import { TradingChart } from '@/components/charts/trading-chart';
import { SystemHealth } from '@/components/system/system-health';
import { RecentTrades } from '@/components/trading/recent-trades';

interface ComprehensiveDashboardProps {
  className?: string;
}

type DashboardView = 
  | 'overview' 
  | 'performance' 
  | 'health' 
  | 'logs' 
  | 'notifications' 
  | 'settings' 
  | 'controls';

const dashboardViews = [
  {
    key: 'overview' as const,
    label: 'Overview',
    icon: <Eye className="h-4 w-4" />,
    emoji: TradingEmojis.chart,
    description: 'Main dashboard overview'
  },
  {
    key: 'performance' as const,
    label: 'Performance',
    icon: <BarChart3 className="h-4 w-4" />,
    emoji: TradingEmojis.rocket,
    description: 'Trading performance analytics'
  },
  {
    key: 'health' as const,
    label: 'System Health',
    icon: <Activity className="h-4 w-4" />,
    emoji: TradingEmojis.success,
    description: 'System monitoring and health'
  },
  {
    key: 'logs' as const,
    label: 'Logs',
    icon: <ScrollText className="h-4 w-4" />,
    emoji: TradingEmojis.scroll,
    description: 'Real-time log viewer'
  },
  {
    key: 'notifications' as const,
    label: 'Notifications',
    icon: <Bell className="h-4 w-4" />,
    emoji: TradingEmojis.bell,
    description: 'Notification center'
  },
  {
    key: 'settings' as const,
    label: 'Settings',
    icon: <Settings className="h-4 w-4" />,
    emoji: TradingEmojis.gear,
    description: 'System configuration'
  },
  {
    key: 'controls' as const,
    label: 'Emergency',
    icon: <Shield className="h-4 w-4" />,
    emoji: TradingEmojis.shield,
    description: 'Emergency controls'
  },
];

export function ComprehensiveDashboard({ className = '' }: ComprehensiveDashboardProps) {
  const [activeView, setActiveView] = React.useState<DashboardView>('overview');
  const [isLoading, setIsLoading] = React.useState(true);

  // Simulate initial loading
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="relative">
            <AnimatedEmoji emoji={TradingEmojis.robot} animation="bounce" size="xl" />
            <motion.div
              className="absolute -inset-4 border-2 border-primary/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">AI Trading Dashboard</h1>
            <p className="text-muted-foreground">Initializing comprehensive trading system...</p>
          </div>
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <AnimatedEmoji emoji={TradingEmojis.shield} animation="pulse" size="sm" />
            <span>Secure Connection Established</span>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Portfolio Overview */}
            <PortfolioOverview />
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trading Chart - Takes 2 columns */}
              <div className="lg:col-span-2">
                <TradingChart />
              </div>
              
              {/* System Health - Takes 1 column */}
              <div>
                <SystemHealth />
              </div>
            </div>
            
            {/* Recent Trades */}
            <RecentTrades />
          </div>
        );
      
      case 'performance':
        return <PerformanceDashboard />;
      
      case 'health':
        return <HealthMonitor />;
      
      case 'logs':
        return <LogViewer />;
      
      case 'notifications':
        return <NotificationCenter />;
      
      case 'settings':
        return <SettingsPanel />;
      
      case 'controls':
        return <EmergencyControls />;
      
      default:
        return <div>View not found</div>;
    }
  };

  const currentView = dashboardViews.find(view => view.key === activeView);

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-background via-background to-muted/20', className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <AnimatedEmoji emoji={TradingEmojis.robot} animation="bounce" size="lg" />
                <div>
                  <h1 className="text-2xl font-bold">AI Trading Dashboard</h1>
                  <p className="text-sm text-muted-foreground">
                    Military-grade cryptocurrency trading system
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500">
                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">System Online</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-64 flex-shrink-0"
          >
            <div className="trading-card p-4 sticky top-24">
              <h3 className="font-semibold mb-4 flex items-center space-x-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Dashboard Views</span>
              </h3>
              <nav className="space-y-2">
                {dashboardViews.map((view) => (
                  <motion.button
                    key={view.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveView(view.key)}
                    className={cn(
                      'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                      activeView === view.key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      {view.icon}
                      <AnimatedEmoji emoji={view.emoji} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{view.label}</div>
                      <div className="text-xs opacity-75 truncate">
                        {view.description}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </nav>
            </div>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Content Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="flex items-center space-x-3">
                <AnimatedEmoji emoji={currentView?.emoji || TradingEmojis.chart} animation="pulse" />
                <div>
                  <h2 className="text-xl font-bold">{currentView?.label}</h2>
                  <p className="text-sm text-muted-foreground">{currentView?.description}</p>
                </div>
              </div>
            </motion.div>

            {/* Dynamic Content */}
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Quick Actions Floating Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          variant="default"
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => setActiveView('controls')}
          title="Emergency Controls"
        >
          <Shield className="h-6 w-6" />
        </Button>
      </motion.div>
    </div>
  );
}