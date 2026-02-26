'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatPeriod, ruleDescription, calculateSalary } from '@/lib/salary'
import {
  FREQUENCIES, DAYS_OF_WEEK, usesMonthDays,
  parseDates, serializeDates, scheduleLabel,
  type PaymentFrequency,
} from '@/lib/paymentSchedule'
import PayModal from '@/components/salary/PayModal'
import { truncateAddress } from '@/lib/utils'

interface Position { id: string; name: string; icon: string | null; color: string | null }
interface SalaryRule {
  id: string; type: string; amount: number | null; percent: number | null
  source: string | null; label: string | null
}
interface CategoryPair {
  id: string; categoryId: string
  category: {
    id: string; name: string
    transactions: Array<{ amount: string; type: string; source: string; timestamp: string }>
  }
  salaryRules: SalaryRule[]
}
interface Payment {
  id: string; amount: string; period: string
  txHash: string | null; status: string; createdAt: string
}
interface Contact {
  id: string; name: string; walletAddress: string; notes: string | null
  positionId: string | null; position: Position | null
  paymentFrequency: string | null; paymentDates: string | null
  employeeProjects: CategoryPair[]; payments: Payment[]
}
interface Props {
  contact: Contact
  positions: Position[]
  availableCategories: Array<{ id: string; name: string }>
  period: string
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

const SEL = 'w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[10px] h-[36px] px-3 text-white text-[12px] focus:outline-none focus:border-[rgba(214,211,255,0.3)]'

function calcRuleAmount(
  rule: SalaryRule,
  txs: Array<{ amount: string; type: string; source: string; timestamp: string }>,
  period: string,
  unitInputs: Record<string, string>,
  manualInputs: Record<string, string>
): number {
  if (rule.type === 'fixed') return rule.amount ?? 0
  if (rule.type === 'per_unit')
    return (rule.amount ?? 0) * (parseFloat(unitInputs[rule.id] ?? '0') || 0)
  if (rule.type === 'manual')
    return parseFloat(manualInputs[rule.id] ?? '0') || 0
  if (rule.type === 'percent') {
    const [year, month] = period.split('-').map(Number)
    const pTxs = txs.filter(tx => {
      const d = new Date(tx.timestamp)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
    const pct = (rule.percent ?? 0) / 100
    const ofGross = pTxs.filter(t => t.source === 'onlyfans' && t.type === 'incoming')
      .reduce((s, t) => s + parseFloat(t.amount), 0)
    const crypto = pTxs.filter(t => t.source === 'blockchain' && t.type === 'incoming')
      .reduce((s, t) => s + parseFloat(t.amount), 0)
    const base = rule.source === 'of_gross' ? ofGross
      : rule.source === 'of_net' ? ofGross * 0.8
      : rule.source === 'crypto' ? crypto
      : ofGross * 0.8 + crypto
    return base * pct
  }
  return 0
}

export default function EmployeeDetailClient({ contact, positions, availableCategories, period }: Props) {
  const router = useRouter()

  // Contact edit
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(contact.name)
  const [wallet, setWallet] = useState(contact.walletAddress)
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [positionId, setPositionId] = useState(contact.positionId ?? '')
  const [payFreq, setPayFreq] = useState<PaymentFrequency | ''>((contact.paymentFrequency as PaymentFrequency) ?? '')
  const [selDates, setSelDates] = useState<number[]>(parseDates(contact.paymentDates))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Projects
  const [pairs, setPairs] = useState<CategoryPair[]>(contact.employeeProjects)
  const [payModal, setPayModal] = useState<{ pair: CategoryPair; amount: number } | null>(null)
  const [attaching, setAttaching] = useState(false)
  const [attachId, setAttachId] = useState('')
  const [attachError, setAttachError] = useState('')
  const [editRulesFor, setEditRulesFor] = useState<string | null>(null)

  // Salary inputs (per period for twice_monthly)
  const [activePeriodIdx, setActivePeriodIdx] = useState(0)
  const [unitByPeriod, setUnitByPeriod] = useState<Record<string, string>[]>([{}, {}])
  const [manualByPeriod, setManualByPeriod] = useState<Record<string, string>[]>([{}, {}])
  // Correction mini-calculator: op = '+' | '-' | '÷', val = number string
  const [corrOps, setCorrOps] = useState<Record<string, '+' | '-' | '÷'>>({})
  const [corrVals, setCorrVals] = useState<Record<string, string>>({})
  // Confirmed per_unit/manual inputs — only show ✓ when input has value
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set())
  const toggleConfirm = (ruleId: string) =>
    setConfirmed(prev => { const s = new Set(prev); s.has(ruleId) ? s.delete(ruleId) : s.add(ruleId); return s })

  const getCorrDelta = (sysAmt: number, ruleId: string) => {
    const op = corrOps[ruleId]
    if (!op) return 0
    const v = parseFloat(corrVals[ruleId] ?? '0') || 0
    if (op === '+') return v
    if (op === '-') return -v
    if (op === '÷') return v > 1 ? sysAmt / v - sysAmt : 0
    return 0
  }

  // Payment detail modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)

  const isTwiceMonthly = contact.paymentFrequency === 'twice_monthly'
  const payDatesArr = parseDates(contact.paymentDates)
  const periodSlots = isTwiceMonthly && payDatesArr.length >= 1
    ? payDatesArr.slice(0, 2).map((day, idx) => ({ day, label: `${day}-е число`, idx }))
    : null

  const activeUnit = periodSlots ? unitByPeriod[activePeriodIdx] : unitByPeriod[0]
  const activeManual = periodSlots ? manualByPeriod[activePeriodIdx] : manualByPeriod[0]

  const setUnit = (ruleId: string, val: string) => {
    const pi = periodSlots ? activePeriodIdx : 0
    setUnitByPeriod(prev => { const n = [...prev]; n[pi] = { ...n[pi], [ruleId]: val }; return n })
  }
  const setManual = (ruleId: string, val: string) => {
    const pi = periodSlots ? activePeriodIdx : 0
    setManualByPeriod(prev => { const n = [...prev]; n[pi] = { ...n[pi], [ruleId]: val }; return n })
  }

  const isMonthDays = usesMonthDays(payFreq || null)

  const toggleDate = (n: number) =>
    setSelDates(prev => {
      if (prev.includes(n)) return prev.filter(d => d !== n)
      if (payFreq === 'twice_monthly' && prev.length >= 2) return prev
      return [...prev, n].sort((a, b) => a - b)
    })

  const handleFreqChange = (v: PaymentFrequency | '') => { setPayFreq(v); setSelDates([]) }

  const handleSave = async () => {
    setSaveError(''); setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, walletAddress: wallet, notes: notes || null,
          positionId: positionId || null,
          paymentFrequency: payFreq || null,
          paymentDates: selDates.length ? serializeDates(selDates) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setSaveError(data.error || 'Ошибка'); return }
      setEditMode(false); router.refresh()
    } catch { setSaveError('Ошибка соединения') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      router.push('/dashboard/employees')
    } catch { setSaveError('Ошибка при удалении') }
  }

