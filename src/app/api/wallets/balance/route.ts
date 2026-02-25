import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWalletBalance } from '@/lib/tron/balance'

// GET - получить баланс кошелька
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    const balance = await getWalletBalance(address)

    return NextResponse.json({
      success: true,
      data: balance,
    })
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    )
  }
}
