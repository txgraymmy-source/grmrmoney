import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import WalletBalance from '@/components/wallet/WalletBalance'

async function getCategoryData(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
      userId,
    },
  })

  return category
}

export default async function DepositPage({ params }: { params: Promise<{ id: string }> }) {
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

        <h1 className="text-3xl font-bold text-white mb-2">Пополнение</h1>
        <p className="text-gray-400">{category.name}</p>
      </div>

      {/* Balance */}
      <WalletBalance address={category.walletAddress} categoryName={category.name} />

      {/* Deposit Instructions */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Как пополнить кошелек</h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-semibold">
              1
            </div>
            <div>
              <p className="text-gray-300 mb-2">Скопируйте адрес кошелька</p>
              <div className="bg-black/40 border border-gray-800 rounded-xl p-4 group relative">
                <p className="font-mono text-sm text-gray-300 break-all pr-10">
                  {category.walletAddress}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(category.walletAddress)
                    alert('Адрес скопирован!')
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-semibold">
              2
            </div>
            <div>
              <p className="text-gray-300">Отправьте USDT (TRC-20) на этот адрес</p>
              <p className="text-sm text-gray-500 mt-1">⚠️ Используйте только сеть TRON (TRC-20)</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-semibold">
              3
            </div>
            <div>
              <p className="text-gray-300">Средства поступят автоматически</p>
              <p className="text-sm text-gray-500 mt-1">Обычно занимает 1-3 минуты</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm text-yellow-400 font-medium mb-1">Важно!</p>
            <p className="text-xs text-yellow-400/80">
              Отправляйте только USDT в сети TRON (TRC-20). Отправка других токенов или использование другой сети приведет к потере средств.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
