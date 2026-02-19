import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import WalletBalance from '@/components/wallet/WalletBalance'
import SendTransactionForm from '@/components/wallet/SendTransactionForm'

async function getCategoryData(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
      userId,
    },
  })

  return category
}

export default async function WithdrawPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/categories/${id}`}
          className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к кошельку
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Вывод средств</h1>
        <p className="text-gray-400">{category.name}</p>
      </div>

      {/* Balance */}
      <WalletBalance address={category.walletAddress} categoryName={category.name} />

      {/* Send Form */}
      <SendTransactionForm
        categoryId={category.id}
        categoryName={category.name}
      />
    </div>
  )
}
