// USDT TRC-20 контракты для разных сетей
const USDT_MAINNET = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const USDT_SHASTA = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs'

// Настройки сети
const TRON_NETWORK = process.env.TRON_NETWORK || 'mainnet'
const FULL_NODE = TRON_NETWORK === 'mainnet'
  ? 'https://api.trongrid.io'
  : 'https://api.shasta.trongrid.io'

// Экспортируем правильный адрес контракта в зависимости от сети
export const USDT_CONTRACT_ADDRESS = TRON_NETWORK === 'mainnet'
  ? USDT_MAINNET
  : USDT_SHASTA

/**
 * Создает экземпляр TronWeb для чтения данных (без приватного ключа)
 */
export function createTronWeb(privateKey?: string) {
  // Используем require для избежания проблем с webpack
  const TronWeb = require('tronweb')

  return new TronWeb({
    fullHost: FULL_NODE,
    headers: process.env.TRON_GRID_API_KEY
      ? { 'TRON-PRO-API-KEY': process.env.TRON_GRID_API_KEY }
      : {},
    privateKey,
  })
}

/**
 * Проверяет валидность TRON адреса
 */
export function isValidTronAddress(address: string): boolean {
  try {
    const tronWeb = createTronWeb()
    return tronWeb.isAddress(address)
  } catch {
    return false
  }
}

/**
 * Конвертирует SUN в TRX (1 TRX = 1,000,000 SUN)
 */
export function sunToTrx(sun: number | string): number {
  return Number(sun) / 1_000_000
}

/**
 * Конвертирует TRX в SUN
 */
export function trxToSun(trx: number | string): number {
  return Number(trx) * 1_000_000
}

/**
 * Конвертирует USDT в минимальные единицы (6 decimals)
 */
export function usdtToSmallestUnit(usdt: number | string): number {
  return Number(usdt) * 1_000_000
}

/**
 * Конвертирует минимальные единицы в USDT
 */
export function smallestUnitToUsdt(amount: number | string): number {
  return Number(amount) / 1_000_000
}
