'use client'

import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'teal'
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue'
}: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600'
  }

  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <TrendingUp size={16} className="text-green-600" />
    if (trend.value < 0) return <TrendingDown size={16} className="text-red-600" />
    return <Minus size={16} className="text-gray-400" />
  }

  const getTrendColor = () => {
    if (!trend) return ''
    if (trend.value > 0) return 'text-green-600'
    if (trend.value < 0) return 'text-red-600'
    return 'text-gray-400'
  }

  return (
    <Card className="overflow-hidden border-slate-200 hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className={`h-2 bg-gradient-to-r ${colorClasses[color]}`} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
              <p className="text-3xl font-bold text-slate-900">{value}</p>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
              )}
            </div>
            {icon && (
              <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}>
                <div className="text-white">
                  {icon}
                </div>
              </div>
            )}
          </div>
          
          {trend && (
            <div className="flex items-center gap-2 text-sm">
              {getTrendIcon()}
              <span className={`font-semibold ${getTrendColor()}`}>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-slate-500">{trend.label}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
