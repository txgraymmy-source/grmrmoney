import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - получить зашифрованные кошельки пользователя
// ?categoryId=xxx  → вернуть один конкретный кошелёк
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    // Single wallet fetch
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { encryptedWallet: true },
      })

      if (!category || category.userId !== session.user.id) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (!category.encryptedWallet) {
        return NextResponse.json({ error: 'No wallet for this fund' }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: { categoryId: category.id, encryptedData: category.encryptedWallet.encryptedData },
      })
    }

    // All wallets
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      include: { encryptedWallet: true },
    })

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
