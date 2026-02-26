import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createTronWeb } from '@/lib/tron/tronweb'
import { z } from 'zod'

const schema = z.object({
  signedTransaction: z.object({}).passthrough(), // opaque tx object
  contactId: z.string().min(1),
  fromCategoryId: z.string().min(1),
  amount: z.number().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  note: z.string().optional(),
})

/**
 * POST /api/pay/broadcast
 * Receives an already-signed TRON transaction from the client and broadcasts it.
 * No private key or master password ever reaches this endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { signedTransaction, contactId, fromCategoryId, amount, period, note } = schema.parse(body)

    // Validate ownership
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

    const fromAddress = category.walletAddress!
    const toAddress = contact.walletAddress

    // Broadcast to TRON network
    const tronWeb = createTronWeb()
    const result = await tronWeb.trx.sendRawTransaction(signedTransaction)

    const success = !!result?.result
    const txHash: string | undefined = result?.txid

    // Save payment record
    const payment = await prisma.salaryPayment.create({
      data: {
        contactId,
        userId: session.user.id,
        amount: amount.toString(),
        period,
        status: success ? 'completed' : 'failed',
        txHash: txHash ?? null,
        fromAddress,
        note: note ?? null,
      },
    })

    // Save outgoing transaction record
    if (success) {
      await prisma.transaction.create({
        data: {
          fromAddress,
          toAddress,
          amount: amount.toString(),
          type: 'outgoing',
          source: 'manual',
          status: 'confirmed',
          description: `Зарплата: ${contact.walletAddress}`,
          timestamp: new Date(),
          categoryId: fromCategoryId,
          userId: session.user.id,
          txHash: txHash ?? null,
        },
      })
    }

    return NextResponse.json({
      success,
      txHash,
      paymentId: payment.id,
      error: success ? undefined : (result?.message || 'Broadcast failed'),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error broadcasting transaction:', error)
    return NextResponse.json({ error: 'Failed to broadcast transaction' }, { status: 500 })
  }
}
