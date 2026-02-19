import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { wallets } = await request.json()

    if (!Array.isArray(wallets) || wallets.length === 0) {
      return NextResponse.json({ error: 'Invalid wallets data' }, { status: 400 })
    }

    // Update all wallets in a transaction
    await prisma.$transaction(
      wallets.map((wallet) =>
        prisma.encryptedWallet.update({
          where: { id: wallet.id },
          data: { encryptedData: wallet.encryptedData },
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: 'All wallets re-encrypted successfully',
    })
  } catch (error) {
    console.error('Error re-encrypting wallets:', error)
    return NextResponse.json(
      { error: 'Failed to re-encrypt wallets' },
      { status: 500 }
    )
  }
}
