'use client'

import { Button } from '@/components/ui/button'

interface DateRangeSelectProps {
  value: number
  onChange: (days: number) => void
}

export function DateRangeSelect({ value, onChange }: DateRangeSelectProps) {
  const ranges = [
    { label: '7 días', value: 7 },
    { label: '30 días', value: 30 },
    { label: '90 días', value: 90 },
    { label: '1 año', value: 365 }
  ]

  return (
    <div className="inline-flex gap-2 bg-slate-100 p-1 rounded-lg">
      {ranges.map(range => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            value === range.value
              ? 'bg-white text-[#003366] shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
