"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface NegotiationData {
  name: string;
  criadas: number;
  vendidas: number;
  perdidas: number;
}

interface ChartHorizontalBarProps {
  data: NegotiationData[];
}

// Tooltip customizado sem fundo branco
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.95)',
          border: '1px solid rgba(51, 65, 85, 0.8)',
          borderRadius: '6px',
          padding: 'clamp(0.5rem, 1vw, 0.75rem)',
          fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
          color: '#e2e8f0',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Nome do vendedor */}
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: 'clamp(0.5rem, 1vw, 0.75rem)',
          paddingBottom: 'clamp(0.5rem, 1vw, 0.75rem)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
          color: '#ffffff'
        }}>
          {label}
        </div>
        {/* Dados das negociações */}
        {payload.map((entry: any, index: number) => (
          <div key={index} style={{ marginBottom: index < payload.length - 1 ? '0.5rem' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: entry.color,
                  borderRadius: '2px',
                }}
              />
              <span style={{ color: '#e2e8f0' }}>
                {entry.name}: <strong>{entry.value}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ChartHorizontalBar({ data }: ChartHorizontalBarProps) {
  return (
    <Card className="bg-transparent border-none shadow-none w-full">
      <CardContent className="p-0 w-full">
        <ResponsiveContainer width="100%" height={data.length * 151 + 189}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{
              left: Math.max(150, Math.max(...data.map(d => d.name.length)) * 6 + 20),
              right: 0,
              top: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#475569" 
              strokeOpacity={0.3}
              horizontal={false}
            />
            <XAxis 
              type="number" 
              domain={[0, 50]}
              ticks={[0, 10, 20, 30, 40, 50]}
              stroke="#64748b"
              strokeOpacity={0.5}
              tick={{ fill: '#94a3b8', fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={Math.max(150, Math.max(...data.map(d => d.name.length)) * 6 + 20)}
              stroke="#64748b"
              strokeOpacity={0.5}
              tick={{ 
                fill: '#94a3b8', 
                fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
                fontFamily: "'Poppins', sans-serif"
              }}
              interval={0}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'transparent' }}
            />
            <Legend 
              wrapperStyle={{ 
                paddingTop: 'clamp(0.75rem, 1.5vw, 1.5rem)', 
                textAlign: 'left',
                fontSize: 'clamp(0.75rem, 1.2vw, 1rem)'
              }}
              iconType="square"
              align="left"
              formatter={(value, entry: any) => (
                <span style={{ color: '#94a3b8' }}>{value}</span>
              )}
            />
            <Bar 
              dataKey="criadas" 
              fill="#3b82f6" 
              name="Negociações criadas"
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="vendidas" 
              fill="#22c55e" 
              name="Negociações vendidas"
              radius={[0, 4, 4, 0]}
            />
            <Bar 
              dataKey="perdidas" 
              fill="#ef4444" 
              name="Negociações perdidas"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
