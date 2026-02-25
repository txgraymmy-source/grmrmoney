'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Category {
  id: string
  name: string
}

interface Rule {
  type: 'fixed' | 'percent'
  amount: string
  percent: string
  source: 'of_gross' | 'of_net' | 'crypto' | 'total'
  label: string
}

const defaultRule = (): Rule => ({
  type: 'fixed',
  amount: '',
  percent: '',
  source: 'of_net',
  label: '',
})

export default function CreateContactForm() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: '',
    walletAddress: '',
    notes: '',
    categoryId: '',
  })
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/categories?limit=50')
      .then(r => r.json())
      .then(({ data }) => setCategories((data || []).filter((c: any) => !c.archived)))
      .catch(() => {})
  }, [])

  const addRule = () => setRules(prev => [...prev, defaultRule()])

  const updateRule = (i: number, patch: Partial<Rule>) => {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const removeRule = (i: number) => {
    setRules(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async () => {
    setError('')
    if (!formData.name.trim()) {
      setError('Введите имя')
      return
    }
    if (!formData.walletAddress.trim()) {
      setError('Введите TRON-адрес')
      return
    }

    setLoading(true)
    try {
      // Create contact
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          walletAddress: formData.walletAddress,
          notes: formData.notes || undefined,
          categoryId: formData.categoryId || undefined,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to create contact')
      }

      const { data: contact } = await res.json()

      // Save rules
      if (rules.length > 0) {
        const rulesPayload = rules.map(r => ({
          type: r.type,
          amount: r.type === 'fixed' ? parseFloat(r.amount) || null : null,
          percent: r.type === 'percent' ? parseFloat(r.percent) || null : null,
          source: r.type === 'percent' ? r.source : null,
          label: r.label || null,
        }))

        const ruleRes = await fetch(`/api/contacts/${contact.id}/rules`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rulesPayload),
        })

        if (!ruleRes.ok) {
          throw new Error('Failed to save rules')
        }
      }

      router.push('/dashboard/salary')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Имя сотрудника / исполнителя</Label>
          <Input
            placeholder="Например: Анна Смирнова"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">TRON-адрес кошелька</Label>
          <Input
            placeholder="T..."
            value={formData.walletAddress}
            onChange={e => setFormData(p => ({ ...p, walletAddress: e.target.value }))}
            className="font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Привязать к проекту (опционально)</Label>
          <select
            value={formData.categoryId}
            onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
            className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
          >
            <option value="">Без проекта</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Заметки (опционально)</Label>
          <Input
            placeholder="Должность, контакт..."
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
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
            + Добавить правило
          </button>
        </div>

        {rules.length === 0 && (
          <p className="text-white/25 text-[13px] italic">Правила не добавлены — сумму можно указать вручную при выплате</p>
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
                      : 'bg-[rgba(118,118,128,0.1)] text-white/50 hover:text-white/70'
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
                      : 'bg-[rgba(118,118,128,0.1)] text-white/50 hover:text-white/70'
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
                  placeholder="0.00"
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
                    placeholder="0"
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
                placeholder="Например: Базовая ставка"
                value={rule.label}
                onChange={e => updateRule(i, { label: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? 'Создание...' : 'Создать сотрудника'}
      </Button>
    </div>
  )
}
