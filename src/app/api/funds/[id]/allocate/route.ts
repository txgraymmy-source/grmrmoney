import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const allocateSchema = z.object({
  transactionId: z.string(),
  amount: z.string(),
  txHash: z.string().optional(), // blockchain tx hash after transfer
  status: z.enum(['confirmed', 'completed', 'rejected']),
})

// POST - create or update allocation for a fund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fundId } = await params
    const body = await request.json()
    const { transactionId, amount, txHash, status } = allocateSchema.parse(body)

    // Verify fund belongs to user
    const fund = await prisma.fund.findUnique({ where: { id: fundId } })
    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    // Verify transaction belongs to user
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })
    if (!transaction || transaction.userId !== session.user.id) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Find or create allocation
    const existing = await prisma.fundAllocation.findFirst({
      where: { fundId, transactionId },
    })
    const allocation = existing
      ? await prisma.fundAllocation.update({
          where: { id: existing.id },
          data: { status, ...(txHash ? { txHash } : {}) },
        })
      : await prisma.fundAllocation.create({
          data: { fundId, transactionId, amount, status, ...(txHash ? { txHash } : {}) },
        })

    // Create notification if allocation completed
    if (status === 'completed') {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          type: 'fund_transfer',
          title: 'Перевод в фонд выполнен',
          message: `Переведено ${amount} USDT в фонд "${fund.name}"`,
          data: { fundId, transactionId, amount, txHash },
        },
      })
    }

    return NextResponse.json({ success: true, data: allocation })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating allocation:', error)
    return NextResponse.json({ error: 'Failed to create allocation' }, { status: 500 })
  }
}

// GET - list allocations for a fund
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: fundId } = await params

    const fund = await prisma.fund.findUnique({ where: { id: fundId } })
    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    const allocations = await prisma.fundAllocation.findMany({
      where: { fundId },
      include: { transaction: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: allocations })
  } catch (error) {
    console.error('Error fetching allocations:', error)
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 })
  }
}
