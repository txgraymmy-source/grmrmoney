import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decryptData } from '@/lib/crypto/encryption'
import { sendUSDT } from '@/lib/tron/transactions'
import { z } from 'zod'

const paySchema = z.object({
  amount: z.number().positive('Сумма должна быть положительной'),
  fromCategoryId: z.string().min(1, 'Выберите источник средств'),
  masterPassword: z.string().min(1, 'Требуется мастер-пароль'),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Неверный формат периода'),
  note: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const body = await request.json()
    const { amount, fromCategoryId, masterPassword, period, note } = paySchema.parse(body)

    // Get encrypted wallet for the source category
    const encryptedWallet = await prisma.encryptedWallet.findUnique({
      where: { categoryId: fromCategoryId },
      include: { category: { select: { userId: true, walletAddress: true } } },
    })

    if (!encryptedWallet || encryptedWallet.category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Source wallet not found' }, { status: 404 })
    }

    // Decrypt wallet
    let privateKey: string
    let fromAddress: string
    try {
      const decrypted = decryptData(encryptedWallet.encryptedData, masterPassword)
      const walletData = JSON.parse(decrypted)
      privateKey = walletData.privateKey
      fromAddress = walletData.address
    } catch {
      return NextResponse.json({ error: 'Неверный мастер-пароль' }, { status: 400 })
    }

    // Send USDT
    const result = await sendUSDT({
      fromPrivateKey: privateKey,
      toAddress: contact.walletAddress,
      amount,
    })

    const status = result.success ? 'completed' : 'failed'

    // Create payment record
    const payment = await prisma.salaryPayment.create({
      data: {
        contactId,
        userId: session.user.id,
        amount: amount.toString(),
        period,
        status,
        txHash: result.txHash ?? null,
        fromAddress,
        note: note ?? null,
      },
    })

    // Create outgoing transaction record
    if (result.success) {
      await prisma.transaction.create({
        data: {
          fromAddress,
          toAddress: contact.walletAddress,
          amount: amount.toString(),
          type: 'outgoing',
          source: 'manual',
          status: 'confirmed',
          description: `Зарплата: ${contact.name}`,
          timestamp: new Date(),
          categoryId: fromCategoryId,
          userId: session.user.id,
          txHash: result.txHash ?? null,
        },
      })
    }

    return NextResponse.json({
      success: result.success,
      txHash: result.txHash,
      paymentId: payment.id,
      error: result.error,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error processing payment:', error)
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 })
  }
}
