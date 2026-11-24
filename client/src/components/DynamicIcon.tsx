import React from 'react';
import * as LucideIcons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  className = 'w-5 h-5',
  size,
  color,
}) => {
  // Normalize name to PascalCase
  const cleanName = name ? name.trim() : 'Circle';
  const IconComponent = (LucideIcons as any)[cleanName] || LucideIcons.CircleHelp || LucideIcons.Circle;

  return <IconComponent className={className} size={size} color={color} />;
};

export const AVAILABLE_ICONS = [
  // Categories & Finance
  'Utensils', 'ShoppingCart', 'Home', 'Car', 'HeartPulse', 'GraduationCap',
  'Gamepad2', 'ShoppingBag', 'Repeat', 'Receipt', 'CreditCard', 'MoreHorizontal',
  'Briefcase', 'TrendingUp', 'Tag', 'LineChart', 'Gift', 'PlusCircle',
  // Accounts & Assets
  'Building2', 'Wallet', 'PiggyBank', 'Landmark', 'Coins', 'Banknote',
  // Goals & Lifestyle
  'Shield', 'Plane', 'Laptop', 'Smartphone', 'Tv', 'Wifi',
  'Coffee', 'Fuel', 'Heart', 'Sparkles', 'Target', 'Trophy',
  'BookOpen', 'Dumbbell', 'Music', 'Film', 'Key', 'Percent'
];

export const AVAILABLE_COLORS = [
  '#059669', // Emerald
  '#10b981', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#14b8a6', // Teal
  '#64748b', // Slate
  '#334155', // Slate dark
];
