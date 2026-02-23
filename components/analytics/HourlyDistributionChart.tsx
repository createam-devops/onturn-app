'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface HourlyDistributionChartProps {
  data: Array<{
    hour: string
    count: number
  }>
}

const COLORS = [
  '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
  '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe',
  '#3b82f6', '#60a5fa', '#93c5fd', '#dbeafe', '#3b82f6'
]

export function HourlyDistributionChart({ data }: HourlyDistributionChartProps) {
  // Encontrar la hora con más citas para destacarla
  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">
          Distribución Horaria
        </CardTitle>
        <p className="text-sm text-slate-600">Citas por hora del día</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="hour" 
              stroke="#64748b"
              style={{ fontSize: '11px' }}
            />
            <YAxis 
              stroke="#64748b"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.count === maxCount ? '#10b981' : COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            <span className="inline-block w-3 h-3 bg-green-500 rounded mr-2" />
            Hora pico
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
