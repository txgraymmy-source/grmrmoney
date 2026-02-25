import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getOnlyMonsterAccount } from '@/lib/onlymonster/client'

const addAccountSchema = z.object({
  platformAccountId: z.string(),
  platform: z.string(),
  username: z.string(),
  name: z.string().optional(),
  avatar: z.string().optional(),
  email: z.string().optional(),
  subscribePrice: z.number().optional(),
  organisationId: z.string().optional(),
})

// GET - получить OnlyFans аккаунты направления
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: categoryId } = await params

    // Проверяем права доступа
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { onlyFansAccounts: true },
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: category.onlyFansAccounts,
    })
  } catch (error) {
    console.error('Error fetching OnlyFans accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch OnlyFans accounts' },
      { status: 500 }
    )
  }
}

// POST - добавить OnlyFans аккаунт к направлению
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: categoryId } = await params
    const body = await request.json()
    const accountData = addAccountSchema.parse(body)

    console.log('[API] Adding OnlyFans account:', {
      categoryId,
      platformAccountId: accountData.platformAccountId,
      username: accountData.username,
      userId: session.user.id,
    })

    // Проверяем права доступа
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { onlyFansAccounts: true },
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Проверяем лимит (максимум 3 аккаунта)
    if (category.onlyFansAccounts.length >= 3) {
      return NextResponse.json(
        { error: 'Максимум 3 OnlyFans аккаунта на направление' },
        { status: 400 }
      )
    }

    // Проверяем, не добавлен ли уже этот аккаунт
    const exists = category.onlyFansAccounts.some(
      (acc) => acc.platformAccountId === accountData.platformAccountId
    )

    if (exists) {
      return NextResponse.json(
        { error: 'Этот аккаунт уже добавлен к направлению' },
        { status: 400 }
      )
    }

    // Создаем запись в БД используя данные из запроса
    // (они уже получены из списка аккаунтов на клиенте)
    const onlyFansAccount = await prisma.onlyFansAccount.create({
      data: {
        categoryId,
        platformAccountId: accountData.platformAccountId,
        platform: accountData.platform,
        username: accountData.username,
        name: accountData.name || null,
        avatar: accountData.avatar || null,
        email: accountData.email || null,
        subscribePrice: accountData.subscribePrice || null,
        organisationId: accountData.organisationId || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: onlyFansAccount,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error adding OnlyFans account:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add OnlyFans account' },
      { status: 500 }
    )
  }
}

// DELETE - удалить OnlyFans аккаунт из направления
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: categoryId } = await params
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      )
    }

    // Проверяем права доступа
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Удаляем аккаунт
    await prisma.onlyFansAccount.delete({
      where: {
        id: accountId,
        categoryId, // Дополнительная проверка
      },
    })

    return NextResponse.json({
      success: true,
      message: 'OnlyFans аккаунт удален',
    })
  } catch (error) {
    console.error('Error deleting OnlyFans account:', error)
    return NextResponse.json(
      { error: 'Failed to delete OnlyFans account' },
      { status: 500 }
    )
  }
}
