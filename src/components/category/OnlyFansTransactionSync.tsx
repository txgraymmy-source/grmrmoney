'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Plus } from 'lucide-react'

interface Props {
  categoryId: string
  onSync?: () => void
}

export default function OnlyFansTransactionSync({ categoryId, onSync }: Props) {
  const [syncing, setSyncing] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualData, setManualData] = useState({
    amount: '',
    type: 'incoming' as 'incoming' | 'outgoing',
    description: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSync = async () => {
    try {
      setSyncing(true)
      setError('')
      setSuccess('')

      // Синхронизируем за последние 30 дней
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)

      const response = await fetch(`/api/categories/${categoryId}/sync-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: start.toISOString(),
          end: end.toISOString(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sync')
      }

      setSuccess(data.message || 'Транзакции синхронизированы')
      onSync?.()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/transactions/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          amount: parseFloat(manualData.amount),
          type: manualData.type,
          description: manualData.description,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add manual transaction')
      }

      setSuccess('Ручная коррекция добавлена')
      setManualData({ amount: '', type: 'incoming', description: '' })
      setShowManual(false)
      onSync?.()
    } catch (error: any) {
      setError(error.message)
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Управление транзакциями</CardTitle>
        <CardDescription className="text-gray-400">
          Синхронизация с OnlyFans и ручные коррекции
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900/20 text-green-400 text-sm p-3 rounded-md border border-green-500/30">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Синхронизация...' : 'Синхронизировать (30 дней)'}
          </Button>

          <Button
            onClick={() => setShowManual(!showManual)}
            variant="outline"
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ручная коррекция
          </Button>
        </div>

        {showManual && (
          <form onSubmit={handleManualAdd} className="border-t border-gray-800 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">Сумма ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualData.amount}
                  onChange={(e) => setManualData({ ...manualData, amount: e.target.value })}
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-gray-300">Тип</Label>
                <select
                  id="type"
                  value={manualData.type}
                  onChange={(e) =>
                    setManualData({
                      ...manualData,
                      type: e.target.value as 'incoming' | 'outgoing',
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                >
                  <option value="incoming">Приход (+)</option>
                  <option value="outgoing">Расход (-)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">Описание</Label>
              <Input
                id="description"
                type="text"
                placeholder="Например: Рефанд от пользователя #123"
                value={manualData.description}
                onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Добавить коррекцию
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowManual(false)}
                className="text-gray-400"
              >
                Отмена
              </Button>
            </div>
          </form>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Синхронизация загружает транзакции и возвраты из OnlyFans за указанный период</p>
          <p>• Ручные коррекции используются для рефандов, не подтянутых автоматически</p>
        </div>
      </CardContent>
    </Card>
  )
}
