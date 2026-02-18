'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  status?: 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  status,
  icon,
}: KPICardProps) {
  const statusColors = {
    success: 'text-green-400 border-green-500/50',
    warning: 'text-yellow-400 border-yellow-500/50',
    danger: 'text-red-400 border-red-500/50',
  };

  return (
    <Card className={cn(status && statusColors[status])}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-slate-200">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold text-white">{value}</div>
        {subtitle && (
          <p className="text-xs text-slate-300 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3 text-emerald-400 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-400 mr-1" />
            )}
            <span
              className={cn(
                'text-xs',
                trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
