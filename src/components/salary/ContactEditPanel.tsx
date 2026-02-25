'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ruleDescription, SalaryRuleInput } from '@/lib/salary'

interface Rule {
  id?: string
  type: 'fixed' | 'percent'
  amount: string
  percent: string
  source: 'of_gross' | 'of_net' | 'crypto' | 'total'
  label: string
}

interface Category {
  id: string
  name: string
}

interface Props {
  contactId: string
  initialName: string
  initialWalletAddress: string
  initialNotes: string
  initialCategoryId: string
  initialRules: SalaryRuleInput[]
  categories: Category[]
}

const defaultRule = (): Rule => ({
  type: 'fixed',
  amount: '',
  percent: '',
  source: 'of_net',
  label: '',
})

export default function ContactEditPanel({
  contactId,
  initialName,
  initialWalletAddress,
  initialNotes,
  initialCategoryId,
  initialRules,
  categories,
}: Props) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [walletAddress, setWalletAddress] = useState(initialWalletAddress)
  const [notes, setNotes] = useState(initialNotes)
  const [categoryId, setCategoryId] = useState(initialCategoryId)
  const [rules, setRules] = useState<Rule[]>(
    initialRules.map(r => ({
      type: r.type as 'fixed' | 'percent',
      amount: r.amount?.toString() ?? '',
      percent: r.percent?.toString() ?? '',
      source: (r.source as Rule['source']) ?? 'of_net',
      label: r.label ?? '',
    }))
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const addRule = () => setRules(prev => [...prev, defaultRule()])
  const updateRule = (i: number, patch: Partial<Rule>) =>
    setRules(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setError('')
    setSuccess(false)
    if (!name.trim() || !walletAddress.trim()) {
      setError('Имя и адрес обязательны')
      return
    }

    setSaving(true)
    try {
      const patchRes = await fetch(`/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          walletAddress,
          notes: notes || null,
          categoryId: categoryId || null,
        }),
      })
      if (!patchRes.ok) {
        const d = await patchRes.json()
        throw new Error(d.error || 'Failed to update')
      }

      const rulesPayload = rules.map(r => ({
        type: r.type,
        amount: r.type === 'fixed' ? parseFloat(r.amount) || null : null,
        percent: r.type === 'percent' ? parseFloat(r.percent) || null : null,
        source: r.type === 'percent' ? r.source : null,
        label: r.label || null,
      }))

      const ruleRes = await fetch(`/api/contacts/${contactId}/rules`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rulesPayload),
      })
      if (!ruleRes.ok) throw new Error('Failed to save rules')

      setSuccess(true)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Удалить "${name}"? Это действие необратимо.`)) return
    setDeleting(true)
    try {
      await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      router.push('/dashboard/salary')
      router.refresh()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Имя</Label>
          <Input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">TRON-адрес</Label>
          <Input
            value={walletAddress}
            onChange={e => setWalletAddress(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Проект</Label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
          >
            <option value="">Без проекта</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Заметки</Label>
          <Input
            placeholder="Должность, контакт..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-white/70 text-[13px]">Правила выплат</Label>
          <button
            type="button"
            onClick={addRule}
            className="text-[#d6d3ff] text-[13px] hover:opacity-80 transition-opacity"
          >
            + Добавить
          </button>
        </div>

        {rules.length === 0 && (
          <p className="text-white/25 text-[13px] italic">Нет правил</p>
        )}

        {rules.map((rule, i) => (
          <div key={i} className="bg-[rgba(118,118,128,0.06)] border border-[rgba(120,120,128,0.15)] rounded-[14px] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateRule(i, { type: 'fixed' })}
                  className={`px-3 py-1 rounded-[8px] text-[13px] transition-colors ${
                    rule.type === 'fixed'
                      ? 'bg-[#d6d3ff]/20 text-[#d6d3ff] border border-[#d6d3ff]/30'
                      : 'bg-[rgba(118,118,128,0.1)] text-white/50'
                  }`}
                >
                  Фиксированная
                </button>
                <button
                  type="button"
                  onClick={() => updateRule(i, { type: 'percent' })}
                  className={`px-3 py-1 rounded-[8px] text-[13px] transition-colors ${
                    rule.type === 'percent'
                      ? 'bg-[#d6d3ff]/20 text-[#d6d3ff] border border-[#d6d3ff]/30'
                      : 'bg-[rgba(118,118,128,0.1)] text-white/50'
                  }`}
                >
                  % от дохода
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-white/30 hover:text-red-400 transition-colors text-[18px] leading-none"
              >
                ×
              </button>
            </div>

            {rule.type === 'fixed' ? (
              <div className="space-y-1.5">
                <Label className="text-white/50 text-[12px]">Сумма (USDT)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rule.amount}
                  onChange={e => updateRule(i, { amount: e.target.value })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/50 text-[12px]">Процент (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={rule.percent}
                    onChange={e => updateRule(i, { percent: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/50 text-[12px]">Источник</Label>
                  <select
                    value={rule.source}
                    onChange={e => updateRule(i, { source: e.target.value as Rule['source'] })}
                    className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-3 text-white text-[13px] focus:outline-none"
                  >
                    <option value="of_gross">OF брутто</option>
                    <option value="of_net">OF нетто</option>
                    <option value="crypto">Крипто</option>
                    <option value="total">Всё</option>
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-white/50 text-[12px]">Метка (опционально)</Label>
              <Input
                placeholder="Базовая ставка"
                value={rule.label}
                onChange={e => updateRule(i, { label: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm text-green-400">Сохранено</p>}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400 hover:text-red-300"
        >
          {deleting ? '...' : 'Удалить'}
        </Button>
      </div>
    </div>
  )
}
