import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { validateOnlyMonsterApiKey } from '@/lib/onlymonster/client'

const updateApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API ключ не может быть пустым'),
})

// GET - получить текущий API ключ (маскированный)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onlyMonsterApiKey: true },
    })

    // Маскируем ключ для безопасности
    const maskedKey = user?.onlyMonsterApiKey
      ? `${user.onlyMonsterApiKey.slice(0, 8)}...${user.onlyMonsterApiKey.slice(-4)}`
      : null

    return NextResponse.json({
      success: true,
      data: {
        hasApiKey: !!user?.onlyMonsterApiKey,
        maskedKey,
      },
    })
  } catch (error) {
    console.error('Error fetching OnlyMonster API key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    )
  }
}

// POST - сохранить API ключ
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { apiKey } = updateApiKeySchema.parse(body)

    // Проверяем валидность API ключа
    const isValid = await validateOnlyMonsterApiKey(apiKey)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Неверный API ключ OnlyMonster' },
        { status: 400 }
      )
    }

    // Сохраняем API ключ
    await prisma.user.update({
      where: { id: session.user.id },
      data: { onlyMonsterApiKey: apiKey },
    })

    return NextResponse.json({
      success: true,
      message: 'API ключ успешно сохранен',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error saving OnlyMonster API key:', error)
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

// DELETE - удалить API ключ
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onlyMonsterApiKey: null },
    })

    return NextResponse.json({
      success: true,
      message: 'API ключ удален',
    })
  } catch (error) {
    console.error('Error deleting OnlyMonster API key:', error)
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
