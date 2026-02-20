'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Transaction {
  id: string
  amount: string
  type: string
  timestamp: Date
  source?: string
}

interface ProjectChartsProps {
  transactions: Transaction[]
  projectName: string
}

export default function ProjectCharts({ transactions, projectName }: ProjectChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedSource, setSelectedSource] = useState('blockchain')

  const periods = [
    { value: '7', label: '7 дней' },
    { value: '30', label: '30 дней' },
    { value: '90', label: '3 месяца' },
    { value: 'all', label: 'Всё время' },
  ]

  const sources = [
    { value: 'blockchain', label: '⛓️ Крипто', description: 'Реальный баланс' },
    { value: 'onlyfans', label: '💎 OnlyFans', description: 'Виртуальный учет' },
    { value: 'all', label: '📊 Все', description: 'Общая статистика' },
  ]

  // Filter by period and source
  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.filter(tx => tx.source === selectedSource)
    }

    // Filter by period
    if (selectedPeriod !== 'all') {
      const days = parseInt(selectedPeriod)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= cutoffDate)
    }

    return filtered
  }, [transactions, selectedPeriod, selectedSource])

  // Calculate stats
  const stats = useMemo(() => {
    const incoming = filteredTransactions
      .filter(tx => tx.type === 'incoming')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
    const outgoing = filteredTransactions
      .filter(tx => tx.type === 'outgoing')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
    return { incoming, outgoing }
  }, [filteredTransactions])

  // Income vs Expense data
  const incomeExpenseData = [
    { name: 'Доходы', value: stats.incoming, fill: '#10b981' },
    { name: 'Расходы', value: stats.outgoing, fill: '#ef4444' },
  ].filter(item => item.value > 0)

  // Daily data
  const dailyData = useMemo(() => {
    const days = selectedPeriod === 'all' ? 30 : parseInt(selectedPeriod)
    const dailyMap = new Map<string, { incoming: number; outgoing: number }>()

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dailyMap.set(dateStr, { incoming: 0, outgoing: 0 })
    }

    filteredTransactions.forEach(tx => {
      const dateStr = new Date(tx.timestamp).toISOString().split('T')[0]
      if (dailyMap.has(dateStr)) {
        const day = dailyMap.get(dateStr)!
        if (tx.type === 'incoming') {
          day.incoming += parseFloat(tx.amount)
        } else {
          day.outgoing += parseFloat(tx.amount)
        }
      }
    })

    let cumulativeBalance = 0
    return Array.from(dailyMap.entries()).map(([date, data]) => {
      const dayBalance = data.incoming - data.outgoing
      cumulativeBalance += dayBalance
      return {
        date: new Date(date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        incoming: data.incoming,
        outgoing: data.outgoing,
        balance: cumulativeBalance,
      }
    })
  }, [filteredTransactions, selectedPeriod])

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

  if (transactions.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6 space-y-4">
          {/* Source Filter */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Источник</label>
            <div className="flex gap-2 flex-wrap">
              {sources.map((source) => (
                <Button
                  key={source.value}
                  variant={selectedSource === source.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSource(source.value)}
                  className={
                    selectedSource === source.value
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }
                >
                  <span className="flex items-center gap-2">
                    {source.label}
                    <span className="text-xs opacity-70">• {source.description}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Period Filter */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Период</label>
            <div className="flex gap-2 flex-wrap">
              {periods.map((period) => (
                <Button
                  key={period.value}
                  variant={selectedPeriod === period.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPeriod(period.value)}
                  className={
                    selectedPeriod === period.value
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income vs Expense */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {selectedSource === 'blockchain' ? '⛓️ Крипто' : selectedSource === 'onlyfans' ? '💎 OnlyFans' : '📊 Все'} • Доходы vs Расходы
            </CardTitle>
            <CardDescription className="text-gray-400">{projectName}</CardDescription>
          </CardHeader>
          <CardContent>
            {incomeExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={incomeExpenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
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
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                Нет данных для {selectedSource === 'blockchain' ? 'крипто' : selectedSource === 'onlyfans' ? 'OnlyFans' : 'выбранного источника'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Статистика</CardTitle>
            <CardDescription className="text-gray-400">
              {selectedSource === 'blockchain' ? 'Реальный баланс (крипто)' :
               selectedSource === 'onlyfans' ? 'Виртуальный учет (OnlyFans)' :
               'Общая статистика'} • За выбранный период
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="text-gray-300">{selectedSource === 'onlyfans' ? 'Дебет' : 'Доходы'}</span>
              <span className="text-green-400 font-semibold text-lg">
                +{formatCurrency(stats.incoming)} {selectedSource === 'blockchain' ? 'USDT' : selectedSource === 'onlyfans' ? 'USD' : 'USD'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <span className="text-gray-300">{selectedSource === 'onlyfans' ? 'Кредит' : 'Расходы'}</span>
              <span className="text-red-400 font-semibold text-lg">
                -{formatCurrency(stats.outgoing)} {selectedSource === 'blockchain' ? 'USDT' : selectedSource === 'onlyfans' ? 'USD' : 'USD'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <span className="text-gray-300">Баланс</span>
              <span className={`font-semibold text-lg ${stats.incoming >= stats.outgoing ? 'text-green-400' : 'text-red-400'}`}>
                {stats.incoming >= stats.outgoing ? '+' : ''}{formatCurrency(stats.incoming - stats.outgoing)} {selectedSource === 'blockchain' ? 'USDT' : selectedSource === 'onlyfans' ? 'USD' : 'USD'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Chart */}
      <Card className="bg-gray-900 border-gray-800">
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
              Нет данных
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
