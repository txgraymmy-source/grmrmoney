'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { sendUSDT } from '@/lib/tron/transactions'
import { isValidTronAddress } from '@/lib/tron/tronweb'

interface SendTransactionProps {
  categoryId: string
  categoryName: string
  onSuccess?: () => void
}

export default function SendTransaction({ categoryId, categoryName, onSuccess }: SendTransactionProps) {
  const { getWallet, isUnlocked } = useWallet()
  const [formData, setFormData] = useState({
    toAddress: '',
    amount: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isUnlocked) {
      setError('Разблокируйте кошельки с помощью мастер-пароля')
      return
    }

    const wallet = getWallet(categoryId)
    if (!wallet) {
      setError('Кошелек не найден. Пожалуйста, разблокируйте кошельки.')
      return
    }

    if (!isValidTronAddress(formData.toAddress)) {
      setError('Неверный TRON адрес')
      return
    }

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Неверная сумма')
      return
    }

    setLoading(true)

    try {
      const result = await sendUSDT({
        fromPrivateKey: wallet.privateKey,
        toAddress: formData.toAddress,
        amount,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to send transaction')
      }

      setSuccess(`Транзакция отправлена! Hash: ${result.txHash}`)
      setFormData({ toAddress: '', amount: '', description: '' })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error sending transaction:', error)
      setError(error.message || 'Ошибка при отправке транзакции')
    } finally {
      setLoading(false)
    }
  }

  if (!isUnlocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Отправить USDT</CardTitle>
          <CardDescription>
            Разблокируйте кошельки для отправки транзакций
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Введите мастер-пароль в настройках для разблокировки кошельков
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Отправить USDT</CardTitle>
        <CardDescription>Из кошелька: {categoryName}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="toAddress">Адрес получателя *</Label>
            <Input
              id="toAddress"
              type="text"
              placeholder="TRON адрес (T...)"
              value={formData.toAddress}
              onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Сумма USDT *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Комментарий (опционально)</Label>
            <Input
              id="description"
              type="text"
              placeholder="Для чего отправка"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Отправка...' : 'Отправить USDT'}
          </Button>

          <p className="text-xs text-muted-foreground">
            ⚠️ Убедитесь, что адрес получателя корректен. Транзакции в блокчейне необратимы.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
