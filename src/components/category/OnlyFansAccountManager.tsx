'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Trash2, ExternalLink } from 'lucide-react'

interface OnlyFansAccount {
  id: string
  platformAccountId: string
  username: string
  name: string | null
  avatar: string | null
  subscribePrice: number | null
  lastSyncAt: string | null
}

interface OnlyMonsterAccount {
  id: number
  platform_account_id: string
  username: string
  name: string
  avatar: string
  subscribe_price: number
}

interface Props {
  categoryId: string
}

export default function OnlyFansAccountManager({ categoryId }: Props) {
  const [accounts, setAccounts] = useState<OnlyFansAccount[]>([])
  const [availableAccounts, setAvailableAccounts] = useState<OnlyMonsterAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showSelector, setShowSelector] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [categoryId])

  const fetchAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/categories/${categoryId}/onlyfans-accounts`)
      if (response.ok) {
        const { data } = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/onlymonster/accounts')
      if (response.ok) {
        const { data } = await response.json()
        // Фильтруем уже добавленные
        const added = new Set(accounts.map((a) => a.platformAccountId))
        setAvailableAccounts(
          data.accounts.filter((a: OnlyMonsterAccount) => !added.has(a.platform_account_id))
        )
        setShowSelector(true)
      } else {
        const { error: errorMsg } = await response.json()
        setError(errorMsg || 'Не удалось загрузить аккаунты')
      }
    } catch (error) {
      setError('Ошибка при загрузке аккаунтов')
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (platformAccountId: string) => {
    try {
      setAdding(true)
      setError('')

      const response = await fetch(`/api/categories/${categoryId}/onlyfans-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platformAccountId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add account')
      }

      setShowSelector(false)
      await fetchAccounts()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveAccount = async (accountId: string) => {
    if (!confirm('Удалить этот OnlyFans аккаунт из направления?')) {
      return
    }

    try {
      const response = await fetch(
        `/api/categories/${categoryId}/onlyfans-accounts?accountId=${accountId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        throw new Error('Failed to remove account')
      }

      await fetchAccounts()
    } catch (error) {
      setError('Ошибка при удалении аккаунта')
    }
  }

  if (loading && accounts.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">OnlyFans Аккаунты</CardTitle>
            <CardDescription className="text-gray-400">
              До 3х аккаунтов на направление
            </CardDescription>
          </div>
          {accounts.length < 3 && !showSelector && (
            <Button
              onClick={fetchAvailableAccounts}
              size="sm"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Текущие аккаунты */}
        {accounts.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">Нет добавленных OnlyFans аккаунтов</p>
            <p className="text-xs mt-1">Добавьте аккаунты для синхронизации транзакций</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  {account.avatar && (
                    <img
                      src={account.avatar}
                      alt={account.username}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-white">@{account.username}</p>
                    {account.name && (
                      <p className="text-sm text-gray-400">{account.name}</p>
                    )}
                    {account.subscribePrice && (
                      <p className="text-xs text-gray-500">${account.subscribePrice}/месяц</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAccount(account.id)}
                  className="text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Селектор доступных аккаунтов */}
        {showSelector && (
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white">Выберите аккаунт:</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSelector(false)}
                className="text-gray-400 hover:text-white"
              >
                Отмена
              </Button>
            </div>

            {availableAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Нет доступных аккаунтов для добавления
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableAccounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleAddAccount(account.platform_account_id)}
                    disabled={adding}
                    className="w-full flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-blue-500 hover:bg-gray-800 transition-colors text-left disabled:opacity-50"
                  >
                    {account.avatar && (
                      <img
                        src={account.avatar}
                        alt={account.username}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white">@{account.username}</p>
                      <p className="text-sm text-gray-400">{account.name}</p>
                    </div>
                    <Plus className="h-4 w-4 text-blue-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
