'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface PerformanceChartProps {
  data: Record<string, number>
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const chartData = Object.entries(data).map(([date, count]) => ({
    date: format(new Date(date), 'dd MMM', { locale: fr }),
    tests: count,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Historique des tests</h2>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="tests" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}