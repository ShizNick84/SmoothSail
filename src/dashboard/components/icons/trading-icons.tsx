'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Zap, 
  Shield, 
  Target,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Wallet,
  CreditCard,
  Coins,
  Bitcoin,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  Star,
  Diamond,
  Crown,
  Trophy,
  Flame,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Gauge,
  Settings,
  RefreshCw,
  Power,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Send,
  Download,
  Upload,
  Share,
  Copy,
  ExternalLink,
  Maximize,
  Minimize,
  MoreHorizontal,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  X,
  Check,
  Search,
  Filter,
  Calendar,
  Clock3,
  MapPin,
  Globe,
  Home,
  User,
  Users,
  Building,
  Briefcase,
  BookOpen,
  FileText,
  Image,
  Video,
  Music,
  Headphones,
  Camera,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Watch,
  Gamepad2,
  Car,
  Plane,
  Ship,
  Train,
  Bike,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Brain,
  Lightbulb,
  Info,
  Recycle,
  Trash
} from 'lucide-react';

// Trading-specific icon components with animations
export interface IconProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  color?: 'default' | 'profit' | 'loss' | 'warning' | 'info';
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
};

const colorClasses = {
  default: 'text-foreground',
  profit: 'text-green-500',
  loss: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

function createAnimatedIcon(IconComponent: React.ComponentType<any>, defaultAnimation?: any) {
  return React.forwardRef<SVGSVGElement, IconProps>(
    ({ className = '', size = 'md', animate = false, color = 'default', ...props }, ref) => {
      const iconClasses = `${sizeClasses[size]} ${colorClasses[color]} ${className}`;
      
      if (animate && defaultAnimation) {
        return (
          <motion.div {...defaultAnimation}>
            <IconComponent ref={ref} className={iconClasses} {...props} />
          </motion.div>
        );
      }
      
      return <IconComponent ref={ref} className={iconClasses} {...props} />;
    }
  );
}

// Trading Icons with animations
export const ProfitIcon = createAnimatedIcon(TrendingUp, {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  whileHover: { scale: 1.1 },
  transition: { duration: 0.2 }
});

export const LossIcon = createAnimatedIcon(TrendingDown, {
  initial: { scale: 0.8, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  whileHover: { scale: 1.1 },
  transition: { duration: 0.2 }
});

export const MoneyIcon = createAnimatedIcon(DollarSign, {
  animate: { rotate: [0, 5, -5, 0] },
  transition: { duration: 2, repeat: Infinity, repeatDelay: 3 }
});

export const LightningIcon = createAnimatedIcon(Zap, {
  animate: { scale: [1, 1.2, 1] },
  transition: { duration: 1, repeat: Infinity, repeatDelay: 2 }
});

export const ShieldIcon = createAnimatedIcon(Shield, {
  animate: { y: [0, -2, 0] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
});

export const RocketIcon = createAnimatedIcon(Rocket, {
  animate: { y: [0, -5, 0], rotate: [0, 2, -2, 0] },
  transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
});

export const DiamondIcon = createAnimatedIcon(Diamond, {
  animate: { rotate: [0, 180, 360] },
  transition: { duration: 4, repeat: Infinity, ease: 'linear' }
});

export const FlameIcon = createAnimatedIcon(Flame, {
  animate: { scale: [1, 1.1, 0.9, 1] },
  transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
});

export const SparklesIcon = createAnimatedIcon(Sparkles, {
  animate: { rotate: [0, 360] },
  transition: { duration: 3, repeat: Infinity, ease: 'linear' }
});

export const CrownIcon = createAnimatedIcon(Crown, {
  animate: { y: [0, -3, 0] },
  transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }
});

export const TrophyIcon = createAnimatedIcon(Trophy, {
  animate: { scale: [1, 1.05, 1] },
  transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
});

// System Icons
export const CPUIcon = createAnimatedIcon(Cpu);
export const ServerIcon = createAnimatedIcon(Server);
export const HardDriveIcon = createAnimatedIcon(HardDrive);
export const MemoryIcon = createAnimatedIcon(MemoryStick);
export const ThermometerIcon = createAnimatedIcon(Thermometer);
export const GaugeIcon = createAnimatedIcon(Gauge);

// Status Icons
export const CheckIcon = createAnimatedIcon(CheckCircle);
export const ErrorIcon = createAnimatedIcon(XCircle);
export const WarningIcon = createAnimatedIcon(AlertTriangle);
export const ClockIcon = createAnimatedIcon(Clock);

// Chart Icons
export const LineChartIcon = createAnimatedIcon(LineChart);
export const BarChartIcon = createAnimatedIcon(BarChart3);
export const PieChartIcon = createAnimatedIcon(PieChart);
export const ActivityIcon = createAnimatedIcon(Activity);

// Wallet Icons
export const WalletIcon = createAnimatedIcon(Wallet);
export const CreditCardIcon = createAnimatedIcon(CreditCard);
export const CoinsIcon = createAnimatedIcon(Coins);
export const BitcoinIcon = createAnimatedIcon(Bitcoin);

// Arrow Icons
export const ArrowUpIcon = createAnimatedIcon(ArrowUpRight);
export const ArrowDownIcon = createAnimatedIcon(ArrowDownRight);

// Control Icons
export const PlayIcon = createAnimatedIcon(PlayCircle);
export const PauseIcon = createAnimatedIcon(PauseCircle);
export const StopIcon = createAnimatedIcon(StopCircle);
export const RefreshIcon = createAnimatedIcon(RefreshCw, {
  animate: { rotate: 360 },
  transition: { duration: 1, ease: 'linear' }
});

// Notification Icons
export const BellIcon = createAnimatedIcon(Bell, {
  animate: { rotate: [0, 15, -15, 0] },
  transition: { duration: 0.5 }
});

export const MailIcon = createAnimatedIcon(Mail);
export const MessageIcon = createAnimatedIcon(MessageSquare);

// Navigation Icons
export const HomeIcon = createAnimatedIcon(Home);
export const SettingsIcon = createAnimatedIcon(Settings);
export const UserIcon = createAnimatedIcon(User);

// Utility Icons
export const SearchIcon = createAnimatedIcon(Search);
export const FilterIcon = createAnimatedIcon(Filter);
export const MoreIcon = createAnimatedIcon(MoreHorizontal);
export const PlusIcon = createAnimatedIcon(Plus);
export const MinusIcon = createAnimatedIcon(Minus);
export const CloseIcon = createAnimatedIcon(X);

// Export all Lucide icons for direct use
export {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Shield,
  Target,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Wallet,
  CreditCard,
  Coins,
  Bitcoin,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Rocket,
  Star,
  Diamond,
  Crown,
  Trophy,
  Flame,
  Sparkles,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Server,
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Gauge,
  Settings,
  RefreshCw,
  Power,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Send,
  Download,
  Upload,
  Share,
  Copy,
  ExternalLink,
  Maximize,
  Minimize,
  MoreHorizontal,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  X,
  Check,
  Search,
  Filter,
  Calendar,
  Clock3,
  MapPin,
  Globe,
  Home,
  User,
  Users,
  Building,
  Briefcase,
  BookOpen,
  FileText,
  Image,
  Video,
  Music,
  Headphones,
  Camera,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  Watch,
  Gamepad2,
  Car,
  Plane,
  Ship,
  Train,
  Bike,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Smile,
  Frown,
  Brain,
  Lightbulb,
  Info,
  Recycle,
  Trash
};

// Icon registry for dynamic icon loading
export const iconRegistry = {
  // Trading
  profit: ProfitIcon,
  loss: LossIcon,
  money: MoneyIcon,
  lightning: LightningIcon,
  shield: ShieldIcon,
  rocket: RocketIcon,
  diamond: DiamondIcon,
  flame: FlameIcon,
  sparkles: SparklesIcon,
  crown: CrownIcon,
  trophy: TrophyIcon,
  
  // System
  cpu: CPUIcon,
  server: ServerIcon,
  harddrive: HardDriveIcon,
  memory: MemoryIcon,
  thermometer: ThermometerIcon,
  gauge: GaugeIcon,
  
  // Status
  check: CheckIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  clock: ClockIcon,
  
  // Charts
  linechart: LineChartIcon,
  barchart: BarChartIcon,
  piechart: PieChartIcon,
  activity: ActivityIcon,
  
  // Wallet
  wallet: WalletIcon,
  creditcard: CreditCardIcon,
  coins: CoinsIcon,
  bitcoin: BitcoinIcon,
  
  // Arrows
  arrowup: ArrowUpIcon,
  arrowdown: ArrowDownIcon,
  
  // Controls
  play: PlayIcon,
  pause: PauseIcon,
  stop: StopIcon,
  refresh: RefreshIcon,
  
  // Notifications
  bell: BellIcon,
  mail: MailIcon,
  message: MessageIcon,
  
  // Navigation
  home: HomeIcon,
  settings: SettingsIcon,
  user: UserIcon,
  
  // Utility
  search: SearchIcon,
  filter: FilterIcon,
  more: MoreIcon,
  plus: PlusIcon,
  minus: MinusIcon,
  close: CloseIcon,
};

export type IconName = keyof typeof iconRegistry;