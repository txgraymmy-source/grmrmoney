'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet } from '@/contexts/WalletContext'
import { decryptData } from '@/lib/crypto/encryption'
import { formatPeriod, isManualRule } from '@/lib/salary'
import type { EmployeeRow } from '@/app/dashboard/salary/page'

interface Props {
  employees: EmployeeRow[]
  period: string
  onClose: () => void
  onSuccess: () => void
}

type PayStatus = 'idle' | 'processing' | 'done' | 'error'

interface EmpState {
  amount: string
  status: PayStatus
  txHash?: string
  error?: string
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

export default function BatchPayModal({ employees, period, onClose, onSuccess }: Props) {
  const { masterPassword: savedPassword } = useWallet()
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [fromCategoryId, setFromCategoryId] = useState('')
  const [masterPassword, setMasterPassword] = useState(savedPassword ?? '')
  const [empStates, setEmpStates] = useState<EmpState[]>(
    employees.map(e => ({ amount: e.amount > 0 ? e.amount.toFixed(2) : '', status: 'idle' }))
  )
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(false)
  const [globalError, setGlobalError] = useState('')

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

  const updateEmp = (i: number, update: Partial<EmpState>) =>
    setEmpStates(prev => prev.map((s, idx) => idx === i ? { ...s, ...update } : s))

  const totalAmount = empStates.reduce((s, e) => {
    const n = parseFloat(e.amount)
    return s + (isNaN(n) ? 0 : n)
  }, 0)

  const handleProcess = async () => {
    if (!fromCategoryId) { setGlobalError('Выберите источник средств'); return }
    if (!masterPassword) { setGlobalError('Введите мастер-пароль'); return }

    setGlobalError('')
    setProcessing(true)

    // ── Step 1: Decrypt source wallet once (stays in browser) ──────
    let privateKey: string
    try {
      const walletRes = await fetch(`/api/wallets/encrypted?categoryId=${fromCategoryId}`)
      if (!walletRes.ok) throw new Error('Кошелёк не найден')
      const { data: walletData } = await walletRes.json()
      const decrypted = decryptData(walletData.encryptedData, masterPassword)
      const parsed = JSON.parse(decrypted)
      if (!parsed.privateKey) throw new Error()
      privateKey = parsed.privateKey
    } catch {
      setGlobalError('Неверный мастер-пароль или кошелёк не найден')
      setProcessing(false)
      return
    }

    // Lazily import signer (browser-only module)
    const { signTronTransaction } = await import('@/lib/tron/signer')

    // ── Step 2: Process each employee ──────────────────────────────
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      const amountNum = parseFloat(empStates[i].amount)

      if (isNaN(amountNum) || amountNum <= 0) {
        updateEmp(i, { status: 'error', error: 'Нет суммы' })
        continue
      }

      updateEmp(i, { status: 'processing' })

      try {
        // Build
        const buildRes = await fetch('/api/pay/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromCategoryId,
            toAddress: emp.contactWallet,
            amount: amountNum,
            contactId: emp.contactId,
          }),
        })
        const buildData = await buildRes.json()
        if (!buildRes.ok || !buildData.success) {
          updateEmp(i, { status: 'error', error: buildData.error || 'Ошибка сборки' })
          continue
        }

        // Sign locally
        const signedTx = await signTronTransaction(buildData.unsignedTransaction, privateKey)

