import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const walletSchema = z.object({
  encryptedData: z.string(),
})

// POST - save encrypted wallet for a fund
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { encryptedData } = walletSchema.parse(body)

    const fund = await prisma.fund.findUnique({ where: { id } })
    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    const encryptedWallet = await prisma.fundEncryptedWallet.upsert({
      where: { fundId: id },
      create: { fundId: id, encryptedData },
      update: { encryptedData },
    })

    return NextResponse.json({ success: true, data: encryptedWallet })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error saving fund wallet:', error)
    return NextResponse.json({ error: 'Failed to save wallet' }, { status: 500 })
  }
}

// GET - get encrypted wallet for a fund
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const fund = await prisma.fund.findUnique({
      where: { id },
      include: { encryptedWallet: true },
    })

    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: fund.encryptedWallet })
  } catch (error) {
    console.error('Error fetching fund wallet:', error)
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 })
  }
}
