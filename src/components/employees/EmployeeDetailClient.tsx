'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPeriod, ruleDescription, calculateSalary } from '@/lib/salary'
import PayModal from '@/components/salary/PayModal'
import { truncateAddress } from '@/lib/utils'

interface Position {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface SalaryRule {
  id: string
  type: string
  amount: number | null
  percent: number | null
  source: string | null
  label: string | null
}

interface CategoryPair {
  id: string
  categoryId: string
  category: {
    id: string
    name: string
    transactions: Array<{ amount: string; type: string; source: string; timestamp: string }>
  }
  salaryRules: SalaryRule[]
}

interface Payment {
  id: string
  amount: string
  period: string
  txHash: string | null
  status: string
  createdAt: string
}

interface Contact {
  id: string
  name: string
  walletAddress: string
  notes: string | null
  positionId: string | null
  position: Position | null
  employeeProjects: CategoryPair[]
  payments: Payment[]
}

interface Props {
  contact: Contact
  positions: Position[]
  availableCategories: Array<{ id: string; name: string }>
  period: string
}

type Tab = 'projects' | 'history'

export default function EmployeeDetailClient({ contact, positions, availableCategories, period }: Props) {
  const router = useRouter()

  // Left panel state
  const [name, setName] = useState(contact.name)
  const [wallet, setWallet] = useState(contact.walletAddress)
  const [notes, setNotes] = useState(contact.notes ?? '')
  const [positionId, setPositionId] = useState(contact.positionId ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Right panel state
  const [tab, setTab] = useState<Tab>('projects')
  const [pairs, setPairs] = useState<CategoryPair[]>(contact.employeeProjects)
  const [payModal, setPayModal] = useState<{ pair: CategoryPair; amount: number } | null>(null)
  const [attachingProject, setAttachingProject] = useState(false)
  const [attachCategoryId, setAttachCategoryId] = useState('')
  const [attachError, setAttachError] = useState('')
  const [editRulesFor, setEditRulesFor] = useState<string | null>(null)

  const handleSave = async () => {
    setSaveError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          walletAddress: wallet,
          notes: notes || null,
          positionId: positionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSaveError(data.error || 'Ошибка при сохранении')
        return
      }
      router.refresh()
    } catch {
      setSaveError('Ошибка соединения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' })
      router.push('/dashboard/employees')
    } catch {
      setSaveError('Ошибка при удалении')
    }
  }

  const handleAttachProject = async () => {
    if (!attachCategoryId) return
    setAttachError('')
    try {
      const res = await fetch(`/api/contacts/${contact.id}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: attachCategoryId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setAttachError(data.error || 'Ошибка')
        return
      }
      setPairs(prev => [...prev, data.data])
      setAttachingProject(false)
      setAttachCategoryId('')
    } catch {
      setAttachError('Ошибка соединения')
    }
  }

  const handleDetachProject = async (categoryId: string) => {
    try {
      await fetch(`/api/contacts/${contact.id}/projects?categoryId=${categoryId}`, { method: 'DELETE' })
      setPairs(prev => prev.filter(p => p.categoryId !== categoryId))
    } catch {}
  }

  const attachedCategoryIds = new Set(pairs.map(p => p.categoryId))
  const unattachedCategories = availableCategories.filter(c => !attachedCategoryIds.has(c.id))

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left panel */}
      <div className="space-y-4">
        <Card className="card-rounded">
          <CardHeader className="pb-3">
            <CardTitle className="text-[16px]">Данные сотрудника</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Имя / Ник</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">TRON-адрес</Label>
              <Input value={wallet} onChange={e => setWallet(e.target.value)} className="font-mono text-[13px]" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Должность</Label>
              <select
                value={positionId}
                onChange={e => setPositionId(e.target.value)}
                className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
              >
                <option value="">Без должности</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon ? `${p.icon} ` : ''}{p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Заметки</Label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительно..." />
            </div>

            {saveError && <p className="text-sm text-red-400">{saveError}</p>}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>

            {deleteConfirm ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDeleteConfirm(false)} className="flex-1 text-[13px]">
                  Отмена
                </Button>
                <button
                  onClick={handleDelete}
                  className="flex-1 h-[40px] rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[13px] transition-colors"
                >
                  Подтвердить
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full h-[40px] rounded-[12px] text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.06] text-[13px] transition-colors"
              >
                Удалить сотрудника
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right panel */}
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[rgba(118,118,128,0.12)] rounded-[14px] w-fit">
          {(['projects', 'history'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-[10px] text-[14px] transition-all ${
                tab === t
                  ? 'bg-white text-[#101012] font-medium shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t === 'projects' ? 'Проекты' : 'История выплат'}
            </button>
          ))}
        </div>

        {tab === 'projects' && (
          <div className="space-y-3">
            {pairs.map(pair => {
              const txs = pair.category.transactions ?? []
              const amount = calculateSalary(pair.salaryRules, txs, period)
              const isEditingRules = editRulesFor === pair.id

              return (
                <ProjectPairCard
                  key={pair.id}
                  pair={pair}
                  amount={amount}
                  period={period}
                  isEditingRules={isEditingRules}
                  contactId={contact.id}
                  contactName={contact.name}
                  contactWallet={contact.walletAddress}
                  onEditRules={() => setEditRulesFor(isEditingRules ? null : pair.id)}
                  onDetach={() => handleDetachProject(pair.categoryId)}
                  onPay={() => setPayModal({ pair, amount })}
                  onRulesUpdated={(newPair) => {
                    setPairs(prev => prev.map(p => p.id === newPair.id ? newPair : p))
                    setEditRulesFor(null)
                  }}
                />
              )
            })}

            {pairs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.15)] rounded-[16px]">
                <p className="text-white/30 text-[14px] mb-4">Сотрудник не прикреплён ни к одному проекту</p>
              </div>
            )}

            {/* Attach project */}
            {!attachingProject ? (
              <button
                onClick={() => setAttachingProject(true)}
                className="w-full h-[44px] rounded-[14px] border border-dashed border-[rgba(120,120,128,0.3)] text-white/40 hover:text-white/60 hover:border-[rgba(120,120,128,0.5)] transition-all text-[14px]"
              >
                + Прикрепить к проекту
              </button>
            ) : (
              <div className="flex gap-2">
                <select
                  value={attachCategoryId}
                  onChange={e => setAttachCategoryId(e.target.value)}
                  className="flex-1 bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[44px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
                >
                  <option value="">Выберите проект</option>
                  {unattachedCategories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Button onClick={handleAttachProject} disabled={!attachCategoryId}>Добавить</Button>
                <Button variant="secondary" onClick={() => { setAttachingProject(false); setAttachError('') }}>×</Button>
              </div>
            )}
            {attachError && <p className="text-sm text-red-400">{attachError}</p>}
          </div>
        )}

        {tab === 'history' && (
          <Card className="card-rounded">
            <CardContent className="pt-4">
              {contact.payments.length === 0 ? (
                <p className="text-white/30 text-[14px] py-8 text-center">Выплат ещё не было</p>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[rgba(120,120,128,0.12)]">
                      {['Дата', 'Период', 'Сумма', 'TX', 'Статус'].map(h => (
                        <th key={h} className="pb-2.5 text-left font-medium text-white/35 pr-3 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contact.payments.map(p => (
                      <tr key={p.id} className="border-b border-[rgba(120,120,128,0.06)]">
                        <td className="py-3 pr-3 text-white/50">
                          {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                        <td className="py-3 pr-3 text-white/60">{formatPeriod(p.period)}</td>
                        <td className="py-3 pr-3 text-[#d6d3ff] font-medium">
                          {parseFloat(p.amount).toFixed(2)} USDT
                        </td>
                        <td className="py-3 pr-3">
                          {p.txHash ? (
                            <span className="font-mono text-[11px] text-white/30">
                              {truncateAddress(p.txHash, 6, 4)}
                            </span>
                          ) : <span className="text-white/20">—</span>}
                        </td>
                        <td className="py-3">
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
            </CardContent>
          </Card>
        )}
      </div>

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

// ─── Project pair card ───────────────────────────────────────────────────────

interface ProjectPairCardProps {
  pair: CategoryPair
  amount: number
  period: string
  isEditingRules: boolean
  contactId: string
  contactName: string
  contactWallet: string
  onEditRules: () => void
  onDetach: () => void
  onPay: () => void
  onRulesUpdated: (pair: CategoryPair) => void
}

function ProjectPairCard({
  pair, amount, period, isEditingRules,
  contactId, onEditRules, onDetach, onPay, onRulesUpdated,
}: ProjectPairCardProps) {
  const [rules, setRules] = useState(
    pair.salaryRules.map(r => ({ ...r }))
  )
  const [savingRules, setSavingRules] = useState(false)
  const [rulesError, setRulesError] = useState('')

  const addRule = () => setRules(prev => [...prev, { id: '', type: 'fixed', amount: 0, percent: null, source: null, label: null }])
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i))
  const updateRule = (i: number, field: string, value: any) =>
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))

  const saveRules = async () => {
    setSavingRules(true)
    setRulesError('')
    try {
      const res = await fetch(`/api/contacts/${contactId}/projects/${pair.categoryId}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules.map(r => ({
          type: r.type,
          amount: r.type === 'fixed' ? (r.amount ?? 0) : null,
          percent: r.type === 'percent' ? (r.percent ?? 0) : null,
          source: r.source ?? null,
          label: r.label ?? null,
        }))),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setRulesError(data.error || 'Ошибка')
        return
      }
      onRulesUpdated(data.data)
    } catch {
      setRulesError('Ошибка соединения')
    } finally {
      setSavingRules(false)
    }
  }

  return (
    <Card className="card-rounded">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-white font-medium text-[15px]">{pair.category.name}</p>
            {pair.salaryRules.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {pair.salaryRules.map((r, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-[6px] bg-[rgba(214,211,255,0.08)] border border-[rgba(214,211,255,0.15)] text-[#d6d3ff]">
                    {ruleDescription(r)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-[12px] mt-1">Нет правил начисления</p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-[#d6d3ff] font-semibold text-[18px]">
              {amount > 0 ? `≈ ${amount.toFixed(2)}` : '0'} USDT
            </p>
            <p className="text-white/30 text-[11px]">{period}</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button onClick={onPay} disabled={amount <= 0} className="flex-1 text-[13px] h-[36px]">
            Выплатить
          </Button>
          <Button variant="secondary" onClick={onEditRules} className="text-[13px] h-[36px] px-3">
            {isEditingRules ? 'Скрыть' : 'Правила'}
          </Button>
          <button
            onClick={onDetach}
            className="h-[36px] px-3 rounded-[10px] text-white/30 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors text-[13px]"
          >
            Открепить
          </button>
        </div>

        {isEditingRules && (
          <div className="mt-4 pt-4 border-t border-[rgba(120,120,128,0.12)] space-y-3">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={rule.type}
                  onChange={e => updateRule(i, 'type', e.target.value)}
                  className="bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[10px] h-[38px] px-3 text-white text-[13px] focus:outline-none"
                >
                  <option value="fixed">Фикс</option>
                  <option value="percent">%</option>
                </select>

                {rule.type === 'fixed' ? (
                  <Input
                    type="number"
                    min="0"
                    value={rule.amount ?? 0}
                    onChange={e => updateRule(i, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-[38px] text-[13px]"
                    placeholder="USDT"
                  />
                ) : (
                  <>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={rule.percent ?? 0}
                      onChange={e => updateRule(i, 'percent', parseFloat(e.target.value) || 0)}
                      className="h-[38px] text-[13px] w-20"
                      placeholder="%"
                    />
                    <select
                      value={rule.source ?? ''}
                      onChange={e => updateRule(i, 'source', e.target.value || null)}
                      className="bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[10px] h-[38px] px-3 text-white text-[13px] focus:outline-none flex-1"
                    >
                      <option value="">Всё</option>
                      <option value="of_gross">OF брутто</option>
                      <option value="of_net">OF нетто</option>
                      <option value="crypto">Крипто</option>
                    </select>
                  </>
                )}

                <button
                  onClick={() => removeRule(i)}
                  className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <button
                onClick={addRule}
                className="h-[36px] px-4 rounded-[10px] border border-dashed border-[rgba(120,120,128,0.3)] text-white/40 hover:text-white/60 text-[13px] transition-colors"
              >
                + Правило
              </button>
              <Button onClick={saveRules} disabled={savingRules} className="h-[36px] text-[13px]">
                {savingRules ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
            {rulesError && <p className="text-sm text-red-400">{rulesError}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
