'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { decryptData, encryptData } from '@/lib/crypto/encryption'

export default function ChangeMasterPassword() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate new password
    if (formData.newPassword.length < 8) {
      setError('Новый пароль должен содержать минимум 8 символов')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Новые пароли не совпадают')
      return
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('Новый пароль должен отличаться от текущего')
      return
    }

    setLoading(true)

    try {
      // 1. Get all encrypted wallets
      const walletsResponse = await fetch('/api/wallets/encrypted')
      if (!walletsResponse.ok) {
        throw new Error('Failed to fetch wallets')
      }

      const { data: encryptedWallets } = await walletsResponse.json()

      if (!encryptedWallets || encryptedWallets.length === 0) {
        setError('Нет кошельков для перешифровки')
        setLoading(false)
        return
      }

      // 2. Try to decrypt all wallets with current password to verify it
      const reencryptedWallets = []

      for (const wallet of encryptedWallets) {
        try {
          // Decrypt with current password
          const decryptedData = decryptData(wallet.encryptedData, formData.currentPassword)

          // Verify it's valid JSON
          JSON.parse(decryptedData)

          // Re-encrypt with new password
          const newEncryptedData = encryptData(decryptedData, formData.newPassword)

          reencryptedWallets.push({
            id: wallet.id,
            encryptedData: newEncryptedData,
          })
        } catch (error) {
          throw new Error('Неверный текущий мастер-пароль')
        }
      }

      // 3. Update all wallets with new encrypted data
      const updateResponse = await fetch('/api/wallets/reencrypt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallets: reencryptedWallets }),
      })

      if (!updateResponse.ok) {
        throw new Error('Failed to update wallets')
      }

      setSuccess('Мастер-пароль успешно изменен! Используйте новый пароль при следующей разблокировке.')
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Error changing password:', error)
      setError(error.message || 'Ошибка при смене пароля')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Смена мастер-пароля</CardTitle>
        <CardDescription>
          Измените пароль, используемый для шифрования кошельков
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 text-green-600 text-sm p-3 rounded-md">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-password">Текущий мастер-пароль</Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Введите текущий пароль"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Новый мастер-пароль</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Минимум 8 символов"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Подтвердите новый пароль</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Повторите новый пароль"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Изменение пароля...' : 'Изменить мастер-пароль'}
          </Button>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
            <p className="text-xs text-yellow-600">
              ⚠️ <strong>Важно:</strong> После смены пароля вам нужно будет разблокировать кошельки
              заново, используя новый мастер-пароль.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
