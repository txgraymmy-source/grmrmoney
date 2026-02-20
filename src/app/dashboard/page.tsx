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

  // Подсчет статистики - разделяем по источникам
  // Реальный баланс - только blockchain транзакции
  const blockchainTxs = transactions.filter(tx => tx.source === 'blockchain')
  const blockchainIncoming = blockchainTxs
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const blockchainOutgoing = blockchainTxs
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const realBalance = blockchainIncoming - blockchainOutgoing

  // OnlyFans доходы/расходы (виртуальный учет с 20% вычетом)
  const onlyfansTxs = transactions.filter(tx => tx.source === 'onlyfans')
  const onlyfansGross = onlyfansTxs
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const onlyfansOutgoing = onlyfansTxs
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const onlyfansNet = onlyfansGross * 0.8  // Вычитаем 20% комиссию
  const onlyfansCommission = onlyfansGross * 0.2
  const onlyfansBalance = onlyfansNet - onlyfansOutgoing

  // Общая статистика для графиков
  const totalIncoming = transactions
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const totalOutgoing = transactions
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const totalTurnover = totalIncoming + totalOutgoing

  // Транзакции за последние 30 дней (blockchain)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentBlockchainTxs = blockchainTxs.filter(
    tx => new Date(tx.timestamp) >= thirtyDaysAgo
  )

  const recentBlockchainIncoming = recentBlockchainTxs
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

  const recentBlockchainOutgoing = recentBlockchainTxs
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)

  // OnlyFans за последние 30 дней (с 20% вычетом)
  const recentOnlyfansTxs = onlyfansTxs.filter(
    tx => new Date(tx.timestamp) >= thirtyDaysAgo
  )

  const recentOnlyfansGross = recentOnlyfansTxs
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const recentOnlyfansNet = recentOnlyfansGross * 0.8  // Вычитаем 20%

  const recentOnlyfansOutgoing = recentOnlyfansTxs
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
      // Реальный баланс (blockchain)
      realBalance,
      blockchainIncoming,
      blockchainOutgoing,
      recentBlockchainIncoming,
      recentBlockchainOutgoing,
      // OnlyFans баланс (с 20% вычетом)
      onlyfansBalance,
      onlyfansGross,
      onlyfansNet,
      onlyfansCommission,
      onlyfansOutgoing,
      recentOnlyfansGross,
      recentOnlyfansNet,
      recentOnlyfansOutgoing,
      // Общая статистика
      totalIncoming,
      totalOutgoing,
      totalTurnover,
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
        {/* Реальный баланс - только крипто */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-400/80">⛓️ Реальный баланс (Крипто)</CardDescription>
            <CardTitle className="text-3xl text-white">{formatUSDT(stats.realBalance)} USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">На криптокошельках</p>
          </CardContent>
        </Card>

        {/* OnlyFans баланс */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-400/80">💎 OnlyFans (чистый)</CardDescription>
            <CardTitle className="text-3xl text-white">{formatUSDT(stats.onlyfansNet)} USD</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Брутто: {formatUSDT(stats.onlyfansGross)}</span>
              <span className="text-red-400">-20%: {formatUSDT(stats.onlyfansCommission)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Входящие крипто за 30 дней */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-green-400/80">Крипто входящие (30 дней)</CardDescription>
            <CardTitle className="text-3xl text-white">+{formatUSDT(stats.recentBlockchainIncoming)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Всего: {formatUSDT(stats.blockchainIncoming)} USDT</p>
          </CardContent>
        </Card>

        {/* Оборот */}
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20 card-rounded overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
          <CardHeader className="pb-3">
            <CardDescription className="text-orange-400/80">Общий оборот</CardDescription>
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
                  // Реальный баланс - только blockchain транзакции
                  const blockchainTxs = category.transactions.filter(tx => tx.source === 'blockchain')
                  const catBlockchainIncoming = blockchainTxs
                    .filter(tx => tx.type === 'incoming')
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  const catBlockchainOutgoing = blockchainTxs
                    .filter(tx => tx.type === 'outgoing')
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  const catRealBalance = catBlockchainIncoming - catBlockchainOutgoing

                  // OnlyFans баланс (с 20% вычетом)
                  const onlyfansTxs = category.transactions.filter(tx => tx.source === 'onlyfans')
                  const catOnlyfansGross = onlyfansTxs
                    .filter(tx => tx.type === 'incoming')
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                  const catOnlyfansNet = catOnlyfansGross * 0.8  // Вычитаем 20%

                  return (
                    <Link key={category.id} href={`/dashboard/categories/${category.id}`}>
                      <div className="p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700 hover:border-gray-600 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{category.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-gray-500">
                                ⛓️ {blockchainTxs.length} крипто
                              </p>
                              {onlyfansTxs.length > 0 && (
                                <p className="text-xs text-purple-400">
                                  💎 {onlyfansTxs.length} OF ({formatUSDT(catOnlyfansNet)})
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${catRealBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {catRealBalance >= 0 ? '+' : ''}{formatUSDT(catRealBalance)}
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
