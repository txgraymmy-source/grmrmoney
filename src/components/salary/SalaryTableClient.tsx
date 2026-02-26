'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PayModal from '@/components/salary/PayModal'
import { ruleDescription } from '@/lib/salary'

export interface SalaryRow {
  contactId: string
  contactName: string
  contactWallet: string
  positionName: string | null
  positionIcon: string | null
  positionColor: string | null
  categoryId: string
  categoryName: string
  amount: number
  rules: Array<{ type: string; amount: number | null; percent: number | null; source: string | null; label: string | null }>
}

interface Props {
  rows: SalaryRow[]
  period: string
  totalAmount: number
  uniqueEmployees: number
  uniqueProjects: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

const fmtInt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

export default function SalaryTableClient({ rows, period, totalAmount, uniqueEmployees, uniqueProjects }: Props) {
  const router = useRouter()
  const [payTarget, setPayTarget] = useState<SalaryRow | null>(null)
  const [paying, setPaying] = useState<string | null>(null)

  const pendingAmount = rows.reduce((s, r) => s + r.amount, 0)

  if (rows.length === 0) {
    return (
      <Card className="card-rounded">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-[18px] bg-[rgba(214,211,255,0.08)] flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d6d3ff" strokeWidth="1.5">
              <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
            </svg>
          </div>
          <p className="text-white/60 text-[15px] font-medium mb-1">Нет данных для выплат</p>
          <p className="text-white/30 text-[13px] mb-6 text-center max-w-xs">
            Добавьте сотрудников, прикрепите к проектам и настройте правила начисления
          </p>
          <Link href="/dashboard/employees">
            <Button>Перейти к сотрудникам</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="card-rounded">
          <CardContent className="pt-4 pb-4">
            <p className="text-white/40 text-[12px] mb-1">Сотрудников</p>
            <p className="text-white font-semibold text-[24px] leading-none">{uniqueEmployees}</p>
          </CardContent>
        </Card>
        <Card className="card-rounded">
          <CardContent className="pt-4 pb-4">
            <p className="text-white/40 text-[12px] mb-1">Проектов</p>
            <p className="text-white font-semibold text-[24px] leading-none">{uniqueProjects}</p>
          </CardContent>
        </Card>
        <Card className="card-rounded">
          <CardContent className="pt-4 pb-4">
            <p className="text-white/40 text-[12px] mb-1">Записей</p>
            <p className="text-white font-semibold text-[24px] leading-none">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="card-rounded">
          <CardContent className="pt-4 pb-4">
            <p className="text-white/40 text-[12px] mb-1">К выплате</p>
            <p className="text-[#d6d3ff] font-semibold text-[24px] leading-none">
              {pendingAmount > 0 ? `$${fmtInt(pendingAmount)}` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="card-rounded overflow-hidden">
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(120,120,128,0.12)]">
                <th className="px-6 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Сотрудник</th>
                <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Должность</th>
                <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Проект</th>
                <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Правила</th>
                <th className="px-4 py-3.5 text-right text-[12px] font-medium text-white/35 uppercase tracking-wide">К выплате</th>
                <th className="px-6 py-3.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-[rgba(120,120,128,0.06)] hover:bg-white/[0.025] transition-colors group">
                  {/* Employee */}
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/employees/${row.contactId}`} className="flex items-center gap-3 group/link">
                      <div className="w-7 h-7 rounded-full bg-[rgba(214,211,255,0.1)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[11px] flex-shrink-0">
                        {row.contactName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium text-[14px] group-hover/link:text-[#d6d3ff] transition-colors">
                        {row.contactName}
                      </span>
                    </Link>
                  </td>

                  {/* Position */}
                  <td className="px-4 py-4">
                    {row.positionName ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[7px] border font-medium whitespace-nowrap"
                        style={{
                          background: row.positionColor ? `${row.positionColor}15` : 'rgba(214,211,255,0.08)',
                          borderColor: row.positionColor ? `${row.positionColor}35` : 'rgba(214,211,255,0.2)',
                          color: row.positionColor ?? '#d6d3ff',
                        }}
                      >
                        {row.positionIcon && <span>{row.positionIcon}</span>}
                        {row.positionName}
                      </span>
                    ) : (
                      <span className="text-white/25 text-[13px]">—</span>
                    )}
                  </td>

                  {/* Project */}
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/categories/${row.categoryId}`}
                      className="text-white/60 hover:text-white text-[14px] transition-colors"
                    >
                      {row.categoryName}
                    </Link>
                  </td>

                  {/* Rules */}
                  <td className="px-4 py-4 max-w-[200px]">
                    {row.rules.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.rules.map((r, j) => (
                          <span key={j} className="text-[11px] px-2 py-0.5 rounded-[5px] bg-[rgba(214,211,255,0.05)] border border-[rgba(214,211,255,0.1)] text-white/40 whitespace-nowrap">
                            {ruleDescription(r)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/20 text-[12px]">—</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4 text-right">
                    {row.amount > 0 ? (
                      <div>
                        <p className="text-[#d6d3ff] font-semibold text-[15px]">${fmt(row.amount)}</p>
                        <p className="text-white/25 text-[11px]">USDT</p>
                      </div>
                    ) : (
                      <span className="text-white/20 text-[13px]">—</span>
                    )}
                  </td>

                  {/* Pay button */}
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setPayTarget(row)}
                      disabled={row.amount <= 0}
                      className={`h-[32px] px-4 rounded-[9px] text-[13px] font-medium transition-all ${
                        row.amount > 0
                          ? 'bg-[#d6d3ff] text-[#090909] hover:opacity-90'
                          : 'bg-white/[0.04] text-white/20 cursor-not-allowed'
                      }`}
                    >
                      Выплатить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile list */}
        <div className="md:hidden divide-y divide-[rgba(120,120,128,0.08)]">
          {rows.map((row, i) => (
            <div key={i} className="px-4 py-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/dashboard/employees/${row.contactId}`} className="text-white font-medium text-[14px]">
                      {row.contactName}
                    </Link>
                    {row.positionName && (
                      <span
                        className="text-[11px] px-1.5 py-0.5 rounded-[5px] border"
                        style={{
                          background: row.positionColor ? `${row.positionColor}15` : 'rgba(214,211,255,0.08)',
                          borderColor: row.positionColor ? `${row.positionColor}35` : 'rgba(214,211,255,0.2)',
                          color: row.positionColor ?? '#d6d3ff',
                        }}
                      >
                        {row.positionIcon} {row.positionName}
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-[12px] mt-0.5">{row.categoryName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {row.amount > 0 ? (
                    <p className="text-[#d6d3ff] font-semibold text-[15px]">${fmt(row.amount)}</p>
                  ) : (
                    <span className="text-white/20 text-[13px]">—</span>
                  )}
                </div>
              </div>
              {row.amount > 0 && (
                <button
                  onClick={() => setPayTarget(row)}
                  className="w-full h-[36px] rounded-[10px] bg-[#d6d3ff] text-[#090909] text-[13px] font-medium hover:opacity-90 transition-opacity"
                >
                  Выплатить ${fmt(row.amount)}
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {payTarget && (
        <PayModal
          contact={{ id: payTarget.contactId, name: payTarget.contactName, walletAddress: payTarget.contactWallet }}
          suggestedAmount={payTarget.amount}
          period={period}
          onClose={() => setPayTarget(null)}
          onSuccess={() => { setPayTarget(null); router.refresh() }}
        />
      )}
    </>
  )
}
