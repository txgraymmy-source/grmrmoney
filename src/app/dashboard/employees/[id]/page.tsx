import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import EmployeeDetailClient from '@/components/employees/EmployeeDetailClient'
import { currentPeriod } from '@/lib/salary'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const period = currentPeriod()

  const [contact, positions, categories] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        position: { select: { id: true, name: true, icon: true, color: true } },
        employeeProjects: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                transactions: {
                  select: { amount: true, type: true, source: true, timestamp: true },
                },
              },
            },
            salaryRules: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    }),
    prisma.position.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id, archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!contact || contact.userId !== session.user.id) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/employees">
          <Button variant="ghost" size="sm">← Назад</Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-white">{contact.name}</h1>
          {contact.position && (
            <p className="text-white/50 text-[14px] mt-0.5">
              {contact.position.icon && `${contact.position.icon} `}{contact.position.name}
            </p>
          )}
        </div>
      </div>

      <EmployeeDetailClient
        contact={contact as any}
        positions={positions}
        availableCategories={categories}
        period={period}
      />
    </div>
  )
}
