'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  Home, 
  BarChart3, 
  Wallet, 
  Settings, 
  Shield, 
  Activity,
  Menu,
  X,
  Bell,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Button } from '@/components/ui/button';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  emoji: string;
  href: string;
  active?: boolean;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
    emoji: TradingEmojis.chart,
    href: '/',
    active: true,
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: <Wallet className="h-5 w-5" />,
    emoji: TradingEmojis.money,
    href: '/portfolio',
  },
  {
    id: 'trading',
    label: 'Trading',
    icon: <BarChart3 className="h-5 w-5" />,
    emoji: TradingEmojis.chart,
    href: '/trading',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <Activity className="h-5 w-5" />,
    emoji: TradingEmojis.graph,
    href: '/analytics',
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Shield className="h-5 w-5" />,
    emoji: TradingEmojis.shield,
    href: '/security',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
    emoji: TradingEmojis.gear,
    href: '/settings',
  },
];

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 h-full w-70 glass-card border-r z-50',
          'lg:relative lg:translate-x-0 lg:z-auto'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <AnimatedEmoji emoji={TradingEmojis.robot} animation="bounce" size="lg" />
              </div>
              <div>
                <h1 className="font-bold text-lg">AI Trader</h1>
                <p className="text-xs text-muted-foreground">v1.0.0</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {navigationItems.map((item) => (
                <motion.a
                  key={item.id}
                  href={item.href}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    item.active
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <AnimatedEmoji 
                    emoji={item.emoji} 
                    animation={item.active ? 'pulse' : undefined}
                    size="sm" 
                  />
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                  {item.active && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto h-2 w-2 bg-primary rounded-full"
                    />
                  )}
                </motion.a>
              ))}
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/20">
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Trading Agent</p>
                <p className="text-xs text-muted-foreground">Active Session</p>
              </div>
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const [notifications] = React.useState(3);

  return (
    <header className="glass-card border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden lg:block">
            <h2 className="text-xl font-semibold">Trading Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Welcome back! Your AI trading agent is active.
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* System Status */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">System Online</span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
              >
                {notifications}
              </motion.span>
            )}
          </Button>

          {/* Theme Toggle */}
          <ThemeToggle variant="icon-only" />

          {/* Profile */}
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex h-screen">
        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}