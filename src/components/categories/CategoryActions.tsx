'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CategoryActionsProps {
  categoryId: string
  categoryName: string
}

export default function CategoryActions({ categoryId, categoryName }: CategoryActionsProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleArchive = async () => {
    if (!confirm(`Вы уверены, что хотите архивировать "${categoryName}"? Проект будет скрыт из списка, но данные сохранятся.`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to archive category')
      }

      router.push('/dashboard/categories')
      router.refresh()
    } catch (error) {
      console.error('Error archiving category:', error)
      alert('Ошибка при архивировании проекта')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`ВНИМАНИЕ! Вы собираетесь удалить "${categoryName}". Это действие необратимо! Все транзакции и данные кошелька будут удалены.\n\nВы уверены?`)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete category')
      }

      router.push('/dashboard/categories')
      router.refresh()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Ошибка при удалении проекта')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={loading}
        className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        title="Настройки проекта"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-20 overflow-hidden">
            <button
              onClick={() => {
                setShowMenu(false)
                handleArchive()
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-left text-sm text-yellow-400 hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Архивировать проект
            </button>
            <button
              onClick={() => {
                setShowMenu(false)
                handleDelete()
              }}
              disabled={loading}
              className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-3 border-t border-gray-800"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Удалить проект
            </button>
          </div>
        </>
      )}
    </div>
  )
}
