import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import WalletBalance from '@/components/wallet/WalletBalance'
import TransactionsList from '@/components/transactions/TransactionsList'
import CategoryActions from '@/components/categories/CategoryActions'
import ProjectCharts from '@/components/dashboard/ProjectCharts'

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

      {/* Wallet Address */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Адрес кошелька</h3>
        <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
          <p className="font-mono text-sm text-gray-300 break-all">
            {category.walletAddress}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-3">USDT TRC-20</p>
      </div>

      {/* Balance */}
      <WalletBalance address={category.walletAddress} categoryName={category.name} />

      {/* Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href={`/dashboard/categories/${category.id}/deposit`}>
          <div className="bg-gray-900 border border-gray-800 hover:border-green-500/50 rounded-2xl p-6 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/10 group-hover:bg-green-500/20 border border-green-500/30 rounded-xl flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">Пополнить</h3>
                <p className="text-sm text-gray-400">Получить USDT на кошелек</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href={`/dashboard/categories/${category.id}/withdraw`}>
          <div className="bg-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/10 group-hover:bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">Вывести</h3>
                <p className="text-sm text-gray-400">Отправить USDT на другой адрес</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Project Charts */}
      <ProjectCharts transactions={category.transactions} projectName={category.name} />

      {/* Transactions */}
      <TransactionsList categoryId={category.id} initialTransactions={category.transactions} />
    </div>
  )
}
