'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { generateWallet } from '@/lib/tron/wallet'
import { encryptData, decryptData } from '@/lib/crypto/encryption'
import { useWallet } from '@/contexts/WalletContext'

interface CreateWalletFlowProps {
  categoryName: string
  categoryDescription?: string
}

export default function CreateWalletFlow({ categoryName, categoryDescription }: CreateWalletFlowProps) {
  const router = useRouter()
  const { addWallet, isUnlocked, masterPassword: savedMasterPassword } = useWallet()
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
  const [hasExistingWallets, setHasExistingWallets] = useState(false)
  const [isCheckingWallets, setIsCheckingWallets] = useState(true)

  // Проверяем, есть ли уже кошельки у пользователя
  useEffect(() => {
    const checkExistingWallets = async () => {
      try {
        const response = await fetch('/api/wallets/encrypted')
        if (response.ok) {
          const { data } = await response.json()
          setHasExistingWallets(data && data.length > 0)
        }
      } catch (error) {
        console.error('Error checking existing wallets:', error)
      } finally {
        setIsCheckingWallets(false)
      }
    }

    checkExistingWallets()
  }, [])

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

    // Если кошельки разблокированы и есть сохраненный пароль - пропускаем шаг с паролем
    if (isUnlocked && savedMasterPassword && hasExistingWallets) {
      setMasterPassword(savedMasterPassword)
      handleCreateCategoryWithPassword(savedMasterPassword)
    } else {
      setStep('password')
    }
  }

  const handleCreateCategoryWithPassword = async (password: string) => {
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

      const encryptedData = encryptData(dataToEncrypt, password)

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

  const handleCreateCategory = async () => {
    setError('')

    // Проверяем минимальную длину пароля
    if (masterPassword.length < 8) {
      setError('Пароль должен содержать минимум 8 символов')
      return
    }

    // Проверяем совпадение паролей только для первого кошелька
    if (!hasExistingWallets && masterPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    await handleCreateCategoryWithPassword(masterPassword)
  }

  if (step === 'form') {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Создание кошелька</CardTitle>
          <CardDescription className="text-gray-400">
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
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-gray-400">Генерируем безопасный кошелек...</p>
        </CardContent>
      </Card>
    )
  }

  if (step === 'seed-phrase' && walletData) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">⚠️ Важно: Сохраните Seed Phrase</CardTitle>
          <CardDescription className="text-gray-400">
            Эти 12 слов — единственный способ восстановить доступ к кошельку.
            <br />
            <strong className="text-destructive">Они больше никогда не будут показаны!</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-black/40 border-2 border-yellow-500/50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-3">
              {walletData.mnemonic.split(' ').map((word, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                  <span className="font-mono font-semibold text-yellow-400">{word}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2 text-white">Адрес кошелька:</p>
            <p className="font-mono break-all text-gray-300">{walletData.address}</p>
          </div>

          <div className="flex items-start space-x-2 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="confirm-seed"
              checked={seedPhraseConfirmed}
              onChange={(e) => setSeedPhraseConfirmed(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="confirm-seed" className="text-sm cursor-pointer text-gray-300">
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
    const isFirstWallet = !hasExistingWallets

    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            {isFirstWallet ? 'Установите мастер-пароль' : 'Введите мастер-пароль'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isFirstWallet ? (
              <>
                Этот пароль будет использоваться для шифрования всех ваших кошельков.
                <br />
                <strong className="text-yellow-500">Используйте надёжный пароль и запомните его!</strong>
              </>
            ) : (
              <>
                Введите ваш существующий мастер-пароль для шифрования нового кошелька.
                <br />
                <span className="text-yellow-500">Используется тот же пароль, что и для других кошельков.</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-password" className="text-gray-300">
              {isFirstWallet ? 'Мастер-пароль' : 'Ваш мастер-пароль'}
            </Label>
            <Input
              id="master-password"
              type="password"
              placeholder={isFirstWallet ? "Минимум 8 символов" : "Введите пароль"}
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          {isFirstWallet && (
            <div className="space-y-2">
              <Label htmlFor="confirm-master-password" className="text-gray-300">Подтвердите пароль</Label>
              <Input
                id="confirm-master-password"
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          )}

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
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
          <p className="text-gray-400">Сохраняем направление и кошелек...</p>
        </CardContent>
      </Card>
    )
  }

  return null
}
