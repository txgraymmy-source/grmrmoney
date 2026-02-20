'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OnlyMonsterSettings() {
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchCurrentApiKey()
  }, [])

  const fetchCurrentApiKey = async () => {
    try {
      const response = await fetch('/api/settings/onlymonster')
      if (response.ok) {
        const { data } = await response.json()
        setHasApiKey(data.hasApiKey)
        setMaskedKey(data.maskedKey)
      }
    } catch (error) {
      console.error('Error fetching API key:', error)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/settings/onlymonster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save API key')
      }

      setSuccess('API ключ успешно сохранен!')
      setApiKey('')
      await fetchCurrentApiKey()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить API ключ OnlyMonster? Это отключит синхронизацию с OnlyFans.')) {
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/settings/onlymonster', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete API key')
      }

      setSuccess('API ключ удален')
      setHasApiKey(false)
      setMaskedKey(null)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleTestConnection = async () => {
    setError('')
    setSuccess('')
    setTesting(true)

    try {
      const response = await fetch('/api/onlymonster/accounts?limit=1')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Connection test failed')
      }

      setSuccess(`✓ Подключение успешно! Найдено аккаунтов: ${data.data.accounts.length}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">OnlyMonster API</CardTitle>
        <CardDescription className="text-gray-400">
          Интеграция с OnlyMonster для синхронизации OnlyFans транзакций
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasApiKey ? (
          <div className="space-y-4">
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-400 mb-2">
                ✓ API ключ настроен
              </p>
              <p className="text-sm text-gray-400 font-mono">
                {maskedKey}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing}
                className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              >
                {testing ? 'Проверка...' : 'Проверить подключение'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Удалить
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="om-api-key" className="text-gray-300">
                API ключ OnlyMonster
              </Label>
              <Input
                id="om-api-key"
                type="password"
                placeholder="Введите API ключ"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                disabled={loading}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <p className="text-xs text-gray-400">
                Получите API ключ в настройках OnlyMonster
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить API ключ'}
            </Button>
          </form>
        )}

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

        <div className="border-t border-gray-800 pt-4 mt-4">
          <h4 className="text-sm font-semibold mb-2 text-white">Как получить API ключ:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
            <li>Войдите в свой аккаунт OnlyMonster</li>
            <li>Перейдите в настройки API</li>
            <li>Создайте новый API ключ</li>
            <li>Скопируйте и вставьте его сюда</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}
