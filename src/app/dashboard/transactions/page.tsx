import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { truncateAddress, formatDate, formatUSDT } from '@/lib/utils'

async function getTransactions(userId: string) {
  return await prisma.transaction.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })
}

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const transactions = await getTransactions(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Cashflow</h1>
        <p className="text-white/50 text-[15px] mt-1">История всех транзакций</p>
      </div>

      {transactions.length === 0 ? (
        <Card className="card-rounded">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-white/50 mb-4">Транзакций пока нет</p>
            <Link href="/dashboard/categories/new" className="text-[#d6d3ff] hover:underline text-[15px]">
              Создайте направление для начала работы
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-rounded">
          <CardContent className="p-0">
            <div className="divide-y divide-[rgba(120,120,128,0.12)]">
              {transactions.map((tx) => (
                <div key={tx.id} className="px-6 py-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-[8px] text-xs font-medium border ${
                          tx.type === 'incoming'
                            ? 'bg-[#d6d3ff]/10 text-[#d6d3ff] border-[#d6d3ff]/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {tx.type === 'incoming' ? '↓ Входящая' : '↑ Исходящая'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-[8px] text-xs font-medium border ${
                          tx.status === 'confirmed'
                            ? 'bg-white/10 text-white/70 border-white/10'
                            : tx.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {tx.status === 'confirmed' ? 'Подтверждено' :
                           tx.status === 'pending' ? 'Ожидание' : 'Ошибка'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-[8px] text-xs font-medium border bg-white/[0.05] text-white/50 border-white/10">
                          {tx.source === 'blockchain' ? 'Blockchain' :
                           tx.source === 'onlyfans' ? 'OnlyFans' : 'Ручная'}
                        </span>
                      </div>

                      <p className="font-medium text-white text-[15px] mb-1">
                        {tx.category?.name || 'Без категории'}
                      </p>

                      {tx.source === 'blockchain' && tx.fromAddress && tx.toAddress && (
                        <p className="text-sm text-white/40 font-mono">
                          {tx.type === 'incoming' ? 'От: ' : 'Кому: '}
                          {truncateAddress(tx.type === 'incoming' ? tx.fromAddress : tx.toAddress)}
                        </p>
                      )}

                      {tx.description && (
                        <p className="text-sm text-white/40 mt-1">{tx.description}</p>
                      )}

                      <p className="text-xs text-white/30 mt-1">{formatDate(tx.timestamp)}</p>
                    </div>

                    <div className="text-right ml-4">
                      <p className={`text-[15px] font-semibold ${
                        tx.type === 'incoming' ? 'text-[#d6d3ff]' : 'text-red-400'
                      }`}>
                        {tx.type === 'incoming' ? '+' : '-'}{formatUSDT(tx.amount)}
                      </p>
                      <p className="text-xs text-white/30">USDT</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
