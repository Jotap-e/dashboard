"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis, Legend } from "recharts"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A multiple line chart"

export type ChartConfig = {
  [key: string]: {
    label: string
    color: string
  }
}

interface ChartLineMultipleProps {
  data?: Array<{ date: string; [key: string]: string | number }>
  config?: ChartConfig
  title?: string
  description?: string
  footer?: React.ReactNode
}

export function ChartLineMultiple({
  data = [],
  config = {},
  title = "",
  description = "",
  footer,
}: ChartLineMultipleProps) {
  return (
    <Card className="bg-transparent border-none shadow-none w-full">
      <CardContent className="p-0 w-full">
        <ChartContainer config={config} className="w-full" style={{ height: 'clamp(757px, 75.7vh, 1513px)', width: '100%', aspectRatio: 'unset' }}>
          <LineChart
            data={data}
            margin={{
              left: 20,
              right: 20,
              top: 20,
              bottom: 40,
            }}
          >
            <CartesianGrid 
              vertical={false} 
              stroke="#475569" 
              strokeOpacity={0.3}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={1}
              stroke="#64748b"
              strokeOpacity={0.5}
              tick={{ fill: '#94a3b8', fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={[0, 30]}
              ticks={[0, 5, 10, 15, 20, 25, 30]}
              stroke="#64748b"
              strokeOpacity={0.5}
              tick={{ fill: '#94a3b8', fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}
            />
            <ChartTooltip 
              cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={<ChartTooltipContent />} 
            />
            {Object.keys(config).map((key) => {
              const configItem = config[key];
              return (
                <Line
                  key={key}
                  dataKey={key}
                  type="monotone"
                  stroke={configItem.color}
                  strokeWidth={2}
                  dot={false}
                  name={configItem.label}
                />
              );
            })}
            <Legend 
              wrapperStyle={{ paddingTop: 'clamp(0.75rem, 1.5vw, 1.5rem)', textAlign: 'left' }}
              iconType="line"
              align="left"
              formatter={(value, entry: any) => (
                <span style={{ color: '#94a3b8', fontSize: 'clamp(0.75rem, 1.2vw, 1rem)' }}>{value}</span>
              )}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      {footer && <div className="pt-4">{footer}</div>}
    </Card>
  )
}
