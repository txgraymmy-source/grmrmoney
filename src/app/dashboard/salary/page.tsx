import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Suspense } from 'react'
import SalaryPeriodPicker from '@/components/salary/SalaryPeriodPicker'
import ContactCard from '@/components/salary/ContactCard'
import { calculateSalary, currentPeriod, formatPeriod } from '@/lib/salary'

interface PageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function SalaryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { period: periodParam } = await searchParams
  const period = periodParam || currentPeriod()

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
    include: {
      salaryRules: true,
      category: {
        select: {
          id: true,
          name: true,
          transactions: {
            select: {
              amount: true,
              type: true,
              source: true,
              timestamp: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const contactsWithAmounts = contacts.map(contact => {
    const transactions = contact.category?.transactions ?? []
    const amount = calculateSalary(contact.salaryRules, transactions, period)
    return { contact, amount }
  })

  const totalAmount = contactsWithAmounts.reduce((sum, { amount }) => sum + amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Зарплата</h1>
          <p className="text-white/50 text-[15px] mt-1">
            Управление выплатами — {formatPeriod(period)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={null}>
            <SalaryPeriodPicker value={period} />
          </Suspense>
          <Link href="/dashboard/salary/new">
            <Button>+ Добавить</Button>
          </Link>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="flex items-center gap-6 px-5 py-4 bg-[rgba(214,211,255,0.04)] border border-[rgba(214,211,255,0.12)] rounded-[16px]">
          <div>
            <p className="text-white/40 text-[12px]">Сотрудников</p>
            <p className="text-white font-semibold text-[20px]">{contacts.length}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-white/40 text-[12px]">К выплате за период</p>
            <p className="text-[#d6d3ff] font-semibold text-[20px]">
              ≈ {totalAmount.toFixed(2)} USDT
            </p>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <Card className="card-rounded">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-white/50 mb-2 text-[15px]">Нет сотрудников</p>
            <p className="text-white/30 text-[13px] mb-6 text-center max-w-sm">
              Добавьте сотрудника или исполнителя с TRON-адресом и настройте правила выплат
            </p>
            <Link href="/dashboard/salary/new">
              <Button>Добавить первого</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contactsWithAmounts.map(({ contact, amount }) => (
            <ContactCard
              key={contact.id}
              contact={{
                id: contact.id,
                name: contact.name,
                walletAddress: contact.walletAddress,
                category: contact.category
                  ? { id: contact.category.id, name: contact.category.name }
                  : null,
                salaryRules: contact.salaryRules,
              }}
              calculatedAmount={amount}
              period={period}
            />
          ))}
        </div>
      )}
    </div>
  )
}
