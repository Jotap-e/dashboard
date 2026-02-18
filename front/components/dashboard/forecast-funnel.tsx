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
} from 'recharts';
import { ForecastData } from '@/lib/types/sales';

interface ForecastFunnelProps {
  data: ForecastData[];
  target: number;
}

export function ForecastFunnel({ data, target }: ForecastFunnelProps) {
  const totalForecast = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Funil de Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 60, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="category" type="category" width={80} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              formatter={(value: number) =>
                `R$ ${value.toLocaleString('pt-BR')}`
              }
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar dataKey="value" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          <div className="flex justify-between">
            <span>Total Forecast:</span>
            <span className="font-semibold text-white">
              R$ {totalForecast.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Meta:</span>
            <span className="font-semibold text-white">
              R$ {target.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Cobertura:</span>
            <span className="font-semibold text-white">
              {(totalForecast / target).toFixed(1)}x
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
