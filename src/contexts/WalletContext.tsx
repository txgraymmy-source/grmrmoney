'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { DecryptedWallet, WalletContextType } from '@/types'
import { decryptData } from '@/lib/crypto/encryption'

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallets, setWallets] = useState<Map<string, DecryptedWallet>>(new Map())
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [masterPassword, setMasterPassword] = useState<string | null>(null)

  /**
   * Разблокирует все кошельки пользователя с мастер-паролем
   */
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    try {
      // Получаем все зашифрованные кошельки с сервера
      const response = await fetch('/api/wallets/encrypted')
      if (!response.ok) {
        throw new Error('Failed to fetch encrypted wallets')
      }

      const { data: encryptedWallets } = await response.json()

      if (!encryptedWallets || encryptedWallets.length === 0) {
        setIsUnlocked(true)
        return true
      }

      // Расшифровываем все кошельки
      const decryptedWallets = new Map<string, DecryptedWallet>()

      for (const wallet of encryptedWallets) {
        try {
          const decryptedData = decryptData(wallet.encryptedData, password)

          // Try to parse as JSON (new format)
          let walletData
          try {
            walletData = JSON.parse(decryptedData)
            // Validate JSON structure
            if (!walletData.address || !walletData.privateKey) {
              throw new Error('Invalid wallet data structure')
            }
          } catch (jsonError) {
            // Fallback: treat as old format (plain string)
            // This shouldn't happen with new wallets, but kept for backwards compatibility
            console.warn('Wallet data is not valid JSON, skipping:', wallet.categoryId)
            return false
          }

          decryptedWallets.set(wallet.categoryId, {
            categoryId: wallet.categoryId,
            address: walletData.address,
            privateKey: walletData.privateKey,
            mnemonic: walletData.mnemonic || '',
          })
        } catch (error) {
          console.error('Failed to decrypt wallet:', wallet.categoryId, error)
          // Если хотя бы один кошелек не расшифровался - неверный пароль
          return false
        }
      }

      setWallets(decryptedWallets)
      setIsUnlocked(true)
      setMasterPassword(password) // Сохраняем пароль для создания новых кошельков
      return true
    } catch (error) {
      console.error('Error unlocking wallets:', error)
      return false
    }
  }, [])

  /**
   * Блокирует все кошельки (удаляет из памяти)
   */
  const lock = useCallback(() => {
    setWallets(new Map())
    setIsUnlocked(false)
    setMasterPassword(null) // Очищаем пароль при блокировке
  }, [])

  /**
   * Добавляет новый расшифрованный кошелек в контекст
   */
  const addWallet = useCallback((categoryId: string, wallet: DecryptedWallet) => {
    setWallets(prev => {
      const updated = new Map(prev)
      updated.set(categoryId, wallet)
      return updated
    })
  }, [])

  /**
   * Получает расшифрованный кошелек по ID категории
   */
  const getWallet = useCallback((categoryId: string): DecryptedWallet | undefined => {
    return wallets.get(categoryId)
  }, [wallets])

  return (
    <WalletContext.Provider
      value={{
        wallets,
        isUnlocked,
        masterPassword,
        unlock,
        lock,
        addWallet,
        getWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
