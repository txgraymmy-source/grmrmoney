import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatUSDT } from '@/lib/utils'
import WalletBalance from '@/components/wallet/WalletBalance'
import FundAllocationPanel from '@/components/funds/FundAllocationPanel'

async function getFund(id: string, userId: string) {
  return await prisma.fund.findUnique({
    where: { id },
    include: {
      allocations: {
        include: { transaction: true },
        orderBy: { createdAt: 'desc' },
      },
      encryptedWallet: true,
    },
  })
}

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const fund = await getFund(id, session.user.id)

  if (!fund || fund.userId !== session.user.id) notFound()

  const pendingAllocations = fund.allocations.filter(a => a.status === 'pending')
  const completedAllocations = fund.allocations.filter(a => a.status === 'completed')
  const totalCompleted = completedAllocations.reduce((s, a) => s + parseFloat(a.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/funds">
            <Button variant="ghost" size="sm">← Назад</Button>
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-[26px]"
              style={{ backgroundColor: `${fund.color || '#d6d3ff'}20` }}
            >
              {fund.icon || '💰'}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{fund.name}</h1>
              {fund.description && (
                <p className="text-white/50 text-[14px]">{fund.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-[10px] text-[13px] border ${
              fund.isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-white/[0.05] text-white/40 border-white/10'
            }`}
          >
            {fund.isActive ? 'Активен' : 'Неактивен'}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="card-rounded">
              <CardContent className="pt-5">
                <p className="text-white/40 text-[12px] mb-1">Целевой %</p>
                <p className="text-2xl font-semibold" style={{ color: fund.color || '#d6d3ff' }}>
                  {fund.targetPercent}%
                </p>
              </CardContent>
            </Card>
            <Card className="card-rounded">
              <CardContent className="pt-5">
                <p className="text-white/40 text-[12px] mb-1">Переведено</p>
                <p className="text-2xl font-semibold text-[#d6d3ff]">
                  {formatUSDT(totalCompleted)}
                </p>
                <p className="text-white/30 text-[11px]">USDT</p>
              </CardContent>
            </Card>
            <Card className="card-rounded">
              <CardContent className="pt-5">
                <p className="text-white/40 text-[12px] mb-1">Операций</p>
                <p className="text-2xl font-semibold text-white">
                  {fund.allocations.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pending allocations */}
          {pendingAllocations.length > 0 && (
            <Card className="card-rounded border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-[16px]">⚡ Ожидают подтверждения</CardTitle>
              </CardHeader>
              <CardContent>
                <FundAllocationPanel
                  fundId={fund.id}
                  fundName={fund.name}
                  fundWalletAddress={fund.walletAddress}
                  encryptedWalletData={fund.encryptedWallet?.encryptedData ?? null}
                  pendingAllocations={pendingAllocations.map(a => ({
                    id: a.id,
                    transactionId: a.transactionId,
                    amount: a.amount,
                    status: a.status,
                    txHash: a.txHash,
                    createdAt: a.createdAt.toISOString(),
                    transaction: {
                      id: a.transaction.id,
                      amount: a.transaction.amount,
                      timestamp: a.transaction.timestamp.toISOString(),
                    },
                  }))}
                />
              </CardContent>
            </Card>
          )}

          {/* Transfer history */}
          <Card className="card-rounded">
            <CardHeader>
              <CardTitle className="text-[16px]">История переводов</CardTitle>
            </CardHeader>
            <CardContent>
              {fund.allocations.length === 0 ? (
                <p className="text-white/40 text-[14px] py-4 text-center">Переводов пока нет</p>
              ) : (
                <div className="divide-y divide-[rgba(120,120,128,0.12)]">
                  {fund.allocations.map(a => (
                    <div key={a.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`px-2 py-0.5 rounded-[6px] text-[11px] font-medium border ${
                            a.status === 'completed'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : a.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : 'bg-white/[0.05] text-white/40 border-white/10'
                          }`}>
                            {a.status === 'completed' ? 'Выполнено' :
                             a.status === 'pending' ? 'Ожидание' : 'Отклонено'}
                          </span>
                          {a.txHash && (
                            <span className="text-white/30 text-[11px] font-mono">
                              {a.txHash.slice(0, 8)}...
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-[12px]">
                          {new Date(a.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <p className="text-[15px] font-semibold text-[#d6d3ff]">
                        {formatUSDT(parseFloat(a.amount))} USDT
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — balance */}
        <div className="space-y-4">
          <WalletBalance address={fund.walletAddress} categoryName={fund.name} />

          <Card className="card-rounded">
            <CardContent className="pt-5 space-y-2">
              <p className="text-white/40 text-[12px]">Адрес кошелька</p>
              <p className="font-mono text-[12px] text-white/60 break-all">{fund.walletAddress}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
