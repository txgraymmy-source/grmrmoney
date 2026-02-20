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
      <div className="min-h-screen bg-[#030712]">
        {/* Header */}
        <header className="border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-8">
                <Link href="/dashboard" className="flex items-center">
                  <img src="/logo.svg" alt="VAULT by grmr" className="h-8" />
                </Link>
                <nav className="hidden md:flex space-x-1">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    Обзор
                  </Link>
                  <Link
                    href="/dashboard/categories"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    Направления
                  </Link>
                  <Link
                    href="/dashboard/transactions"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    Транзакции
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all"
                  >
                    Настройки
                  </Link>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <div className="hidden md:block">
                  <p className="text-sm text-gray-400">
                    {session.user?.email}
                  </p>
                </div>
                <form action="/api/auth/signout" method="post">
                  <Button
                    variant="outline"
                    size="sm"
                    type="submit"
                    className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white rounded-xl"
                  >
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

        {/* Footer */}
        <footer className="border-t border-purple-500/20 mt-20 bg-gray-900/30">
          <div className="container mx-auto px-4 py-6">
            <p className="text-center text-sm text-gray-500">
              GrMrMoney - Управление финансами модельного агентства
            </p>
          </div>
        </footer>
      </div>
    </WalletProvider>
  )
}
