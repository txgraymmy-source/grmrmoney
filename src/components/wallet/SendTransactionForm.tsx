'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWallet } from '@/contexts/WalletContext'
import { sendUSDT, estimateUSDTFee, type FeeEstimate } from '@/lib/tron/transactions'
import { getTRXBalance } from '@/lib/tron/balance'
import { isValidTronAddress } from '@/lib/tron/tronweb'
import UnlockWalletModal from './UnlockWalletModal'

interface SendTransactionFormProps {
  categoryId: string
  categoryName: string
}

export default function SendTransactionForm({ categoryId, categoryName }: SendTransactionFormProps) {
  const router = useRouter()
  const { getWallet, isUnlocked } = useWallet()
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [formData, setFormData] = useState({
    toAddress: '',
    amount: '',
    recipientName: '',
    purpose: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null)
  const [estimatingFee, setEstimatingFee] = useState(false)
  const [trxBalance, setTrxBalance] = useState<number | null>(null)

  // Estimate fee when amount or address changes
  useEffect(() => {
    const estimateFee = async () => {
      if (!formData.toAddress || !formData.amount || !isValidTronAddress(formData.toAddress)) {
        setFeeEstimate(null)
        return
      }

      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        setFeeEstimate(null)
        return
      }

      const wallet = getWallet(categoryId)
      if (!wallet) {
        return
      }

      setEstimatingFee(true)

      // Get TRX balance and fee estimate in parallel
      const [estimate, balance] = await Promise.all([
        estimateUSDTFee(wallet.address, formData.toAddress, amount),
        getTRXBalance(wallet.address)
      ])

      setFeeEstimate(estimate)
      setTrxBalance(balance)
      setEstimatingFee(false)
    }

    const debounceTimer = setTimeout(estimateFee, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.toAddress, formData.amount, categoryId, getWallet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isUnlocked) {
      setShowUnlockModal(true)
      return
    }

    const wallet = getWallet(categoryId)
    if (!wallet) {
      setError('Кошелек не найден. Попробуйте разблокировать снова.')
      setShowUnlockModal(true)
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

      await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txHash: result.txHash,
          categoryId,
          recipientName: formData.recipientName,
          purpose: formData.purpose,
          notes: formData.notes,
        }),
      })

      setSuccess(`Транзакция отправлена! Hash: ${result.txHash}`)
      setFormData({
        toAddress: '',
        amount: '',
        recipientName: '',
        purpose: '',
        notes: '',
      })

      // Redirect back to wallet page after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/categories/${categoryId}`)
      }, 2000)
    } catch (error: any) {
      console.error('Error sending transaction:', error)
      setError(error.message || 'Ошибка при отправке транзакции')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Отправить USDT</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-sm text-green-400 break-all">
              {success}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Адрес получателя *</label>
            <input
              type="text"
              placeholder="TRON адрес (T...)"
              value={formData.toAddress}
              onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
              required
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 font-mono text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Имя получателя</label>
            <input
              type="text"
              placeholder="Например: Мария Иванова"
              value={formData.recipientName}
              onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Сумма USDT *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50 text-lg font-semibold"
            />
          </div>

          {/* Fee Estimate */}
          {estimatingFee && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
              <p className="text-xs text-blue-400">
                ⏳ Расчёт комиссии...
              </p>
            </div>
          )}

          {feeEstimate && !estimatingFee && (
            <>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Комиссия сети (примерно):</span>
                  <span className="text-purple-400 font-semibold">~{feeEstimate.totalFee.toFixed(4)} TRX</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Energy: {feeEstimate.estimatedEnergy.toLocaleString()}</span>
                  <span>Bandwidth: {feeEstimate.estimatedBandwidth}</span>
                </div>
                {trxBalance !== null && (
                  <div className="flex justify-between text-xs pt-1 border-t border-purple-500/20">
                    <span className="text-gray-400">Ваш баланс TRX:</span>
                    <span className="text-gray-300">{trxBalance.toFixed(4)} TRX</span>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  Реальная комиссия может отличаться в зависимости от ресурсов аккаунта
                </p>
              </div>

              {/* Low TRX balance warning */}
              {trxBalance !== null && trxBalance < feeEstimate.totalFee && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                  <p className="text-xs text-yellow-400">
                    ⚠️ <strong>Внимание:</strong> У вас может быть недостаточно TRX для оплаты комиссии.
                    Пополните баланс TRX или используйте энергию/bandwidth для снижения комиссии.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Назначение платежа</label>
            <input
              type="text"
              placeholder="Например: Оплата за фотосессию"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">Заметки</label>
            <input
              type="text"
              placeholder="Дополнительная информация"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={loading}
              className="w-full bg-black/40 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-gray-200 placeholder:text-gray-600 focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl px-4 py-3 font-semibold text-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Отправка...' : 'Отправить USDT'}
          </button>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-xs text-yellow-400">
              ⚠️ Убедитесь, что адрес получателя корректен. Транзакции необратимы.
            </p>
          </div>
        </form>
      </div>

      <UnlockWalletModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        onUnlock={() => {
          setTimeout(() => handleSubmit(new Event('submit') as any), 100)
        }}
      />
    </>
  )
}
