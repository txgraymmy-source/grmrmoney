import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createWalletSchema = z.object({
  categoryId: z.string(),
  encryptedData: z.string(),
})

// POST - сохранить зашифрованный кошелек
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { categoryId, encryptedData } = createWalletSchema.parse(body)

    // Проверяем, принадлежит ли категория пользователю
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Создаём зашифрованный кошелек
    const encryptedWallet = await prisma.encryptedWallet.create({
      data: {
        categoryId,
        encryptedData,
      },
    })

    return NextResponse.json({
      success: true,
      data: encryptedWallet,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating encrypted wallet:', error)
    return NextResponse.json(
      { error: 'Failed to create encrypted wallet' },
      { status: 500 }
    )
  }
}
