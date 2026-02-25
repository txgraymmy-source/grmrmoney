'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ProjectStat {
  id: string
  name: string
  blockchainIn: number
  ofGross: number
  ofNet: number
  expenses: number
  total: number
  color: string
}

export interface DailyBalanceItem {
  date: string
  income: number
  expenses: number
  balance: number
}

export interface FundStat {
  id: string
  name: string
  icon: string | null
  color: string | null
  allTimeTotal: number
  periodTotal: number
  pendingCount: number
}

interface Props {
  projectStats: ProjectStat[]
  businessDailyData: DailyBalanceItem[]
  fundStats: FundStat[]
  showBar?: boolean
  showLine?: boolean
  showTable?: boolean
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const BarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1f] border border-[rgba(120,120,128,0.2)] rounded-[12px] p-3 shadow-xl text-[13px]">
      <p className="text-white/60 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)} USDT</p>
      ))}
    </div>
  )
}

const LineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1c1c1f] border border-[rgba(120,120,128,0.2)] rounded-[12px] p-3 shadow-xl text-[13px]">
      <p className="text-white/60 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)} $</p>
      ))}
    </div>
  )
}

const axisStyle = { fill: 'rgba(255,255,255,0.3)', fontSize: 11 }

export default function DashboardCharts({
  projectStats,
  businessDailyData,
  fundStats,
  showBar = true,
  showLine = true,
  showTable = true,
}: Props) {
  const hasProjectData = projectStats.some(p => p.blockchainIn > 0 || p.ofGross > 0)
  const hasBusinessData = businessDailyData.some(d => d.income > 0 || d.expenses > 0)

  const barData = projectStats.map(p => ({
    ...p,
    shortName: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
  }))

  const totals = projectStats.reduce(
    (acc, p) => ({
      blockchainIn: acc.blockchainIn + p.blockchainIn,
      ofNet: acc.ofNet + p.ofNet,
      expenses: acc.expenses + p.expenses,
      total: acc.total + p.total,
    }),
    { blockchainIn: 0, ofNet: 0, expenses: 0, total: 0 }
  )

  const fundPeriodTotal = fundStats.reduce((s, f) => s + f.periodTotal, 0)

  return (
    <div className="space-y-6">
      {/* Bar chart */}
      {showBar && (
        <Card className="card-rounded">
          <CardHeader><CardTitle>Сравнение проектов</CardTitle></CardHeader>
          <CardContent>
            {hasProjectData ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,128,0.12)" vertical={false} />
                  <XAxis dataKey="shortName" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${fmt(v)}`} width={60} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Legend wrapperStyle={{ paddingTop: 12 }} formatter={v => <span className="text-white/60 text-[12px]">{v}</span>} />
                  <Bar dataKey="blockchainIn" name="Крипто" fill="#d6d3ff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ofNet" name="OF (нетто)" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-white/25 text-[14px]">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Business dynamics */}
      {showLine && (
        <Card className="card-rounded">
          <CardHeader><CardTitle>Динамика бизнеса</CardTitle></CardHeader>
          <CardContent>
            {hasBusinessData ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={businessDailyData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,128,0.12)" vertical={false} />
                  <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${fmt(v)}`} width={60} />
                  <Tooltip content={<LineTooltip />} />
                  <Legend wrapperStyle={{ paddingTop: 12 }} formatter={v => <span className="text-white/60 text-[12px]">{v}</span>} />
                  <Line type="monotone" dataKey="income" name="Поступления" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="expenses" name="Расходы" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line type="monotone" dataKey="balance" name="Баланс (нараст.)" stroke="#d6d3ff" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-white/25 text-[14px]">
                Нет данных за выбранный период
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      {showTable && (projectStats.length > 0 || fundStats.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Projects table */}
          {projectStats.length > 0 && (
            <Card className="card-rounded">
              <CardHeader><CardTitle>Поступления по проектам</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[rgba(120,120,128,0.12)]">
                      {['Проект', 'Крипто', 'OF нетто', 'Расходы', 'Итого'].map(h => (
                        <th key={h} className="pb-2.5 text-left font-medium text-white/35 pr-3 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {projectStats.map(p => (
                      <tr key={p.id} className="border-b border-[rgba(120,120,128,0.06)] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <span className="text-white font-medium truncate max-w-[100px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-[#d6d3ff]">{p.blockchainIn > 0 ? `+$${fmt(p.blockchainIn)}` : '—'}</td>
                        <td className="py-3 pr-3 text-green-400">{p.ofNet > 0 ? `$${fmt(p.ofNet)}` : '—'}</td>
                        <td className="py-3 pr-3 text-red-400">{p.expenses > 0 ? `−$${fmt(p.expenses)}` : '—'}</td>
                        <td className={`py-3 font-semibold ${p.total >= 0 ? 'text-white' : 'text-red-400'}`}>
                          {p.total >= 0 ? '+' : ''}{fmt(p.total)} $
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {projectStats.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-[rgba(120,120,128,0.2)]">
                        <td className="pt-3 pr-3 text-white/50 font-medium">Итого</td>
                        <td className="pt-3 pr-3 text-[#d6d3ff] font-semibold">{totals.blockchainIn > 0 ? `+$${fmt(totals.blockchainIn)}` : '—'}</td>
                        <td className="pt-3 pr-3 text-green-400 font-semibold">{totals.ofNet > 0 ? `$${fmt(totals.ofNet)}` : '—'}</td>
                        <td className="pt-3 pr-3 text-red-400 font-semibold">{totals.expenses > 0 ? `−$${fmt(totals.expenses)}` : '—'}</td>
                        <td className={`pt-3 font-bold text-[15px] ${totals.total >= 0 ? 'text-white' : 'text-red-400'}`}>
                          {totals.total >= 0 ? '+' : ''}{fmt(totals.total)} $
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </CardContent>
            </Card>
          )}

          {/* Fund income table */}
          {fundStats.length > 0 && (
            <Card className="card-rounded">
              <CardHeader><CardTitle>Поступления в фонды</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[rgba(120,120,128,0.12)]">
                      {['Фонд', 'За период', 'Всего', 'Ожидает'].map(h => (
                        <th key={h} className="pb-2.5 text-left font-medium text-white/35 pr-3 last:pr-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fundStats.map(f => (
                      <tr key={f.id} className="border-b border-[rgba(120,120,128,0.06)] hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px]">{f.icon || '💰'}</span>
                            <span className="text-white font-medium truncate max-w-[100px]">{f.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-[#d6d3ff] font-medium">{f.periodTotal > 0 ? `+$${fmt(f.periodTotal)}` : '—'}</td>
                        <td className="py-3 pr-3 text-white/60">{f.allTimeTotal > 0 ? `$${fmt(f.allTimeTotal)}` : '—'}</td>
                        <td className="py-3">
                          {f.pendingCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-[6px] text-[11px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                              ⚡ {f.pendingCount}
                            </span>
                          ) : (
                            <span className="text-white/25">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {fundStats.length > 1 && (
                    <tfoot>
                      <tr className="border-t border-[rgba(120,120,128,0.2)]">
                        <td className="pt-3 pr-3 text-white/50 font-medium">Итого</td>
                        <td className="pt-3 pr-3 text-[#d6d3ff] font-semibold">{fundPeriodTotal > 0 ? `+$${fmt(fundPeriodTotal)}` : '—'}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
