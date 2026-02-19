'use client'

import { useState, useEffect } from 'react'
import { truncateAddress, formatDate, formatUSDT } from '@/lib/utils'

interface TransactionCategory {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

interface Transaction {
  id: string
  txHash: string
  fromAddress: string
  toAddress: string
  amount: string
  type: string
  status: string
  description: string | null
  timestamp: Date
  transactionCategory?: TransactionCategory | null
}

interface TransactionsListProps {
  categoryId: string
  initialTransactions: Transaction[]
}

export default function TransactionsList({ categoryId, initialTransactions }: TransactionsListProps) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [syncing, setSyncing] = useState(false)
  const [categories, setCategories] = useState<TransactionCategory[]>([])
  const [selectedTx, setSelectedTx] = useState<string | null>(null)

  // Загрузка категорий
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      // Сначала создаем категории если их нет
      await fetch('/api/transaction-categories/seed', { method: 'POST' })

      // Загружаем категории
      const res = await fetch('/api/transaction-categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  // Автоматическая синхронизация при загрузке страницы
  useEffect(() => {
    const lastSync = localStorage.getItem(`last-sync-${categoryId}`)
    const now = Date.now()

    if (!lastSync || now - parseInt(lastSync) > 30000) {
      handleSync(true)
      localStorage.setItem(`last-sync-${categoryId}`, now.toString())
    }
  }, [categoryId])

  const handleSync = async (silent = false) => {
    setSyncing(true)
    try {
      const res = await fetch('/api/transactions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId })
      })

      const data = await res.json()

      if (data.success) {
        if (data.data.newTransactions > 0) {
          if (!silent) {
            alert(`Синхронизировано: ${data.data.newTransactions} новых транзакций`)
          }
          window.location.reload()
        } else if (!silent) {
          alert('Нет новых транзакций')
        }
      } else if (!silent) {
        alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (error) {
      console.error('Sync error:', error)
      if (!silent) {
        alert('Ошибка синхронизации')
      }
    } finally {
      setSyncing(false)
    }
  }

  const assignCategory = async (txId: string, categoryId: string) => {
    try {
      const res = await fetch(`/api/transactions/${txId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionCategoryId: categoryId })
      })

      if (res.ok) {
        setSelectedTx(null)
        window.location.reload()
      }
    } catch (error) {
      console.error('Error assigning category:', error)
      alert('Ошибка при назначении категории')
    }
  }

  const getCategoriesForType = (txType: string) => {
    const type = txType === 'incoming' ? 'income' : 'expense'
    return categories.filter(c => c.type === type)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">История транзакций</h2>
        <button
          onClick={() => handleSync()}
          disabled={syncing}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded-xl transition-colors flex items-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Синхронизация...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Синхронизировать
            </>
          )}
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-gray-400 mb-3">Транзакций пока нет</p>
          <p className="text-sm text-gray-500">Нажмите "Синхронизировать" чтобы загрузить транзакции из блокчейна</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="divide-y divide-gray-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Status Badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`
                        px-3 py-1 rounded-lg text-xs font-medium border
                        ${tx.type === 'incoming'
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }
                      `}>
                        {tx.type === 'incoming' ? '↓ Входящая' : '↑ Исходящая'}
                      </span>

                      {tx.transactionCategory ? (
                        <span
                          className="px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: tx.transactionCategory.color + '20',
                            borderColor: tx.transactionCategory.color + '50',
                            color: tx.transactionCategory.color
                          }}
                          onClick={() => setSelectedTx(selectedTx === tx.id ? null : tx.id)}
                        >
                          {tx.transactionCategory.icon} {tx.transactionCategory.name}
                        </span>
                      ) : (
                        <button
                          onClick={() => setSelectedTx(selectedTx === tx.id ? null : tx.id)}
                          className="px-3 py-1 rounded-lg text-xs font-medium border border-gray-600 text-gray-400 hover:bg-gray-700 transition-colors"
                        >
                          + Категория
                        </button>
                      )}
                    </div>

                    {/* Category Selector */}
                    {selectedTx === tx.id && (
                      <div className="mb-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
                        <p className="text-xs text-gray-400 mb-2">Выберите категорию:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {getCategoriesForType(tx.type).map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => assignCategory(tx.id, cat.id)}
                              className="px-3 py-2 rounded-lg text-sm font-medium border transition-all hover:scale-105"
                              style={{
                                backgroundColor: cat.color + '20',
                                borderColor: cat.color + '50',
                                color: cat.color
                              }}
                            >
                              {cat.icon} {cat.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Address */}
                    <div className="text-sm text-gray-400 mb-1">
                      {tx.type === 'incoming' ? 'От: ' : 'Кому: '}
                      <code className="text-purple-400">
                        {truncateAddress(tx.type === 'incoming' ? tx.fromAddress : tx.toAddress)}
                      </code>
                    </div>

                    {/* Description */}
                    {tx.description && (
                      <p className="text-sm text-gray-300 mb-1">{tx.description}</p>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-gray-600">
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <div className={`text-xl font-bold ${
                      tx.type === 'incoming' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'incoming' ? '+' : '-'}{formatUSDT(tx.amount)}
                    </div>
                    <div className="text-xs text-gray-500">USDT</div>
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
