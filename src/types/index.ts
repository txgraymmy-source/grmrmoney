import { User, Category, Transaction, EncryptedWallet } from '@prisma/client'

// Расширенные типы с relations
export type CategoryWithRelations = Category & {
  user?: User
  transactions?: Transaction[]
  encryptedWallet?: EncryptedWallet | null
}

export type TransactionWithRelations = Transaction & {
  user?: User
  category?: Category | null
}

export type UserWithRelations = User & {
  categories?: Category[]
  transactions?: Transaction[]
}

// Типы для API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Типы для wallet операций
export interface WalletInfo {
  address: string
  balance: {
    usdt: number
    trx: number
  }
}

export interface DecryptedWallet {
  categoryId: string
  address: string
  privateKey: string
  mnemonic: string
}

// Типы для форм
export interface CreateCategoryInput {
  name: string
  description?: string
}

export interface SendTransactionInput {
  fromCategoryId: string
  toAddress: string
  amount: number
  description?: string
}

export interface UpdateTransactionInput {
  description?: string
}

// Типы для контекста кошельков
export interface WalletContextType {
  wallets: Map<string, DecryptedWallet>
  isUnlocked: boolean
  masterPassword: string | null
  unlock: (password: string) => Promise<boolean>
  lock: () => void
  addWallet: (categoryId: string, wallet: DecryptedWallet) => void
  getWallet: (categoryId: string) => DecryptedWallet | undefined
}

// Типы транзакций
export type TransactionType = 'incoming' | 'outgoing'
export type TransactionStatus = 'pending' | 'confirmed' | 'failed'
