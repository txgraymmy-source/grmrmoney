import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createTronWeb, USDT_CONTRACT_ADDRESS, usdtToSmallestUnit } from '@/lib/tron/tronweb'
import { z } from 'zod'

const schema = z.object({
  fromCategoryId: z.string().min(1),
  toAddress: z.string().min(1),
  amount: z.number().positive(),
  contactId: z.string().min(1),
})

/**
 * POST /api/pay/build
 * Builds an unsigned USDT TRC-20 transaction.
 * Does NOT touch private keys — only needs the sender's public address.
 * The client will sign it locally and send to /api/pay/broadcast.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fromCategoryId, toAddress, amount, contactId } = schema.parse(body)

    // Validate ownership of source fund and recipient contact
    const [category, contact] = await Promise.all([
      prisma.category.findUnique({
        where: { id: fromCategoryId },
        select: { walletAddress: true, userId: true },
      }),
      prisma.contact.findUnique({
        where: { id: contactId },
        select: { walletAddress: true, userId: true },
      }),
    ])

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Source fund not found' }, { status: 404 })
    }
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const fromAddress = category.walletAddress
    if (!fromAddress) {
      return NextResponse.json({ error: 'Fund has no wallet' }, { status: 400 })
    }

    // Build unsigned transaction (no private key needed for this step)
    const tronWeb = createTronWeb()

    if (!tronWeb.isAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 })
    }

    const amountUnits = usdtToSmallestUnit(amount)

    const { transaction } = await tronWeb.transactionBuilder.triggerSmartContract(
      USDT_CONTRACT_ADDRESS,
      'transfer(address,uint256)',
      { feeLimit: 100_000_000, callValue: 0, from: fromAddress },
      [
        { type: 'address', value: toAddress },
        { type: 'uint256', value: amountUnits },
      ],
      fromAddress
    )

    return NextResponse.json({
      success: true,
      unsignedTransaction: transaction,
      fromAddress,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error building transaction:', error)
    return NextResponse.json({ error: 'Failed to build transaction' }, { status: 500 })
  }
}
