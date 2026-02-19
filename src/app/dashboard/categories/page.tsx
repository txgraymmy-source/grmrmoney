import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { truncateAddress, formatDate } from '@/lib/utils'
import CategoriesHeader from '@/components/categories/CategoriesHeader'

async function getCategories(userId: string) {
  return await prisma.category.findMany({
    where: {
      userId,
      archived: false, // Don't show archived categories
    },
    include: {
      transactions: {
        orderBy: { timestamp: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/login')
  }

  const categories = await getCategories(session.user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <CategoriesHeader userId={session.user.id} />

      {/* Categories List */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              У вас пока нет направлений
            </p>
            <Link href="/dashboard/categories/new">
              <Button>Создать первое направление</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{category.name}</CardTitle>
                <CardDescription>
                  {category.description || 'Без описания'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Адрес кошелька</p>
                  <p className="font-mono text-sm truncate">
                    {truncateAddress(category.walletAddress, 10, 8)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Статистика</p>
                  <p className="text-sm">
                    Транзакций: {category.transactions.length}
                  </p>
                </div>

                <div className="pt-2">
                  <Link href={`/dashboard/categories/${category.id}`}>
                    <Button className="w-full" variant="outline">
                      Открыть
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
