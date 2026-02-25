'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface UserMenuProps {
  email: string
}

export default function UserMenu({ email }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-[14px] border border-[rgba(120,120,128,0.16)] hover:border-[rgba(120,120,128,0.32)] transition-all"
      >
        <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.3), rgba(255,255,255,0.05))',
            boxShadow: '-0.3px 1.7px 3.8px 0px rgba(0,0,0,0.16)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {email.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block text-white text-[15px] font-normal whitespace-nowrap max-w-[140px] truncate">
          {email.split('@')[0]}
        </span>
        <svg
          className={`w-4 h-4 text-white/60 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-[16px] shadow-xl overflow-hidden z-50 border border-[rgba(120,120,128,0.2)] backdrop-blur-xl"
          style={{
            backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.2) 100%), linear-gradient(90deg, rgba(37,37,37,0.95) 0%, rgba(37,37,37,0.95) 100%)',
          }}
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-[rgba(120,120,128,0.16)]">
            <p className="text-sm font-medium text-white">{email}</p>
            <p className="text-xs text-white/40 mt-0.5">Пользователь</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Профиль и настройки</span>
            </Link>

            <Link
              href="/dashboard/transactions"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>История транзакций</span>
            </Link>

            <Link
              href="/dashboard/settings/categories"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>Настройки категорий</span>
            </Link>

            <Link
              href="/dashboard/settings/onlymonster"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Интеграции</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-[rgba(120,120,128,0.16)]">
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-white/[0.06] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Выйти</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
