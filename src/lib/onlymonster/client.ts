/**
 * OnlyMonster API Client
 * Документация: https://omapi.onlymonster.ai/docs
 */

const ONLYMONSTER_API_BASE = 'https://omapi.onlymonster.ai'

export interface OnlyMonsterAccount {
  id: number
  platform_account_id: string
  platform: string
  name: string
  email: string
  avatar: string
  username: string
  organisation_id: string
  subscribe_price: number
  subscription_expiration_date: string
}

export interface OnlyMonsterTransaction {
  id: string
  amount: number
  fan: {
    id: string
  }
  type: string
  status: string
  timestamp: string
}

export interface OnlyMonsterChargeback {
  id: string
  amount: number
  fan: {
    id: string
  }
  type: string
  status: string
  chargeback_timestamp: string
  transaction_timestamp: string
}

/**
 * Получить список аккаунтов OnlyFans
 */
export async function getOnlyMonsterAccounts(
  apiKey: string,
  cursor?: string,
  limit: number = 100
): Promise<{
  accounts: OnlyMonsterAccount[]
  nextCursor?: string
}> {
  const url = new URL(`${ONLYMONSTER_API_BASE}/api/v0/accounts`)
  if (cursor) url.searchParams.set('cursor', cursor)
  if (limit) url.searchParams.set('limit', limit.toString())

  const response = await fetch(url.toString(), {
    headers: {
      'x-om-auth-token': apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (response.status === 403) {
      throw new Error('Нет доступа к аккаунтам. Проверьте права организации в OnlyMonster.')
    }
    throw new Error(`OnlyMonster API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return {
    accounts: data.accounts || [],
    nextCursor: data.nextCursor,
  }
}

/**
 * Получить информацию об аккаунте
 */
export async function getOnlyMonsterAccount(
  apiKey: string,
  accountId: string
): Promise<OnlyMonsterAccount> {
  const url = `${ONLYMONSTER_API_BASE}/api/v0/accounts/${accountId}`

  console.log('[OnlyMonster] Fetching account:', {
    url,
    accountId,
    hasApiKey: !!apiKey,
  })

  const response = await fetch(url, {
    headers: {
      'x-om-auth-token': apiKey,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[OnlyMonster] API Error:', {
      status: response.status,
      statusText: response.statusText,
      accountId,
      error: errorText,
    })

    let errorData
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { message: errorText }
    }

    if (response.status === 403) {
      throw new Error(`403: ${errorData.message || 'Нет доступа к аккаунту'}`)
    }
    throw new Error(`OnlyMonster API ${response.status}: ${errorData.message || errorText}`)
  }

  const data = await response.json()
  console.log('[OnlyMonster] Account fetched successfully:', accountId)
  return data.account
}

/**
 * Получить транзакции для OnlyFans аккаунта
 */
export async function getOnlyFansTransactions(
  apiKey: string,
  platformAccountId: string,
  start: string,  // ISO 8601 Zulu
  end: string,    // ISO 8601 Zulu
  cursor?: string,
  limit: number = 100
): Promise<{
  items: OnlyMonsterTransaction[]
  cursor?: string
}> {
  const url = new URL(
    `${ONLYMONSTER_API_BASE}/api/v0/platforms/onlyfans/accounts/${platformAccountId}/transactions`
  )
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)
  if (cursor) url.searchParams.set('cursor', cursor)
  if (limit) url.searchParams.set('limit', limit.toString())

  const response = await fetch(url.toString(), {
    headers: {
      'x-om-auth-token': apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OnlyMonster API error: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Получить chargebacks (возвраты) для OnlyFans аккаунта
 */
export async function getOnlyFansChargebacks(
  apiKey: string,
  platformAccountId: string,
  start: string,
  end: string,
  cursor?: string,
  limit: number = 100
): Promise<{
  items: OnlyMonsterChargeback[]
  cursor?: string
}> {
  const url = new URL(
    `${ONLYMONSTER_API_BASE}/api/v0/platforms/onlyfans/accounts/${platformAccountId}/chargebacks`
  )
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)
  if (cursor) url.searchParams.set('cursor', cursor)
  if (limit) url.searchParams.set('limit', limit.toString())

  const response = await fetch(url.toString(), {
    headers: {
      'x-om-auth-token': apiKey,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OnlyMonster API error: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Проверить валидность API ключа
 */
export async function validateOnlyMonsterApiKey(apiKey: string): Promise<boolean> {
  try {
    await getOnlyMonsterAccounts(apiKey, undefined, 1)
    return true
  } catch (error) {
    return false
  }
}
