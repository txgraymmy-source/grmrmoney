import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

async function getDashboardData(userId: string) {
  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({
      where: { userId },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        category: true,
      },
    }),
  ])

  return { categories, transactions }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string

  const { categories, transactions } = await getDashboardData(userId)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Обзор</h1>
          <p className="text-muted-foreground mt-1">
            Управление финансами модельного агентства
          </p>
        </div>
        <Link href="/categories/new">
          <Button>Создать направление</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Всего направлений</CardDescription>
            <CardTitle className="text-3xl">{categories.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Всего транзакций</CardDescription>
            <CardTitle className="text-3xl">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Активные кошельки</CardDescription>
            <CardTitle className="text-3xl">{categories.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Направления</h2>
          <Link href="/categories">
            <Button variant="outline" size="sm">
              Все направления
            </Button>
          </Link>
        </div>

        {categories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                У вас пока нет направлений
              </p>
              <Link href="/categories/new">
                <Button>Создать первое направление</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link key={category.id} href={`/categories/${category.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle>{category.name}</CardTitle>
                    <CardDescription>
                      {category.description || 'Без описания'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-mono truncate">{category.walletAddress}</p>
                      <p className="mt-2">
                        Транзакций: {category.transactions.length}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Последние транзакции</h2>
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                Все транзакции
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {tx.type === 'incoming' ? 'Входящая' : 'Исходящая'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tx.category?.name || 'Без категории'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          tx.type === 'incoming' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {tx.type === 'incoming' ? '+' : '-'}{tx.amount} USDT
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
