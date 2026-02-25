'use client'

import { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UnlockWalletModalProps {
  isOpen: boolean
  onClose: () => void
  onUnlock: () => void
}

export default function UnlockWalletModal({ isOpen, onClose, onUnlock }: UnlockWalletModalProps) {
  const { unlock } = useWallet()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await unlock(password)

      if (!success) {
        setError('Неверный мастер-пароль')
      } else {
        setPassword('')
        onUnlock()
        onClose()
      }
    } catch (error) {
      setError('Ошибка при разблокировке')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Разблокировать кошельки</h2>
        <p className="text-white/50 text-sm mb-6">
          Введите мастер-пароль для отправки транзакций
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-[14px]">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="master-password" className="text-white/70">Мастер-пароль</Label>
            <Input
              id="master-password"
              type="password"
              placeholder="Введите мастер-пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white placeholder:text-white/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Разблокировка...' : 'Разблокировать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
