'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { CloserPerformance } from '@/lib/types/sales';

interface CloserLeaderboardProps {
  data: CloserPerformance[];
}

export function CloserLeaderboard({ data }: CloserLeaderboardProps) {
  const chartData = data
    .map((closer) => ({
      name: closer.name,
      receita: closer.revenue,
      meta: closer.target,
      atingimento: (closer.revenue / closer.target) * 100,
    }))
    .sort((a, b) => b.atingimento - a.atingimento);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Leaderboard Closers</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 70, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="name" type="category" width={70} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'atingimento') {
                  return `${value.toFixed(1)}%`;
                }
                return `R$ ${value.toLocaleString('pt-BR')}`;
              }}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar dataKey="receita" fill="#4ade80" name="Receita Fechada" />
            <Bar dataKey="meta" fill="#94a3b8" name="Meta Individual" />
            <ReferenceLine x={100} stroke="#f87171" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
