'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { CloserPerformance } from '@/lib/types/sales';

interface EfficiencyMatrixProps {
  data: CloserPerformance[];
}

export function EfficiencyMatrix({ data }: EfficiencyMatrixProps) {
  const avgPipeline =
    data.reduce((sum, item) => sum + item.pipeline, 0) / data.length;
  const avgWinRate =
    data.reduce((sum, item) => sum + item.winRate, 0) / data.length;

  const chartData = data.map((closer) => ({
    name: closer.name,
    pipeline: closer.pipeline,
    winRate: closer.winRate,
    revenue: closer.revenue,
  }));

  const getColor = (pipeline: number, winRate: number) => {
    if (pipeline >= avgPipeline && winRate >= avgWinRate) {
      return '#4ade80'; // Alto Pipeline / Alto Win Rate
    }
    if (pipeline < avgPipeline && winRate >= avgWinRate) {
      return '#60a5fa'; // Baixo Pipeline / Alto Win Rate
    }
    if (pipeline >= avgPipeline && winRate < avgWinRate) {
      return '#fbbf24'; // Alto Pipeline / Baixo Win Rate
    }
    return '#f87171'; // Baixo Pipeline / Baixo Win Rate
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Matriz Win Rate x Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <ScatterChart
            margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
          >
            <CartesianGrid stroke="#475569" />
            <XAxis
              type="number"
              dataKey="pipeline"
              name="Pipeline"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              label={{ value: 'Pipeline (R$)', position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
              domain={[0, 'dataMax + 100000']}
            />
            <YAxis
              type="number"
              dataKey="winRate"
              name="Win Rate"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: '#64748b' }}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
              formatter={(value: number, name: string, props: any) => {
                if (name === 'winRate') {
                  return [`${value.toFixed(1)}%`, 'Win Rate'];
                }
                if (name === 'pipeline') {
                  return [`R$ ${value.toLocaleString('pt-BR')}`, 'Pipeline'];
                }
                return [props.payload.name, 'Vendedor'];
              }}
            />
            <ReferenceLine
              x={avgPipeline}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: 'Média Pipeline', position: 'top', fill: '#94a3b8' }}
            />
            <ReferenceLine
              y={avgWinRate}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              label={{ value: 'Média Win Rate', position: 'right', fill: '#94a3b8' }}
            />
            <Scatter name="Vendedores" data={chartData} fill="#8884d8">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getColor(entry.pipeline, entry.winRate)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-400 rounded"></div>
              <span>Alto Pipeline / Alto Win Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded"></div>
              <span>Baixo Pipeline / Alto Win Rate</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-400 rounded"></div>
              <span>Alto Pipeline / Baixo Win Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span>Baixo Pipeline / Baixo Win Rate</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
