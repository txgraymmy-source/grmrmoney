import { createTronWeb, USDT_CONTRACT_ADDRESS, smallestUnitToUsdt } from './tronweb'

export interface TronTransaction {
  txHash: string
  from: string
  to: string
  amount: number  // В USDT
  timestamp: number
  blockNumber: number
  type: 'incoming' | 'outgoing'
}

/**
 * Получает TRC20 транзакции для адреса
 */
export async function getUSDTTransactions(
  address: string,
  options: {
    limit?: number
    minTimestamp?: number
  } = {}
): Promise<TronTransaction[]> {
  const { limit = 20, minTimestamp = 0 } = options

  try {
    const url = new URL('https://api.trongrid.io/v1/accounts/' + address + '/transactions/trc20')
    url.searchParams.append('limit', limit.toString())
    url.searchParams.append('contract_address', USDT_CONTRACT_ADDRESS)

    if (minTimestamp > 0) {
      url.searchParams.append('min_timestamp', minTimestamp.toString())
    }

    const response = await fetch(url.toString(), {
      headers: process.env.TRON_GRID_API_KEY
        ? { 'TRON-PRO-API-KEY': process.env.TRON_GRID_API_KEY }
        : {},
    })

    if (!response.ok) {
      throw new Error(`TronGrid API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      return []
    }

    // Преобразуем транзакции в наш формат
    const transactions: TronTransaction[] = data.data.map((tx: any) => ({
      txHash: tx.transaction_id,
      from: tx.from,
      to: tx.to,
      amount: smallestUnitToUsdt(tx.value),
      timestamp: tx.block_timestamp,
      blockNumber: tx.block_number || 0,
      type: tx.to.toLowerCase() === address.toLowerCase() ? 'incoming' : 'outgoing',
    }))

    return transactions
  } catch (error) {
    console.error('Error fetching USDT transactions:', error)
    return []
  }
}

/**
 * Проверяет новые транзакции с момента последней проверки
 */
export async function checkNewTransactions(
  address: string,
  lastCheckTimestamp: number
): Promise<TronTransaction[]> {
  const transactions = await getUSDTTransactions(address, {
    limit: 50,
    minTimestamp: lastCheckTimestamp,
  })

  // Фильтруем только транзакции новее последней проверки
  return transactions.filter(tx => tx.timestamp > lastCheckTimestamp)
}

/**
 * Получает последние N транзакций для адреса
 */
export async function getRecentTransactions(
  address: string,
  limit: number = 10
): Promise<TronTransaction[]> {
  return getUSDTTransactions(address, { limit })
}
