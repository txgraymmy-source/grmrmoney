'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PayModal from '@/components/salary/PayModal'
import { ruleDescription } from '@/lib/salary'

interface SalaryRule {
  type: string
  amount: number | null
  percent: number | null
  source: string | null
  label: string | null
}

interface EmployeePair {
  id: string
  contactId: string
  contact: {
    id: string
    name: string
    walletAddress: string
    position: { name: string; icon: string | null; color: string | null } | null
  }
  salaryRules: SalaryRule[]
  calculatedAmount: number
}

interface Props {
  categoryId: string
  pairs: EmployeePair[]
  availableContacts: Array<{ id: string; name: string }>
  period: string
}

export default function ProjectEmployeesSection({ categoryId, pairs: initialPairs, availableContacts, period }: Props) {
  const router = useRouter()
  const [pairs, setPairs] = useState(initialPairs)
  const [payTarget, setPayTarget] = useState<EmployeePair | null>(null)
  const [attaching, setAttaching] = useState(false)
  const [attachContactId, setAttachContactId] = useState('')
  const [attachError, setAttachError] = useState('')

  const attachedContactIds = new Set(pairs.map(p => p.contactId))
  const unattached = availableContacts.filter(c => !attachedContactIds.has(c.id))

  const handleAttach = async () => {
    if (!attachContactId) return
    setAttachError('')
    try {
      const res = await fetch(`/api/contacts/${attachContactId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setAttachError(data.error || 'Ошибка')
        return
      }
      router.refresh()
      setAttaching(false)
      setAttachContactId('')
    } catch {
      setAttachError('Ошибка соединения')
    }
  }

  return (
    <Card className="card-rounded">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[16px]">Сотрудники проекта</CardTitle>
          <span className="text-white/30 text-[13px]">{pairs.length}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pairs.length === 0 && !attaching && (
          <p className="text-white/30 text-[13px]">Нет прикреплённых сотрудников</p>
        )}

        {pairs.map(pair => (
          <div
            key={pair.id}
            className="flex items-center gap-3 p-3 rounded-[12px] bg-[rgba(118,118,128,0.06)] border border-[rgba(120,120,128,0.1)]"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/employees/${pair.contact.id}`}
                  className="text-white font-medium text-[14px] hover:text-[#d6d3ff] transition-colors"
                >
                  {pair.contact.name}
                </Link>
                {pair.contact.position && (
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded-[5px] border"
                    style={{
                      background: pair.contact.position.color ? `${pair.contact.position.color}18` : 'rgba(214,211,255,0.08)',
                      borderColor: pair.contact.position.color ? `${pair.contact.position.color}40` : 'rgba(214,211,255,0.2)',
                      color: pair.contact.position.color ?? '#d6d3ff',
                    }}
                  >
                    {pair.contact.position.icon && <span className="mr-1">{pair.contact.position.icon}</span>}
                    {pair.contact.position.name}
                  </span>
                )}
              </div>
              {pair.salaryRules.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {pair.salaryRules.map((r, i) => (
                    <span key={i} className="text-[11px] text-white/35 bg-[rgba(214,211,255,0.05)] px-1.5 py-0.5 rounded-[5px]">
                      {ruleDescription(r)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-[#d6d3ff] font-semibold text-[14px]">
                {pair.calculatedAmount > 0 ? `≈ ${pair.calculatedAmount.toFixed(2)} USDT` : '—'}
              </p>
            </div>

            <Button
              onClick={() => setPayTarget(pair)}
              disabled={pair.calculatedAmount <= 0}
              className="h-[32px] text-[12px] px-3 flex-shrink-0"
            >
              Выплатить
            </Button>
          </div>
        ))}

        {!attaching ? (
          <button
            onClick={() => setAttaching(true)}
            className="w-full h-[38px] rounded-[12px] border border-dashed border-[rgba(120,120,128,0.25)] text-white/35 hover:text-white/50 hover:border-[rgba(120,120,128,0.4)] transition-all text-[13px]"
          >
            + Прикрепить сотрудника
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={attachContactId}
                onChange={e => setAttachContactId(e.target.value)}
                className="flex-1 bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[40px] px-4 text-white text-[13px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
              >
                <option value="">Выберите сотрудника</option>
                {unattached.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button onClick={handleAttach} disabled={!attachContactId} className="h-[40px] text-[13px]">Добавить</Button>
              <Button variant="secondary" onClick={() => { setAttaching(false); setAttachError('') }} className="h-[40px] text-[13px]">×</Button>
            </div>
            {attachError && <p className="text-sm text-red-400">{attachError}</p>}
            {unattached.length === 0 && (
              <p className="text-white/30 text-[13px]">
                Все сотрудники уже прикреплены.{' '}
                <Link href="/dashboard/employees/new" className="text-[#d6d3ff] hover:underline">Добавить нового</Link>
              </p>
            )}
          </div>
        )}
      </CardContent>

      {payTarget && (
        <PayModal
          contact={{ id: payTarget.contact.id, name: payTarget.contact.name, walletAddress: payTarget.contact.walletAddress }}
          suggestedAmount={payTarget.calculatedAmount}
          period={period}
          onClose={() => setPayTarget(null)}
          onSuccess={() => { setPayTarget(null); router.refresh() }}
        />
      )}
    </Card>
  )
}
