import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { transactionCategoryId } = await request.json()

    // Проверяем, что транзакция принадлежит пользователю
    const transaction = await prisma.transaction.findUnique({
      where: { id, userId: session.user.id },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Обновляем категорию
    const updated = await prisma.transaction.update({
      where: { id },
      data: { transactionCategoryId },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Error updating transaction category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}
