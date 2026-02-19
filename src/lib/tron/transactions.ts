import { createTronWeb, USDT_CONTRACT_ADDRESS, usdtToSmallestUnit } from './tronweb'

export interface SendUSDTParams {
  fromPrivateKey: string
  toAddress: string
  amount: number  // Сумма в USDT (не в минимальных единицах)
}

export interface TransactionResult {
  success: boolean
  txHash?: string
  error?: string
  fee?: number  // Fee in TRX
}

export interface FeeEstimate {
  energyFee: number  // in SUN
  bandwidthFee: number  // in SUN
  totalFee: number  // in TRX
  estimatedEnergy: number
  estimatedBandwidth: number
}

/**
 * Оценивает комиссию для отправки USDT
 */
export async function estimateUSDTFee(
  fromAddress: string,
  toAddress: string,
  amount: number
): Promise<FeeEstimate | null> {
  try {
    const tronWeb = createTronWeb()

    // Get contract
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS)
    const amountInSmallestUnit = usdtToSmallestUnit(amount)

    // Trigger constant contract to estimate
    const parameter = [
      { type: 'address', value: toAddress },
      { type: 'uint256', value: amountInSmallestUnit }
    ]

    const options = {
      feeLimit: 100_000_000,
      callValue: 0,
      from: fromAddress,
    }

    // Get transaction to estimate energy
    const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
      USDT_CONTRACT_ADDRESS,
      'transfer(address,uint256)',
      options,
      parameter,
      fromAddress
    )

    // Estimate energy (typical USDT transfer uses ~14,000-65,000 energy)
    // For estimation, we'll use a conservative 65,000
    const estimatedEnergy = 65000

    // Energy fee: 420 SUN per energy unit (as of current TRON pricing)
    const energyFee = estimatedEnergy * 420

    // Bandwidth fee: ~345 bytes * 1000 SUN per byte = 345,000 SUN
    const estimatedBandwidth = 345
    const bandwidthFee = estimatedBandwidth * 1000

    // Total in SUN, convert to TRX (1 TRX = 1,000,000 SUN)
    const totalFeeSUN = energyFee + bandwidthFee
    const totalFeeTRX = totalFeeSUN / 1_000_000

    return {
      energyFee,
      bandwidthFee,
      totalFee: totalFeeTRX,
      estimatedEnergy,
      estimatedBandwidth,
    }
  } catch (error) {
    console.error('Error estimating fee:', error)
    return null
  }
}

/**
 * Отправляет USDT с одного адреса на другой
 * ВАЖНО: Эта функция должна вызываться ТОЛЬКО на клиенте с расшифрованным приватным ключом!
 */
export async function sendUSDT({
  fromPrivateKey,
  toAddress,
  amount,
}: SendUSDTParams): Promise<TransactionResult> {
  try {
    // Создаем TronWeb с приватным ключом
    const tronWeb = createTronWeb(fromPrivateKey)

    // Проверяем валидность адреса получателя
    if (!tronWeb.isAddress(toAddress)) {
      return {
        success: false,
        error: 'Invalid recipient address',
      }
    }

    // Получаем контракт USDT
    const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS)

    // Конвертируем сумму в минимальные единицы (6 decimals)
    const amountInSmallestUnit = usdtToSmallestUnit(amount)

    // Отправляем транзакцию
    const result = await contract.transfer(
      toAddress,
      amountInSmallestUnit
    ).send({
      feeLimit: 100_000_000, // 100 TRX fee limit
    })

    return {
      success: true,
      txHash: result,
    }
  } catch (error: any) {
    console.error('Error sending USDT:', error)

    return {
      success: false,
      error: error.message || 'Failed to send transaction',
    }
  }
}

/**
 * Получает информацию о транзакции по хешу
 */
export async function getTransactionInfo(txHash: string) {
  try {
    const tronWeb = createTronWeb()
    const txInfo = await tronWeb.trx.getTransactionInfo(txHash)
    return txInfo
  } catch (error) {
    console.error('Error fetching transaction info:', error)
    return null
  }
}

/**
 * Проверяет статус транзакции
 */
export async function getTransactionStatus(txHash: string): Promise<'confirmed' | 'pending' | 'failed'> {
  try {
    const tronWeb = createTronWeb()
    const tx = await tronWeb.trx.getTransaction(txHash)

    if (!tx) return 'pending'

    const txInfo = await tronWeb.trx.getTransactionInfo(txHash)

    if (txInfo && txInfo.receipt) {
      return txInfo.receipt.result === 'SUCCESS' ? 'confirmed' : 'failed'
    }

    return 'pending'
  } catch (error) {
    console.error('Error checking transaction status:', error)
    return 'pending'
  }
}
