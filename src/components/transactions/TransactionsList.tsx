'use client'

import { useState, useEffect, useRef } from 'react'
import { truncateAddress, formatDate, formatUSDT } from '@/lib/utils'
import ManualTransactionForm from './ManualTransactionForm'

interface TransactionCategory {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

interface Transaction {
  id: string
  txHash: string | null
  fromAddress: string | null
  toAddress: string | null
  amount: string
  type: string
  source: string
  status: string
  description: string | null
  timestamp: Date
  onlyFansTransactionId?: string | null
  onlyFansFanId?: string | null
  onlyFansType?: string | null
  transactionCategory?: TransactionCategory | null
}

interface TransactionsListProps {
  categoryId: string
  initialTransactions: Transaction[]
}

const SOURCE_LABELS: Record<string, string> = {
  all: 'Все источники',
  blockchain: '⛓️ Крипто',
  onlyfans: '💎 OnlyFans',
  manual: '✏️ Ручные',
}

const TYPE_LABELS: Record<string, string> = {
  all: 'Все',
  incoming: '↓ Входящие',
  outgoing: '↑ Исходящие',
}

export default function TransactionsList({ categoryId, initialTransactions }: TransactionsListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [selectedTx, setSelectedTx] = useState<string | null>(null)

  // Applied filters
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('blockchain')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Pending (inside dropdown)
  const [pendingSource, setPendingSource] = useState<string>('blockchain')
  const [pendingType, setPendingType] = useState<string>('all')

  // Dropdown state
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const hasActiveFilter = sourceFilter !== 'all' || typeFilter !== 'all'

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    setPendingSource(sourceFilter)
    setPendingType(typeFilter)
    setOpen(true)
  }

  const apply = () => {
    setSourceFilter(pendingSource)
    setTypeFilter(pendingType)
    setOpen(false)
  }

  const reset = () => {
    setSourceFilter('all')
    setTypeFilter('all')
    setPendingSource('all')
    setPendingType('all')
    setOpen(false)
  }

  // Filter label for trigger button
  const filterLabel = (() => {
    const parts = []
    if (sourceFilter !== 'all') parts.push(SOURCE_LABELS[sourceFilter])
    if (typeFilter !== 'all') parts.push(TYPE_LABELS[typeFilter])
    return parts.length > 0 ? parts.join(' · ') : 'Фильтры'
  })()

  // Filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    if (sourceFilter !== 'all' && tx.source !== sourceFilter) return false
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        tx.amount.includes(q) ||
        tx.description?.toLowerCase().includes(q) ||
        tx.fromAddress?.toLowerCase().includes(q) ||
        tx.toAddress?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Load tx categories
  useEffect(() => {
    const load = async () => {
      try {
        await fetch('/api/transaction-categories/seed', { method: 'POST' })
        const res = await fetch('/api/transaction-categories')
        const data = await res.json()
        if (data.success) setCategories(data.data)
      } catch {}
    }
    load()
  }, [])

