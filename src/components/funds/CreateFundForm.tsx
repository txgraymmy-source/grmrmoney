'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateWallet } from '@/lib/tron/wallet'
import { encryptData } from '@/lib/crypto/encryption'
import { useWallet } from '@/contexts/WalletContext'

const EMOJI_OPTIONS = ['💰', '🏦', '📈', '🛡️', '💎', '🚀', '⭐', '🔒', '💼', '🌟']
const COLOR_OPTIONS = ['#d6d3ff', '#a3e635', '#fb923c', '#f87171', '#60a5fa', '#34d399', '#fbbf24', '#e879f9']

type Step = 'form' | 'generating' | 'seed-phrase' | 'password' | 'saving'

interface WalletData {
  mnemonic: string
  privateKey: string
  address: string
}

export default function CreateFundForm() {
  const router = useRouter()
  const { isUnlocked, masterPassword: savedMasterPassword } = useWallet()

  const [step, setStep] = useState<Step>('form')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '💰',
    color: '#d6d3ff',
    targetPercent: '10',
  })
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [seedConfirmed, setSeedConfirmed] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [hasExistingWallets, setHasExistingWallets] = useState(false)

  useEffect(() => {
    fetch('/api/wallets/encrypted')
      .then(r => r.json())
      .then(({ data }) => setHasExistingWallets(data && data.length > 0))
      .catch(() => {})
  }, [])

  const handleGenerate = async () => {
    setError('')
    if (!formData.name.trim()) {
      setError('Введите название фонда')
      return
    }
    const percent = parseFloat(formData.targetPercent)
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      setError('Процент должен быть от 0.1 до 100')
      return
    }
    setStep('generating')
    try {
      const wallet = await generateWallet()
      setWalletData(wallet)
      setStep('seed-phrase')
    } catch {
      setError('Ошибка при генерации кошелька')
      setStep('form')
    }
  }

  const handleSeedConfirmed = () => {
    if (!seedConfirmed) {
      setError('Подтвердите, что сохранили seed phrase')
      return
    }
    if (isUnlocked && savedMasterPassword && hasExistingWallets) {
      setMasterPassword(savedMasterPassword)
      saveFund(savedMasterPassword)
    } else {
      setStep('password')
    }
  }

  const saveFund = async (password: string) => {
    if (!walletData) return
    setStep('saving')
    setError('')

    try {
      // 1. Create fund
      const fundRes = await fetch('/api/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon,
          color: formData.color,
          walletAddress: walletData.address,
          targetPercent: parseFloat(formData.targetPercent),
        }),
      })

      if (!fundRes.ok) {
        const d = await fundRes.json()
        throw new Error(d.error || 'Failed to create fund')
      }

      const { data: fund } = await fundRes.json()

      // 2. Encrypt and save wallet
      const encrypted = encryptData(
        JSON.stringify({ mnemonic: walletData.mnemonic, privateKey: walletData.privateKey, address: walletData.address }),
        password
      )

      const walletRes = await fetch(`/api/funds/${fund.id}/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedData: encrypted }),
      })

      if (!walletRes.ok) {
        throw new Error('Failed to save wallet')
      }

      router.push('/dashboard/funds')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании фонда')
      setStep('password')
    }
  }

  const handlePasswordSubmit = async () => {
    setError('')
    if (masterPassword.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }
    if (!hasExistingWallets && masterPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    await saveFund(masterPassword)
  }

  if (step === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin mb-4" />
        <p className="text-white/50">Генерируем кошелёк...</p>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-12 h-12 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin mb-4" />
        <p className="text-white/50">Сохраняем фонд...</p>
      </div>
    )
  }

  if (step === 'seed-phrase' && walletData) {
    return (
      <div className="space-y-6 max-w-lg">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Сохраните Seed Phrase</h2>
          <p className="text-white/50 text-[14px]">
            Эти 12 слов — единственный способ восстановить доступ к кошельку фонда.{' '}
            <span className="text-red-400 font-medium">Они больше не будут показаны!</span>
          </p>
        </div>

        <div className="bg-[rgba(255,200,0,0.05)] border border-yellow-500/30 rounded-[16px] p-5">
          <div className="grid grid-cols-3 gap-3">
            {walletData.mnemonic.split(' ').map((word, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[11px] text-white/30 w-5 text-right">{i + 1}.</span>
                <span className="font-mono text-[13px] text-yellow-300 font-semibold">{word}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[rgba(118,118,128,0.08)] border border-[rgba(120,120,128,0.2)] rounded-[14px] p-4">
          <p className="text-xs text-white/40 mb-1">Адрес кошелька</p>
          <p className="font-mono text-sm text-white/70 break-all">{walletData.address}</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-4 bg-[rgba(118,118,128,0.06)] rounded-[14px] border border-[rgba(120,120,128,0.12)]">
          <input
            type="checkbox"
            checked={seedConfirmed}
            onChange={e => setSeedConfirmed(e.target.checked)}
            className="mt-0.5 accent-[#d6d3ff]"
          />
          <span className="text-sm text-white/70">
            Я сохранил seed phrase в надёжном месте и понимаю, что без него восстановление невозможно.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button onClick={handleSeedConfirmed} disabled={!seedConfirmed} className="w-full">
          Продолжить
        </Button>
      </div>
    )
  }

  if (step === 'password') {
    const isFirst = !hasExistingWallets
    return (
      <div className="space-y-5 max-w-lg">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">
            {isFirst ? 'Установите мастер-пароль' : 'Введите мастер-пароль'}
          </h2>
          <p className="text-white/50 text-[14px]">
            {isFirst
              ? 'Этот пароль шифрует все ваши кошельки. Запомните его!'
              : 'Введите существующий мастер-пароль для шифрования нового кошелька.'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">
              {isFirst ? 'Мастер-пароль' : 'Ваш мастер-пароль'}
            </Label>
            <Input
              type="password"
              placeholder={isFirst ? 'Минимум 8 символов' : 'Введите пароль'}
              value={masterPassword}
              onChange={e => setMasterPassword(e.target.value)}
            />
          </div>
          {isFirst && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Подтвердите пароль</Label>
              <Input
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button onClick={handlePasswordSubmit} className="w-full">Создать фонд</Button>
      </div>
    )
  }

  // Step: form
  return (
    <div className="space-y-6 max-w-lg">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Название фонда</Label>
          <Input
            placeholder="Например: Резервный фонд"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Описание (опционально)</Label>
          <Input
            placeholder="Для чего этот фонд?"
            value={formData.description}
            onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Иконка</Label>
          <div className="flex gap-2 flex-wrap">
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setFormData(p => ({ ...p, icon: emoji }))}
                className={`w-10 h-10 rounded-[10px] text-[20px] flex items-center justify-center transition-colors ${
                  formData.icon === emoji
                    ? 'bg-[#d6d3ff]/20 border border-[#d6d3ff]/50'
                    : 'bg-[rgba(118,118,128,0.12)] hover:bg-[rgba(118,118,128,0.2)]'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Цвет</Label>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map(color => (
              <button
                key={color}
                onClick={() => setFormData(p => ({ ...p, color }))}
                className={`w-8 h-8 rounded-full transition-transform ${
                  formData.color === color ? 'scale-125 ring-2 ring-white/40' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-white/70 text-[13px]">Процент от входящих (%)</Label>
          <Input
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            placeholder="10"
            value={formData.targetPercent}
            onChange={e => setFormData(p => ({ ...p, targetPercent: e.target.value }))}
          />
          <p className="text-[12px] text-white/30">
            При поступлении средств вы получите уведомление распределить {formData.targetPercent}% в этот фонд
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button onClick={handleGenerate} className="w-full">
        Сгенерировать кошелёк и создать фонд
      </Button>
    </div>
  )
}
