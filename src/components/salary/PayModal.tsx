'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet } from '@/contexts/WalletContext'
import { currentPeriod, formatPeriod } from '@/lib/salary'

interface Category {
  id: string
  name: string
  walletAddress: string
}

interface Contact {
  id: string
  name: string
  walletAddress: string
}

interface Props {
  contact: Contact
  suggestedAmount: number
  period: string
  onClose: () => void
  onSuccess: () => void
}

export default function PayModal({ contact, suggestedAmount, period, onClose, onSuccess }: Props) {
  const { masterPassword: savedPassword } = useWallet()
  const [categories, setCategories] = useState<Category[]>([])
  const [fromCategoryId, setFromCategoryId] = useState('')
  const [amount, setAmount] = useState(suggestedAmount.toFixed(2))
  const [masterPassword, setMasterPassword] = useState(savedPassword ?? '')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  useEffect(() => {
    fetch('/api/categories?limit=50')
      .then(r => r.json())
      .then(({ data }) => {
        const cats = (data || []).filter((c: any) => !c.archived)
        setCategories(cats)
        if (cats.length > 0) setFromCategoryId(cats[0].id)
      })
      .catch(() => {})
  }, [])

  const handlePay = async () => {
    setError('')
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Введите корректную сумму')
      return
    }
    if (!fromCategoryId) {
      setError('Выберите источник средств')
      return
    }
    if (!masterPassword) {
      setError('Введите мастер-пароль')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          fromCategoryId,
          masterPassword,
          period,
          note: note || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Ошибка при выплате')
        return
      }

      setTxHash(data.txHash || '')
      onSuccess()
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  if (txHash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#1a1a1c] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-md">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-semibold text-white mb-2">Выплата выполнена</h2>
            <p className="text-white/50 text-[14px] mb-4">
              {amount} USDT отправлено {contact.name}
            </p>
            {txHash && (
              <div className="bg-[rgba(118,118,128,0.1)] rounded-[12px] p-3 mb-4">
                <p className="text-white/30 text-[11px] mb-1">TX Hash</p>
                <p className="font-mono text-[12px] text-white/60 break-all">{txHash}</p>
              </div>
            )}
            <Button onClick={onClose} className="w-full">Закрыть</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1c] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-semibold text-white">Выплата</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/70 transition-colors text-[20px] leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-[rgba(118,118,128,0.08)] rounded-[14px] p-4">
            <p className="text-white/40 text-[12px] mb-1">Получатель</p>
            <p className="text-white font-medium">{contact.name}</p>
            <p className="font-mono text-[12px] text-white/40 mt-0.5">
              {contact.walletAddress.slice(0, 10)}...{contact.walletAddress.slice(-8)}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Период</Label>
            <div className="h-[46px] px-4 flex items-center bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px]">
              <span className="text-white/60 text-[14px]">{formatPeriod(period)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Сумма (USDT)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Источник средств</Label>
            <select
              value={fromCategoryId}
              onChange={e => setFromCategoryId(e.target.value)}
              className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
            >
              {categories.length === 0 && (
                <option value="">Нет доступных проектов</option>
              )}
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {!savedPassword && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Мастер-пароль</Label>
              <Input
                type="password"
                placeholder="Введите мастер-пароль"
                value={masterPassword}
                onChange={e => setMasterPassword(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Заметка (опционально)</Label>
            <Input
              placeholder="Например: за февраль 2026"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
            <Button onClick={handlePay} disabled={loading} className="flex-1">
              {loading ? 'Отправка...' : 'Выплатить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
