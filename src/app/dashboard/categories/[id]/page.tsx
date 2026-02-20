import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import WalletBalance from '@/components/wallet/WalletBalance'
import TransactionsList from '@/components/transactions/TransactionsList'
import ManualTransactionForm from '@/components/transactions/ManualTransactionForm'
import CategoryActions from '@/components/categories/CategoryActions'
import ProjectCharts from '@/components/dashboard/ProjectCharts'
import OnlyFansAccountManager from '@/components/category/OnlyFansAccountManager'
import OnlyFansTransactionSync from '@/components/category/OnlyFansTransactionSync'

async function getCategoryData(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
      userId,
    },
    include: {
      transactions: {
        include: {
          transactionCategory: true,
        },
        orderBy: { timestamp: 'desc' },
      },
      encryptedWallet: true,
      onlyFansAccounts: true,
    },
  })

  if (!category) return null

  // Расчет статистики
  const blockchainTxs = category.transactions.filter(tx => tx.source === 'blockchain')
  const onlyfansTxs = category.transactions.filter(tx => tx.source === 'onlyfans')

  // Blockchain статистика
  const blockchainIncoming = blockchainTxs
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const blockchainOutgoing = blockchainTxs
    .filter(tx => tx.type === 'outgoing')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const realBalance = blockchainIncoming - blockchainOutgoing

  // OnlyFans статистика (с 20% вычетом)
  const onlyfansGross = onlyfansTxs
    .filter(tx => tx.type === 'incoming')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  const onlyfansNet = onlyfansGross * 0.8  // Вычитаем 20%
  const onlyfansCommission = onlyfansGross * 0.2

  return {
    ...category,
    stats: {
      realBalance,
      blockchainIncoming,
      blockchainOutgoing,
      onlyfansGross,
      onlyfansNet,
      onlyfansCommission,
      totalWithdrawn: blockchainOutgoing,
    }
  }
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

  const formatUSDT = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/dashboard/categories"
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </Link>
          <CategoryActions categoryId={category.id} categoryName={category.name} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-gray-400">{category.description}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Real Balance */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-400/80">⛓️ Реальный баланс</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.realBalance)} USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">На криптокошельке</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="text-red-400/80">📤 Расходы (крипто)</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.blockchainOutgoing)} USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">Исходящие транзакции</p>
          </CardContent>
        </Card>

        {/* OnlyFans Net */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-400/80">💎 OnlyFans (чистый)</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.onlyfansNet)} USD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">-20% комиссия ({formatUSDT(category.stats.onlyfansCommission)})</p>
          </CardContent>
        </Card>

        {/* OnlyFans Gross */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-400/80">💰 OnlyFans (брутто)</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.onlyfansGross)} USD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500">{category.onlyFansAccounts.length} аккаунтов</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wallet & Actions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Кошелек</CardTitle>
              <CardDescription>USDT TRC-20</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
                <p className="font-mono text-sm text-gray-300 break-all">
                  {category.walletAddress}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Link href={`/dashboard/categories/${category.id}/deposit`}>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 transition-all flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    <span className="font-semibold">Пополнить</span>
                  </button>
                </Link>

                <Link href={`/dashboard/categories/${category.id}/withdraw`}>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 transition-all flex items-center justify-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="font-semibold">Вывести</span>
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* OnlyFans Accounts */}
          <OnlyFansAccountManager categoryId={category.id} />

          {/* OnlyFans Transaction Sync */}
          <OnlyFansTransactionSync categoryId={category.id} />

          {/* Manual Transaction Form */}
          <ManualTransactionForm categoryId={category.id} />
        </div>

        {/* Right Column - 1/3 */}
        <div className="space-y-6">
          {/* Live Balance */}
          <WalletBalance address={category.walletAddress} categoryName={category.name} />
        </div>
      </div>

      {/* Project Charts */}
      <ProjectCharts transactions={category.transactions} projectName={category.name} />

      {/* Transactions */}
      <TransactionsList categoryId={category.id} initialTransactions={category.transactions} />
    </div>
  )
}
