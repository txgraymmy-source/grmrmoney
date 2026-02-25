import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createManualTransactionSchema = z.object({
  categoryId: z.string(),
  amount: z.number(),
  type: z.enum(['incoming', 'outgoing']),
  description: z.string(),
  timestamp: z.string().optional(),
})

// POST - создать ручную коррекцию
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createManualTransactionSchema.parse(body)

    // Проверяем права доступа к категории
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Создаем ручную транзакцию
    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        categoryId: data.categoryId,
        amount: data.amount.toString(),
        type: data.type,
        source: 'manual',
        status: 'confirmed',
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
        description: data.description,
        // Blockchain поля оставляем null для manual транзакций
        txHash: null,
        fromAddress: null,
        toAddress: null,
        blockNumber: null,
      },
    })

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Ручная коррекция создана',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating manual transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create manual transaction' },
      { status: 500 }
    )
  }
}

// GET - получить ручные коррекции
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const where: any = {
      userId: session.user.id,
      source: 'manual',
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      data: transactions,
    })
  } catch (error) {
    console.error('Error fetching manual transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch manual transactions' },
      { status: 500 }
    )
  }
}
