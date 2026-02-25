'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { decryptData } from '@/lib/crypto/encryption'
import { sendUSDT } from '@/lib/tron/transactions'
import { formatUSDT } from '@/lib/utils'

interface Allocation {
  id: string
  transactionId: string
  amount: string
  status: string
  txHash: string | null
  createdAt: string
  transaction: {
    id: string
    amount: string
    timestamp: string
  }
}

interface FundAllocationPanelProps {
  fundId: string
  fundName: string
  fundWalletAddress: string
  encryptedWalletData: string | null
  pendingAllocations: Allocation[]
}

export default function FundAllocationPanel({
  fundId,
  fundName,
  fundWalletAddress,
  encryptedWalletData,
  pendingAllocations,
}: FundAllocationPanelProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null)

  if (pendingAllocations.length === 0) return null

  const handleApprove = async (allocation: Allocation) => {
    if (!encryptedWalletData) {
      setError('Кошелёк фонда не настроен')
      return
    }
    if (!password) {
      setShowPasswordFor(allocation.id)
      return
    }

    setProcessing(allocation.id)
    setError('')

    try {
      // Decrypt wallet
      const decrypted = decryptData(encryptedWalletData, password)
      const walletData = JSON.parse(decrypted)

      // Send USDT
      const result = await sendUSDT({
        fromPrivateKey: walletData.privateKey,
        toAddress: fundWalletAddress,
        amount: parseFloat(allocation.amount),
      })

      if (!result.success) {
        throw new Error(result.error || 'Transaction failed')
      }

      // Update allocation status
      await fetch(`/api/funds/${fundId}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: allocation.transactionId,
          amount: allocation.amount,
          txHash: result.txHash,
          status: 'completed',
        }),
      })

      router.refresh()
    } catch (err: any) {
      if (err.message?.includes('decrypt') || err.message?.includes('password')) {
        setError('Неверный пароль')
      } else {
        setError(err.message || 'Ошибка при переводе')
      }
    } finally {
      setProcessing(null)
      setShowPasswordFor(null)
    }
  }

  const handleReject = async (allocation: Allocation) => {
    setProcessing(allocation.id)
    try {
      await fetch(`/api/funds/${fundId}/allocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: allocation.transactionId,
          amount: allocation.amount,
          status: 'rejected',
        }),
      })
      router.refresh()
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-[15px] font-medium text-white">Ожидают подтверждения</h3>

      {pendingAllocations.map(allocation => (
        <div
          key={allocation.id}
          className="p-4 rounded-[16px] border border-yellow-500/20 bg-yellow-500/[0.04]"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-white font-semibold">{formatUSDT(parseFloat(allocation.amount))} USDT</p>
              <p className="text-white/40 text-[12px] mt-0.5">
                Из транзакции на {formatUSDT(parseFloat(allocation.transaction.amount))} USDT
              </p>
              <p className="text-white/30 text-[11px] mt-0.5">
                {new Date(allocation.transaction.timestamp).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-[8px] text-[11px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              Ожидание
            </span>
          </div>

          {showPasswordFor === allocation.id && (
            <div className="mb-3">
              <input
                type="password"
                placeholder="Мастер-пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-[40px] px-3 rounded-[10px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[14px] placeholder:text-white/40"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-[12px] mb-2">{error}</p>}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleReject(allocation)}
              disabled={!!processing}
              className="flex-1"
            >
              Отклонить
            </Button>
            <Button
              size="sm"
              onClick={() => handleApprove(allocation)}
              disabled={!!processing}
              className="flex-1"
            >
              {processing === allocation.id ? 'Отправка...' : 'Подтвердить перевод'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
