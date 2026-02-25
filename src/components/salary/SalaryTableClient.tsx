'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import PayModal from '@/components/salary/PayModal'
import { ruleDescription } from '@/lib/salary'

interface SalaryRow {
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
}

export default function SalaryTableClient({ rows, period, totalAmount }: Props) {
  const router = useRouter()
  const [payTarget, setPayTarget] = useState<SalaryRow | null>(null)

  return (
    <>
      {rows.length === 0 ? (
        <Card className="card-rounded">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-white/50 mb-2 text-[15px]">Нет сотрудников с привязанными проектами</p>
            <p className="text-white/30 text-[13px] mb-6 text-center max-w-sm">
              Добавьте сотрудников и прикрепите их к проектам с правилами выплат
            </p>
            <Link href="/dashboard/employees">
              <Button>Перейти к сотрудникам</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center gap-6 px-5 py-4 bg-[rgba(214,211,255,0.04)] border border-[rgba(214,211,255,0.12)] rounded-[16px]">
            <div>
              <p className="text-white/40 text-[12px]">Записей</p>
              <p className="text-white font-semibold text-[20px]">{rows.length}</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <p className="text-white/40 text-[12px]">К выплате за период</p>
              <p className="text-[#d6d3ff] font-semibold text-[20px]">
                ≈ {totalAmount.toFixed(2)} USDT
              </p>
            </div>
          </div>

          <Card className="card-rounded">
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[rgba(120,120,128,0.12)]">
                    {['Сотрудник', 'Должность', 'Проект', 'Правила', 'К выплате', ''].map(h => (
                      <th key={h} className="pb-2.5 text-left font-medium text-white/35 pr-4 last:pr-0 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[rgba(120,120,128,0.06)] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/employees/${row.contactId}`}
                          className="text-white font-medium hover:text-[#d6d3ff] transition-colors"
                        >
                          {row.contactName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        {row.positionName ? (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-[6px] border whitespace-nowrap"
                            style={{
                              background: row.positionColor ? `${row.positionColor}18` : 'rgba(214,211,255,0.08)',
                              borderColor: row.positionColor ? `${row.positionColor}40` : 'rgba(214,211,255,0.2)',
                              color: row.positionColor ?? '#d6d3ff',
                            }}
                          >
                            {row.positionIcon && <span className="mr-1">{row.positionIcon}</span>}
                            {row.positionName}
                          </span>
                        ) : (
                          <span className="text-white/25">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/dashboard/categories/${row.categoryId}`}
                          className="text-white/70 hover:text-white transition-colors"
                        >
                          {row.categoryName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        {row.rules.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.rules.map((r, j) => (
                              <span key={j} className="text-[11px] px-1.5 py-0.5 rounded-[5px] bg-[rgba(214,211,255,0.06)] border border-[rgba(214,211,255,0.12)] text-white/40">
                                {ruleDescription(r)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-white/20 text-[12px]">Нет правил</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`font-semibold text-[14px] ${row.amount > 0 ? 'text-[#d6d3ff]' : 'text-white/25'}`}>
                          {row.amount > 0 ? `≈ ${row.amount.toFixed(2)} USDT` : '—'}
                        </span>
                      </td>
                      <td className="py-3">
                        <Button
                          onClick={() => setPayTarget(row)}
                          disabled={row.amount <= 0}
                          className="h-[32px] text-[12px] px-3"
                        >
                          Выплатить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

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
