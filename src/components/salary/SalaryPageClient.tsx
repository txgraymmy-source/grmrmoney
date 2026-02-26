'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import PayModal from '@/components/salary/PayModal'
import BatchPayModal from '@/components/salary/BatchPayModal'
import { ruleDescription, isManualRule } from '@/lib/salary'
import type { EmployeeRow, ProjectGroup } from '@/app/dashboard/salary/page'

interface Props {
  groups: ProjectGroup[]
  period: string
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

const fmtInt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

export default function SalaryPageClient({ groups, period }: Props) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [payTarget, setPayTarget] = useState<EmployeeRow | null>(null)
  const [batchTarget, setBatchTarget] = useState<EmployeeRow[] | null>(null)

  const allEmployees = groups.flatMap(g => g.employees)
  const totalAmount = groups.reduce((s, g) => s + g.totalAmount, 0)

  const selectedGroup = selectedId ? groups.find(g => g.categoryId === selectedId) ?? null : null
  const displayEmployees = selectedGroup ? selectedGroup.employees : allEmployees
  const displayAmount = selectedGroup ? selectedGroup.totalAmount : totalAmount
  const displayLabel = selectedGroup ? selectedGroup.categoryName : 'Все сотрудники'

  const batchable = displayEmployees.filter(e => e.amount > 0 || isManualRule(e.rules))

