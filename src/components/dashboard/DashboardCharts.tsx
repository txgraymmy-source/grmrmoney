'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Category {
  id: string
  name: string
  balance: number
  incoming: number
  outgoing: number
  color: string
}

interface DailyData {
  date: string
  incoming: number
  outgoing: number
  balance: number
}

interface DashboardChartsProps {
  categories: Category[]
  dailyData: DailyData[]
  totalIncoming: number
  totalOutgoing: number
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

export default function DashboardCharts({ categories, dailyData, totalIncoming, totalOutgoing }: DashboardChartsProps) {
  // Prepare data for donut chart (categories distribution)
  const categoryData = categories.map((cat, index) => ({
    name: cat.name,
    value: Math.abs(cat.balance),
    fill: COLORS[index % COLORS.length],
  })).filter(item => item.value > 0)

  // Income vs Expense donut
  const incomeExpenseData = [
    { name: 'Доходы', value: totalIncoming, fill: '#10b981' },
    { name: 'Расходы', value: totalOutgoing, fill: '#ef4444' },
  ].filter(item => item.value > 0)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold">{payload[0].name}</p>
          <p className="text-purple-400">{formatCurrency(payload[0].value)} USDT</p>
        </div>
      )
    }
    return null
  }

  const LineChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-gray-400 text-xs mb-2">{label}</p>
          <p className="text-green-400 text-sm">Доход: {formatCurrency(payload[0].value)} USDT</p>
          <p className="text-red-400 text-sm">Расход: {formatCurrency(payload[1].value)} USDT</p>
          <p className="text-purple-400 text-sm font-semibold">Баланс: {formatCurrency(payload[2].value)} USDT</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Income vs Expense Donut */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Доходы vs Расходы</CardTitle>
          <CardDescription className="text-gray-400">Распределение за весь период</CardDescription>
        </CardHeader>
        <CardContent>
          {incomeExpenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeExpenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {incomeExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-gray-300">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Нет данных для отображения
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Distribution Donut */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Распределение по проектам</CardTitle>
          <CardDescription className="text-gray-400">Баланс по направлениям</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-gray-300 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Нет данных для отображения
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cashflow Line Chart */}
      <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white">Динамика кешфлоу</CardTitle>
          <CardDescription className="text-gray-400">Поступления и расходы по дням</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `${formatCurrency(value)}`}
                />
                <Tooltip content={<LineChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-gray-300">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="incoming"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Доходы"
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="outgoing"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Расходы"
                  dot={{ fill: '#ef4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Баланс"
                  dot={{ fill: '#8b5cf6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-gray-500">
              Нет данных для отображения
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
