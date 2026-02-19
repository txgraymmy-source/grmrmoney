import CryptoJS from 'crypto-js'

/**
 * Шифрует данные с использованием AES-256
 * @param data - данные для шифрования
 * @param password - пароль для шифрования
 * @returns зашифрованная строка
 */
export function encryptData(data: string, password: string): string {
  if (!data || !password) {
    throw new Error('Data and password are required for encryption')
  }

  return CryptoJS.AES.encrypt(data, password).toString()
}

/**
 * Расшифровывает данные, зашифрованные с помощью AES-256
 * @param encryptedData - зашифрованные данные
 * @param password - пароль для расшифровки
 * @returns расшифрованная строка
 */
export function decryptData(encryptedData: string, password: string): string {
  if (!encryptedData || !password) {
    throw new Error('Encrypted data and password are required for decryption')
  }

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)

    if (!decrypted) {
      throw new Error('Decryption failed - invalid password or corrupted data')
    }

    return decrypted
  } catch (error) {
    throw new Error('Decryption failed - invalid password or corrupted data')
  }
}

/**
 * Генерирует случайную соль для дополнительной безопасности
 */
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128 / 8).toString()
}
