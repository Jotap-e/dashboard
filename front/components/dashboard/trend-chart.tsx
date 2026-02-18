'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendData } from '@/lib/types/sales';

interface TrendChartProps {
  data: TrendData[];
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Tendência de Fechamento vs. Meta</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="date" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              formatter={(value: number) =>
                `R$ ${value.toLocaleString('pt-BR')}`
              }
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Area
              type="monotone"
              dataKey="forecast"
              stackId="1"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.4}
              name="Forecast Ponderado"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="#cbd5e1"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Meta Alvo"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#22c55e"
              strokeWidth={2}
              name="Realizado"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
