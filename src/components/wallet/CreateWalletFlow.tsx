'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { generateWallet } from '@/lib/tron/wallet'
import { encryptData } from '@/lib/crypto/encryption'
import { useWallet } from '@/contexts/WalletContext'

interface CreateWalletFlowProps {
  categoryName: string
  categoryDescription?: string
}

export default function CreateWalletFlow({ categoryName, categoryDescription }: CreateWalletFlowProps) {
  const router = useRouter()
  const { addWallet } = useWallet()
  const [step, setStep] = useState<'form' | 'generating' | 'seed-phrase' | 'password' | 'saving'>('form')
  const [walletData, setWalletData] = useState<{
    mnemonic: string
    privateKey: string
    address: string
  } | null>(null)
  const [seedPhraseConfirmed, setSeedPhraseConfirmed] = useState(false)
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const handleGenerateWallet = async () => {
    setStep('generating')
    setError('')

    try {
      const wallet = await generateWallet()
      setWalletData(wallet)
      setStep('seed-phrase')
    } catch (error) {
      console.error('Error generating wallet:', error)
      setError('Ошибка при генерации кошелька')
      setStep('form')
    }
  }

  const handleSeedPhraseConfirmed = () => {
    if (!seedPhraseConfirmed) {
      setError('Пожалуйста, подтвердите, что вы сохранили seed phrase')
      return
    }
    setStep('password')
  }

  const handleCreateCategory = async () => {
    setError('')

    if (masterPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (masterPassword.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }

    if (!walletData) {
      setError('Данные кошелька не найдены')
      return
    }

    setStep('saving')

    try {
      // 1. Создаём категорию
      const categoryResponse = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription,
          walletAddress: walletData.address,
        }),
      })

      if (!categoryResponse.ok) {
        const data = await categoryResponse.json()
        throw new Error(data.error || 'Failed to create category')
      }

      const { data: category } = await categoryResponse.json()

      // 2. Шифруем данные кошелька
      const dataToEncrypt = JSON.stringify({
        mnemonic: walletData.mnemonic,
        privateKey: walletData.privateKey,
        address: walletData.address,
      })

      const encryptedData = encryptData(dataToEncrypt, masterPassword)

      // 3. Сохраняем зашифрованный кошелек
      const walletResponse = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: category.id,
          encryptedData,
        }),
      })

      if (!walletResponse.ok) {
        throw new Error('Failed to save encrypted wallet')
      }

      // 4. Добавляем расшифрованный кошелек в контекст (для текущей сессии)
      addWallet(category.id, {
        categoryId: category.id,
        address: walletData.address,
        privateKey: walletData.privateKey,
        mnemonic: walletData.mnemonic,
      })

      // 5. Перенаправляем на страницу категории
      router.push(`/dashboard/categories/${category.id}`)
      router.refresh()
    } catch (error: any) {
      console.error('Error creating category:', error)
      setError(error.message || 'Ошибка при создании направления')
      setStep('password')
    }
  }

  if (step === 'form') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Создание кошелька</CardTitle>
          <CardDescription>
            Будет создан новый USDT TRC-20 кошелек для направления "{categoryName}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerateWallet} className="w-full">
            Сгенерировать кошелек
          </Button>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (step === 'generating') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground">Генерируем безопасный кошелек...</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'seed-phrase' && walletData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⚠️ Важно: Сохраните Seed Phrase</CardTitle>
          <CardDescription>
            Эти 12 слов — единственный способ восстановить доступ к кошельку.
            <br />
            <strong className="text-destructive">Они больше никогда не будут показаны!</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-3">
              {walletData.mnemonic.split(' ').map((word, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground w-6">{index + 1}.</span>
                  <span className="font-mono font-semibold">{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">Адрес кошелька:</p>
            <p className="font-mono break-all">{walletData.address}</p>
          </div>

          <div className="flex items-start space-x-2 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="confirm-seed"
              checked={seedPhraseConfirmed}
              onChange={(e) => setSeedPhraseConfirmed(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="confirm-seed" className="text-sm cursor-pointer">
              Я надёжно сохранил(а) seed phrase в безопасном месте и понимаю, что не смогу
              восстановить доступ к кошельку без этих слов.
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleSeedPhraseConfirmed}
            disabled={!seedPhraseConfirmed}
            className="w-full"
          >
            Продолжить
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'password') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Установите мастер-пароль</CardTitle>
          <CardDescription>
            Этот пароль будет использоваться для шифрования ваших кошельков.
            Используйте надёжный пароль и запомните его!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-password">Мастер-пароль</Label>
            <Input
              id="master-password"
              type="password"
              placeholder="Минимум 8 символов"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-master-password">Подтвердите пароль</Label>
            <Input
              id="confirm-master-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button onClick={handleCreateCategory} className="w-full">
            Создать направление
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'saving') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-muted-foreground">Сохраняем направление и кошелек...</p>
        </CardContent>
      </Card>
    )
  }

  return null
}
