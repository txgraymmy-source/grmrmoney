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
    include: {
      category: true,
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })
}

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  const transactions = await getTransactions(session.user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Транзакции</h1>
        <p className="text-muted-foreground mt-1">
          История всех транзакций по направлениям
        </p>
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              Транзакций пока нет
            </p>
            <Link href="/dashboard/categories/new" className="text-primary hover:underline">
              Создайте направление для начала работы
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tx.type === 'incoming'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {tx.type === 'incoming' ? 'Входящая' : 'Исходящая'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tx.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-700'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tx.status === 'confirmed' ? 'Подтверждено' :
                           tx.status === 'pending' ? 'Ожидание' : 'Ошибка'}
                        </span>
                      </div>

                      <p className="font-medium mb-1">
                        {tx.category?.name || 'Без категории'}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        {tx.type === 'incoming' ? 'От: ' : 'Кому: '}
                        <span className="font-mono">
                          {truncateAddress(tx.type === 'incoming' ? tx.fromAddress : tx.toAddress)}
                        </span>
                      </p>

                      {tx.description && (
                        <p className="text-sm mt-1">{tx.description}</p>
                      )}

                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(tx.timestamp)}
                      </p>
                    </div>

                    <div className="text-right ml-4">
                      <p className={`text-lg font-semibold ${
                        tx.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'incoming' ? '+' : '-'}{formatUSDT(tx.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">USDT</p>
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
