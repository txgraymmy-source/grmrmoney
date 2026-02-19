import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { WalletProvider } from '@/contexts/WalletContext'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <Link href="/dashboard" className="text-xl font-bold">
                  GrMrMoney
                </Link>
                <nav className="hidden md:flex space-x-4">
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium hover:text-primary"
                  >
                    Обзор
                  </Link>
                  <Link
                    href="/categories"
                    className="text-sm font-medium hover:text-primary"
                  >
                    Направления
                  </Link>
                  <Link
                    href="/transactions"
                    className="text-sm font-medium hover:text-primary"
                  >
                    Транзакции
                  </Link>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  {session.user?.email}
                </span>
                <form action="/api/auth/signout" method="post">
                  <Button variant="outline" size="sm" type="submit">
                    Выйти
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </WalletProvider>
  )
}
