import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import CreateFundForm from '@/components/funds/CreateFundForm'

export default async function NewFundPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/funds">
          <Button variant="ghost" size="sm">← Назад</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-white">Новый фонд</h1>
          <p className="text-white/50 text-[15px] mt-1">Создайте корпоративный фонд с реальным TRON-кошельком</p>
        </div>
      </div>

      <CreateFundForm />
    </div>
  )
}
