import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardClient from '@/components/dashboard/DashboardClient'
import DashboardConfigButton from '@/components/dashboard/DashboardConfigButton'
import DashboardFilterBar from '@/components/dashboard/DashboardFilterBar'
import type { ProjectStat, DailyBalanceItem, FundStat } from '@/components/dashboard/DashboardCharts'
import { calculateSalary, currentPeriod } from '@/lib/salary'

const DEFAULT_WIDGETS = [
  { type: 'stat_cards',      enabled: true, order: 0 },
  { type: 'project_bar',     enabled: true, order: 1 },
  { type: 'of_line',         enabled: true, order: 2 },
  { type: 'income_table',    enabled: true, order: 3 },
  { type: 'fund_overview',   enabled: true, order: 4 },
  { type: 'categories_list', enabled: true, order: 5 },
]

const COLORS = ['#d6d3ff','#a78bfa','#60a5fa','#34d399','#fbbf24','#f87171','#e879f9','#fb923c']

function getDateRange(period: string, dateFrom?: string, dateTo?: string) {
  if (period === 'custom' && dateFrom && dateTo) {
    return { from: new Date(dateFrom + 'T00:00:00'), to: new Date(dateTo + 'T23:59:59') }
  }
  const to = new Date()
  const from = new Date()
  if (period === 'all') {
    from.setFullYear(2000)
  } else {
    from.setDate(from.getDate() - (parseInt(period) || 7))
    from.setHours(0, 0, 0, 0)
  }
  return { from, to }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

async function getDashboardData(
  userId: string,
  period: string,
  dateFrom: string | undefined,
  dateTo: string | undefined,
  rawCats: string | null,
  rawFunds: string | null,
) {
  const [categories, allTimeTxs, funds, contacts, unreadCount, pendingDistributions] = await Promise.all([
    prisma.category.findMany({ where: { userId, archived: false }, orderBy: { createdAt: 'asc' } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: { timestamp: 'desc' } }),
    prisma.fund.findMany({
      where: { userId, isActive: true },
      include: { allocations: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.contact.findMany({
      where: { userId },
      include: { salaryRules: true, category: { include: { transactions: true } } },
    }),
    prisma.notification.count({ where: { userId, read: false } }),
    prisma.notification.count({ where: { userId, read: false, type: 'distribution_pending' } }),
  ])

  // ── ALL-TIME STATS ──
  const blockchainAll = allTimeTxs.filter(tx => tx.source === 'blockchain')
  const realBalance =
    blockchainAll.filter(t => t.type === 'incoming').reduce((s, t) => s + parseFloat(t.amount), 0) -
    blockchainAll.filter(t => t.type === 'outgoing').reduce((s, t) => s + parseFloat(t.amount), 0)

  const ofAll = allTimeTxs.filter(tx => tx.source === 'onlyfans')
  const ofGrossAll = ofAll.filter(t => t.type === 'incoming').reduce((s, t) => s + parseFloat(t.amount), 0)
  const ofOutAll   = ofAll.filter(t => t.type === 'outgoing').reduce((s, t) => s + parseFloat(t.amount), 0)
  const ofPending  = ofGrossAll * 0.8 - ofOutAll
  const ofReceived = ofOutAll

  // ── SALARY DUE ──
  const salaryPeriod = currentPeriod()
  let salaryTotal = 0
  for (const contact of contacts) {
    const txs = contact.category?.transactions ?? []
    salaryTotal += calculateSalary(contact.salaryRules, txs, salaryPeriod)
  }
  const salaryDue = { total: salaryTotal, count: contacts.length }

  // ── PERIOD + CATEGORY FILTER ──
  const { from, to } = getDateRange(period, dateFrom, dateTo)
  let periodTxs = allTimeTxs.filter(tx => {
    const d = new Date(tx.timestamp)
    return d >= from && d <= to
  })

  const catIds = rawCats === null ? null
    : rawCats === '' ? []
    : rawCats.split(',').filter(Boolean)

  if (catIds !== null) {
    periodTxs = catIds.length === 0
      ? []
      : periodTxs.filter(tx => tx.categoryId && catIds.includes(tx.categoryId))
  }

  const displayCats = catIds === null
    ? categories
    : catIds.length === 0 ? []
    : categories.filter(c => catIds.includes(c.id))

  // ── PERIOD STATS ──
  const periodIncome   = periodTxs.filter(t => t.type === 'incoming').reduce((s, t) => s + parseFloat(t.amount), 0)
  const periodExpenses = periodTxs.filter(t => t.type === 'outgoing').reduce((s, t) => s + parseFloat(t.amount), 0)
  const periodPaidExpenses = periodTxs
    .filter(t => t.type === 'outgoing' && t.source === 'blockchain')
    .reduce((s, t) => s + parseFloat(t.amount), 0)

  // ── PROJECT STATS ──
  const projectStats: ProjectStat[] = displayCats.map((cat, i) => {
    const catTxs = periodTxs.filter(tx => tx.categoryId === cat.id)
    const blockchainIn = catTxs.filter(tx => tx.source === 'blockchain' && tx.type === 'incoming')
      .reduce((s, t) => s + parseFloat(t.amount), 0)
    const ofGross = catTxs.filter(tx => tx.source === 'onlyfans' && tx.type === 'incoming')
      .reduce((s, t) => s + parseFloat(t.amount), 0)
    const expenses = catTxs.filter(tx => tx.type === 'outgoing')
      .reduce((s, t) => s + parseFloat(t.amount), 0)
    return {
      id: cat.id, name: cat.name, color: COLORS[i % COLORS.length],
      blockchainIn, ofGross, ofNet: ofGross * 0.8,
      expenses, total: blockchainIn + ofGross * 0.8 - expenses,
    }
  })

  // ── BUSINESS DAILY DATA ──
  const days = period === 'all' ? 30
    : period === 'custom' && dateFrom && dateTo
    ? Math.min(Math.ceil((to.getTime() - from.getTime()) / 86400000), 90)
    : parseInt(period) || 7

  let cumulativeBalance = 0
  const businessDailyData: DailyBalanceItem[] = Array.from({ length: Math.min(days, 60) }, (_, i) => {
    const d = new Date(to)
    d.setDate(d.getDate() - (Math.min(days, 60) - 1 - i))
    const dateStr = d.toISOString().split('T')[0]
    const dayTxs = periodTxs.filter(tx =>
      new Date(tx.timestamp).toISOString().split('T')[0] === dateStr
    )
    const income   = dayTxs.filter(t => t.type === 'incoming').reduce((s, t) => s + parseFloat(t.amount), 0)
    const expenses = dayTxs.filter(t => t.type === 'outgoing').reduce((s, t) => s + parseFloat(t.amount), 0)
    cumulativeBalance += income - expenses
    return {
      date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
      income, expenses, balance: cumulativeBalance,
    }
  })

  // ── CATEGORIES LIST ──
  const catListData = categories.map(cat => {
    const catTxs = allTimeTxs.filter(tx => tx.categoryId === cat.id)
    const bcTxs = catTxs.filter(tx => tx.source === 'blockchain')
    const balance =
      bcTxs.filter(t => t.type === 'incoming').reduce((s, t) => s + parseFloat(t.amount), 0) -
      bcTxs.filter(t => t.type === 'outgoing').reduce((s, t) => s + parseFloat(t.amount), 0)
    const ofGross = catTxs.filter(tx => tx.source === 'onlyfans' && tx.type === 'incoming')
      .reduce((s, t) => s + parseFloat(t.amount), 0)
    return { id: cat.id, name: cat.name, balance, ofNet: ofGross * 0.8, txCount: catTxs.length }
  })

  // ── FUND STATS ──
  const allFundStats: FundStat[] = funds.map(fund => {
    const completed = fund.allocations.filter(a => a.status === 'completed')
    const pending   = fund.allocations.filter(a => a.status === 'pending')
    const allTimeTotal = completed.reduce((s, a) => s + parseFloat(a.amount), 0)
    const periodTotal  = completed
      .filter(a => a.createdAt >= from && a.createdAt <= to)
      .reduce((s, a) => s + parseFloat(a.amount), 0)
    return {
      id: fund.id,
      name: fund.name,
      icon: fund.icon ?? null,
      color: fund.color ?? null,
      allTimeTotal,
      periodTotal,
      pendingCount: pending.length,
    }
  })

  // ── FUND FILTER ──
  const fundIds = rawFunds === null ? null
    : rawFunds === '' ? []
    : rawFunds.split(',').filter(Boolean)

  const displayFunds = fundIds === null ? funds
    : fundIds.length === 0 ? []
    : funds.filter(f => fundIds.includes(f.id))

  const displayFundStats = fundIds === null ? allFundStats
    : fundIds.length === 0 ? []
    : allFundStats.filter(f => fundIds.includes(f.id))

  return {
    stats: { realBalance, ofPending, ofReceived, salaryDue, unreadCount, pendingDistributions },
    periodStats: { income: periodIncome, expenses: periodExpenses, paidExpenses: periodPaidExpenses },
    projectStats,
    businessDailyData,
    catListData,
    displayFunds,
    allFundStats,
    displayFundStats,
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; dateFrom?: string; dateTo?: string; categories?: string; funds?: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string
  const sp = await searchParams

  const period  = sp.period || '7'
  const rawCats  = sp.categories !== undefined ? sp.categories  : null
  const rawFunds = sp.funds      !== undefined ? sp.funds       : null

  const [
    { stats, periodStats, projectStats, businessDailyData, catListData, displayFunds, allFundStats, displayFundStats },
    dashboardConfigDb,
    allCategories,
    allFunds,
  ] = await Promise.all([
    getDashboardData(userId, period, sp.dateFrom, sp.dateTo, rawCats, rawFunds),
    prisma.dashboardConfig.findUnique({ where: { userId } }),
    prisma.category.findMany({ where: { userId, archived: false }, select: { id: true, name: true } }),
    prisma.fund.findMany({ where: { userId, isActive: true }, select: { id: true, name: true, icon: true } }),
  ])

  // Normalize: keep only known widget types, add any missing with defaults
  const knownTypes = new Set(DEFAULT_WIDGETS.map(w => w.type))
  const rawWidgets = dashboardConfigDb
    ? (dashboardConfigDb.widgets as { type: string; enabled: boolean; order: number }[])
    : DEFAULT_WIDGETS
  const dbByType = new Map(rawWidgets.filter(w => knownTypes.has(w.type)).map(w => [w.type, w]))
  const widgets = DEFAULT_WIDGETS.map(def => dbByType.get(def.type) ?? def)

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order)
  const isEnabled = (type: string) => sortedWidgets.find(w => w.type === type)?.enabled !== false
  const anyEnabled = sortedWidgets.some(w => w.enabled)
  const hasAnalytics = isEnabled('project_bar') || isEnabled('of_line') || isEnabled('income_table')

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-white mb-1">Обзор</h1>
          <p className="text-white/40 text-[14px]">Финансы и статистика агентства</p>
        </div>
        <DashboardConfigButton widgets={sortedWidgets} />
      </div>

      {/* ── STAT CARDS (all-time) ── */}
      {isEnabled('stat_cards') && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* 1. Деньги на счетах */}
          <Card className="card-rounded">
            <CardHeader className="pb-1">
              <p className="text-[11px] text-white/35 uppercase tracking-wide">Денег на счетах</p>
            </CardHeader>
            <CardContent>
              <p className="text-[28px] font-semibold text-white leading-tight">{fmt(stats.realBalance)}</p>
              <p className="text-[13px] text-white/40 mt-0.5">USDT · все кошельки</p>
            </CardContent>
          </Card>

          {/* 2. OF ожидание */}
          <Card className="card-rounded">
            <CardHeader className="pb-1">
              <p className="text-[11px] text-white/35 uppercase tracking-wide">Ожидает поступления</p>
            </CardHeader>
            <CardContent>
              <p className={`text-[28px] font-semibold leading-tight ${stats.ofPending >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {stats.ofPending >= 0 ? '' : '−'}{fmt(Math.abs(stats.ofPending))}
              </p>
              <p className="text-[13px] text-white/40 mt-0.5">
                USD · уже на счетах: {fmt(stats.ofReceived)}
              </p>
            </CardContent>
          </Card>

          {/* 3. К выплате */}
          <Link href="/dashboard/salary" className="block">
            <Card className="card-rounded h-full hover:border-[rgba(120,120,128,0.35)] transition-colors cursor-pointer">
              <CardHeader className="pb-1">
                <p className="text-[11px] text-white/35 uppercase tracking-wide">К выплате сейчас</p>
              </CardHeader>
              <CardContent>
                <p className="text-[28px] font-semibold text-[#d6d3ff] leading-tight">{fmt(stats.salaryDue.total)}</p>
                <p className="text-[13px] text-white/40 mt-0.5">
                  USDT · {stats.salaryDue.count > 0 ? `${stats.salaryDue.count} сотр. · зарплатный фонд →` : 'зарплатный фонд →'}
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* 4. Уведомления */}
          <Card className={`card-rounded ${stats.unreadCount > 0 ? 'border-yellow-500/20' : ''}`}>
            <CardHeader className="pb-1">
              <p className="text-[11px] text-white/35 uppercase tracking-wide">Уведомления</p>
            </CardHeader>
            <CardContent>
              {stats.unreadCount === 0 ? (
                <>
                  <p className="text-[28px] font-semibold text-white/25 leading-tight">0</p>
                  <p className="text-[13px] text-white/30 mt-0.5">Всё прочитано</p>
                </>
              ) : (
                <>
                  <p className="text-[28px] font-semibold text-yellow-400 leading-tight">{stats.unreadCount}</p>
                  <p className="text-[13px] text-white/40 mt-0.5">
                    {stats.pendingDistributions > 0
                      ? `⚡ ${stats.pendingDistributions} в фонды`
                      : 'непрочитанных'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FUND SUB-BLOCKS ── */}
      {isEnabled('fund_overview') && allFundStats.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {allFundStats.map(fund => (
            <Link key={fund.id} href={`/dashboard/funds/${fund.id}`}>
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-[14px] border transition-colors cursor-pointer ${
                fund.pendingCount > 0
                  ? 'bg-yellow-500/[0.05] border-yellow-500/20 hover:border-yellow-500/35'
                  : 'bg-[rgba(37,37,37,0.5)] border-[rgba(120,120,128,0.2)] hover:border-[rgba(120,120,128,0.35)]'
              }`}>
                <span className="text-[18px]">{fund.icon || '💰'}</span>
                <div>
                  <p className="text-white text-[13px] font-medium leading-tight">{fund.name}</p>
                  <p className="text-white/40 text-[11px]">{fmt(fund.allTimeTotal)} USDT</p>
                </div>
                {fund.pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-[5px] text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 ml-1">
                    ⚡ {fund.pendingCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
          <Link href="/dashboard/funds">
            <div className="flex items-center px-4 py-2.5 rounded-[14px] border border-dashed border-[rgba(120,120,128,0.15)] text-white/30 hover:text-white/50 hover:border-[rgba(120,120,128,0.25)] transition-colors cursor-pointer text-[13px] gap-1.5">
              + Все фонды
            </div>
          </Link>
        </div>
      )}

      {/* ── ANALYTICS SECTION ── */}
      {hasAnalytics && (
        <>
          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-white/35 uppercase tracking-wide font-medium">Аналитика за период</p>
            <Suspense fallback={null}>
              <DashboardFilterBar categories={allCategories} funds={allFunds} />
            </Suspense>
          </div>

          {/* Period metric cards */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[16px] border border-[rgba(120,120,128,0.2)] bg-[rgba(37,37,37,0.5)] px-5 py-4">
              <p className="text-[11px] text-white/35 uppercase tracking-wide mb-1.5">Доход за период</p>
              <p className="text-[24px] font-semibold text-green-400 leading-tight">{fmt(periodStats.income)}</p>
              <p className="text-[12px] text-white/30 mt-0.5">USDT</p>
            </div>
            <div className="rounded-[16px] border border-[rgba(120,120,128,0.2)] bg-[rgba(37,37,37,0.5)] px-5 py-4">
              <p className="text-[11px] text-white/35 uppercase tracking-wide mb-1.5">Расход за период</p>
              <p className="text-[24px] font-semibold text-red-400 leading-tight">{fmt(periodStats.expenses)}</p>
              <p className="text-[12px] text-white/30 mt-0.5">USDT</p>
            </div>
            <div className="rounded-[16px] border border-[rgba(120,120,128,0.2)] bg-[rgba(37,37,37,0.5)] px-5 py-4">
              <p className="text-[11px] text-white/35 uppercase tracking-wide mb-1.5">Оплаченный расход</p>
              <p className="text-[24px] font-semibold text-white leading-tight">{fmt(periodStats.paidExpenses)}</p>
              <p className="text-[12px] text-white/30 mt-0.5">USDT · реальные переводы</p>
            </div>
          </div>
        </>
      )}

      {/* Charts */}
      {(isEnabled('project_bar') || isEnabled('of_line') || isEnabled('income_table')) && (
        <DashboardClient
          projectStats={projectStats}
          businessDailyData={businessDailyData}
          fundStats={displayFundStats}
          showBar={isEnabled('project_bar')}
          showLine={isEnabled('of_line')}
          showTable={isEnabled('income_table')}
        />
      )}

      {/* ── BOTTOM 2 COLUMNS ── */}
      {(catListData.length > 0 || displayFunds.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Модели */}
          {isEnabled('categories_list') && catListData.length > 0 && (
            <Card className="card-rounded">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Модели</CardTitle>
                  <Link href="/dashboard/categories" className="text-[13px] text-white/40 hover:text-white transition-colors">
                    Все →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {catListData.map(cat => (
                    <Link key={cat.id} href={`/dashboard/categories/${cat.id}`}>
                      <div className="p-4 bg-white/[0.04] hover:bg-white/[0.07] rounded-[14px] border border-[rgba(120,120,128,0.16)] hover:border-[rgba(120,120,128,0.28)] transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-white text-[15px]">{cat.name}</h3>
                            <div className="flex items-center gap-3 mt-0.5">
                              <p className="text-[12px] text-white/35">{cat.txCount} транзакций</p>
                              {cat.ofNet > 0 && (
                                <p className="text-[12px] text-white/35">OF: {fmt(cat.ofNet)} нетто</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-[15px] font-semibold ${cat.balance >= 0 ? 'text-[#d6d3ff]' : 'text-red-400'}`}>
                              {cat.balance >= 0 ? '+' : ''}{fmt(cat.balance)}
                            </p>
                            <p className="text-[11px] text-white/30">USDT</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Фонды */}
          {isEnabled('fund_overview') && displayFunds.length > 0 && (
            <Card className="card-rounded">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Фонды</CardTitle>
                  <Link href="/dashboard/funds" className="text-[13px] text-white/40 hover:text-white transition-colors">
                    Все →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {displayFunds.map(fund => {
                    const pending   = fund.allocations.filter(a => a.status === 'pending')
                    const completed = fund.allocations.filter(a => a.status === 'completed')
                    const totalCompleted = completed.reduce((s, a) => s + parseFloat(a.amount), 0)
                    return (
                      <Link key={fund.id} href={`/dashboard/funds/${fund.id}`}>
                        <div className="p-4 bg-white/[0.04] hover:bg-white/[0.07] rounded-[14px] border border-[rgba(120,120,128,0.16)] hover:border-[rgba(120,120,128,0.28)] transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-[20px]">{fund.icon || '💰'}</span>
                              <div>
                                <p className="font-medium text-white text-[15px]">{fund.name}</p>
                                <p className="text-xs text-white/40">{fmt(totalCompleted)} USDT накоплено</p>
                              </div>
                            </div>
                            {pending.length > 0 && (
                              <span className="px-2.5 py-0.5 rounded-[8px] text-[11px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                ⚡ {pending.length} ожидает
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!anyEnabled && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-[20px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.15)] flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-[15px] font-medium">Все виджеты отключены</p>
            <p className="text-white/25 text-[13px] mt-1">Нажмите <span className="text-white/40">⚙</span> в правом верхнем углу, чтобы включить нужные</p>
          </div>
        </div>
      )}

    </div>
  )
}
