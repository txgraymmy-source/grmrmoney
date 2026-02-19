import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import WalletBalance from '@/components/wallet/WalletBalance'
import SendTransaction from '@/components/wallet/SendTransaction'
import { truncateAddress, formatDate, formatUSDT } from '@/lib/utils'

async function getCategoryData(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
      userId,
    },
    include: {
      transactions: {
        orderBy: { timestamp: 'desc' },
        take: 20,
      },
      encryptedWallet: true,
    },
  })

  return category
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  const { id } = await params
  const category = await getCategoryData(id, session.user.id)

  if (!category) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/categories" className="text-sm text-muted-foreground hover:underline mb-2 block">
          ← Назад к направлениям
        </Link>
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-1">{category.description}</p>
        )}
      </div>

      {/* Wallet Info */}
      <Card>
        <CardHeader>
          <CardTitle>Адрес кошелька</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="font-mono text-sm break-all bg-gray-50 p-3 rounded">
              {category.walletAddress}
            </p>
            <p className="text-xs text-muted-foreground">
              USDT TRC-20 кошелек для этого направления
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Balance and Send */}
      <div className="grid gap-6 md:grid-cols-2">
        <WalletBalance address={category.walletAddress} categoryName={category.name} />
        <SendTransaction categoryId={category.id} categoryName={category.name} />
      </div>

      {/* Transactions */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Транзакции</h2>

        {category.transactions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Транзакций пока нет</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {category.transactions.map((tx) => (
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
    </div>
  )
}
