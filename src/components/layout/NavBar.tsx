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
  dropdownHref?: string      // "See all" link
  dropdownKey?: string       // used to load items
}

const NAV_ITEMS: NavItemConfig[] = [
  { label: 'Обзор',       href: '/dashboard' },
  { label: 'Фонды',       href: '/dashboard/funds',       dropdownHref: '/dashboard/funds',       dropdownKey: 'funds' },
  { label: 'Модели',      href: '/dashboard/categories',  dropdownHref: '/dashboard/categories',  dropdownKey: 'categories' },
  { label: 'Сотрудники',  href: '/dashboard/employees' },
  { label: 'Зарплата',    href: '/dashboard/salary' },
]

// Cache loaded items per key so we don't refetch on every hover
const cache: Record<string, SubItem[]> = {}

export default function NavBar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isCrypto = (session?.user as any)?.accountType !== 'accounting'

  const visibleItems = NAV_ITEMS.filter(item =>
    item.dropdownKey !== 'funds' || isCrypto
  )
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [items, setItems] = useState<Record<string, SubItem[]>>({})
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <nav className="relative flex items-center p-1 rounded-[20px] border border-[rgba(120,120,128,0.16)] overflow-visible h-[47px]">
      {/* Background */}
      <div className="absolute inset-0 rounded-[20px] bg-[#323232] pointer-events-none" />

      {visibleItems.map(item => {
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

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
                isActive
                  ? 'bg-white text-[#101012] font-medium shadow-[0px_4px_2px_0px_rgba(16,16,18,0.01),0px_2px_2px_0px_rgba(16,16,18,0.02),0px_1px_1px_0px_rgba(16,16,18,0.04),0px_0px_1px_0px_rgba(16,16,18,0.12)]'
                  : 'text-white font-normal hover:bg-white/10'
              }`}
            >
              {item.label}
              {hasDropdown && (
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  className={`transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
            </Link>

            {/* Dropdown */}
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
                      <Link
                        key={sub.id}
                        href={sub.href}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.06] transition-colors"
                        onClick={() => setOpenKey(null)}
                      >
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

                {/* Divider + See all */}
                <div className="border-t border-[rgba(120,120,128,0.12)] px-4 py-2.5">
                  <Link
                    href={item.dropdownHref!}
                    className="flex items-center justify-between text-white/50 hover:text-white text-[13px] transition-colors"
                    onClick={() => setOpenKey(null)}
                  >
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
  )
}
