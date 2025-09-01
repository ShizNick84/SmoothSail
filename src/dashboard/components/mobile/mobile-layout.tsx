'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MobileHeader } from './mobile-header';
import { MobileNavigation } from './mobile-navigation';
import { PullToRefresh } from './swipe-gestures';
import { useToast } from '@/components/ui/toaster';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBalance?: boolean;
  balance?: number;
  balanceChange?: number;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export function MobileLayout({
  children,
  title,
  subtitle,
  showBalance = false,
  balance = 0,
  balanceChange = 0,
  activeTab = 'dashboard',
  onTabChange,
  onRefresh,
  className = ''
}: MobileLayoutProps) {
  const { addToast } = useToast();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        addToast({
          title: 'Refreshed',
          description: 'Dashboard data has been updated',
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        addToast({
          title: 'Refresh Failed',
          description: 'Unable to refresh data. Please try again.',
          type: 'error',
          duration: 3000,
        });
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleNotificationClick = () => {
    addToast({
      title: 'Notifications',
      description: 'You have 3 new trading alerts',
      type: 'info',
      duration: 3000,
    });
  };

  const handleSettingsClick = () => {
    addToast({
      title: 'Settings',
      description: 'Settings panel coming soon',
      type: 'info',
      duration: 2000,
    });
  };

  const handleTabChange = (tab: string) => {
    onTabChange?.(tab);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Show tab change feedback
    addToast({
      title: `Switched to ${tab}`,
      description: `Now viewing ${tab} section`,
      type: 'info',
      duration: 1500,
    });
  };

  return (
    <div className={cn('min-h-screen bg-gradient-to-br from-background via-background to-muted/20 md:hidden', className)}>
      {/* Mobile Header */}
      <MobileHeader
        title={title}
        subtitle={subtitle}
        showBalance={showBalance}
        balance={balance}
        balanceChange={balanceChange}
        onNotificationClick={handleNotificationClick}
        onSettingsClick={handleSettingsClick}
      />

      {/* Main Content with Pull to Refresh */}
      <main className="pb-20"> {/* Bottom padding for navigation */}
        {onRefresh ? (
          <PullToRefresh onRefresh={handleRefresh}>
            <div className="p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </PullToRefresh>
        ) : (
          <div className="p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* Loading overlay for refresh */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="glass-card p-6 rounded-xl text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"
              />
              <p className="text-sm font-medium">Refreshing data...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Mobile-optimized card component
interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function MobileCard({
  children,
  title,
  subtitle,
  action,
  className = '',
  padding = 'md'
}: MobileCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('glass-card rounded-xl border', paddingClasses[padding], className)}
    >
      {(title || subtitle || action) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold text-lg">{title}</h3>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}

// Mobile-optimized grid component
interface MobileGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MobileGrid({
  children,
  columns = 1,
  gap = 'md',
  className = ''
}: MobileGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={cn('grid', gridClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  );
}