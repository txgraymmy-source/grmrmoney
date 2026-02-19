'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import CategoryManagerWrapper from '@/components/settings/CategoryManagerWrapper'
import ChangeMasterPassword from '@/components/settings/ChangeMasterPassword'

export default function SettingsPage() {
  const { isUnlocked, unlock, lock, wallets } = useWallet()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await unlock(password)

      if (!success) {
        setError('Неверный мастер-пароль')
      } else {
        setPassword('')
      }
    } catch (error) {
      setError('Ошибка при разблокировке кошельков')
    } finally {
      setLoading(false)
    }
  }

  const handleLock = () => {
    lock()
    setPassword('')
    setError('')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Настройки</h1>
        <p className="text-muted-foreground mt-1">
          Управление безопасностью кошельков
        </p>
      </div>

      {/* Wallet Security */}
      <Card>
        <CardHeader>
          <CardTitle>Безопасность кошельков</CardTitle>
          <CardDescription>
            {isUnlocked
              ? 'Ваши кошельки разблокированы для текущей сессии'
              : 'Разблокируйте кошельки для отправки транзакций'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isUnlocked ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  ✓ Кошельки разблокированы
                </p>
                <p className="text-sm text-green-700">
                  Расшифровано кошельков: {wallets.size}
                </p>
              </div>

              <Button variant="destructive" onClick={handleLock} className="w-full">
                Заблокировать кошельки
              </Button>

              <p className="text-xs text-muted-foreground">
                При блокировке все приватные ключи будут удалены из памяти.
                Вам нужно будет снова ввести мастер-пароль для отправки транзакций.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnlock} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="master-password">Мастер-пароль</Label>
                <Input
                  id="master-password"
                  type="password"
                  placeholder="Введите мастер-пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Пароль, который вы установили при создании первого кошелька
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Разблокировка...' : 'Разблокировать кошельки'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Советы по безопасности</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start">
              <span className="mr-2">🔒</span>
              <span>Используйте надёжный мастер-пароль (минимум 8 символов)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📝</span>
              <span>Храните seed phrase в безопасном месте (бумага, сейф)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🚫</span>
              <span>Никогда не делитесь seed phrase или мастер-паролем</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">💾</span>
              <span>Регулярно делайте backup базы данных</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔐</span>
              <span>Блокируйте кошельки после завершения работы</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Change Master Password */}
      <ChangeMasterPassword />

      {/* Category Management */}
      <Card>
        <CardHeader>
          <CardTitle>Управление категориями</CardTitle>
          <CardDescription>
            Настройте категории для доходов и расходов
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryManagerWrapper />
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Информация об аккаунте</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Сеть TRON:</span>
              <span className="font-medium">
                {process.env.NEXT_PUBLIC_TRON_NETWORK === 'mainnet' ? 'Mainnet' : 'Shasta Testnet'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
