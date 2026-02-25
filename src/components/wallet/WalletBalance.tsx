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
    <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Баланс</h3>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="relative w-12 h-12 mb-3">
            <div className="absolute inset-0 border-4 border-[rgba(120,120,128,0.2)] rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-[#d6d3ff] rounded-full animate-spin"></div>
          </div>
          <p className="text-white/30 text-sm">Загрузка...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-4 rounded-[16px]">
          {error}
        </div>
      ) : balance ? (
        <div className="space-y-4">
          {/* USDT Balance */}
          <div className="bg-[#d6d3ff]/10 border border-[#d6d3ff]/30 rounded-[16px] p-5">
            <p className="text-sm text-white/50 mb-2">USDT TRC-20</p>
            <p className="text-4xl font-bold text-white mb-1">
              {formatUSDT(balance.usdt)}
            </p>
            <p className="text-sm text-white/30">${formatUSDT(balance.usdt)} USD</p>
          </div>

          {/* TRX Balance */}
          <div className="bg-white/[0.04] border border-[rgba(120,120,128,0.2)] rounded-[16px] p-4">
            <p className="text-sm text-white/50 mb-1">TRX (комиссии)</p>
            <p className="text-xl font-semibold text-white/70">{balance.trx.toFixed(2)} TRX</p>
            {balance.trx < 15 && (
              <p className="text-xs text-yellow-400 mt-2">⚠️ Пополните для оплаты комиссий</p>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchBalance}
            className="w-full bg-[#d6d3ff]/10 hover:bg-[#d6d3ff]/20 border border-[#d6d3ff]/30 text-[#d6d3ff] rounded-[16px] p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
