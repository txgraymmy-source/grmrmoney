import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardClient from '@/components/dashboard/DashboardClient'

async function getDashboardStats(userId: string) {
  const [categories, transactions] = await Promise.all([
    prisma.category.findMany({
      where: {
        userId,
        archived: false, // Don't include archived categories
      },
      include: {
        transactions: true,
      },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    }),
  ])

  // Подсчет статистики
  const incoming = transactions
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

  const outgoing = transactions
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

  const totalBalance = incoming - outgoing
  const totalTurnover = incoming + outgoing

  // Транзакции за последние 30 дней
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentTransactions = transactions.filter(
    tx => new Date(tx.timestamp) >= thirtyDaysAgo
  )

  const recentIncoming = recentTransactions
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

  const recentOutgoing = recentTransactions
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

  // Группировка по дням (последние 7 дней)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    return date.toISOString().split('T')[0]
  }).reverse()

  const dailyStats = last7Days.map(date => {
    const dayTxs = transactions.filter(tx =>
      tx.timestamp.toISOString().split('T')[0] === date
    )

    return {
      date,
      incoming: dayTxs
        .filter(tx => tx.type === 'incoming')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
      outgoing: dayTxs
        .filter(tx => tx.type === 'outgoing')
        .reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
    }
  })

  return {
    categories,
    transactions: transactions.slice(0, 10),
    stats: {
      totalBalance,
      incoming,
      outgoing,
      totalTurnover,
      recentIncoming,
      recentOutgoing,
      totalCategories: categories.length,
      totalTransactions: transactions.length,
    },
    dailyStats,
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id as string

  const { categories, transactions, stats, dailyStats } = await getDashboardStats(userId)

  const formatUSDT = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Дашборд</h1>
          <p className="text-gray-400">
            Обзор финансов и статистика
          </p>
        </div>
        <Link href="/dashboard/categories/new">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl px-6">
            + Создать направление
          </Button>
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-400/80">Общий баланс</CardDescription>
            <CardTitle className="text-3xl text-white">{formatUSDT(stats.totalBalance)} USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Все направления</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-green-400/80">Входящие (30 дней)</CardDescription>
            <CardTitle className="text-3xl text-white">+{formatUSDT(stats.recentIncoming)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Всего: {formatUSDT(stats.incoming)} USDT</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-red-400/80">Исходящие (30 дней)</CardDescription>
            <CardTitle className="text-3xl text-white">-{formatUSDT(stats.recentOutgoing)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Всего: {formatUSDT(stats.outgoing)} USDT</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-400/80">Оборот</CardDescription>
            <CardTitle className="text-3xl text-white">{formatUSDT(stats.totalTurnover)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">{stats.totalTransactions} транзакций</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Filters */}
      <DashboardClient
        categories={categories}
        allTransactions={await prisma.transaction.findMany({
          where: { userId },
          orderBy: { timestamp: 'desc' },
        })}
      />

      {/* Categories and Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Categories */}
        <Card className="bg-gray-900 border-gray-800 card-rounded">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Направления</CardTitle>
              <Link href="/dashboard/categories">
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                  Все →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">Нет направлений</p>
                <Link href="/dashboard/categories/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl">
                    Создать первое направление
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.slice(0, 5).map((category) => {
                  const catIncoming = category.transactions
                    .filter(tx => tx.type === 'incoming')
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  const catOutgoing = category.transactions
                    .filter(tx => tx.type === 'outgoing')
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  const catBalance = catIncoming - catOutgoing

                  return (
                    <Link key={category.id} href={`/dashboard/categories/${category.id}`}>
                      <div className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{category.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">
                              {category.transactions.length} транзакций
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${catBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {catBalance >= 0 ? '+' : ''}{formatUSDT(catBalance)}
                            </p>
                            <p className="text-xs text-gray-500">USDT</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-gray-900 border-gray-800 card-rounded">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Последние транзакции</CardTitle>
              <Link href="/dashboard/transactions">
                <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                  Все →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                Транзакций пока нет
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                            tx.type === 'incoming'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {tx.type === 'incoming' ? '↓ Вход' : '↑ Выход'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${
                          tx.type === 'incoming' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tx.type === 'incoming' ? '+' : '-'}{formatUSDT(parseFloat(tx.amount))}
                        </p>
                        <p className="text-xs text-gray-500">USDT</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
