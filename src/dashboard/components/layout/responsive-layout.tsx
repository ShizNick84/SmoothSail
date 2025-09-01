'use client';

import * as React from 'react';
import { DashboardLayout } from './dashboard-layout';
import { MobileLayout } from '../mobile/mobile-layout';
import { useToast } from '@/components/ui/toaster';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBalance?: boolean;
  balance?: number;
  balanceChange?: number;
}

export function ResponsiveLayout({
  children,
  title = 'AI Trading Dashboard',
  subtitle = 'Military-grade cryptocurrency trading system',
  showBalance = true,
  balance = 125000.50,
  balanceChange = 2450.75
}: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('dashboard');
  const { addToast } = useToast();

  // Detect screen size changes
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Handle refresh for mobile
  const handleRefresh = async () => {
    // Simulate data refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, this would fetch fresh data from your API
    console.log('Refreshing dashboard data...');
  };

  // Handle tab changes for mobile
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Render mobile layout on small screens
  if (isMobile) {
    return (
      <MobileLayout
        title={title}
        subtitle={subtitle}
        showBalance={showBalance}
        balance={balance}
        balanceChange={balanceChange}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
      >
        {children}
      </MobileLayout>
    );
  }

  // Render desktop layout on larger screens
  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}

// Hook for responsive utilities
export function useResponsive() {
  const [screenSize, setScreenSize] = React.useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(true);

  React.useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      if (width < 768) {
        setScreenSize('mobile');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width < 1024) {
        setScreenSize('tablet');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else {
        setScreenSize('desktop');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);

    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
  };
}

// Hook for touch gestures
export function useTouchGestures() {
  const [touchSupported, setTouchSupported] = React.useState(false);

  React.useEffect(() => {
    setTouchSupported('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const vibrate = React.useCallback((pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, []);

  return {
    touchSupported,
    vibrate,
  };
}

// Hook for PWA features
export function usePWA() {
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState<any>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);

  React.useEffect(() => {
    // Check if app is installed/standalone
    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    };

    checkStandalone();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = React.useCallback(async () => {
    if (installPrompt) {
      const result = await installPrompt.prompt();
      console.log('Install prompt result:', result);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  return {
    isInstalled,
    isStandalone,
    canInstall: !!installPrompt,
    installApp,
  };
}