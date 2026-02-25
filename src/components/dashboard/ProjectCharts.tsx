'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

const PERIOD_LABELS: Record<string, string> = {
  '7': '7 дней', '30': '30 дней', '90': '3 месяца', 'all': 'Всё время',
}

const SOURCE_LABELS: Record<string, string> = {
  blockchain: '⛓️ Крипто', onlyfans: '💎 OnlyFans', all: '📊 Все',
}

export default function ProjectCharts({ transactions, projectName }: ProjectChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedSource, setSelectedSource] = useState('blockchain')

  // Pending (inside dropdown)
  const [pendingPeriod, setPendingPeriod] = useState('30')
  const [pendingSource, setPendingSource] = useState('blockchain')

  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hasCustomFilter = selectedPeriod !== '30' || selectedSource !== 'blockchain'

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setPendingPeriod(selectedPeriod)
    setPendingSource(selectedSource)
    setOpen(true)
  }

  const apply = () => {
    setSelectedPeriod(pendingPeriod)
    setSelectedSource(pendingSource)
    setOpen(false)
  }

  const reset = () => {
    setSelectedPeriod('30')
    setSelectedSource('blockchain')
    setPendingPeriod('30')
    setPendingSource('blockchain')
    setOpen(false)
  }

  const triggerLabel = `${SOURCE_LABELS[selectedSource]} · ${PERIOD_LABELS[selectedPeriod]}`

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
        <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[14px] p-3 shadow-xl">
          <p className="text-white font-semibold">{payload[0].name}</p>
          <p className="text-[#d6d3ff]">{formatCurrency(payload[0].value)} USDT</p>
        </div>
      )
    }
    return null
  }

  const LineChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[14px] p-3 shadow-xl">
          <p className="text-white/50 text-xs mb-2">{label}</p>
          <p className="text-green-400 text-sm">Доход: {formatCurrency(payload[0].value)} USDT</p>
          <p className="text-red-400 text-sm">Расход: {formatCurrency(payload[1].value)} USDT</p>
          <p className="text-[#d6d3ff] text-sm font-semibold">Баланс: {formatCurrency(payload[2].value)} USDT</p>
        </div>
      )
    }
    return null
  }

  if (transactions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Filter trigger */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Статистика</h3>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={open ? () => setOpen(false) : handleOpen}
            className={`flex items-center gap-2 h-[46px] px-5 rounded-[14px] border text-[15px] font-medium transition-all ${
              hasCustomFilter
                ? 'border-[#d6d3ff]/30 bg-[#d6d3ff]/[0.08] text-[#d6d3ff]'
                : 'border-[rgba(120,120,128,0.2)] bg-[rgba(118,118,128,0.08)] text-white/50 hover:text-white hover:border-[rgba(120,120,128,0.35)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round"/>
            </svg>
            <span>{triggerLabel}</span>
            {hasCustomFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#d6d3ff] flex-shrink-0" />}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className={`transition-transform ${open ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-[260px] rounded-[18px] border border-[rgba(120,120,128,0.2)] bg-[#17171a] shadow-2xl z-50 overflow-hidden">

              {/* Источник */}
              <div className="p-4 border-b border-[rgba(120,120,128,0.1)]">
                <p className="text-[11px] text-white/35 uppercase tracking-wide mb-2.5">Источник</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['blockchain', 'onlyfans', 'all'] as const).map(v => (
                    <button key={v} onClick={() => setPendingSource(v)}
                      className={`h-7 px-3 rounded-[8px] text-[12px] font-medium transition-all ${
                        pendingSource === v
                          ? 'bg-[#d6d3ff] text-[#090909]'
                          : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white'
                      }`}>
                      {SOURCE_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Период */}
              <div className="p-4 border-b border-[rgba(120,120,128,0.1)]">
                <p className="text-[11px] text-white/35 uppercase tracking-wide mb-2.5">Период</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['7', '30', '90', 'all'] as const).map(v => (
                    <button key={v} onClick={() => setPendingPeriod(v)}
                      className={`h-7 px-3 rounded-[8px] text-[12px] font-medium transition-all ${
                        pendingPeriod === v
                          ? 'bg-[#d6d3ff] text-[#090909]'
                          : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white'
                      }`}>
                      {PERIOD_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 flex gap-2">
                <button onClick={reset}
                  className="flex-1 h-8 rounded-[10px] bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white text-[13px] transition-colors">
                  Сбросить
                </button>
                <button onClick={apply}
                  className="flex-1 h-8 rounded-[10px] bg-[#d6d3ff] text-[#090909] font-medium text-[13px] hover:opacity-90 transition-opacity">
                  Применить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income vs Expense */}
        <Card className="bg-[rgba(37,37,37,0.5)] border-[rgba(120,120,128,0.2)]">
          <CardHeader>
            <CardTitle className="text-white">
              {selectedSource === 'blockchain' ? '⛓️ Крипто' : selectedSource === 'onlyfans' ? '💎 OnlyFans' : '📊 Все'} • Доходы vs Расходы
            </CardTitle>
            <CardDescription className="text-white/50">{projectName}</CardDescription>
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
                    formatter={(value) => <span className="text-white/70">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-white/30">
                Нет данных для {selectedSource === 'blockchain' ? 'крипто' : selectedSource === 'onlyfans' ? 'OnlyFans' : 'выбранного источника'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-[rgba(37,37,37,0.5)] border-[rgba(120,120,128,0.2)]">
          <CardHeader>
            <CardTitle className="text-white">Статистика</CardTitle>
            <CardDescription className="text-white/50">
              {selectedSource === 'blockchain' ? 'Реальный баланс (крипто)' :
               selectedSource === 'onlyfans' ? 'Виртуальный учет (OnlyFans)' :
               'Общая статистика'} • За выбранный период
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-[14px]">
              <span className="text-white/70">{selectedSource === 'onlyfans' ? 'Дебет' : 'Доходы'}</span>
              <span className="text-green-400 font-semibold text-lg">
                +{formatCurrency(stats.incoming)} {selectedSource === 'blockchain' ? 'USDT' : selectedSource === 'onlyfans' ? 'USD' : 'USD'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-[14px]">
              <span className="text-white/70">{selectedSource === 'onlyfans' ? 'Кредит' : 'Расходы'}</span>
              <span className="text-red-400 font-semibold text-lg">
                -{formatCurrency(stats.outgoing)} {selectedSource === 'blockchain' ? 'USDT' : selectedSource === 'onlyfans' ? 'USD' : 'USD'}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[#d6d3ff]/10 border border-[#d6d3ff]/20 rounded-[14px]">
              <span className="text-white/70">Баланс</span>
              <span className={`font-semibold text-lg ${stats.incoming >= stats.outgoing ? 'text-green-400' : 'text-red-400'}`}>
                {stats.incoming >= stats.outgoing ? '+' : ''}{formatCurrency(stats.incoming - stats.outgoing)} {selectedSource === 'blockchain' ? 'USDT' : selectedSource === 'onlyfans' ? 'USD' : 'USD'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Chart */}
      <Card className="bg-[rgba(37,37,37,0.5)] border-[rgba(120,120,128,0.2)]">
        <CardHeader>
          <CardTitle className="text-white">Динамика кешфлоу</CardTitle>
          <CardDescription className="text-white/50">Поступления и расходы по дням</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,128,0.2)" />
                <XAxis
                  dataKey="date"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `${formatCurrency(value)}`}
                />
                <Tooltip content={<LineChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-white/70">{value}</span>}
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
            <div className="h-[350px] flex items-center justify-center text-white/30">
              Нет данных
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
