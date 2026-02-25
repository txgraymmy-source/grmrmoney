'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ManualTransactionFormProps {
  categoryId: string
  onSuccess?: () => void
}

export default function ManualTransactionForm({ categoryId, onSuccess }: ManualTransactionFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    type: 'incoming' as 'incoming' | 'outgoing',
    amount: '',
    description: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Введите корректную сумму')
      }

      const response = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount,
          type: formData.type,
          description: formData.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при создании транзакции')
      }

      // Сбрасываем форму
      setFormData({
        type: 'incoming',
        amount: '',
        description: '',
      })
      setIsOpen(false)

      if (onSuccess) {
        onSuccess()
      } else {
        window.location.reload()
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="secondary"
        onClick={() => setIsOpen(true)}
      >
        ✏️ Ручная транзакция
      </Button>
    )
  }

  return (
    <Card className="bg-[rgba(37,37,37,0.5)] border-[rgba(120,120,128,0.2)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">✏️ Ручная транзакция</CardTitle>
            <CardDescription>Добавить коррекцию баланса вручную</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-white/50 hover:text-white"
          >
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-[12px]">
              {error}
            </div>
          )}

          {/* Type Selection */}
          <div className="space-y-2">
            <Label className="text-white/70">Тип</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'incoming' })}
                className={`p-4 rounded-[14px] border transition-all ${
                  formData.type === 'incoming'
                    ? 'bg-green-500/20 border-green-500 text-green-400'
                    : 'bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white/50 hover:border-[rgba(120,120,128,0.4)]'
                }`}
              >
                <div className="text-2xl mb-1">↓</div>
                <div className="font-semibold">Доход</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'outgoing' })}
                className={`p-4 rounded-[14px] border transition-all ${
                  formData.type === 'outgoing'
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white/50 hover:border-[rgba(120,120,128,0.4)]'
                }`}
              >
                <div className="text-2xl mb-1">↑</div>
                <div className="font-semibold">Расход</div>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white/70">
              Сумма (USDT)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white text-lg"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/70">
              Описание
            </Label>
            <Input
              id="description"
              type="text"
              placeholder="Например: коррекция баланса, возврат средств..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white"
              required
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Создание...' : 'Создать транзакцию'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
