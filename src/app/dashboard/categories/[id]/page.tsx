import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import TransactionsList from '@/components/transactions/TransactionsList'
import CategoryActions from '@/components/categories/CategoryActions'
import ProjectCharts from '@/components/dashboard/ProjectCharts'
import ProjectEmployeesSection from '@/components/employees/ProjectEmployeesSection'
import { calculateSalary, currentPeriod } from '@/lib/salary'

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
  const period = currentPeriod()
  const category = await getCategoryData(id, session.user.id)

  if (!category) {
    notFound()
  }

  // Fetch employee-project pairs for this category
  const employeePairs = await prisma.contactCategory.findMany({
    where: { categoryId: id },
    include: {
      contact: {
        include: {
          position: { select: { name: true, icon: true, color: true } },
        },
      },
      salaryRules: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const pairsWithAmounts = employeePairs.map(pair => ({
    id: pair.id,
    contactId: pair.contactId,
    contact: {
      id: pair.contact.id,
      name: pair.contact.name,
      walletAddress: pair.contact.walletAddress,
      position: pair.contact.position ?? null,
    },
    salaryRules: pair.salaryRules,
    calculatedAmount: calculateSalary(
      pair.salaryRules,
      category.transactions,
      period
    ),
  }))

  const allContacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

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
            className="inline-flex items-center gap-2 text-sm text-[#d6d3ff] hover:text-purple-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </Link>
          <CategoryActions categoryId={category.id} categoryName={category.name} />
        </div>

        <h1 className="text-3xl font-semibold text-white mb-2">{category.name}</h1>
        {category.description && (
          <p className="text-white/50">{category.description}</p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Real Balance */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-blue-400">⛓️ Реальный баланс</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.realBalance)} USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-white/30">На криптокошельке</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-red-400">📤 Расходы (крипто)</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.blockchainOutgoing)} USDT</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-white/30">Исходящие транзакции</p>
          </CardContent>
        </Card>

        {/* OnlyFans Net */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-[#d6d3ff]">💎 OnlyFans (чистый)</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.onlyfansNet)} USD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-white/30">-20% комиссия ({formatUSDT(category.stats.onlyfansCommission)})</p>
          </CardContent>
        </Card>

        {/* OnlyFans Gross */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-green-400">💰 OnlyFans (брутто)</CardDescription>
            <CardTitle className="text-2xl text-white">{formatUSDT(category.stats.onlyfansGross)} USD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-white/30">{category.onlyFansAccounts.length} аккаунтов</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href={`/dashboard/categories/${category.id}/deposit`}>
          <Button className="w-full h-14 gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="font-semibold">Пополнить</span>
          </Button>
        </Link>

        <Link href={`/dashboard/categories/${category.id}/withdraw`}>
          <Button variant="secondary" className="w-full h-14 gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="font-semibold">Вывести</span>
          </Button>
        </Link>

        <Link href={`/dashboard/categories/${category.id}/settings`}>
          <Button variant="secondary" className="w-full h-14 gap-3">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-semibold">Настройки</span>
          </Button>
        </Link>

        <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-4">
          <div className="text-xs text-white/30 mb-1">Адрес кошелька</div>
          <p className="font-mono text-xs text-white/50 break-all">{category.walletAddress}</p>
        </div>
      </div>

      {/* Project Charts */}
      <ProjectCharts transactions={category.transactions} projectName={category.name} />

      {/* Employees section */}
      <ProjectEmployeesSection
        categoryId={category.id}
        pairs={pairsWithAmounts}
        availableContacts={allContacts}
        period={period}
      />

      {/* Transactions */}
      <TransactionsList categoryId={category.id} initialTransactions={category.transactions} />
    </div>
  )
}
