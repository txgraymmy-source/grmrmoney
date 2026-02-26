import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import SalaryPeriodPicker from '@/components/salary/SalaryPeriodPicker'
import SalaryPageClient from '@/components/salary/SalaryPageClient'
import { calculateSalary, currentPeriod, formatPeriod } from '@/lib/salary'

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export interface EmployeeRow {
  contactCategoryId: string
  contactId: string
  contactName: string
  contactWallet: string
  positionName: string | null
  positionIcon: string | null
  positionColor: string | null
  categoryId: string
  categoryName: string
  rules: Array<{ type: string; amount: number | null; percent: number | null; source: string | null; label: string | null }>
  amount: number
}

export interface ProjectGroup {
  categoryId: string
  categoryName: string
  totalAmount: number
  employees: EmployeeRow[]
}

export default async function SalaryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { period: periodParam } = await searchParams
  const period = periodParam || currentPeriod()

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
      { category: { name: 'asc' } },
      { contact: { name: 'asc' } },
    ],
  })

  // Build ProjectGroup[]
  const groupMap = new Map<string, ProjectGroup>()

  for (const pair of pairs) {
    const amount = calculateSalary(pair.salaryRules, pair.category.transactions, period)

    const empRow: EmployeeRow = {
      contactCategoryId: pair.id,
      contactId: pair.contact.id,
      contactName: pair.contact.name,
      contactWallet: pair.contact.walletAddress,
      positionName: pair.contact.position?.name ?? null,
      positionIcon: pair.contact.position?.icon ?? null,
      positionColor: pair.contact.position?.color ?? null,
      categoryId: pair.category.id,
      categoryName: pair.category.name,
      rules: pair.salaryRules,
      amount,
    }

    if (!groupMap.has(pair.category.id)) {
      groupMap.set(pair.category.id, {
        categoryId: pair.category.id,
        categoryName: pair.category.name,
        totalAmount: 0,
        employees: [],
      })
    }

    const group = groupMap.get(pair.category.id)!
    group.employees.push(empRow)
    group.totalAmount += amount
  }

  const groups = Array.from(groupMap.values())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-white">Зарплата</h1>
          <p className="text-white/40 text-[14px] mt-0.5">
            Выплаты за {formatPeriod(period)}
          </p>
        </div>
        <Suspense fallback={null}>
          <SalaryPeriodPicker value={period} />
        </Suspense>
      </div>

      <SalaryPageClient groups={groups} period={period} />
    </div>
  )
}
