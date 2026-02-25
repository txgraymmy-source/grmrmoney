'use client'

import { useState } from 'react'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

interface CategoryManagerProps {
  initialCategories: Category[]
}

const EMOJI_OPTIONS = ['💰', '💼', '🎁', '📈', '💵', '🛒', '🚗', '🎮', '⚕️', '📚', '👔', '🏠', '🍽️', '💸', '✈️', '🎬', '🎨', '💪', '🎓', '🏥']
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6', '#f97316', '#a855f7', '#6b7280']

export default function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    icon: '💰',
    color: '#10b981',
    type: 'income'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingId) {
        // Update category
        const res = await fetch(`/api/transaction-categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (res.ok) {
          const data = await res.json()
          setCategories(categories.map(c => c.id === editingId ? data.data : c))
          setEditingId(null)
        }
      } else {
        // Create category
        const res = await fetch('/api/transaction-categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })

        if (res.ok) {
          const data = await res.json()
          setCategories([...categories, data.data])
        }
      }

      setFormData({ name: '', icon: '💰', color: '#10b981', type: 'income' })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Ошибка при сохранении категории')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту категорию? Транзакции с этой категорией станут без категории.')) {
      return
    }

    try {
      const res = await fetch(`/api/transaction-categories/${id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Ошибка при удалении категории')
    }
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Категории транзакций</h2>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm)
            setEditingId(null)
            setFormData({ name: '', icon: '💰', color: '#10b981', type: 'income' })
          }}
          className="px-4 py-2 bg-[#d6d3ff] hover:bg-purple-700 text-white rounded-xl transition-colors"
        >
          {showAddForm ? 'Отмена' : '+ Добавить категорию'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingId ? 'Редактировать категорию' : 'Новая категория'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-white/50 mb-2 block">Тип</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'income' })}
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    formData.type === 'income'
                      ? 'bg-green-500/20 border-green-500/50 text-green-400 border'
                      : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  Доход
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'expense' })}
                  className={`px-4 py-2 rounded-xl transition-colors ${
                    formData.type === 'expense'
                      ? 'bg-red-500/20 border-red-500/50 text-red-400 border'
                      : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  Расход
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-white/50 mb-2 block">Название</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full bg-black/40 border border-[rgba(120,120,128,0.2)] rounded-xl px-4 py-2 text-gray-200"
                placeholder="Например: Зарплата"
              />
            </div>

            <div>
              <label className="text-sm text-white/50 mb-2 block">Иконка</label>
              <div className="grid grid-cols-10 gap-2">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`p-2 text-2xl rounded-lg transition-all ${
                      formData.icon === emoji
                        ? 'bg-[#d6d3ff]/20 border-purple-500/50 border scale-110'
                        : 'bg-[rgba(118,118,128,0.12)] hover:bg-white/[0.08]'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-white/50 mb-2 block">Цвет</label>
              <div className="grid grid-cols-10 gap-2">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition-all ${
                      formData.color === color ? 'ring-2 ring-white scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-[#d6d3ff] hover:bg-purple-700 text-white rounded-xl transition-colors"
              >
                {editingId ? 'Сохранить' : 'Создать'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setFormData({ name: '', icon: '💰', color: '#10b981', type: 'income' })
                    setShowAddForm(false)
                  }}
                  className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] text-white rounded-xl transition-colors"
                >
                  Отмена
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Income Categories */}
      <div>
        <h3 className="text-lg font-semibold text-green-400 mb-3">Доходы</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {incomeCategories.map(category => (
            <div
              key={category.id}
              className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: category.color + '20', border: `1px solid ${category.color}50` }}
                >
                  {category.icon}
                </div>
                <span className="text-white font-medium">{category.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-white/50 hover:text-[#d6d3ff] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-white/50 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Categories */}
      <div>
        <h3 className="text-lg font-semibold text-red-400 mb-3">Расходы</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {expenseCategories.map(category => (
            <div
              key={category.id}
              className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: category.color + '20', border: `1px solid ${category.color}50` }}
                >
                  {category.icon}
                </div>
                <span className="text-white font-medium">{category.name}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-white/50 hover:text-[#d6d3ff] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-white/50 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
