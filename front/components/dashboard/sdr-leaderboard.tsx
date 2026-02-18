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
import { SDRPerformance } from '@/lib/types/sales';

interface SDRLeaderboardProps {
  data: SDRPerformance[];
}

export function SDRLeaderboard({ data }: SDRLeaderboardProps) {
  const sortedData = [...data].sort((a, b) => b.sqlsGenerated - a.sqlsGenerated);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-200">Leaderboard SDRs</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 70, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <YAxis dataKey="name" type="category" width={70} stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ color: '#94a3b8' }} />
            <Bar
              dataKey="meetingsScheduled"
              fill="#60a5fa"
              name="Reuniões Agendadas"
            />
            <Bar
              dataKey="meetingsCompleted"
              fill="#4ade80"
              name="Reuniões Realizadas"
            />
            <Bar
              dataKey="sqlsGenerated"
              fill="#fbbf24"
              name="SQLs Gerados"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
