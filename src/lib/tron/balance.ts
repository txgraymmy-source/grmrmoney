import { USDT_CONTRACT_ADDRESS, smallestUnitToUsdt } from './tronweb'

// Настройки сети
const TRON_NETWORK = process.env.TRON_NETWORK || 'mainnet'
const TRON_GRID_API = TRON_NETWORK === 'mainnet'
  ? 'https://api.trongrid.io'
  : 'https://api.shasta.trongrid.io'

/**
 * Конвертирует TRON адрес в hex формат без TronWeb
 */
function addressToHex(address: string): string {
  const bs58 = require('bs58')

  // Декодируем base58 адрес (bs58 экспортирует decode напрямую)
  const decoded = bs58.default ? bs58.default.decode(address) : bs58.decode(address)

  // Убираем последние 4 байта (checksum)
  const hexAddress = Buffer.from(decoded.slice(0, -4)).toString('hex')

  // Убираем префикс 41 и возвращаем
  return hexAddress.slice(2)
}

/**
 * Получает баланс USDT для адреса через TronGrid API
 */
export async function getUSDTBalance(address: string): Promise<number> {
  try {
    // Конвертируем адрес в hex и форматируем для balanceOf параметра
    let hexAddress = addressToHex(address)
    if (hexAddress.startsWith('0x')) {
      hexAddress = hexAddress.slice(2)
    }
    const parameter = hexAddress.padStart(64, '0')

    const response = await fetch(
      `${TRON_GRID_API}/wallet/triggerconstantcontract`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner_address: address,
          contract_address: USDT_CONTRACT_ADDRESS,
          function_selector: 'balanceOf(address)',
          parameter: parameter,
          visible: true,
        }),
      }
    )

    const data = await response.json()

    if (data.constant_result && data.constant_result[0]) {
      const balance = parseInt(data.constant_result[0], 16)
      return smallestUnitToUsdt(balance)
    }

    return 0
  } catch (error) {
    console.error('Error fetching USDT balance:', error)
    return 0
  }
}

/**
 * Получает баланс TRX для адреса через TronGrid API
 */
export async function getTRXBalance(address: string): Promise<number> {
  try {
    const response = await fetch(
      `${TRON_GRID_API}/v1/accounts/${address}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const data = await response.json()

    if (data.data && data.data[0] && data.data[0].balance) {
      // Баланс возвращается в SUN, конвертируем в TRX
      return data.data[0].balance / 1_000_000
    }

    return 0
  } catch (error) {
    console.error('Error fetching TRX balance:', error)
    return 0
  }
}

/**
 * Получает полную информацию о балансе (USDT + TRX)
 */
export async function getWalletBalance(address: string): Promise<{
  usdt: number
  trx: number
}> {
  const [usdt, trx] = await Promise.all([
    getUSDTBalance(address),
    getTRXBalance(address),
  ])

  return { usdt, trx }
}
