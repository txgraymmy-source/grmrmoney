import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { truncateAddress } from '@/lib/utils'
import { formatPeriod } from '@/lib/salary'
import ContactEditPanel from '@/components/salary/ContactEditPanel'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const [contact, categories] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        salaryRules: true,
        category: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    }),
    prisma.category.findMany({
      where: { userId: session.user.id, archived: false },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!contact || contact.userId !== session.user.id) notFound()

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/salary">
          <Button variant="ghost" size="sm">← Назад</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-white">{contact.name}</h1>
          {contact.category && (
            <p className="text-white/50 text-[15px] mt-1">Проект: {contact.category.name}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Edit panel */}
        <Card className="card-rounded">
          <CardHeader className="pb-3">
            <CardTitle className="text-[16px]">Настройки</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactEditPanel
              contactId={contact.id}
              initialName={contact.name}
              initialWalletAddress={contact.walletAddress}
              initialNotes={contact.notes ?? ''}
              initialCategoryId={contact.categoryId ?? ''}
              initialRules={contact.salaryRules}
              categories={categories}
            />
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card className="card-rounded">
          <CardHeader className="pb-3">
            <CardTitle className="text-[16px]">История выплат</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.payments.length === 0 ? (
              <p className="text-white/30 text-[13px]">Выплат ещё не было</p>
            ) : (
              <div className="space-y-2">
                {contact.payments.map(payment => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-2.5 border-b border-[rgba(120,120,128,0.1)] last:border-0"
                  >
                    <div>
                      <p className="text-white text-[14px] font-medium">
                        {parseFloat(payment.amount).toFixed(2)} USDT
                      </p>
                      <p className="text-white/40 text-[12px]">
                        {formatPeriod(payment.period)}
                      </p>
                      {payment.txHash && (
                        <p className="font-mono text-[11px] text-white/25 mt-0.5">
                          {truncateAddress(payment.txHash, 8, 6)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-[6px] text-[11px] border ${
                        payment.status === 'completed'
                          ? 'bg-green-500/10 border-green-500/20 text-green-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}
                    >
                      {payment.status === 'completed' ? 'Выполнено' : 'Ошибка'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
