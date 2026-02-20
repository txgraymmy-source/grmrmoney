import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import OnlyFansAccountManager from '@/components/category/OnlyFansAccountManager'
import OnlyFansTransactionSync from '@/components/category/OnlyFansTransactionSync'
import CategoryActions from '@/components/categories/CategoryActions'

async function getCategoryData(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
      userId,
    },
  })

  return category
}

export default async function CategorySettingsPage({ params }: { params: Promise<{ id: string }> }) {
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
            href={`/dashboard/categories/${category.id}`}
            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Назад к направлению
          </Link>
          <CategoryActions categoryId={category.id} categoryName={category.name} />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Настройки: {category.name}</h1>
        {category.description && (
          <p className="text-gray-400">{category.description}</p>
        )}
      </div>

      {/* Wallet Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Адрес кошелька</CardTitle>
          <CardDescription>USDT TRC-20</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-black/40 border border-gray-800 rounded-xl p-4">
            <p className="font-mono text-sm text-gray-300 break-all">
              {category.walletAddress}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* OnlyFans Accounts */}
      <OnlyFansAccountManager categoryId={category.id} />

      {/* OnlyFans Transaction Sync */}
      <OnlyFansTransactionSync categoryId={category.id} />

      {/* Danger Zone */}
      <Card className="bg-red-500/5 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400">Опасная зона</CardTitle>
          <CardDescription className="text-gray-400">
            Необратимые действия с направлением
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            Архивирование или удаление направления - необратимые действия. Будьте осторожны.
          </p>
          <CategoryActions categoryId={category.id} categoryName={category.name} />
        </CardContent>
      </Card>
    </div>
  )
}
