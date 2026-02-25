import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SalaryPeriodPicker from '@/components/salary/SalaryPeriodPicker'
import SalaryTableClient from '@/components/salary/SalaryTableClient'
import { calculateSalary, currentPeriod, formatPeriod } from '@/lib/salary'

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function SalaryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { period: periodParam } = await searchParams
  const period = periodParam || currentPeriod()

  // Fetch all employee-project pairs with salary rules and category transactions
  const pairs = await prisma.contactCategory.findMany({
    where: {
      contact: { userId: session.user.id },
    },
    include: {
      contact: {
        include: {
          position: { select: { id: true, name: true, icon: true, color: true } },
        },
      },
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
    orderBy: [
      { contact: { name: 'asc' } },
      { category: { name: 'asc' } },
    ],
  })

  const rows = pairs.map(pair => {
    const txs = pair.category.transactions
    const amount = calculateSalary(pair.salaryRules, txs, period)
    return {
      contactId: pair.contact.id,
      contactName: pair.contact.name,
      contactWallet: pair.contact.walletAddress,
      positionName: pair.contact.position?.name ?? null,
      positionIcon: pair.contact.position?.icon ?? null,
      positionColor: pair.contact.position?.color ?? null,
      categoryId: pair.category.id,
      categoryName: pair.category.name,
      amount,
      rules: pair.salaryRules,
    }
  })

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Зарплата</h1>
          <p className="text-white/50 text-[15px] mt-1">
            Выплаты за {formatPeriod(period)}
          </p>
        </div>
        <Suspense fallback={null}>
          <SalaryPeriodPicker value={period} />
        </Suspense>
      </div>

      <SalaryTableClient rows={rows} period={period} totalAmount={totalAmount} />
    </div>
  )
}
