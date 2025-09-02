'use client';

import * as React from 'react';
import { motion, PanInfo } from 'framer-motion';
import { Home, BarChart3, Wallet, Settings, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatedEmoji, TradingEmojis } from '@/components/icons/emoji-system';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

interface NavTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  emoji: string;
  badge?: number;
}

const navTabs: NavTab[] = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: <Home className="h-5 w-5" />,
    emoji: TradingEmojis.chart,
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: <Wallet className="h-5 w-5" />,
    emoji: TradingEmojis.money,
  },
  {
    id: 'trading',
    label: 'Trading',
    icon: <BarChart3 className="h-5 w-5" />,
    emoji: TradingEmojis.chart,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    icon: <Bell className="h-5 w-5" />,
    emoji: TradingEmojis.bell,
    badge: 3,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="h-5 w-5" />,
    emoji: TradingEmojis.robot,
  },
];

export function MobileNavigation({ activeTab, onTabChange, className = '' }: MobileNavProps) {
  const [dragConstraints, setDragConstraints] = React.useState({ left: 0, right: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const contentWidth = navTabs.length * 80; // Approximate tab width
      const maxDrag = Math.max(0, contentWidth - containerWidth);
      setDragConstraints({ left: -maxDrag, right: 0 });
    }
  }, []);

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Optional: Add haptic feedback on mobile
    if ('vibrate' in navigator && Math.abs(info.velocity.x) > 500) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 z-50 md:hidden', className)}>
      {/* Background with glassmorphism */}
      <div className="glass-card border-t border-border/50 px-2 py-2">
        <motion.div
          ref={containerRef}
          className="flex items-center justify-around"
          drag="x"
          dragConstraints={dragConstraints}
          onDrag={handleDrag}
          whileDrag={{ scale: 0.98 }}
        >
          {navTabs.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 min-w-[60px]',
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
              )}
            >
              <div className="relative">
                <div className="flex items-center justify-center mb-1">
                  <AnimatedEmoji
                    emoji={tab.emoji}
                    animation={activeTab === tab.id ? 'bounce' : undefined}
                    size="sm"
                  />
                </div>
                {tab.badge && tab.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                  >
                    {tab.badge}
                  </motion.span>
                )}
              </div>
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="mobileActiveIndicator"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-1 w-8 bg-primary rounded-full"
                />
              )}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}