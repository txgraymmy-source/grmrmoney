import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - получить все зашифрованные кошельки пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем все категории пользователя с зашифрованными кошельками
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      include: {
        encryptedWallet: true,
      },
    })

    // Фильтруем только те, у которых есть зашифрованный кошелек
    const encryptedWallets = categories
      .filter(cat => cat.encryptedWallet)
      .map(cat => ({
        categoryId: cat.id,
        encryptedData: cat.encryptedWallet!.encryptedData,
      }))

    return NextResponse.json({
      success: true,
      data: encryptedWallets,
    })
  } catch (error) {
    console.error('Error fetching encrypted wallets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch encrypted wallets' },
      { status: 500 }
    )
  }
}
