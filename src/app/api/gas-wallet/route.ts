import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// GET — вернуть газ-кошелёк юзера (или null если не создан)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gasWallet = await prisma.gasWallet.findUnique({
      where: { userId: session.user.id },
      select: { walletAddress: true, createdAt: true },
    })

    return NextResponse.json({ success: true, data: gasWallet })
  } catch (error) {
    console.error('Error fetching gas wallet:', error)
    return NextResponse.json({ error: 'Failed to fetch gas wallet' }, { status: 500 })
  }
}

const createSchema = z.object({
  walletAddress: z.string().min(1),
  encryptedData: z.string().min(1),
})

// POST — сохранить газ-кошелёк (создаётся один раз)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { walletAddress, encryptedData } = createSchema.parse(body)

    // Запрещаем создавать второй раз
    const existing = await prisma.gasWallet.findUnique({ where: { userId: session.user.id } })
    if (existing) {
      return NextResponse.json({ error: 'Gas wallet already exists' }, { status: 400 })
    }

    const gasWallet = await prisma.gasWallet.create({
      data: { userId: session.user.id, walletAddress, encryptedData },
    })

    return NextResponse.json({ success: true, data: { walletAddress: gasWallet.walletAddress } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating gas wallet:', error)
    return NextResponse.json({ error: 'Failed to create gas wallet' }, { status: 500 })
  }
}

// DELETE — удалить газ-кошелёк (для пересоздания)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.gasWallet.deleteMany({ where: { userId: session.user.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting gas wallet:', error)
    return NextResponse.json({ error: 'Failed to delete gas wallet' }, { status: 500 })
  }
}

// PUT — вернуть зашифрованные данные для распределения
export async function PUT() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const gasWallet = await prisma.gasWallet.findUnique({
      where: { userId: session.user.id },
      select: { encryptedData: true },
    })

    if (!gasWallet) {
      return NextResponse.json({ error: 'Gas wallet not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: { encryptedData: gasWallet.encryptedData } })
  } catch (error) {
    console.error('Error fetching gas wallet encrypted data:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
