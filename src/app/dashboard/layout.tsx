import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import DashboardProviders from '@/components/layout/DashboardProviders'
import Link from 'next/link'
import UserMenu from '@/components/layout/UserMenu'
import NavBar from '@/components/layout/NavBar'
import NotificationBell from '@/components/layout/NotificationBell'
import HeaderActions from '@/components/layout/HeaderActions'

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
    <DashboardProviders>
      <div className="min-h-screen bg-[#101012]">
        {/* Header: логотип снаружи подложки слева, Rectangle 1904 — от лого до правого края */}
        <div className="sticky top-0 z-40 flex items-center gap-3 md:gap-4 px-4 md:px-6 pt-4 md:pt-7">
          {/* Логотип — левее подложки, без фона */}
          <Link href="/dashboard" className="flex-shrink-0 hidden md:block">
            <img src="/logo.svg" alt="VAULT by grmr" className="h-[52px] w-auto block" />
          </Link>

          {/* Rectangle 1904 — стеклянная подложка h=90, от лого до правого края */}
          <div className="relative flex-1 flex items-center justify-between h-[62px] md:h-[90px] rounded-[20px] md:rounded-[25px] border border-[rgba(120,120,128,0.2)] px-4 md:px-6">
            {/* Glass background */}
            <div
              className="absolute inset-0 rounded-[25px] backdrop-blur-xl pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 100%), linear-gradient(90deg, rgba(37,37,37,0.75) 0%, rgba(37,37,37,0.75) 100%)',
              }}
            />

            {/* Nav-пилюля */}
            <div className="relative z-10">
              <NavBar />
            </div>

            {/* Кнопки и юзер-меню */}
            <div className="relative z-10 flex items-center gap-2">
              {(session.user as any)?.accountType !== 'accounting' && <HeaderActions />}
              <NotificationBell />
              <UserMenu email={session.user?.email || ''} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 md:px-5 py-5 md:py-6">
          {children}
        </main>
      </div>
    </DashboardProviders>
  )
}
