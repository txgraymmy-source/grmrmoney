'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: Record<string, unknown>
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const { data, unreadCount } = await res.json()
        setNotifications(data || [])
        setUnreadCount(unreadCount || 0)
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' })
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    if (notification.type === 'distribution_pending' || notification.type === 'fund_transfer') {
      router.push('/dashboard/funds')
    }
    setOpen(false)
  }

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'только что'
    if (mins < 60) return `${mins} мин назад`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ч назад`
    return date.toLocaleDateString('ru-RU')
  }

  const typeIcon = (type: string) => {
    if (type === 'incoming_transaction') return '↓'
    if (type === 'distribution_pending') return '⚡'
    if (type === 'fund_transfer') return '→'
    return '•'
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-[46px] h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white hover:opacity-80 transition-opacity"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#d6d3ff] text-[#101012] text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[54px] w-[360px] rounded-[20px] border border-[rgba(120,120,128,0.2)] bg-[rgba(20,20,22,0.95)] backdrop-blur-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(120,120,128,0.12)]">
            <span className="text-white font-medium text-[15px]">Уведомления</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-white/50 hover:text-white/80 transition-colors"
              >
                Все прочитаны
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-5 py-8 text-center text-white/40 text-[14px]">
                Уведомлений нет
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-5 py-4 border-b border-[rgba(120,120,128,0.08)] hover:bg-white/[0.04] transition-colors ${
                    !n.read ? 'bg-[#d6d3ff]/[0.04]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-[15px] mt-0.5 flex-shrink-0 ${
                      n.type === 'incoming_transaction' ? 'text-[#d6d3ff]' :
                      n.type === 'distribution_pending' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {typeIcon(n.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[13px] font-medium leading-tight">{n.title}</p>
                      <p className="text-white/50 text-[12px] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                      <p className="text-white/30 text-[11px] mt-1">{formatTime(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#d6d3ff] flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
