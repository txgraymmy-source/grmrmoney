import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { calculateSalary, currentPeriod } from '@/lib/salary'

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

export default async function EmployeesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const period = currentPeriod()

  const [contacts, positionsCount] = await Promise.all([
    prisma.contact.findMany({
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
      orderBy: { name: 'asc' },
    }),
    prisma.position.count({ where: { userId: session.user.id } }),
  ])

  const employeesWithAmounts = contacts.map(contact => {
    const totalAmount = contact.employeeProjects.reduce((sum, pair) => {
      return sum + calculateSalary(pair.salaryRules, pair.category?.transactions ?? [], period)
    }, 0)
    return { contact, totalAmount }
  })

  const totalPayout = employeesWithAmounts.reduce((s, e) => s + e.totalAmount, 0)
  const totalPairs = contacts.reduce((s, c) => s + c.employeeProjects.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-white">Сотрудники</h1>
          <p className="text-white/40 text-[14px] mt-0.5">Управление командой и выплатами</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/employees/positions">
            <Button variant="secondary">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mr-2">
                <rect x="3" y="7" width="18" height="4" rx="1"/><rect x="3" y="14" width="18" height="4" rx="1"/>
              </svg>
              Должности
            </Button>
          </Link>
          <Link href="/dashboard/employees/new">
            <Button>+ Добавить</Button>
          </Link>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="card-rounded">
            <CardContent className="pt-4 pb-4">
              <p className="text-white/40 text-[12px] mb-1">Сотрудников</p>
              <p className="text-white font-semibold text-[24px] leading-none">{contacts.length}</p>
            </CardContent>
          </Card>
          <Card className="card-rounded">
            <CardContent className="pt-4 pb-4">
              <p className="text-white/40 text-[12px] mb-1">Должностей</p>
              <p className="text-white font-semibold text-[24px] leading-none">{positionsCount}</p>
            </CardContent>
          </Card>
          <Card className="card-rounded">
            <CardContent className="pt-4 pb-4">
              <p className="text-white/40 text-[12px] mb-1">Проектов (пар)</p>
              <p className="text-white font-semibold text-[24px] leading-none">{totalPairs}</p>
            </CardContent>
          </Card>
          <Card className="card-rounded">
            <CardContent className="pt-4 pb-4">
              <p className="text-white/40 text-[12px] mb-1">К выплате</p>
              <p className="text-[#d6d3ff] font-semibold text-[24px] leading-none">
                {totalPayout > 0 ? `$${fmt(totalPayout)}` : '—'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {contacts.length === 0 ? (
        <Card className="card-rounded">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-[18px] bg-[rgba(214,211,255,0.08)] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d6d3ff" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <p className="text-white/60 text-[15px] font-medium mb-1">Сотрудников пока нет</p>
            <p className="text-white/30 text-[13px] mb-6 text-center max-w-xs">
              Добавьте сотрудника, укажите должность и прикрепите к проекту
            </p>
            <Link href="/dashboard/employees/new">
              <Button>Добавить первого</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-rounded overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(120,120,128,0.12)]">
                  <th className="px-6 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Сотрудник</th>
                  <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Должность</th>
                  <th className="px-4 py-3.5 text-left text-[12px] font-medium text-white/35 uppercase tracking-wide">Проекты</th>
                  <th className="px-4 py-3.5 text-right text-[12px] font-medium text-white/35 uppercase tracking-wide">К выплате</th>
                  <th className="px-6 py-3.5 text-right text-[12px] font-medium text-white/35 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody>
                {employeesWithAmounts.map(({ contact, totalAmount }) => (
                  <tr
                    key={contact.id}
                    className="border-b border-[rgba(120,120,128,0.06)] hover:bg-white/[0.025] transition-colors group"
                  >
                    {/* Name + avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[rgba(214,211,255,0.12)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[13px] flex-shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium text-[14px] leading-tight">{contact.name}</p>
                          <p className="text-white/30 font-mono text-[11px] mt-0.5">
                            {contact.walletAddress.slice(0, 6)}…{contact.walletAddress.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-4">
                      {contact.position ? (
                        <span
                          className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-[7px] border font-medium"
                          style={{
                            background: contact.position.color ? `${contact.position.color}15` : 'rgba(214,211,255,0.08)',
                            borderColor: contact.position.color ? `${contact.position.color}35` : 'rgba(214,211,255,0.2)',
                            color: contact.position.color ?? '#d6d3ff',
                          }}
                        >
                          {contact.position.icon && <span>{contact.position.icon}</span>}
                          {contact.position.name}
                        </span>
                      ) : (
                        <span className="text-white/25 text-[13px]">—</span>
                      )}
                    </td>

                    {/* Projects */}
                    <td className="px-4 py-4">
                      {contact.employeeProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {contact.employeeProjects.map(p => (
                            <span
                              key={p.id}
                              className="text-[12px] text-white/50 px-2 py-0.5 rounded-[6px] bg-white/[0.04] border border-white/[0.08]"
                            >
                              {p.category.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-white/20 text-[13px]">Нет проектов</span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 text-right">
                      {totalAmount > 0 ? (
                        <div>
                          <p className="text-[#d6d3ff] font-semibold text-[15px]">${fmt(totalAmount)}</p>
                          <p className="text-white/25 text-[11px]">USDT / мес</p>
                        </div>
                      ) : (
                        <span className="text-white/20 text-[13px]">—</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/employees/${contact.id}`}
                        className="inline-flex items-center gap-1.5 text-[13px] text-white/40 group-hover:text-white/80 transition-colors"
                      >
                        Открыть
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden divide-y divide-[rgba(120,120,128,0.08)]">
            {employeesWithAmounts.map(({ contact, totalAmount }) => (
              <Link
                key={contact.id}
                href={`/dashboard/employees/${contact.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[rgba(214,211,255,0.12)] flex items-center justify-center text-[#d6d3ff] font-semibold text-[14px] flex-shrink-0">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-[14px] truncate">{contact.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contact.position ? (
                      <span className="text-[11px]" style={{ color: contact.position.color ?? '#d6d3ff' }}>
                        {contact.position.icon} {contact.position.name}
                      </span>
                    ) : (
                      <span className="text-white/30 text-[11px]">Без должности</span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {totalAmount > 0 && (
                    <p className="text-[#d6d3ff] font-semibold text-[14px]">${fmt(totalAmount)}</p>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 ml-auto mt-1">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
