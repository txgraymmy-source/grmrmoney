'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  FREQUENCIES,
  DAYS_OF_WEEK,
  usesMonthDays,
  serializeDates,
  scheduleLabel,
  type PaymentFrequency,
} from '@/lib/paymentSchedule'

interface Position {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface Props {
  positions: Position[]
}

const SELECT_CLS =
  'w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]'

export default function NewEmployeeForm({ positions }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [positionId, setPositionId] = useState('')
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency | ''>('')
  const [selectedDates, setSelectedDates] = useState<number[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleDate = (n: number) =>
    setSelectedDates(prev => {
      if (prev.includes(n)) return prev.filter(d => d !== n)
      if (paymentFrequency === 'twice_monthly' && prev.length >= 2) return prev
      return [...prev, n].sort((a, b) => a - b)
    })

  const handleFreqChange = (v: PaymentFrequency | '') => {
    setPaymentFrequency(v)
    setSelectedDates([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          walletAddress,
          notes: notes || undefined,
          positionId: positionId || undefined,
          paymentFrequency: paymentFrequency || undefined,
          paymentDates: selectedDates.length ? serializeDates(selectedDates) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setError(data.error || 'Ошибка при создании'); return }
      router.push(`/dashboard/employees/${data.data.id}`)
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  const isMonthDays = usesMonthDays(paymentFrequency || null)
  const chips = isMonthDays
    ? Array.from({ length: 28 }, (_, i) => i + 1)
    : DAYS_OF_WEEK

  return (
    <Card className="card-rounded">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Имя / Ник</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Иван Петров" required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">TRON-адрес кошелька</Label>
            <Input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} placeholder="T..." required />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Должность</Label>
            <select value={positionId} onChange={e => setPositionId(e.target.value)} className={SELECT_CLS}>
              <option value="">Без должности</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>{p.icon ? `${p.icon} ` : ''}{p.name}</option>
              ))}
            </select>
          </div>

          {/* Payment schedule — compact */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[rgba(120,120,128,0.12)]" />
              <span className="text-white/25 text-[11px]">Расписание выплат</span>
              <div className="h-px flex-1 bg-[rgba(120,120,128,0.12)]" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={paymentFrequency}
                onChange={e => handleFreqChange(e.target.value as PaymentFrequency | '')}
                className="flex-1 bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[10px] h-[38px] px-3 text-white text-[13px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
              >
                <option value="">Не указана</option>
                {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>

            {/* Date chips */}
            {paymentFrequency && (
              <div>
                <p className="text-white/40 text-[11px] mb-1.5">
                  {isMonthDays
                    ? paymentFrequency === 'twice_monthly'
                      ? `Числа месяца — выберите 2 ${selectedDates.length === 2 ? '✓' : `(${selectedDates.length}/2)`}`
                      : 'Числа месяца'
                    : 'Дни недели'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {isMonthDays
                    ? Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => toggleDate(n)}
                          className={`w-8 h-8 rounded-[8px] text-[12px] font-medium transition-all ${
                            selectedDates.includes(n)
                              ? 'bg-[#d6d3ff] text-[#090909]'
                              : 'bg-[rgba(118,118,128,0.1)] text-white/50 hover:text-white hover:bg-[rgba(118,118,128,0.2)]'
                          }`}
                        >{n}</button>
                      ))
                    : DAYS_OF_WEEK.map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDate(d.value)}
                          className={`h-8 px-2.5 rounded-[8px] text-[12px] font-medium transition-all ${
                            selectedDates.includes(d.value)
                              ? 'bg-[#d6d3ff] text-[#090909]'
                              : 'bg-[rgba(118,118,128,0.1)] text-white/50 hover:text-white hover:bg-[rgba(118,118,128,0.2)]'
                          }`}
                        >{d.short}</button>
                      ))
                  }
                </div>
              </div>
            )}

            {/* Preview */}
            {paymentFrequency && (selectedDates.length > 0 || paymentFrequency === 'twice_monthly') && (
              <p className="text-[#d6d3ff] text-[11px]">
                📅 {scheduleLabel(paymentFrequency, serializeDates(selectedDates))}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Заметки</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">Отмена</Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Создание...' : 'Создать сотрудника'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
