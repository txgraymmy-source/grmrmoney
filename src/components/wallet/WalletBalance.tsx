'use client'

import { useEffect, useState } from 'react'
import { formatUSDT } from '@/lib/utils'

interface WalletBalanceProps {
  address: string
  categoryName: string
}

export default function WalletBalance({ address, categoryName }: WalletBalanceProps) {
  const [balance, setBalance] = useState<{ usdt: number; trx: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchBalance()
  }, [address])

  const fetchBalance = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/wallets/balance?address=${address}`)
      if (!response.ok) {
        throw new Error('Failed to fetch balance')
      }

      const { data } = await response.json()
      setBalance(data)
    } catch (error) {
      console.error('Error fetching balance:', error)
      setError('Ошибка загрузки баланса')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Баланс</h3>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-12 h-12 mb-3">
            <div className="absolute inset-0 border-4 border-gray-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-xl">
          {error}
        </div>
      ) : balance ? (
        <div className="space-y-4">
          {/* USDT Balance */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5">
            <p className="text-sm text-gray-400 mb-2">USDT TRC-20</p>
            <p className="text-4xl font-bold text-white mb-1">
              {formatUSDT(balance.usdt)}
            </p>
            <p className="text-sm text-gray-500">${formatUSDT(balance.usdt)} USD</p>
          </div>

          {/* TRX Balance */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-400 mb-1">TRX (комиссии)</p>
            <p className="text-xl font-semibold text-gray-300">{balance.trx.toFixed(2)} TRX</p>
            {balance.trx < 15 && (
              <p className="text-xs text-yellow-400 mt-2">⚠️ Пополните для оплаты комиссий</p>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchBalance}
            className="w-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Обновить
          </button>
        </div>
      ) : null}
    </div>
  )
}
