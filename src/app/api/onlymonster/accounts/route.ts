import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOnlyMonsterAccounts } from '@/lib/onlymonster/client'

// GET - получить список OnlyFans аккаунтов
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем API ключ пользователя
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onlyMonsterApiKey: true },
    })

    if (!user?.onlyMonsterApiKey) {
      return NextResponse.json(
        { error: 'OnlyMonster API ключ не настроен. Добавьте его в настройках.' },
        { status: 400 }
      )
    }

    // Получаем параметры пагинации
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const limit = parseInt(searchParams.get('limit') || '100')

    // Запрашиваем аккаунты из OnlyMonster
    const result = await getOnlyMonsterAccounts(
      user.onlyMonsterApiKey,
      cursor,
      limit
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    console.error('Error fetching OnlyMonster accounts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}
