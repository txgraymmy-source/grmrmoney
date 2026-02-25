import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import NewEmployeeForm from '@/components/employees/NewEmployeeForm'

export default async function NewEmployeePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const positions = await prisma.position.findMany({
    where: { userId: session.user.id },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="sm">← Назад</Button>
        </Link>
        <h1 className="text-2xl font-semibold text-white">Новый сотрудник</h1>
      </div>

      <NewEmployeeForm positions={positions} />
    </div>
  )
}