  const handleAttach = async () => {
    if (!attachId) return; setAttachError('')
    try {
      const res = await fetch(`/api/contacts/${contact.id}/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: attachId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setAttachError(data.error || 'Ошибка'); return }
      setPairs(prev => [...prev, data.data]); setAttaching(false); setAttachId('')
    } catch { setAttachError('Ошибка соединения') }
  }

  const handleDetach = async (categoryId: string) => {
    try {
      await fetch(`/api/contacts/${contact.id}/projects?categoryId=${categoryId}`, { method: 'DELETE' })
      setPairs(prev => prev.filter(p => p.categoryId !== categoryId))
    } catch {}
  }

  const attachedIds = new Set(pairs.map(p => p.categoryId))
  const unattached = availableCategories.filter(c => !attachedIds.has(c.id))

  const pairTotals = useMemo(() =>
    pairs.map(pair => ({
      pair,
      total: pair.salaryRules.reduce((s, r) => {
        const sys = calcRuleAmount(r, pair.category.transactions ?? [], period, activeUnit, activeManual)
        return s + sys + getCorrDelta(sys, r.id)
      }, 0),
    })),
    [pairs, period, activeUnit, activeManual, corrOps, corrVals]
  )
  const grandTotal = pairTotals.reduce((s, p) => s + p.total, 0)
  const payAmount = periodSlots ? grandTotal / 2 : grandTotal

  const scheduleInfo = contact.paymentFrequency
    ? scheduleLabel(contact.paymentFrequency as PaymentFrequency, contact.paymentDates)
    : null

  return (
    <div className="space-y-4">

      {/* ══ ROW 1: Contact | Projects ═══════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* ── Contact card ── */}
        <Card className="card-rounded">
          <CardContent className="pt-5 pb-5">
            {!editMode ? (
              <>
                {/* Header row: avatar + name + edit button */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-[rgba(214,211,255,0.1)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[17px] select-none shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-[15px] truncate">{contact.name}</p>
                    {contact.position && (
                      <p className="text-white/40 text-[12px] mt-0.5 truncate">
                        {contact.position.icon && `${contact.position.icon} `}{contact.position.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditMode(true)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[10px] text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                    title="Редактировать"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M9.5 1.5L12.5 4.5M1 13H4L12.5 4.5L9.5 1.5L1 10V13Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Info rows */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between py-2 border-b border-[rgba(120,120,128,0.08)]">
                    <span className="text-white/30 text-[12px]">Кошелёк</span>
                    <span className="font-mono text-white/50 text-[12px]">{truncateAddress(contact.walletAddress, 6, 4)}</span>
                  </div>
                  {scheduleInfo && (
                    <div className="flex items-center justify-between py-2 border-b border-[rgba(120,120,128,0.08)]">
                      <span className="text-white/30 text-[12px]">Расписание</span>
                      <span className="text-[#d6d3ff]/70 text-[12px] text-right max-w-[60%]">{scheduleInfo}</span>
                    </div>
                  )}
                  {contact.notes && (
                    <p className="text-white/30 text-[12px] italic pt-1">{contact.notes}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white/60 text-[13px] font-medium">Редактирование</p>
                  <button onClick={() => { setEditMode(false); setSaveError('') }}
                    className="w-7 h-7 flex items-center justify-center rounded-[8px] text-white/30 hover:text-white/70 hover:bg-white/[0.05] transition-all text-[18px] leading-none">×</button>
                </div>
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-white/40 text-[11px]">Имя / Ник</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="h-[34px] text-[12px]" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/40 text-[11px]">TRON-адрес</Label>
                    <Input value={wallet} onChange={e => setWallet(e.target.value)} className="h-[34px] text-[11px] font-mono" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white/40 text-[11px]">Должность</Label>
                    <select value={positionId} onChange={e => setPositionId(e.target.value)} className={SEL}>
                      <option value="">Без должности</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ''}{p.name}</option>)}
                    </select>
                  </div>

                  {/* Schedule */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-[rgba(120,120,128,0.1)]" />
                      <span className="text-white/20 text-[10px]">Расписание</span>
                      <div className="h-px flex-1 bg-[rgba(120,120,128,0.1)]" />
                    </div>
                    <select value={payFreq} onChange={e => handleFreqChange(e.target.value as PaymentFrequency | '')} className={SEL}>
                      <option value="">Не указана</option>
                      {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                    {payFreq && (
                      <div>
                        {isMonthDays && (
                          <p className="text-white/20 text-[10px] mb-1">
                            {payFreq === 'twice_monthly' ? `Выберите 2 числа (${selDates.length}/2)` : 'Числа месяца'}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-0.5">
                          {isMonthDays
                            ? Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                                <button key={n} type="button" onClick={() => toggleDate(n)}
                                  className={`w-6 h-6 rounded-[5px] text-[10px] font-medium transition-all ${
                                    selDates.includes(n) ? 'bg-[#d6d3ff] text-[#090909]' : 'bg-[rgba(118,118,128,0.1)] text-white/30 hover:text-white/60'
                                  }`}>{n}</button>
                              ))
                            : DAYS_OF_WEEK.map(d => (
                                <button key={d.value} type="button" onClick={() => toggleDate(d.value)}
                                  className={`h-6 px-1.5 rounded-[5px] text-[10px] font-medium transition-all ${
                                    selDates.includes(d.value) ? 'bg-[#d6d3ff] text-[#090909]' : 'bg-[rgba(118,118,128,0.1)] text-white/30 hover:text-white/60'
                                  }`}>{d.short}</button>
                              ))
                          }
                        </div>
                        {selDates.length > 0 && (
                          <p className="text-[#d6d3ff]/60 text-[10px] mt-1">
                            {scheduleLabel(payFreq as PaymentFrequency, serializeDates(selDates))}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-white/40 text-[11px]">Заметки</Label>
                    <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-[34px] text-[12px]" placeholder="Дополнительно..." />
                  </div>

                  {saveError && <p className="text-xs text-red-400">{saveError}</p>}

                  <Button onClick={handleSave} disabled={saving} className="w-full h-[34px] text-[12px]">
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </Button>

                  {deleteConfirm ? (
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setDeleteConfirm(false)} className="flex-1 h-[30px] text-[11px]">Отмена</Button>
                      <button onClick={handleDelete}
                        className="flex-1 h-[30px] rounded-[10px] bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] hover:bg-red-500/20 transition-colors">
                        Подтвердить
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(true)}
                      className="w-full h-[30px] rounded-[10px] text-red-400/40 hover:text-red-400 hover:bg-red-500/[0.06] text-[11px] transition-colors">
                      Удалить сотрудника
                    </button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Projects card ── */}
        <Card className="card-rounded overflow-hidden">
          <div className="px-4 pt-3 pb-2.5 flex items-center justify-between border-b border-[rgba(120,120,128,0.08)]">
            <p className="text-white/60 text-[13px] font-medium">Проекты</p>
            {pairs.length > 0 && <span className="text-white/20 text-[12px]">{pairs.length}</span>}
          </div>

          {pairs.length === 0 ? (
            <div className="px-4 py-6 text-center text-white/25 text-[13px]">
              Не прикреплён ни к одному проекту
            </div>
          ) : (
            <div className="divide-y divide-[rgba(120,120,128,0.07)]">
              {pairs.map(pair => {
                const amount = calculateSalary(pair.salaryRules, pair.category.transactions ?? [], period)
                const isEditing = editRulesFor === pair.id
                return (
                  <ProjectRow
                    key={pair.id}
                    pair={pair} amount={amount} period={period}
                    isEditing={isEditing} contactId={contact.id}
                    onToggleEdit={() => setEditRulesFor(isEditing ? null : pair.id)}
                    onDetach={() => handleDetach(pair.categoryId)}
                    onRulesUpdated={newPair => {
                      setPairs(prev => prev.map(p => p.id === newPair.id ? newPair : p))
                      setEditRulesFor(null)
                    }}
                  />
                )
              })}
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-[rgba(120,120,128,0.07)]">
            {!attaching ? (
              <button onClick={() => setAttaching(true)}
                className="w-full h-[30px] rounded-[8px] border border-dashed border-[rgba(120,120,128,0.2)] text-white/25 hover:text-white/45 hover:border-[rgba(120,120,128,0.35)] transition-all text-[12px]">
                + Прикрепить к проекту
              </button>
            ) : (
              <div className="flex gap-2">
                <select value={attachId} onChange={e => setAttachId(e.target.value)}
                  className="flex-1 bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[8px] h-[32px] px-3 text-white text-[12px] focus:outline-none">
                  <option value="">Выберите проект</option>
                  {unattached.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button onClick={handleAttach} disabled={!attachId} className="h-[32px] text-[12px] px-3">Добавить</Button>
                <Button variant="secondary" onClick={() => { setAttaching(false); setAttachError('') }} className="h-[32px] px-2.5">×</Button>
              </div>
            )}
            {attachError && <p className="text-xs text-red-400 mt-1">{attachError}</p>}
          </div>
        </Card>
      </div>

      {/* ══ ROW 2: Salary formation (full width) ════════════════════ */}
      {pairs.length > 0 && (
        <Card className="card-rounded overflow-hidden">
          {/* Header + period tabs */}
          <div className="px-4 pt-3 pb-0 border-b border-[rgba(120,120,128,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/60 text-[13px] font-medium">Формирование выплаты — {formatPeriod(period)}</p>
              {payAmount > 0 && (
                <span className="text-[#d6d3ff] font-semibold text-[13px]">${fmt(payAmount)}</span>
              )}
            </div>

            {/* Period tabs for twice_monthly */}
            {periodSlots && (
              <div className="flex gap-1 pb-0">
                {periodSlots.map(slot => (
                  <button
                    key={slot.idx}
                    onClick={() => setActivePeriodIdx(slot.idx)}
                    className={`px-4 py-2 text-[13px] rounded-t-[10px] transition-all border-b-2 ${
                      activePeriodIdx === slot.idx
                        ? 'text-white border-[#d6d3ff] bg-[rgba(214,211,255,0.05)]'
                        : 'text-white/35 border-transparent hover:text-white/60'
                    }`}
                  >
                    Период {slot.idx + 1} — {slot.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Salary table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[rgba(120,120,128,0.08)]">
                  <th className="px-4 py-2.5 text-left font-medium text-white/25 w-[160px]">Проект</th>
                  <th className="px-4 py-2.5 text-left font-medium text-white/25">Условие</th>
                  <th className="px-4 py-2.5 text-left font-medium text-white/25 w-[150px]">Ввод</th>
                  <th className="px-4 py-2.5 text-right font-medium text-white/25 w-[100px]">Начислено</th>
                  <th className="px-4 py-2.5 text-center font-medium text-white/25 w-[120px]">Коррекция</th>
                  <th className="px-4 py-2.5 text-right font-medium text-white/25 w-[90px]">Итого</th>
                  <th className="px-4 py-2.5 w-[110px]"></th>
                </tr>
              </thead>
              <tbody>
                {pairTotals.map(({ pair, total }) => {
                  const pairPayAmt = periodSlots ? total / 2 : total

                  return pair.salaryRules.length === 0 ? (
                    <tr key={pair.id} className="border-b border-[rgba(120,120,128,0.05)]">
                      <td className="px-4 py-3 text-white/50">{pair.category.name}</td>
                      <td colSpan={5} className="px-4 py-3 text-white/20">Нет условий оплаты</td>
                      <td />
                    </tr>
                  ) : (
                    pair.salaryRules.map((rule, rIdx) => {
                      const sysAmt = calcRuleAmount(rule, pair.category.transactions ?? [], period, activeUnit, activeManual)
                      const sysPay = periodSlots ? sysAmt / 2 : sysAmt
                      const corrDelta = getCorrDelta(sysAmt, rule.id)
                      const corrPay = periodSlots ? corrDelta / 2 : corrDelta
                      const totalPay = sysPay + corrPay
                      const isLastRule = rIdx === pair.salaryRules.length - 1
                      const isConfirmed = confirmed.has(rule.id)

                      return (
                        <tr key={rule.id} className={`border-b ${isLastRule ? 'border-[rgba(120,120,128,0.1)]' : 'border-[rgba(120,120,128,0.04)]'}`}>
                          {/* Project — first row only */}
                          <td className="px-4 py-2.5 text-white/55 align-middle text-[12px]">
                            {rIdx === 0 ? pair.category.name : ''}
                          </td>

                          {/* Rule description */}
                          <td className="px-4 py-2.5 text-white/35 text-[12px]">{ruleDescription(rule)}</td>

                          {/* Input + confirm checkmark (only when has value) */}
                          <td className="px-4 py-2.5">
                            {rule.type === 'per_unit' && (
                              <div className="flex items-center gap-1.5">
                                <Input type="number" min="0"
                                  value={activeUnit[rule.id] ?? ''}
                                  onChange={e => { setUnit(rule.id, e.target.value); setConfirmed(prev => { const s = new Set(prev); s.delete(rule.id); return s }) }}
                                  className={`w-[56px] h-[26px] text-[11px] text-center px-1 ${isConfirmed ? 'opacity-50' : ''}`}
                                  placeholder="0" readOnly={isConfirmed} />
                                <span className="text-white/20 text-[11px]">{rule.label || 'шт'}</span>
                                {/* checkmark only if value entered */}
                                {(activeUnit[rule.id] ?? '') !== '' && (
                                  <button onClick={() => toggleConfirm(rule.id)}
                                    className={`w-6 h-6 rounded-[6px] flex items-center justify-center transition-all shrink-0 ${
                                      isConfirmed ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.05] text-white/30 hover:text-white/70'
                                    }`}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                            {rule.type === 'manual' && (
                              <div className="flex items-center gap-1">
                                <span className="text-white/20 text-[11px]">$</span>
                                <Input type="number" min="0" step="0.01"
                                  value={activeManual[rule.id] ?? ''}
                                  onChange={e => { setManual(rule.id, e.target.value); setConfirmed(prev => { const s = new Set(prev); s.delete(rule.id); return s }) }}
                                  className={`w-[72px] h-[26px] text-[11px] text-right px-2 ${isConfirmed ? 'opacity-50' : ''}`}
                                  placeholder="0.00" readOnly={isConfirmed} />
                                {(activeManual[rule.id] ?? '') !== '' && (
                                  <button onClick={() => toggleConfirm(rule.id)}
                                    className={`w-6 h-6 rounded-[6px] flex items-center justify-center transition-all shrink-0 ${
                                      isConfirmed ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.05] text-white/30 hover:text-white/70'
                                    }`}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Начислено */}
                          <td className={`px-4 py-2.5 text-right text-[12px] ${sysPay > 0 ? 'text-white/55' : 'text-white/18'}`}>
                            {sysPay > 0 ? `$${fmt(sysPay)}` : '—'}
                          </td>

                          {/* Коррекция — mini calculator */}
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1 justify-center">
                              {/* Op buttons */}
                              {(['+', '-', '÷'] as const).map(op => (
                                <button key={op}
                                  onClick={() => setCorrOps(prev => ({ ...prev, [rule.id]: prev[rule.id] === op ? undefined as any : op }))}
                                  className={`w-6 h-6 rounded-[5px] text-[11px] font-medium transition-all ${
                                    corrOps[rule.id] === op
                                      ? op === '+' ? 'bg-green-500/20 text-green-400'
                                        : op === '-' ? 'bg-red-500/20 text-red-400'
                                        : 'bg-[rgba(214,211,255,0.15)] text-[#d6d3ff]'
                                      : 'bg-white/[0.04] text-white/30 hover:text-white/60 hover:bg-white/[0.07]'
                                  }`}>{op}</button>
                              ))}
                              {/* Value input — only when op selected */}
                              {corrOps[rule.id] && (
                                <Input type="number" min="0" step="0.01"
                                  value={corrVals[rule.id] ?? ''}
                                  onChange={e => setCorrVals(prev => ({ ...prev, [rule.id]: e.target.value }))}
                                  className={`w-[60px] h-[26px] text-[11px] text-center px-1 ${
                                    corrOps[rule.id] === '-' ? 'text-red-400' : corrOps[rule.id] === '+' ? 'text-green-400' : 'text-[#d6d3ff]'
                                  }`}
                                  placeholder="0" />
                              )}
                            </div>
                          </td>

                          {/* Итого */}
                          <td className={`px-4 py-2.5 text-right text-[12px] font-medium ${totalPay !== 0 ? 'text-white/75' : 'text-white/18'}`}>
                            {totalPay !== 0 ? `$${fmt(totalPay)}` : '—'}
                          </td>

                          {/* Выплатить — last row only */}
                          <td className="px-4 py-2.5 text-right">
                            {isLastRule && (
                              <div className="flex items-center justify-end gap-1.5">
                                {pairPayAmt !== 0 && (
                                  <span className={`text-[12px] font-semibold ${pairPayAmt > 0 ? 'text-[#d6d3ff]' : 'text-red-400'}`}>
                                    ${fmt(pairPayAmt)}
                                  </span>
                                )}
                                <button
                                  onClick={() => setPayModal({ pair, amount: pairPayAmt })}
                                  disabled={pairPayAmt <= 0}
                                  className={`h-[26px] px-3 rounded-[7px] text-[11px] font-medium transition-all ${
                                    pairPayAmt > 0
                                      ? 'bg-[#d6d3ff] text-[#090909] hover:opacity-90'
                                      : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                                  }`}>
                                  Выплатить
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )
                })}
              </tbody>

              {(pairs.length > 1 || periodSlots) && payAmount !== 0 && (
                <tfoot>
                  <tr className="bg-[rgba(214,211,255,0.02)] border-t border-[rgba(120,120,128,0.1)]">
                    <td colSpan={5} className="px-4 py-3 text-white/30 text-[12px]">
                      {periodSlots ? `Итого за период ${activePeriodIdx + 1}` : 'Итого'}
                    </td>
                    <td className="px-4 py-3 text-right text-[#d6d3ff] font-bold text-[14px]">
                      ${fmt(payAmount)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}

      {/* ══ ROW 3: Payment history (full width) ══════════════════════ */}
      <Card className="card-rounded overflow-hidden">
        <div className="px-4 pt-3 pb-2.5 border-b border-[rgba(120,120,128,0.08)]">
          <p className="text-white/60 text-[13px] font-medium">История выплат</p>
        </div>

        {contact.payments.length === 0 ? (
          <div className="px-4 py-8 text-center text-white/20 text-[13px]">Выплат ещё не было</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[rgba(120,120,128,0.08)]">
                {['Дата', 'Период', 'Сумма', 'TX Hash', 'Статус'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium text-white/30">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contact.payments.map(p => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPayment(p)}
                  className="border-b border-[rgba(120,120,128,0.05)] last:border-0 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3 text-white/45">{new Date(p.createdAt).toLocaleDateString('ru-RU')}</td>
                  <td className="px-4 py-3 text-white/50">{formatPeriod(p.period)}</td>
                  <td className="px-4 py-3 text-[#d6d3ff] font-medium">{parseFloat(p.amount).toFixed(2)} USDT</td>
                  <td className="px-4 py-3">
                    {p.txHash
                      ? <span className="font-mono text-[11px] text-white/30">{truncateAddress(p.txHash, 8, 6)}</span>
                      : <span className="text-white/15">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-[6px] text-[11px] border ${
                      p.status === 'completed'
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {p.status === 'completed' ? 'Выполнено' : 'Ошибка'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Payment detail modal */}
      {selectedPayment && (
        <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />
      )}

      {payModal && (
        <PayModal
          contact={{ id: contact.id, name: contact.name, walletAddress: contact.walletAddress }}
          suggestedAmount={payModal.amount}
          period={period}
          onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// ─── Payment Detail Modal ─────────────────────────────────────────────────────

function PaymentDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-[20px] border border-[rgba(120,120,128,0.2)] bg-[rgba(20,20,22,0.95)] p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-[16px]">Выплата</p>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-[20px] transition-colors">×</button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Дата', value: new Date(payment.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { label: 'Период', value: formatPeriod(payment.period) },
            { label: 'Сумма', value: `${parseFloat(payment.amount).toFixed(2)} USDT`, accent: true },
            { label: 'Статус', value: payment.status === 'completed' ? 'Выполнено' : 'Ошибка' },
          ].map(row => (
            <div key={row.label} className="flex items-baseline justify-between py-2 border-b border-[rgba(120,120,128,0.08)]">
              <span className="text-white/35 text-[13px]">{row.label}</span>
              <span className={`text-[13px] font-medium ${row.accent ? 'text-[#d6d3ff]' : 'text-white/70'}`}>{row.value}</span>
            </div>
          ))}

          {payment.txHash && (
            <div className="py-2">
              <p className="text-white/35 text-[13px] mb-1.5">TX Hash</p>
              <a
                href={`https://tronscan.org/#/transaction/${payment.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[12px] text-[#d6d3ff]/70 hover:text-[#d6d3ff] break-all transition-colors"
              >
                {payment.txHash}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ProjectRow ───────────────────────────────────────────────────────────────

interface ProjectRowProps {
  pair: CategoryPair; amount: number; period: string
  isEditing: boolean; contactId: string
  onToggleEdit: () => void; onDetach: () => void
  onRulesUpdated: (pair: CategoryPair) => void
}

function ProjectRow({ pair, amount, period, isEditing, contactId, onToggleEdit, onDetach, onRulesUpdated }: ProjectRowProps) {
  const [rules, setRules] = useState(pair.salaryRules.map(r => ({ ...r })))
  const [saving, setSaving] = useState(false)
  const [rulesError, setRulesError] = useState('')

  const addRule = () => setRules(prev => [...prev, { id: '', type: 'fixed', amount: 0, percent: null, source: null, label: null }])
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i))
  const updateRule = (i: number, field: string, value: unknown) =>
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const saveRules = async () => {
    setSaving(true); setRulesError('')
    try {
      const res = await fetch(`/api/contacts/${contactId}/projects/${pair.categoryId}/rules`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules.map(r => ({
          type: r.type,
          amount: (r.type === 'fixed' || r.type === 'per_unit') ? (r.amount ?? 0) : null,
          percent: r.type === 'percent' ? (r.percent ?? 0) : null,
          source: r.type === 'percent' ? (r.source ?? null) : null,
          label: (r.type === 'per_unit' || r.type === 'manual') ? (r.label ?? null) : null,
        }))),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setRulesError(data.error || 'Ошибка'); return }
      onRulesUpdated(data.data)
    } catch { setRulesError('Ошибка соединения') } finally { setSaving(false) }
  }

  return (
    <div>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-[13px] truncate">{pair.category.name}</p>
          {pair.salaryRules.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {pair.salaryRules.map((r, i) => (
                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[rgba(214,211,255,0.05)] border border-[rgba(214,211,255,0.1)] text-white/35">
                  {ruleDescription(r)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onToggleEdit}
            className={`h-[26px] px-2.5 rounded-[7px] text-[11px] transition-all ${
              isEditing ? 'bg-[rgba(214,211,255,0.15)] text-[#d6d3ff]' : 'bg-white/[0.04] text-white/40 hover:text-white/70'
            }`}>Условия</button>
          <button onClick={onDetach}
            className="w-[26px] h-[26px] flex items-center justify-center rounded-[7px] text-white/20 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors text-[15px]">×</button>
        </div>
      </div>

      {isEditing && (
        <div className="px-4 pb-3 pt-2 border-t border-[rgba(120,120,128,0.08)] space-y-2 bg-[rgba(0,0,0,0.08)]">
          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-wrap">
              <select value={rule.type} onChange={e => updateRule(i, 'type', e.target.value)}
                className="bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[7px] h-[28px] px-2 text-white text-[11px] focus:outline-none">
                <option value="fixed">Фиксированная</option>
                <option value="percent">Процент</option>
                <option value="per_unit">За единицу</option>
                <option value="manual">Ручная</option>
              </select>
              {rule.type === 'fixed' && (
                <Input type="number" min="0" value={rule.amount ?? 0}
                  onChange={e => updateRule(i, 'amount', parseFloat(e.target.value) || 0)}
                  className="h-[28px] text-[11px] w-20" placeholder="USDT" />
              )}
              {rule.type === 'percent' && (
                <>
                  <Input type="number" min="0" max="100" value={rule.percent ?? 0}
                    onChange={e => updateRule(i, 'percent', parseFloat(e.target.value) || 0)}
                    className="h-[28px] text-[11px] w-14" placeholder="%" />
                  <select value={rule.source ?? ''} onChange={e => updateRule(i, 'source', e.target.value || null)}
                    className="flex-1 bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[7px] h-[28px] px-2 text-white text-[11px] focus:outline-none">
                    <option value="">Всё</option>
                    <option value="of_gross">OF брутто</option>
                    <option value="of_net">OF нетто</option>
                    <option value="crypto">Крипто</option>
                  </select>
                </>
              )}
              {rule.type === 'per_unit' && (
                <>
                  <Input type="number" min="0" step="0.01" value={rule.amount ?? 0}
                    onChange={e => updateRule(i, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-[28px] text-[11px] w-20" placeholder="Цена" />
                  <Input type="text" value={rule.label ?? ''} onChange={e => updateRule(i, 'label', e.target.value || null)}
                    className="h-[28px] text-[11px] flex-1" placeholder="пдп, чат..." />
                </>
              )}
              {rule.type === 'manual' && (
                <Input type="text" value={rule.label ?? ''} onChange={e => updateRule(i, 'label', e.target.value || null)}
                  className="h-[28px] text-[11px] flex-1" placeholder="Описание" />
              )}
              <button onClick={() => removeRule(i)}
                className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors">×</button>
            </div>
          ))}
          <div className="flex gap-2 pt-0.5">
            <button onClick={addRule}
              className="h-[26px] px-2.5 rounded-[7px] border border-dashed border-[rgba(120,120,128,0.25)] text-white/35 hover:text-white/55 text-[11px] transition-colors">
              + Правило
            </button>
            <Button onClick={saveRules} disabled={saving} className="h-[26px] text-[11px] px-3">
              {saving ? '...' : 'Сохранить'}
            </Button>
          </div>
          {rulesError && <p className="text-xs text-red-400">{rulesError}</p>}
        </div>
      )}
    </div>
  )
}
