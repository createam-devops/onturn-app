'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Star, TrendingUp } from 'lucide-react'

interface SpecialistPerformanceTableProps {
  data: Array<{
    id: string
    name: string
    totalAppointments: number
    completedAppointments: number
    averageRating: number
    revenue: number
  }>
}

export function SpecialistPerformanceTable({ data }: SpecialistPerformanceTableProps) {
  if (data.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-900">
            Rendimiento de Especialistas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-8">
            No hay datos de especialistas disponibles
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-slate-900">
          Rendimiento de Especialistas
        </CardTitle>
        <p className="text-sm text-slate-600">Últimos 30 días</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                  Especialista
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Total Citas
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Completadas
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                  Rating
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  Ingresos
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((specialist, index) => {
                const completionRate = specialist.totalAppointments > 0
                  ? Math.round((specialist.completedAppointments / specialist.totalAppointments) * 100)
                  : 0

                return (
                  <tr 
                    key={specialist.id} 
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      index === 0 ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <TrendingUp size={16} className="text-blue-600" />
                        )}
                        <span className="font-medium text-slate-900">
                          {specialist.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-semibold text-slate-700">
                        {specialist.totalAppointments}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm font-semibold text-green-600">
                          {specialist.completedAppointments}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({completionRate}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star size={14} className="text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold text-slate-700">
                          {specialist.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-sm font-bold text-green-600">
                        ${specialist.revenue.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total:</span>
              <div className="flex gap-8">
                <span className="font-semibold text-slate-700">
                  {data.reduce((sum, s) => sum + s.totalAppointments, 0)} citas
                </span>
                <span className="font-semibold text-green-600">
                  ${data.reduce((sum, s) => sum + s.revenue, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
