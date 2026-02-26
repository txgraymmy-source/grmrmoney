'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface SubItem {
  id: string
  name: string
  icon?: string | null
  href: string
}

interface NavItemConfig {
  label: string
  href: string
  dropdownHref?: string
  dropdownKey?: string
}

const NAV_ITEMS: NavItemConfig[] = [
  { label: 'Обзор',       href: '/dashboard' },
  { label: 'Фонды',       href: '/dashboard/funds',       dropdownHref: '/dashboard/funds',       dropdownKey: 'funds' },
  { label: 'Модели',      href: '/dashboard/categories',  dropdownHref: '/dashboard/categories',  dropdownKey: 'categories' },
  { label: 'Сотрудники',  href: '/dashboard/employees' },
  { label: 'Зарплата',    href: '/dashboard/salary' },
]

const NAV_ICONS: Record<string, React.ReactNode> = {
  '/dashboard': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  '/dashboard/funds': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
  ),
  '/dashboard/categories': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  '/dashboard/employees': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  '/dashboard/salary': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2"/>
      <path d="M2 10h20"/>
    </svg>
  ),
}

const cache: Record<string, SubItem[]> = {}

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isCrypto = (session?.user as any)?.accountType !== 'accounting'

  const visibleItems = NAV_ITEMS.filter(item =>
    item.dropdownKey !== 'funds' || isCrypto
  )

  // Desktop dropdown state
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, SubItem[]>>({})
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const openDropdown = async (key: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenKey(key)
    if (!cache[key]) {
      try {
        const res = await fetch(`/api/${key}?limit=3`)
        if (res.ok) {
          const { data } = await res.json()
          const mapped: SubItem[] = (data || []).slice(0, 3).map((item: any) => ({
            id: item.id,
            name: item.name,
            icon: item.icon ?? null,
            href: `/dashboard/${key}/${item.id}`,
          }))
          cache[key] = mapped
          setItems(prev => ({ ...prev, [key]: mapped }))
        }
      } catch {
        cache[key] = []
      }
    } else {
      setItems(prev => ({ ...prev, [key]: cache[key] }))
    }
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpenKey(null), 150)
  }
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  return (
    <>
      {/* ── Desktop nav pill (md+) ── */}
      <nav className="relative hidden md:flex items-center p-1 rounded-[20px] border border-[rgba(120,120,128,0.16)] overflow-visible h-[47px]">
        <div className="absolute inset-0 rounded-[20px] bg-[#323232] pointer-events-none" />

        {visibleItems.map(item => {
          const active = isActive(item.href)
          const hasDropdown = !!item.dropdownKey
          const dropItems = item.dropdownKey ? (items[item.dropdownKey] ?? []) : []
          const isOpen = openKey === item.dropdownKey

          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => hasDropdown && openDropdown(item.dropdownKey!)}
              onMouseLeave={() => hasDropdown && scheduleClose()}
            >
              <Link
                href={item.href}
                className={`relative z-10 flex items-center gap-1.5 px-4 py-2 rounded-[14px] text-[15px] transition-all whitespace-nowrap leading-6 ${
                  active
                    ? 'bg-white text-[#101012] font-medium shadow-[0px_4px_2px_0px_rgba(16,16,18,0.01),0px_2px_2px_0px_rgba(16,16,18,0.02),0px_1px_1px_0px_rgba(16,16,18,0.04),0px_0px_1px_0px_rgba(16,16,18,0.12)]'
                    : 'text-white font-normal hover:bg-white/10'
                }`}
              >
                {item.label}
                {hasDropdown && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </Link>

              {hasDropdown && isOpen && (
                <div
                  className="absolute left-0 top-[calc(100%+8px)] w-[240px] rounded-[18px] border border-[rgba(120,120,128,0.2)] bg-[rgba(16,16,18,0.96)] backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
                  onMouseEnter={cancelClose}
                  onMouseLeave={scheduleClose}
                >
                  {dropItems.length === 0 ? (
                    <div className="px-4 py-3 text-white/30 text-[13px]">Ничего нет</div>
                  ) : (
                    <div className="py-1.5">
                      {dropItems.map(sub => (
                        <Link key={sub.id} href={sub.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] transition-colors" onClick={() => setOpenKey(null)}>
                          {sub.icon ? (
                            <span className="text-[16px] w-6 text-center flex-shrink-0">{sub.icon}</span>
                          ) : (
                            <div className="w-6 h-6 rounded-[8px] bg-[rgba(118,118,128,0.2)] flex-shrink-0" />
                          )}
                          <span className="text-white text-[14px] truncate">{sub.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-[rgba(120,120,128,0.12)] px-4 py-2.5">
                    <Link href={item.dropdownHref!} className="flex items-center justify-between text-white/50 hover:text-white text-[13px] transition-colors" onClick={() => setOpenKey(null)}>
                      <span>Смотреть все</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Hamburger button (mobile only) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="flex md:hidden items-center justify-center w-[42px] h-[42px] rounded-[13px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors"
        aria-label="Меню"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 h-full w-[280px] bg-[#111113] border-r border-[rgba(120,120,128,0.2)] z-50 flex flex-col md:hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-[rgba(120,120,128,0.1)]">
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <img src="/logo.svg" alt="VAULT" className="h-[36px] w-auto" />
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all text-[20px] leading-none"
              >
                ×
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {visibleItems.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-[14px] mb-1 transition-all ${
                      active
                        ? 'bg-white/[0.08] text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className={`flex-shrink-0 ${active ? 'text-[#d6d3ff]' : 'text-white/40'}`}>
                      {NAV_ICONS[item.href]}
                    </span>
                    <span className="text-[15px] font-medium">{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d6d3ff] flex-shrink-0" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-[rgba(120,120,128,0.1)] space-y-1">
              <Link
                href="/dashboard/transactions"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-white/50 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <span className="text-[14px]">История транзакций</span>
              </Link>
              <Link
                href="/dashboard/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-[12px] text-white/50 hover:text-white hover:bg-white/[0.04] transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="text-[14px]">Профиль</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
