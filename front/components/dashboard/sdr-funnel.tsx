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
  Cell,
} from 'recharts';
import { SDRFunnel } from '@/lib/types/sales';

interface SDRFunnelChartProps {
  data: SDRFunnel[];
}

export function SDRFunnelChart({ data }: SDRFunnelChartProps) {
  const colors = ['#60a5fa', '#4ade80', '#fbbf24', '#f87171'];
  const reversedData = [...data].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Funil de Conversão SDR</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={reversedData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="stage" type="category" width={100} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                `${value.toLocaleString('pt-BR')} (${props.payload.conversionRate}%)`,
                'Valor',
              ]}
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {reversedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-0.5 text-xs text-slate-300">
          {data.map((item, index) => {
            if (index === 0) return null;
            const prevValue = data[index - 1].value;
            const conversion = ((item.value / prevValue) * 100).toFixed(1);
            return (
              <div key={item.stage} className="flex justify-between">
                <span>{data[index - 1].stage} → {item.stage}:</span>
                <span className="font-semibold text-white">{conversion}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
