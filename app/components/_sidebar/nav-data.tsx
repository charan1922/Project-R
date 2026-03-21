import {
  Activity,
  BarChart2,
  Bot,
  Brain,
  CalendarDays,
  Clock,
  Compass,
  Database,
  Download,
  Flame,
  FlaskConical,
  HardDrive,
  History,
  Layers,
  LayoutGrid,
  LineChart,
  List,
  Settings,
  Shield,
  Table2,
  TestTube2,
  Upload,
  Zap,
} from 'lucide-react';
import type React from 'react';

export interface NavItemType {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: NavItemType[];
}

export const v1Items: NavItemType[] = [
  {
    label: 'v1.0 (Current)',
    href: '/v1',
    icon: <Zap className="w-4 h-4" />,
    children: [
      {
        label: 'Intraday Boost Live',
        href: '/trading-lab/intraday-boost?tab=live',
        icon: <Flame className="w-4 h-4" />,
        badge: 'LIVE',
      },
      {
        label: 'Intraday Boost Past',
        href: '/trading-lab/intraday-boost?tab=past',
        icon: <Flame className="w-4 h-4" />,
        badge: 'EOD',
      },
      {
        label: 'Option Chain',
        href: '/trading-lab/option-chain',
        icon: <Activity className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'Market Intelligence',
        href: '/trading-lab/intelligence',
        icon: <Brain className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'Trade Journal',
        href: '/trading-lab/tradefinder',
        icon: <LineChart className="w-4 h-4" />,
        badge: 'ANALYTICS',
      },
      {
        label: 'F&O Universe',
        href: '/trading-lab/fno-universe',
        icon: <Layers className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'R-Factor History',
        href: '/trading-lab/r-factor-history',
        icon: <Clock className="w-4 h-4" />,
      },
      {
        label: 'Master Contracts',
        href: '/trading-lab/master-contracts',
        icon: <Database className="w-4 h-4" />,
      },
      {
        label: 'Bhavcopy',
        href: '/trading-lab/bhavcopy',
        icon: <BarChart2 className="w-4 h-4" />,
      },
    ],
  },
];

export const marketScopeItems: NavItemType[] = [
  {
    label: 'Market Scope',
    href: '/trading-lab/sector-scope',
    icon: <Compass className="w-4 h-4" />,
    badge: 'LIVE',
    children: [
      {
        label: 'Sector Heatmap',
        href: '/trading-lab/sector-scope',
        icon: <LayoutGrid className="w-3.5 h-3.5" />,
        badge: 'NEW',
      },
      {
        label: 'Sector Chart',
        href: '/trading-lab/sector-scope/chart',
        icon: <BarChart2 className="w-3.5 h-3.5" />,
      },
      {
        label: 'Sector Tables',
        href: '/trading-lab/sector-scope/tables',
        icon: <Table2 className="w-3.5 h-3.5" />,
      },
    ],
  },
];

export const historifyItems: NavItemType[] = [
  {
    label: 'Historify',
    href: '/historify',
    icon: <Database className="w-4 h-4" />,
    badge: 'DATA',
    children: [
      {
        label: 'Live Trading',
        href: '/historify/live',
        icon: <Activity className="w-4 h-4" />,
        badge: 'LIVE',
      },
      {
        label: 'Dashboard',
        href: '/historify',
        icon: <Activity className="w-4 h-4" />,
      },
      {
        label: 'Watchlist',
        href: '/historify/watchlist',
        icon: <List className="w-4 h-4" />,
      },
      {
        label: 'Charts',
        href: '/historify/charts',
        icon: <BarChart2 className="w-4 h-4" />,
      },
      {
        label: 'Day Chart',
        href: '/historify/day-chart',
        icon: <CalendarDays className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'Download',
        href: '/historify/download',
        icon: <Download className="w-4 h-4" />,
      },
      {
        label: 'Import',
        href: '/historify/import',
        icon: <Upload className="w-4 h-4" />,
      },
      {
        label: 'Export',
        href: '/historify/export',
        icon: <HardDrive className="w-4 h-4" />,
      },
      {
        label: 'Scheduler',
        href: '/historify/scheduler',
        icon: <Clock className="w-4 h-4" />,
      },
      {
        label: 'Settings',
        href: '/historify/settings',
        icon: <Settings className="w-4 h-4" />,
      },
    ],
  },
];

export const quantLabItems: NavItemType[] = [
  {
    label: 'Quant Lab',
    href: '/quant',
    icon: <TestTube2 className="w-4 h-4" />,
    badge: 'NEW',
    children: [
      {
        label: 'Sector Rotation',
        href: '/quant/sector-rotation',
        icon: <Compass className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'Backtester',
        href: '/quant/backtester',
        icon: <FlaskConical className="w-4 h-4" />,
        badge: 'NEW',
      },
    ],
  },
];

export const aiTradingItems: NavItemType[] = [
  {
    label: 'AI Trading',
    href: '/trading-lab/ai-autopilot',
    icon: <Bot className="w-4 h-4" />,
    badge: 'AI',
    children: [
      {
        label: 'AI Autopilot',
        href: '/trading-lab/ai-autopilot',
        icon: <Brain className="w-4 h-4" />,
        badge: 'LIVE',
      },
      {
        label: 'Trade History',
        href: '/trading-lab/ai-autopilot/history',
        icon: <History className="w-4 h-4" />,
      },
      {
        label: 'Strategy Config',
        href: '/trading-lab/ai-autopilot/config',
        icon: <Settings className="w-4 h-4" />,
      },
      {
        label: 'Option Trader',
        href: '/trading-lab/ai-autopilot/options',
        icon: <Activity className="w-4 h-4" />,
        badge: 'NEW',
      },
      {
        label: 'Risk Manager',
        href: '/trading-lab/ai-autopilot/risk',
        icon: <Shield className="w-4 h-4" />,
      },
    ],
  },
];
