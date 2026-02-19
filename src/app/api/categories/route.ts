import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  walletAddress: z.string().min(1, 'Адрес кошелька обязателен'),
})

// GET - получить все категории пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      include: {
        encryptedWallet: true,
        transactions: {
          orderBy: { timestamp: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST - создать новую категорию
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, walletAddress } = createCategorySchema.parse(body)

    // Проверяем, не существует ли уже кошелек с таким адресом
    const existingWallet = await prisma.category.findUnique({
      where: { walletAddress },
    })

    if (existingWallet) {
      return NextResponse.json(
        { error: 'Кошелек с таким адресом уже существует' },
        { status: 400 }
      )
    }

    // Создаём категорию
    const category = await prisma.category.create({
      data: {
        name,
        description,
        walletAddress,
        userId: session.user.id,
      },
      include: {
        encryptedWallet: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: category,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
