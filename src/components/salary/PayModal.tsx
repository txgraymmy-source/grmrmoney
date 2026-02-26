'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet } from '@/contexts/WalletContext'
import { decryptData } from '@/lib/crypto/encryption'
import { formatPeriod } from '@/lib/salary'

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

type Step = 'form' | 'signing' | 'done'

export default function PayModal({ contact, suggestedAmount, period, onClose, onSuccess }: Props) {
  const { masterPassword: savedPassword } = useWallet()

  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [fromCategoryId, setFromCategoryId] = useState('')
  const [amount, setAmount] = useState(suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '')
  const [masterPassword, setMasterPassword] = useState(savedPassword ?? '')
  const [note, setNote] = useState('')

  const [step, setStep] = useState<Step>('form')
  const [statusText, setStatusText] = useState('')
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
    if (isNaN(amountNum) || amountNum <= 0) { setError('Введите корректную сумму'); return }
    if (!fromCategoryId) { setError('Выберите источник средств'); return }
    if (!masterPassword) { setError('Введите мастер-пароль'); return }

    setStep('signing')

    try {
      // ── Step 1: Decrypt wallet locally ──────────────────────────
      setStatusText('Расшифровка кошелька...')

      const walletRes = await fetch(`/api/wallets/encrypted?categoryId=${fromCategoryId}`)
      if (!walletRes.ok) { throw new Error('Не удалось получить кошелёк') }
      const { data: walletData } = await walletRes.json()

      let privateKey: string
      try {
        const decrypted = decryptData(walletData.encryptedData, masterPassword)
        const parsed = JSON.parse(decrypted)
        if (!parsed.privateKey) throw new Error()
        privateKey = parsed.privateKey
      } catch {
        setStep('form')
        setError('Неверный мастер-пароль')
        return
      }

      // ── Step 2: Build unsigned transaction (server) ──────────────
      setStatusText('Подготовка транзакции...')

      const buildRes = await fetch('/api/pay/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromCategoryId,
          toAddress: contact.walletAddress,
          amount: amountNum,
          contactId: contact.id,
        }),
      })
      const buildData = await buildRes.json()
      if (!buildRes.ok || !buildData.success) {
        throw new Error(buildData.error || 'Ошибка при подготовке транзакции')
      }

      // ── Step 3: Sign locally (private key stays in browser) ──────
      setStatusText('Подпись транзакции...')

      const { signTronTransaction } = await import('@/lib/tron/signer')
      const signedTx = await signTronTransaction(buildData.unsignedTransaction, privateKey)

      // ── Step 4: Broadcast (server) ───────────────────────────────
      setStatusText('Отправка...')

      const broadcastRes = await fetch('/api/pay/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signedTransaction: signedTx,
          contactId: contact.id,
          fromCategoryId,
          amount: amountNum,
          period,
          note: note || undefined,
        }),
      })
      const broadcastData = await broadcastRes.json()
      if (!broadcastRes.ok || !broadcastData.success) {
        throw new Error(broadcastData.error || 'Ошибка при отправке')
      }

      setTxHash(broadcastData.txHash || '')
      setStep('done')
      onSuccess()
    } catch (err: any) {
      setStep('form')
      setError(err.message || 'Ошибка')
    }
  }

  // ── Done ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#1a1a1c] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-md">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-[18px] font-semibold text-white mb-1">Выплата выполнена</h2>
            <p className="text-white/50 text-[14px] mb-4">
              {parseFloat(amount).toFixed(2)} USDT → {contact.name}
            </p>
            {txHash && (
              <div className="bg-[rgba(118,118,128,0.1)] rounded-[12px] p-3 mb-4 text-left">
                <p className="text-white/30 text-[11px] mb-1">TX Hash</p>
                <p className="font-mono text-[11px] text-white/50 break-all">{txHash}</p>
              </div>
            )}
            <Button onClick={onClose} className="w-full">Закрыть</Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Signing in progress ───────────────────────────────────────────
  if (step === 'signing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#1a1a1c] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-md">
          <div className="text-center py-4">
            <div className="w-10 h-10 border-2 border-[#d6d3ff]/30 border-t-[#d6d3ff] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">{statusText}</p>
            <p className="text-white/30 text-[12px] mt-1">Приватный ключ не покидает браузер</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1c] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-semibold text-white">Выплата</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors text-[20px] leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Recipient */}
          <div className="bg-[rgba(118,118,128,0.08)] rounded-[14px] p-4">
            <p className="text-white/40 text-[12px] mb-1">Получатель</p>
            <p className="text-white font-medium">{contact.name}</p>
            <p className="font-mono text-[12px] text-white/40 mt-0.5">
              {contact.walletAddress.slice(0, 10)}...{contact.walletAddress.slice(-8)}
            </p>
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Период</Label>
            <div className="h-[46px] px-4 flex items-center bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px]">
              <span className="text-white/60 text-[14px]">{formatPeriod(period)}</span>
            </div>
          </div>

          {/* Amount */}
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

          {/* Source */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Источник средств</Label>
            <select
              value={fromCategoryId}
              onChange={e => setFromCategoryId(e.target.value)}
              className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
            >
              {categories.length === 0 && <option value="">Нет доступных проектов</option>}
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Master password */}
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

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Заметка (опционально)</Label>
            <Input
              placeholder="Например: за февраль 2026"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-green-500/[0.06] border border-green-500/[0.15]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p className="text-green-400 text-[11px]">Приватный ключ не покидает браузер</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
            <Button onClick={handlePay} className="flex-1">Выплатить</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
