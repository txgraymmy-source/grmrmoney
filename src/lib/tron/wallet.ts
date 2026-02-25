export interface WalletData {
  mnemonic: string      // 12-word seed phrase
  privateKey: string    // Private key
  address: string       // Public TRON address
}

/**
 * Конвертирует публичный ключ в TRON адрес
 */
async function publicKeyToAddress(publicKeyBytes: Uint8Array): Promise<string> {
  const { sha256 } = await import('@noble/hashes/sha2.js')
  const { keccak_256 } = await import('@noble/hashes/sha3.js')

  // Убираем первый байт (04) из несжатого публичного ключа
  const publicKeyNoPrefix = publicKeyBytes.slice(1)

  // Keccak256 хеш
  const hash = keccak_256(publicKeyNoPrefix)

  // Берем последние 20 байт
  const addressBytes = hash.slice(hash.length - 20)

  // Добавляем префикс 0x41 для TRON
  const addressWithPrefix = new Uint8Array([0x41, ...addressBytes])

  // Base58Check кодирование
  return base58CheckEncode(addressWithPrefix, sha256)
}

/**
 * Base58 алфавит
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Base58Check кодирование (для TRON адресов)
 */
function base58CheckEncode(payload: Uint8Array, sha256Fn: (data: Uint8Array) => Uint8Array): string {
  // Двойной SHA256 для checksum
  const hash1 = sha256Fn(payload)
  const hash2 = sha256Fn(hash1)
  const checksum = hash2.slice(0, 4)

  // Объединяем payload и checksum
  const combined = new Uint8Array([...payload, ...checksum])

  // Base58 кодирование
  let num = BigInt('0x' + Buffer.from(combined).toString('hex'))
  let encoded = ''

  while (num > 0n) {
    const remainder = Number(num % 58n)
    encoded = BASE58_ALPHABET[remainder] + encoded
    num = num / 58n
  }

  // Добавляем '1' для каждого ведущего нулевого байта
  for (let i = 0; i < combined.length && combined[i] === 0; i++) {
    encoded = '1' + encoded
  }

  return encoded
}

/**
 * Генерирует новый TRON кошелек с seed phrase
 * ВАЖНО: Эта функция должна вызываться ТОЛЬКО на клиенте!
 */
export async function generateWallet(): Promise<WalletData> {
  try {
    // Динамические импорты
    const bip39 = await import('bip39')
    const { secp256k1 } = await import('@noble/curves/secp256k1.js')

    // Генерация 12-word mnemonic
    const mnemonic = bip39.generateMnemonic(128)

    // Генерация seed из mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic)

    // Используем первые 32 байта seed как приватный ключ
    const privateKeyBytes = seed.slice(0, 32)
    const privateKey = Buffer.from(privateKeyBytes).toString('hex')

    // Генерируем публичный ключ из приватного
    const publicKey = secp256k1.getPublicKey(privateKeyBytes, false) // false = несжатый формат

    // Конвертируем публичный ключ в TRON адрес
    const address = await publicKeyToAddress(publicKey)

    return {
      mnemonic,
      privateKey,
      address,
    }
  } catch (error) {
    console.error('Error generating wallet:', error)
    throw new Error('Failed to generate wallet: ' + (error as Error).message)
  }
}

/**
 * Восстанавливает кошелек из seed phrase
 */
export async function restoreWalletFromMnemonic(mnemonic: string): Promise<WalletData> {
  try {
    const bip39 = await import('bip39')
    const { secp256k1 } = await import('@noble/curves/secp256k1.js')

    // Проверка валидности mnemonic
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase')
    }

    // Генерация seed из mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic)

    // Приватный ключ
    const privateKeyBytes = seed.slice(0, 32)
    const privateKey = Buffer.from(privateKeyBytes).toString('hex')

    // Публичный ключ
    const publicKey = secp256k1.getPublicKey(privateKeyBytes, false)

    // TRON адрес
    const address = await publicKeyToAddress(publicKey)

    return {
      mnemonic,
      privateKey,
      address,
    }
  } catch (error) {
    console.error('Error restoring wallet:', error)
    throw new Error('Failed to restore wallet: ' + (error as Error).message)
  }
}

/**
 * Получает адрес из приватного ключа
 */
export async function getAddressFromPrivateKey(privateKey: string): Promise<string> {
  try {
    const { secp256k1 } = await import('@noble/curves/secp256k1.js')

    // Конвертируем hex строку в байты
    const privateKeyBytes = Buffer.from(privateKey, 'hex')

    // Генерируем публичный ключ
    const publicKey = secp256k1.getPublicKey(privateKeyBytes, false)

    // Конвертируем в TRON адрес
    return await publicKeyToAddress(publicKey)
  } catch (error) {
    console.error('Error getting address from private key:', error)
    throw new Error('Failed to get address: ' + (error as Error).message)
  }
}
