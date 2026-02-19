'use client'

import { useState, useMemo } from 'react'
import DashboardFilters from './DashboardFilters'
import DashboardCharts from './DashboardCharts'

interface Transaction {
  id: string
  amount: string
  type: string
  timestamp: Date
  categoryId: string | null
}

interface Category {
  id: string
  name: string
  transactions: Transaction[]
}

interface DashboardClientProps {
  categories: Category[]
  allTransactions: Transaction[]
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316']

export default function DashboardClient({ categories, allTransactions }: DashboardClientProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Handle custom date change
  const handleCustomDateChange = (startDate: string, endDate: string) => {
    setCustomStartDate(startDate)
    setCustomEndDate(endDate)
  }

  // Filter transactions based on period and category
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions]

    // Filter by period
    if (selectedPeriod === 'custom') {
      // Custom date range
      if (customStartDate) {
        const startDate = new Date(customStartDate)
        startDate.setHours(0, 0, 0, 0)
        filtered = filtered.filter(tx => new Date(tx.timestamp) >= startDate)
      }
      if (customEndDate) {
        const endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
        filtered = filtered.filter(tx => new Date(tx.timestamp) <= endDate)
      }
    } else if (selectedPeriod !== 'all') {
      const days = parseInt(selectedPeriod)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      filtered = filtered.filter(tx => new Date(tx.timestamp) >= cutoffDate)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(tx => tx.categoryId === selectedCategory)
    }

    return filtered
  }, [allTransactions, selectedPeriod, selectedCategory, customStartDate, customEndDate])

  // Calculate stats from filtered transactions
  const stats = useMemo(() => {
    const incoming = filteredTransactions
      .filter(tx => tx.type === 'incoming')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

    const outgoing = filteredTransactions
      .filter(tx => tx.type === 'outgoing')
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

    return { incoming, outgoing }
  }, [filteredTransactions])

  // Prepare category data for charts
  const categoryData = useMemo(() => {
    return categories.map((cat, index) => {
      const catTransactions = filteredTransactions.filter(tx => tx.categoryId === cat.id)
      const incoming = catTransactions
        .filter(tx => tx.type === 'incoming')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
      const outgoing = catTransactions
        .filter(tx => tx.type === 'outgoing')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

      return {
        id: cat.id,
        name: cat.name,
        balance: incoming - outgoing,
        incoming,
        outgoing,
        color: COLORS[index % COLORS.length],
      }
    })
  }, [categories, filteredTransactions])

  // Prepare daily data for line chart
  const dailyData = useMemo(() => {
    let days: number
    let startDate: Date
    let endDate: Date

    if (selectedPeriod === 'custom') {
      // Custom date range
      if (!customStartDate || !customEndDate) {
        return []
      }
      startDate = new Date(customStartDate)
      endDate = new Date(customEndDate)
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    } else {
      // Preset period
      days = selectedPeriod === 'all' ? 30 : parseInt(selectedPeriod)
      endDate = new Date()
      startDate = new Date()
      startDate.setDate(startDate.getDate() - (days - 1))
    }

    const dailyMap = new Map<string, { incoming: number; outgoing: number }>()

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      dailyMap.set(dateStr, { incoming: 0, outgoing: 0 })
    }

    // Fill with transaction data
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

    // Convert to array and calculate cumulative balance
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
  }, [filteredTransactions, selectedPeriod, customStartDate, customEndDate])

  return (
    <div className="space-y-6">
      <DashboardFilters
        categories={categories}
        selectedPeriod={selectedPeriod}
        selectedCategory={selectedCategory}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onPeriodChange={setSelectedPeriod}
        onCategoryChange={setSelectedCategory}
        onCustomDateChange={handleCustomDateChange}
      />

      <DashboardCharts
        categories={categoryData}
        dailyData={dailyData}
        totalIncoming={stats.incoming}
        totalOutgoing={stats.outgoing}
      />
    </div>
  )
}
