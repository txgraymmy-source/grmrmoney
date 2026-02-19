import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST - создать или обновить транзакцию с деталями
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { txHash, categoryId, recipientName, purpose, notes } = await request.json()

    // Проверяем, что категория принадлежит пользователю
    const category = await prisma.category.findUnique({
      where: { id: categoryId, userId: session.user.id },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Находим или создаем транзакцию
    let transaction = await prisma.transaction.findUnique({
      where: { txHash },
    })

    // Формируем описание
    const description = [recipientName, purpose, notes]
      .filter(Boolean)
      .join(' | ')

    if (transaction) {
      // Обновляем существующую
      transaction = await prisma.transaction.update({
        where: { txHash },
        data: {
          description,
          categoryId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    })
  } catch (error) {
    console.error('Error saving transaction:', error)
    return NextResponse.json(
      { error: 'Failed to save transaction' },
      { status: 500 }
    )
  }
}
