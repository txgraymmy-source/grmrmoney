'use client'

import { useState, useEffect } from 'react'
import CategoryManager from './CategoryManager'

export default function CategoryManagerWrapper() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      // Seed categories first
      await fetch('/api/transaction-categories/seed', { method: 'POST' })

      // Load categories
      const res = await fetch('/api/transaction-categories')
      const data = await res.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error loading categories:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
        <div className="inline-flex w-12 h-12 border-4 border-gray-700 border-t-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400">Загрузка категорий...</p>
      </div>
    )
  }

  return <CategoryManager initialCategories={categories} />
}
