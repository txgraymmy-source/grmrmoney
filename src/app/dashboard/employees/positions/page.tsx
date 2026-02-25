import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import PositionsManager from '@/components/employees/PositionsManager'

export default async function PositionsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const positions = await prisma.position.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { employees: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="sm">← Назад</Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white">Должности</h1>
      </div>

      <PositionsManager initialPositions={positions as any} />
    </div>
  )
}
