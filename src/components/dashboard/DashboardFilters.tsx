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
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Period Filter */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Период</label>
            <div className="flex gap-2 flex-wrap">
              {periods.map((period) => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPeriodChange(period.value)}
                  className={
                    selectedPeriod === period.value
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          {selectedPeriod === 'custom' && onCustomDateChange && (
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm text-gray-400 mb-2 block">С даты</label>
                <Input
                  type="date"
                  value={customStartDate || ''}
                  onChange={(e) => onCustomDateChange(e.target.value, customEndDate || '')}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm text-gray-400 mb-2 block">По дату</label>
                <Input
                  type="date"
                  value={customEndDate || ''}
                  onChange={(e) => onCustomDateChange(customStartDate || '', e.target.value)}
                  className="bg-gray-800 border-gray-700 text-gray-300"
                />
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Проект</label>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onCategoryChange('all')}
                className={
                  selectedCategory === 'all'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }
              >
                Все проекты
              </Button>
              {categories.slice(0, 5).map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onCategoryChange(category.id)}
                  className={
                    selectedCategory === category.id
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }
                >
                  {category.name}
                </Button>
              ))}
              {categories.length > 5 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="">Другие...</option>
                  {categories.slice(5).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
