import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { calculateSalary, currentPeriod } from '@/lib/salary'

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const period = currentPeriod()

  const contacts = await prisma.contact.findMany({
    where: { userId: session.user.id },
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
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  // Calculate total salary per employee across all their project pairs
  const employeesWithAmounts = contacts.map(contact => {
    const totalAmount = contact.employeeProjects.reduce((sum, pair) => {
      const txs = pair.category?.transactions ?? []
      return sum + calculateSalary(pair.salaryRules, txs, period)
    }, 0)
    return { contact, totalAmount }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Сотрудники</h1>
          <p className="text-white/50 text-[15px] mt-1">
            {contacts.length} {contacts.length === 1 ? 'сотрудник' : contacts.length < 5 ? 'сотрудника' : 'сотрудников'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/employees/positions">
            <Button variant="secondary">Должности</Button>
          </Link>
          <Link href="/dashboard/employees/new">
            <Button>+ Добавить</Button>
          </Link>
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card className="card-rounded">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-white/50 mb-2 text-[15px]">Нет сотрудников</p>
            <p className="text-white/30 text-[13px] mb-6 text-center max-w-sm">
              Добавьте сотрудника с TRON-адресом, должностью и привяжите к проекту
            </p>
            <Link href="/dashboard/employees/new">
              <Button>Добавить первого</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {employeesWithAmounts.map(({ contact, totalAmount }) => (
            <Link
              key={contact.id}
              href={`/dashboard/employees/${contact.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[16px] hover:border-[rgba(120,120,128,0.35)] hover:bg-[rgba(37,37,37,0.7)] transition-all"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[rgba(214,211,255,0.12)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[16px] flex-shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + position */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-[15px] truncate">{contact.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {contact.position ? (
                    <span className="text-[12px] px-2 py-0.5 rounded-[6px] border"
                      style={{
                        background: contact.position.color ? `${contact.position.color}18` : 'rgba(214,211,255,0.08)',
                        borderColor: contact.position.color ? `${contact.position.color}40` : 'rgba(214,211,255,0.2)',
                        color: contact.position.color ?? '#d6d3ff',
                      }}
                    >
                      {contact.position.icon && <span className="mr-1">{contact.position.icon}</span>}
                      {contact.position.name}
                    </span>
                  ) : (
                    <span className="text-white/30 text-[12px]">Без должности</span>
                  )}
                  {contact.employeeProjects.map(p => (
                    <span key={p.id} className="text-[12px] text-white/40 px-2 py-0.5 rounded-[6px] bg-white/[0.04] border border-white/[0.08]">
                      {p.category.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <p className="text-[#d6d3ff] font-semibold text-[16px]">
                  {totalAmount > 0 ? `≈ ${totalAmount.toFixed(2)} USDT` : '—'}
                </p>
                <p className="text-white/30 text-[11px]">к выплате</p>
              </div>

              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 flex-shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
