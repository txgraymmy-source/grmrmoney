'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import CreateWalletFlow from '@/components/wallet/CreateWalletFlow'

export default function NewCategoryPage() {
  const [showWalletFlow, setShowWalletFlow] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Введите название направления')
      return
    }

    setShowWalletFlow(true)
  }

  if (showWalletFlow) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Создание направления</h1>
          <p className="text-gray-400 mt-1">
            Шаг 2: Создание кошелька
          </p>
        </div>

        <CreateWalletFlow
          categoryName={formData.name}
          categoryDescription={formData.description}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Создание направления</h1>
        <p className="text-gray-400 mt-1">
          Шаг 1: Основная информация
        </p>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Информация о направлении</CardTitle>
          <CardDescription className="text-gray-400">
            Укажите название и описание направления (модель/проект)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Название направления *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Например: Мария - Fashion"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">Описание (опционально)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Краткое описание направления"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full">
              Продолжить к созданию кошелька
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2 text-white">Что произойдёт далее:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
          <li>Будет создан новый USDT TRC-20 кошелек</li>
          <li>Вам будет показана seed phrase (12 слов) — сохраните её!</li>
          <li>Вы установите мастер-пароль для шифрования кошелька</li>
          <li>Направление и кошелек будут сохранены</li>
        </ol>
      </div>
    </div>
  )
}
