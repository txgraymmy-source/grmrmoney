'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Category {
  id: string
  name: string
}

interface DashboardFiltersProps {
  categories: Category[]
  selectedPeriod: string
  selectedCategory: string
  customStartDate?: string
  customEndDate?: string
  onPeriodChange: (period: string) => void
  onCategoryChange: (categoryId: string) => void
  onCustomDateChange?: (startDate: string, endDate: string) => void
}

export default function DashboardFilters({
  categories,
  selectedPeriod,
  selectedCategory,
  customStartDate,
  customEndDate,
  onPeriodChange,
  onCategoryChange,
  onCustomDateChange,
}: DashboardFiltersProps) {
  const periods = [
    { value: '7', label: '7 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '3 месяца' },
    { value: 'all', label: 'Всё время' },
    { value: 'custom', label: 'Произвольный' },
  ]

  return (
    <Card className="card-rounded">
      <CardContent className="pt-6 space-y-4">
        {/* Period */}
        <div>
          <label className="text-[13px] text-white/40 mb-2 block">Период</label>
          <div className="flex gap-2 flex-wrap">
            {periods.map(period => (
              <Button
                key={period.value}
                variant={selectedPeriod === period.value ? 'default' : 'secondary'}
                size="sm"
                onClick={() => onPeriodChange(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom date range */}
        {selectedPeriod === 'custom' && onCustomDateChange && (
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[150px]">
              <label className="text-[13px] text-white/40 mb-2 block">С даты</label>
              <Input
                type="date"
                value={customStartDate || ''}
                onChange={e => onCustomDateChange(e.target.value, customEndDate || '')}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-[13px] text-white/40 mb-2 block">По дату</label>
              <Input
                type="date"
                value={customEndDate || ''}
                onChange={e => onCustomDateChange(customStartDate || '', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Category */}
        <div>
          <label className="text-[13px] text-white/40 mb-2 block">Проект</label>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => onCategoryChange('all')}
            >
              Все проекты
            </Button>
            {categories.slice(0, 5).map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'secondary'}
                size="sm"
                onClick={() => onCategoryChange(category.id)}
              >
                {category.name}
              </Button>
            ))}
            {categories.length > 5 && (
              <select
                value={selectedCategory}
                onChange={e => onCategoryChange(e.target.value)}
                className="h-9 px-3 rounded-[12px] text-sm"
              >
                <option value="">Другие...</option>
                {categories.slice(5).map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