  // Silent auto-sync on load
  useEffect(() => {
    const lastSync = localStorage.getItem(`last-sync-${categoryId}`)
    const now = Date.now()
    if (!lastSync || now - parseInt(lastSync) > 30000) {
      localStorage.setItem(`last-sync-${categoryId}`, now.toString())
      fetch('/api/transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data.newTransactions > 0) window.location.reload()
        })
        .catch(() => {})
    }
  }, [categoryId])

  const assignCategory = async (txId: string, catId: string) => {
    try {
      const res = await fetch(`/api/transactions/${txId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionCategoryId: catId }),
      })
      if (res.ok) { setSelectedTx(null); window.location.reload() }
    } catch {}
  }

  const getCategoriesForType = (txType: string) =>
    categories.filter(c => c.type === (txType === 'incoming' ? 'income' : 'expense'))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">История транзакций</h2>
        <ManualTransactionForm categoryId={categoryId} />
      </div>

      {/* Search + Filter row */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="🔍 Поиск по сумме, описанию, адресу..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[14px] px-4 h-[46px] text-white text-[15px] placeholder-white/30 focus:outline-none focus:border-[#d6d3ff]/50"
        />

        {/* Filter dropdown trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={open ? () => setOpen(false) : handleOpen}
            className={`flex items-center gap-2 h-[46px] px-5 rounded-[14px] border text-[15px] font-medium transition-all whitespace-nowrap ${
              hasActiveFilter
                ? 'border-[#d6d3ff]/30 bg-[#d6d3ff]/[0.08] text-[#d6d3ff]'
                : 'border-[rgba(120,120,128,0.2)] bg-[rgba(118,118,128,0.08)] text-white/50 hover:text-white hover:border-[rgba(120,120,128,0.35)]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round"/>
            </svg>
            <span>{filterLabel}</span>
            {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#d6d3ff] flex-shrink-0" />}
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
                  {(['all', 'blockchain', 'onlyfans', 'manual'] as const).map(v => (
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

              {/* Тип */}
              <div className="p-4 border-b border-[rgba(120,120,128,0.1)]">
                <p className="text-[11px] text-white/35 uppercase tracking-wide mb-2.5">Тип</p>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'incoming', 'outgoing'] as const).map(v => (
                    <button key={v} onClick={() => setPendingType(v)}
                      className={`h-7 px-3 rounded-[8px] text-[12px] font-medium transition-all ${
                        pendingType === v
                          ? 'bg-[#d6d3ff] text-[#090909]'
                          : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white'
                      }`}>
                      {TYPE_LABELS[v]}
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

      {/* Count */}
      <p className="text-sm text-white/30 mb-3">
        Показано: {filteredTransactions.length} из {transactions.length}
      </p>

      {filteredTransactions.length === 0 ? (
        <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-12 text-center">
          <p className="text-white/50 mb-3">
            {transactions.length === 0 ? 'Транзакций пока нет' : 'Нет транзакций по выбранным фильтрам'}
          </p>
        </div>
      ) : (
        <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[20px] overflow-hidden">
          <div className="divide-y divide-[rgba(120,120,128,0.12)]">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status Badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-[8px] text-xs font-medium border ${
                        tx.type === 'incoming'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                      }`}>
                        {tx.type === 'incoming' ? '↓ Входящая' : '↑ Исходящая'}
                      </span>

                      <span className={`px-3 py-1 rounded-[8px] text-xs font-medium border ${
                        tx.source === 'blockchain'
                          ? 'bg-[#d6d3ff]/10 text-blue-400 border-blue-500/30'
                          : tx.source === 'onlyfans'
                          ? 'bg-[#d6d3ff]/10 text-[#d6d3ff] border-[#d6d3ff]/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        {tx.source === 'blockchain' ? '⛓️ Blockchain' : tx.source === 'onlyfans' ? '💎 OnlyFans' : '✏️ Ручная'}
                      </span>

                      {tx.transactionCategory ? (
                        <span
                          className="px-3 py-1 rounded-[8px] text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: tx.transactionCategory.color + '20',
                            borderColor: tx.transactionCategory.color + '50',
                            color: tx.transactionCategory.color,
                          }}
                          onClick={() => setSelectedTx(selectedTx === tx.id ? null : tx.id)}
                        >
                          {tx.transactionCategory.icon} {tx.transactionCategory.name}
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedTx(selectedTx === tx.id ? null : tx.id)}
                          className="px-3 py-1 rounded-[8px] text-xs font-medium border border-[rgba(120,120,128,0.3)] text-white/50 hover:bg-white/[0.08] transition-colors"
                        >
                          + Категория
                        </button>
                      )}
                    </div>

                    {/* Category Selector */}
                    {selectedTx === tx.id && (
                      <div className="mb-3 p-3 bg-[rgba(118,118,128,0.12)] rounded-[12px] border border-[rgba(120,120,128,0.2)]">
                        <p className="text-xs text-white/50 mb-2">Выберите категорию:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {getCategoriesForType(tx.type).map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => assignCategory(tx.id, cat.id)}
                              className="px-3 py-2 rounded-[8px] text-sm font-medium border transition-all hover:scale-105"
                              style={{
                                backgroundColor: cat.color + '20',
                                borderColor: cat.color + '50',
                                color: cat.color,
                              }}
                            >
                              {cat.icon} {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    {tx.source === 'blockchain' && tx.fromAddress && tx.toAddress && (
                      <div className="text-sm text-white/50 mb-1">
                        {tx.type === 'incoming' ? 'От: ' : 'Кому: '}
                        <code className="text-[#d6d3ff]">
                          {truncateAddress(tx.type === 'incoming' ? tx.fromAddress : tx.toAddress)}
                        </code>
                      </div>
                    )}

                    {/* OnlyFans info */}
                    {tx.source === 'onlyfans' && tx.onlyFansType && (
                      <div className="text-sm text-white/50 mb-1">
                        {tx.onlyFansType}
                        {tx.onlyFansFanId && <span className="text-[#d6d3ff]"> • Fan #{tx.onlyFansFanId.slice(-6)}</span>}
                      </div>
                    )}

                    {/* Description */}
                    {tx.description && (
                      <p className="text-sm text-white/70 mb-1">{tx.description}</p>
                    )}

                    <p className="text-xs text-white/20">{formatDate(tx.timestamp)}</p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className={`text-xl font-bold ${tx.type === 'incoming' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'incoming' ? '+' : '-'}{formatUSDT(tx.amount)}
                    </div>
                    <div className="text-xs text-white/30">USDT</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
