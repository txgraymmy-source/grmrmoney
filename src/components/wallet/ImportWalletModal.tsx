'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { restoreWalletFromMnemonic, getAddressFromPrivateKey } from '@/lib/tron/wallet'
import { encryptData } from '@/lib/crypto/encryption'

interface ImportWalletModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

type ImportMethod = 'mnemonic' | 'privateKey'

export default function ImportWalletModal({ isOpen, onClose, userId }: ImportWalletModalProps) {
  const router = useRouter()
  const [method, setMethod] = useState<ImportMethod>('mnemonic')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    mnemonic: '',
    privateKey: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let walletData

      if (method === 'mnemonic') {
        // Validate and restore from mnemonic
        const mnemonicWords = formData.mnemonic.trim().split(/\s+/)
        if (mnemonicWords.length !== 12) {
          throw new Error('Seed phrase должен содержать 12 слов')
        }
        walletData = await restoreWalletFromMnemonic(formData.mnemonic.trim())
      } else {
        // Restore from private key
        const privateKey = formData.privateKey.trim()
        if (!/^[0-9a-fA-F]{64}$/.test(privateKey)) {
          throw new Error('Неверный формат приватного ключа')
        }
        const address = await getAddressFromPrivateKey(privateKey)
        walletData = {
          mnemonic: '', // No mnemonic when importing via private key
          privateKey,
          address,
        }
      }

      // Encrypt wallet data as JSON object (same format as generated wallets)
      const walletObject = {
        address: walletData.address,
        privateKey: walletData.privateKey,
        mnemonic: walletData.mnemonic || '', // Empty if imported via private key
      }
      const encryptedData = encryptData(JSON.stringify(walletObject), formData.password)

      // Create category with wallet
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          walletAddress: walletData.address,
          encryptedData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create category')
      }

      const result = await response.json()

      // Check if we got valid data
      if (!result.success || !result.data || !result.data.id) {
        throw new Error('Invalid response from server')
      }

      // Redirect to new category
      router.push(`/dashboard/categories/${result.data.id}`)
    } catch (error: any) {
      console.error('Error importing wallet:', error)
      setError(error.message || 'Ошибка при импорте кошелька')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Импортировать кошелек</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Method Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMethod('mnemonic')}
            className={`flex-1 px-4 py-2 rounded-xl transition-colors ${
              method === 'mnemonic'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Seed Phrase (12 слов)
          </button>
          <button
            type="button"
            onClick={() => setMethod('privateKey')}
            className={`flex-1 px-4 py-2 rounded-xl transition-colors ${
              method === 'privateKey'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Приватный ключ
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Project Info */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Название проекта *</label>
            <input
              type="text"
              placeholder="Например: Модель Мария"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Описание</label>
            <input
              type="text"
              placeholder="Дополнительная информация"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Import Method Fields */}
          {method === 'mnemonic' ? (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Seed Phrase (12 слов) *</label>
              <textarea
                placeholder="word1 word2 word3 ... word12"
                value={formData.mnemonic}
                onChange={(e) => setFormData({ ...formData, mnemonic: e.target.value })}
                required
                disabled={loading}
                rows={3}
                className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Введите 12 слов через пробел
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Приватный ключ *</label>
              <input
                type="password"
                placeholder="64 hex символа"
                value={formData.privateKey}
                onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                required
                disabled={loading}
                className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Hex строка из 64 символов
              </p>
            </div>
          )}

          {/* Master Password */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Мастер-пароль *</label>
            <input
              type="password"
              placeholder="Для шифрования кошелька"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={8}
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Минимум 8 символов. Используйте существующий мастер-пароль или создайте новый.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
            <p className="text-xs text-yellow-400">
              ⚠️ <strong>Важно:</strong> Убедитесь, что вводите корректные данные.
              Неправильный seed phrase или приватный ключ могут привести к потере доступа к средствам.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold text-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Импорт...' : 'Импортировать кошелек'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
