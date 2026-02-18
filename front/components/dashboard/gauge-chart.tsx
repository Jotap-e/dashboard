'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Label,
} from 'recharts';
import { cn } from '@/lib/utils';

interface GaugeChartProps {
  title: string;
  value: number;
  subtitle?: string;
}

export function GaugeChart({ title, value, subtitle }: GaugeChartProps) {
  const data = [
    { name: 'Atingido', value },
    { name: 'Restante', value: 100 - value },
  ];

  const getColor = (val: number) => {
    if (val >= 90) return '#4ade80'; // Verde
    if (val >= 70) return '#fbbf24'; // Amarelo
    return '#f87171'; // Vermelho
  };

  const color = getColor(value);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={100}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={30}
              outerRadius={40}
              paddingAngle={0}
              dataKey="value"
            >
              <Cell fill={color} />
              <Cell fill="#475569" />
              <Label
                value={`${value}%`}
                position="center"
                className="text-xl font-bold"
                fill={color}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {subtitle && (
          <p className="text-xs text-slate-300 text-center mt-2">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
