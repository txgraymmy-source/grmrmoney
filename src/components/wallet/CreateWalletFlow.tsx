'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { generateWallet } from '@/lib/tron/wallet'
import { encryptData } from '@/lib/crypto/encryption'
import { useWallet } from '@/contexts/WalletContext'

interface CreateWalletFlowProps {
  categoryName: string
  categoryDescription?: string
}

export default function CreateWalletFlow({ categoryName, categoryDescription }: CreateWalletFlowProps) {
  const router = useRouter()
  const { addWallet, isUnlocked, masterPassword: savedMasterPassword } = useWallet()
  const [step, setStep] = useState<'form' | 'generating' | 'seed-phrase' | 'password' | 'saving'>('form')
  const [walletData, setWalletData] = useState<{ mnemonic: string; privateKey: string; address: string } | null>(null)
  const [seedPhraseConfirmed, setSeedPhraseConfirmed] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [hasExistingWallets, setHasExistingWallets] = useState(false)
  const [isCheckingWallets, setIsCheckingWallets] = useState(true)

  useEffect(() => {
    fetch('/api/wallets/encrypted')
      .then(r => r.json())
      .then(({ data }) => setHasExistingWallets(data && data.length > 0))
      .catch(() => {})
      .finally(() => setIsCheckingWallets(false))
  }, [])

  const handleGenerateWallet = async () => {
    setStep('generating')
    setError('')
    try {
      const wallet = await generateWallet()
      setWalletData(wallet)
      setStep('seed-phrase')
    } catch {
      setError('Ошибка при генерации кошелька')
      setStep('form')
    }
  }

  const handleSeedPhraseConfirmed = () => {
    if (!seedPhraseConfirmed) {
      setError('Пожалуйста, подтвердите, что вы сохранили seed phrase')
      return
    }
    if (isUnlocked && savedMasterPassword && hasExistingWallets) {
      setMasterPassword(savedMasterPassword)
      handleCreateCategoryWithPassword(savedMasterPassword)
    } else {
      setStep('password')
    }
  }

  const handleCreateCategoryWithPassword = async (password: string) => {
    if (!walletData) return
    setStep('saving')
    try {
      const categoryResponse = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: categoryName, description: categoryDescription, walletAddress: walletData.address }),
      })
      if (!categoryResponse.ok) {
        const d = await categoryResponse.json()
        throw new Error(d.error || 'Failed to create category')
      }
      const { data: category } = await categoryResponse.json()

      const encryptedData = encryptData(
        JSON.stringify({ mnemonic: walletData.mnemonic, privateKey: walletData.privateKey, address: walletData.address }),
        password
      )

      const walletResponse = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: category.id, encryptedData }),
      })
      if (!walletResponse.ok) throw new Error('Failed to save encrypted wallet')

      addWallet(category.id, { categoryId: category.id, address: walletData.address, privateKey: walletData.privateKey, mnemonic: walletData.mnemonic })
      router.push(`/dashboard/categories/${category.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании направления')
      setStep('password')
    }
  }

  const handleCreateCategory = async () => {
    setError('')
    if (masterPassword.length < 8) { setError('Пароль должен содержать минимум 8 символов'); return }
    if (!hasExistingWallets && masterPassword !== confirmPassword) { setError('Пароли не совпадают'); return }
    await handleCreateCategoryWithPassword(masterPassword)
  }

  if (step === 'form') {
    return (
      <div className="space-y-4">
        <div className="p-5 rounded-[16px] border border-[rgba(120,120,128,0.2)] bg-[rgba(118,118,128,0.06)]">
          <p className="text-white/50 text-[14px]">
            Будет создан новый USDT TRC-20 кошелёк для направления <span className="text-white font-medium">"{categoryName}"</span>
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={handleGenerateWallet} className="w-full">Сгенерировать кошелёк</Button>
      </div>
    )
  }

  if (step === 'generating' || step === 'saving') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-12 h-12 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin mb-4" />
        <p className="text-white/50">{step === 'generating' ? 'Генерируем безопасный кошелёк...' : 'Сохраняем направление и кошелёк...'}</p>
      </div>
    )
  }

  if (step === 'seed-phrase' && walletData) {
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-white font-semibold text-[16px] mb-1">⚠️ Важно: Сохраните Seed Phrase</h3>
          <p className="text-white/50 text-[14px]">
            Эти 12 слов — единственный способ восстановить доступ к кошельку.{' '}
            <span className="text-red-400 font-medium">Они больше никогда не будут показаны!</span>
          </p>
        </div>

        <div className="bg-yellow-500/[0.05] border border-yellow-500/30 rounded-[16px] p-5">
          <div className="grid grid-cols-3 gap-3">
            {walletData.mnemonic.split(' ').map((word, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-[11px] text-white/30 w-5 text-right">{index + 1}.</span>
                <span className="font-mono text-[13px] text-yellow-300 font-semibold">{word}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[rgba(118,118,128,0.08)] border border-[rgba(120,120,128,0.2)] rounded-[14px] p-4">
          <p className="text-xs text-white/40 mb-1">Адрес кошелька</p>
          <p className="font-mono text-[13px] text-white/70 break-all">{walletData.address}</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-4 bg-[rgba(118,118,128,0.06)] rounded-[14px] border border-[rgba(120,120,128,0.12)]">
          <input
            type="checkbox"
            id="confirm-seed"
            checked={seedPhraseConfirmed}
            onChange={e => setSeedPhraseConfirmed(e.target.checked)}
            className="mt-0.5 accent-[#d6d3ff]"
          />
          <span className="text-sm text-white/70">
            Я надёжно сохранил(а) seed phrase в безопасном месте и понимаю, что не смогу восстановить доступ к кошельку без этих слов.
          </span>
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={handleSeedPhraseConfirmed} disabled={!seedPhraseConfirmed} className="w-full">Продолжить</Button>
      </div>
    )
  }

  if (step === 'password') {
    const isFirstWallet = !hasExistingWallets
    return (
      <div className="space-y-5">
        <div>
          <h3 className="text-white font-semibold text-[16px] mb-1">
            {isFirstWallet ? 'Установите мастер-пароль' : 'Введите мастер-пароль'}
          </h3>
          <p className="text-white/50 text-[14px]">
            {isFirstWallet
              ? 'Этот пароль шифрует все ваши кошельки. Запомните его!'
              : 'Введите существующий мастер-пароль для шифрования нового кошелька.'}
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">{isFirstWallet ? 'Мастер-пароль' : 'Ваш мастер-пароль'}</Label>
            <Input
              type="password"
              placeholder={isFirstWallet ? 'Минимум 8 символов' : 'Введите пароль'}
              value={masterPassword}
              onChange={e => setMasterPassword(e.target.value)}
            />
          </div>
          {isFirstWallet && (
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Подтвердите пароль</Label>
              <Input type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button onClick={handleCreateCategory} className="w-full">Создать направление</Button>
      </div>
    )
  }

  return null
}