        // Broadcast
        const broadcastRes = await fetch('/api/pay/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signedTransaction: signedTx,
            contactId: emp.contactId,
            fromCategoryId,
            amount: amountNum,
            period,
          }),
        })
        const broadcastData = await broadcastRes.json()

        if (!broadcastRes.ok || !broadcastData.success) {
          updateEmp(i, { status: 'error', error: broadcastData.error || 'Ошибка отправки' })
        } else {
          updateEmp(i, { status: 'done', txHash: broadcastData.txHash })
        }
      } catch (err: any) {
        updateEmp(i, { status: 'error', error: err.message || 'Ошибка соединения' })
      }
    }

    setProcessing(false)
    setDone(true)
  }

  const successCount = empStates.filter(e => e.status === 'done').length
  const errorCount = empStates.filter(e => e.status === 'error').length
  const readyCount = empStates.filter(e => {
    const n = parseFloat(e.amount)
    return !isNaN(n) && n > 0
  }).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1c] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h2 className="text-[18px] font-semibold text-white">Выплатить всем</h2>
            <p className="text-white/40 text-[13px]">{employees.length} сотрудников · {formatPeriod(period)}</p>
          </div>
          {!processing && (
            <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors text-[20px] leading-none">×</button>
          )}
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-0.5 mb-4">
          {employees.map((emp, i) => {
            const state = empStates[i]
            const hasManual = isManualRule(emp.rules)

            return (
              <div
                key={emp.contactCategoryId}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-colors ${
                  state.status === 'done'
                    ? 'bg-green-500/[0.06] border border-green-500/[0.15]'
                    : state.status === 'error'
                    ? 'bg-red-500/[0.06] border border-red-500/[0.15]'
                    : 'bg-[rgba(118,118,128,0.08)] border border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-[rgba(214,211,255,0.1)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[11px] flex-shrink-0">
                  {emp.contactName.charAt(0).toUpperCase()}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-medium truncate">{emp.contactName}</p>
                  {state.status === 'error' && (
                    <p className="text-red-400 text-[11px]">{state.error}</p>
                  )}
                  {state.status === 'done' && state.txHash && (
                    <p className="font-mono text-[10px] text-white/25 truncate">{state.txHash}</p>
                  )}
                </div>

                {/* Amount or status */}
                {state.status === 'idle' && (
                  hasManual ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={state.amount}
                      onChange={e => updateEmp(i, { amount: e.target.value })}
                      placeholder="0.00"
                      className="w-28 bg-[rgba(118,118,128,0.15)] border border-[rgba(120,120,128,0.2)] rounded-[10px] h-[34px] px-3 text-[#d6d3ff] text-[13px] font-medium text-right focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
                    />
                  ) : (
                    <span className="text-[#d6d3ff] font-semibold text-[13px] whitespace-nowrap">
                      {parseFloat(state.amount) > 0 ? `$${fmt(parseFloat(state.amount))}` : '—'}
                    </span>
                  )
                )}

                {state.status === 'processing' && (
                  <div className="w-5 h-5 border-2 border-[#d6d3ff]/30 border-t-[#d6d3ff] rounded-full animate-spin flex-shrink-0" />
                )}

                {state.status === 'done' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                    <circle cx="10" cy="10" r="9" fill="rgba(74,222,128,0.15)" stroke="rgba(74,222,128,0.4)"/>
                    <path d="M6 10l3 3 5-5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}

                {state.status === 'error' && (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="flex-shrink-0">
                    <circle cx="10" cy="10" r="9" fill="rgba(248,113,113,0.15)" stroke="rgba(248,113,113,0.4)"/>
                    <path d="M7 7l6 6M13 7l-6 6" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 space-y-4">
          {!processing && !done && (
            <>
              {/* Total */}
              <div className="flex items-center justify-between px-1">
                <span className="text-white/40 text-[13px]">Итого · {readyCount} выплат</span>
                <span className="text-[#d6d3ff] font-semibold text-[16px]">
                  ${fmt(totalAmount)} USDT
                </span>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <Label className="text-white/70 text-[13px]">Источник средств</Label>
                <select
                  value={fromCategoryId}
                  onChange={e => setFromCategoryId(e.target.value)}
                  className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
                >
                  {categories.length === 0 && <option value="">Нет проектов</option>}
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
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

              {/* Security badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-green-500/[0.06] border border-green-500/[0.15]">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <p className="text-green-400 text-[11px]">Приватный ключ не покидает браузер</p>
              </div>

              {globalError && <p className="text-sm text-red-400">{globalError}</p>}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={onClose} className="flex-1">Отмена</Button>
                <Button onClick={handleProcess} disabled={readyCount === 0} className="flex-1">
                  Начать · ${fmt(totalAmount)}
                </Button>
              </div>
            </>
          )}

          {processing && !done && (
            <div className="text-center py-2">
              <p className="text-white/50 text-[13px]">Обработка выплат...</p>
            </div>
          )}

          {done && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4 py-1">
                {successCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-green-400 text-[13px]">{successCount} выполнено</span>
                  </div>
                )}
                {errorCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-red-400 text-[13px]">{errorCount} ошибок</span>
                  </div>
                )}
              </div>
              <Button onClick={onSuccess} className="w-full">Готово</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
