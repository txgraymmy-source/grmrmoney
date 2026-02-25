import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DEFAULT_CATEGORIES = [
  // Доходы
  { name: 'Зарплата', icon: '💰', color: '#10b981', type: 'income' },
  { name: 'Фриланс', icon: '💼', color: '#3b82f6', type: 'income' },
  { name: 'Подарки', icon: '🎁', color: '#ec4899', type: 'income' },
  { name: 'Инвестиции', icon: '📈', color: '#8b5cf6', type: 'income' },
  { name: 'Другое', icon: '💵', color: '#6b7280', type: 'income' },

  // Расходы
  { name: 'Продукты', icon: '🛒', color: '#ef4444', type: 'expense' },
  { name: 'Транспорт', icon: '🚗', color: '#f59e0b', type: 'expense' },
  { name: 'Развлечения', icon: '🎮', color: '#a855f7', type: 'expense' },
  { name: 'Здоровье', icon: '⚕️', color: '#14b8a6', type: 'expense' },
  { name: 'Образование', icon: '📚', color: '#3b82f6', type: 'expense' },
  { name: 'Одежда', icon: '👔', color: '#ec4899', type: 'expense' },
  { name: 'Дом', icon: '🏠', color: '#8b5cf6', type: 'expense' },
  { name: 'Кафе/Рестораны', icon: '🍽️', color: '#f97316', type: 'expense' },
  { name: 'Другое', icon: '💸', color: '#6b7280', type: 'expense' },
]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем, есть ли уже категории
    const existingCount = await prisma.transactionCategory.count({
      where: { userId: session.user.id },
    })

    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: 'Categories already exist',
        count: existingCount,
      })
    }

    // Создаем стандартные категории
    await prisma.transactionCategory.createMany({
      data: DEFAULT_CATEGORIES.map(cat => ({
        ...cat,
        userId: session.user.id,
      })),
    })

    return NextResponse.json({
      success: true,
      message: `Created ${DEFAULT_CATEGORIES.length} categories`,
      count: DEFAULT_CATEGORIES.length,
    })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json(
      { error: 'Failed to seed categories' },
      { status: 500 }
    )
  }
}
