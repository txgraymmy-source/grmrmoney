import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { truncateAddress, formatUSDT } from '@/lib/utils'

async function getFunds(userId: string) {
  return await prisma.fund.findMany({
    where: { userId },
    include: {
      allocations: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function FundsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const funds = await getFunds(session.user.id)

  const pendingAllocations = funds.flatMap(f =>
    f.allocations.filter(a => a.status === 'pending')
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Фонды</h1>
          <p className="text-white/50 text-[15px] mt-1">Корпоративные фонды с реальными TRON-кошельками</p>
        </div>
        <Link href="/dashboard/funds/new">
          <Button>+ Создать фонд</Button>
        </Link>
      </div>

      {/* Pending allocations banner */}
      {pendingAllocations.length > 0 && (
        <div className="rounded-[16px] border border-yellow-500/30 bg-yellow-500/[0.06] px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-yellow-300 font-medium text-[15px]">
              ⚡ Есть ожидающие распределения
            </p>
            <p className="text-yellow-300/60 text-[13px] mt-0.5">
              {pendingAllocations.length} предложений для перевода в фонды
            </p>
          </div>
          <Link href="#funds-list">
            <Button variant="secondary">Просмотреть</Button>
          </Link>
        </div>
      )}

      {funds.length === 0 ? (
        <Card className="card-rounded">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">🏦</div>
            <p className="text-white/50 mb-2 text-[15px]">Фондов пока нет</p>
            <p className="text-white/30 text-[13px] mb-6 text-center max-w-sm">
              Создайте корпоративный фонд — отдельный TRON-кошелёк, куда будет предложено
              направлять процент от входящих транзакций
            </p>
            <Link href="/dashboard/funds/new">
              <Button>Создать первый фонд</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div id="funds-list" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {funds.map(fund => {
            const pending = fund.allocations.filter(a => a.status === 'pending')
            const completed = fund.allocations.filter(a => a.status === 'completed')
            const totalCompleted = completed.reduce((s, a) => s + parseFloat(a.amount), 0)

            return (
              <Link key={fund.id} href={`/dashboard/funds/${fund.id}`}>
                <Card className="card-rounded hover:border-[rgba(120,120,128,0.35)] transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-1">
                      <span
                        className="w-10 h-10 rounded-[12px] flex items-center justify-center text-[22px]"
                        style={{ backgroundColor: `${fund.color}20` }}
                      >
                        {fund.icon || '💰'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-[16px]">{fund.name}</CardTitle>
                        {fund.description && (
                          <p className="text-white/40 text-[13px] mt-0.5 truncate">{fund.description}</p>
                        )}
                      </div>
                      {!fund.isActive && (
                        <span className="px-2 py-0.5 rounded-[6px] text-[11px] bg-white/[0.06] text-white/40 border border-white/10">
                          Неактивен
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-white/30 mb-1">Адрес кошелька</p>
                      <p className="font-mono text-[13px] text-white/60">
                        {truncateAddress(fund.walletAddress, 10, 8)}
                      </p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-white/30 mb-0.5">Цель</p>
                        <p className="text-[15px] font-semibold" style={{ color: fund.color || '#d6d3ff' }}>
                          {fund.targetPercent}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/30 mb-0.5">Переведено</p>
                        <p className="text-[15px] font-semibold text-white">
                          {formatUSDT(totalCompleted)} USDT
                        </p>
                      </div>
                    </div>
                    {pending.length > 0 && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-yellow-500/[0.08] border border-yellow-500/20">
                        <span className="text-yellow-400 text-[13px]">⚡</span>
                        <span className="text-yellow-300 text-[12px]">{pending.length} ожидает подтверждения</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
