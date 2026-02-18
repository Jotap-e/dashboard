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
  ReferenceLine,
} from 'recharts';
import { CloserPerformance } from '@/lib/types/sales';

interface PipelineCoverageProps {
  data: CloserPerformance[];
  targetCoverage: number;
}

export function PipelineCoverage({
  data,
  targetCoverage = 3,
}: PipelineCoverageProps) {
  const chartData = data.map((closer) => {
    const remainingTarget = Math.max(0, closer.target - closer.revenue);
    const coverage = remainingTarget > 0 ? closer.pipeline / remainingTarget : 0;
    return {
      name: closer.name,
      coverage: coverage,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Cobertura de Pipeline</CardTitle>
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
              formatter={(value: number) => `${value.toFixed(1)}x`}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            />
            <ReferenceLine
              x={targetCoverage}
              stroke="#f87171"
              strokeDasharray="3 3"
              label={{ value: `Meta: ${targetCoverage}x`, position: 'top', fill: '#94a3b8' }}
            />
            <Bar dataKey="coverage" fill="#60a5fa" name="Cobertura (x)" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-slate-300 mt-1">
          Cobertura = Pipeline Aberto / Meta Restante
        </p>
      </CardContent>
    </Card>
  );
}