  if (groups.length === 0) {
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
          <Link href="/dashboard/employees" className="h-[40px] px-5 rounded-[12px] bg-[#d6d3ff] text-[#090909] text-[14px] font-medium flex items-center hover:opacity-90 transition-opacity">
            Перейти к сотрудникам
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex gap-4 items-start">
      {/* ── Left sidebar ────────────────────────────────────────── */}
      <div className="w-[200px] flex-shrink-0 space-y-1">
        {/* Суммарно */}
        <SidebarItem
          label="Суммарно"
          amount={totalAmount}
          count={allEmployees.length}
          isSelected={selectedId === null}
          onClick={() => setSelectedId(null)}
        />

        {/* Divider */}
        {groups.length > 0 && (
          <div className="h-px bg-[rgba(120,120,128,0.12)] my-2" />
        )}

        {/* Projects */}
        {groups.map(g => (
          <SidebarItem
            key={g.categoryId}
            label={g.categoryName}
            amount={g.totalAmount}
            count={g.employees.length}
            isSelected={selectedId === g.categoryId}
            onClick={() => setSelectedId(g.categoryId)}
          />
        ))}
      </div>

      {/* ── Right panel ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Panel header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[20px] font-semibold text-white">{displayLabel}</h2>
            <p className="text-white/40 text-[13px]">
              {selectedGroup
                ? `${displayEmployees.length} сотр.`
                : `${allEmployees.length} сотр. · ${groups.length} проектов`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {displayAmount > 0 && (
              <div className="text-right">
                <p className="text-[#d6d3ff] font-semibold text-[22px] leading-none">
                  ${fmtInt(displayAmount)}
                </p>
                <p className="text-white/30 text-[11px] mt-0.5">к выплате</p>
              </div>
            )}
            {batchable.length > 0 && (
              <button
                onClick={() => setBatchTarget(batchable)}
                className="h-[38px] px-4 rounded-[12px] bg-[#d6d3ff] text-[#090909] text-[13px] font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Выплатить всем
              </button>
            )}
          </div>
        </div>

        {/* Employees table */}
        <Card className="card-rounded overflow-hidden">
          {displayEmployees.length === 0 ? (
            <CardContent className="flex items-center justify-center py-14">
              <p className="text-white/30 text-[14px]">Нет сотрудников</p>
            </CardContent>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(120,120,128,0.12)]">
                      <th className="px-6 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Сотрудник</th>
                      {!selectedId && (
                        <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Проект</th>
                      )}
                      <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Правила</th>
                      <th className="px-4 py-3.5 text-right text-[12px] font-medium text-white/35 uppercase tracking-wide">К выплате</th>
                      <th className="px-6 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayEmployees.map(emp => (
                      <tr
                        key={emp.contactCategoryId}
                        className="border-b border-[rgba(120,120,128,0.06)] hover:bg-white/[0.025] transition-colors"
                      >
                        {/* Employee */}
                        <td className="px-6 py-4">
                          <Link href={`/dashboard/employees/${emp.contactId}`} className="flex items-center gap-3 group/link">
                            <div className="w-7 h-7 rounded-full bg-[rgba(214,211,255,0.1)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[11px] flex-shrink-0">
                              {emp.contactName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-white font-medium text-[14px] group-hover/link:text-[#d6d3ff] transition-colors">
                                {emp.contactName}
                              </p>
                              {emp.positionName && (
                                <p className="text-[11px] mt-0.5" style={{ color: emp.positionColor ?? '#d6d3ff' }}>
                                  {emp.positionIcon} {emp.positionName}
                                </p>
                              )}
                            </div>
                          </Link>
                        </td>

                        {/* Project (summary view only) */}
                        {!selectedId && (
                          <td className="px-4 py-4">
                            <button
                              onClick={() => setSelectedId(emp.categoryId)}
                              className="text-white/50 hover:text-white text-[13px] transition-colors"
                            >
                              {emp.categoryName}
                            </button>
                          </td>
                        )}

                        {/* Rules */}
                        <td className="px-4 py-4 max-w-[200px]">
                          {emp.rules.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {emp.rules.map((r, j) => (
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
                          {emp.amount > 0 ? (
                            <div>
                              <p className="text-[#d6d3ff] font-semibold text-[15px]">${fmt(emp.amount)}</p>
                              <p className="text-white/25 text-[11px]">USDT</p>
                            </div>
                          ) : isManualRule(emp.rules) ? (
                            <span className="text-white/40 text-[12px] italic">Ручная</span>
                          ) : (
                            <span className="text-white/20 text-[13px]">—</span>
                          )}
                        </td>

                        {/* Pay button */}
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setPayTarget(emp)}
                            disabled={emp.amount <= 0 && !isManualRule(emp.rules)}
                            className={`h-[32px] px-4 rounded-[9px] text-[13px] font-medium transition-all ${
                              emp.amount > 0 || isManualRule(emp.rules)
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
                {displayEmployees.map(emp => (
                  <div key={emp.contactCategoryId} className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/dashboard/employees/${emp.contactId}`} className="text-white font-medium text-[14px]">
                            {emp.contactName}
                          </Link>
                          {emp.positionName && (
                            <span className="text-[11px]" style={{ color: emp.positionColor ?? '#d6d3ff' }}>
                              {emp.positionIcon} {emp.positionName}
                            </span>
                          )}
                        </div>
                        {!selectedId && (
                          <p className="text-white/35 text-[12px] mt-0.5">{emp.categoryName}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        {emp.amount > 0 ? (
                          <p className="text-[#d6d3ff] font-semibold text-[15px]">${fmt(emp.amount)}</p>
                        ) : isManualRule(emp.rules) ? (
                          <span className="text-white/40 text-[12px] italic">Ручная</span>
                        ) : (
                          <span className="text-white/20 text-[13px]">—</span>
                        )}
                      </div>
                    </div>
                    {(emp.amount > 0 || isManualRule(emp.rules)) && (
                      <button
                        onClick={() => setPayTarget(emp)}
                        className="w-full h-[36px] rounded-[10px] bg-[#d6d3ff] text-[#090909] text-[13px] font-medium hover:opacity-90 transition-opacity"
                      >
                        Выплатить {emp.amount > 0 ? `$${fmt(emp.amount)}` : ''}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Modals */}
      {payTarget && (
        <PayModal
          contact={{ id: payTarget.contactId, name: payTarget.contactName, walletAddress: payTarget.contactWallet }}
          suggestedAmount={payTarget.amount}
          period={period}
          onClose={() => setPayTarget(null)}
          onSuccess={() => { setPayTarget(null); router.refresh() }}
        />
      )}

      {batchTarget && (
        <BatchPayModal
          employees={batchTarget}
          period={period}
          onClose={() => setBatchTarget(null)}
          onSuccess={() => { setBatchTarget(null); router.refresh() }}
        />
      )}
    </div>
  )
}

// ─── Sidebar item ─────────────────────────────────────────────────────────────

function SidebarItem({
  label, amount, count, isSelected, onClick,
}: {
  label: string
  amount: number
  count: number
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3.5 py-3 rounded-[14px] text-left transition-all ${
        isSelected
          ? 'bg-[rgba(214,211,255,0.1)] border border-[rgba(214,211,255,0.2)]'
          : 'hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      <p className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-white/65'}`}>
        {label}
      </p>
      <div className="flex items-center justify-between mt-0.5">
        <p className={`text-[12px] font-semibold ${isSelected ? 'text-[#d6d3ff]' : 'text-white/30'}`}>
          {amount > 0 ? `$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}` : '—'}
        </p>
        <p className="text-[11px] text-white/20">{count}</p>
      </div>
    </button>
  )
}
