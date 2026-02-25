import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createFundSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  walletAddress: z.string().min(1, 'Адрес кошелька обязателен'),
  targetPercent: z.number().min(0).max(100),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limitParam = request.nextUrl.searchParams.get('limit')
    const take = limitParam ? parseInt(limitParam) : undefined

    const funds = await prisma.fund.findMany({
      where: { userId: session.user.id },
      include: {
        allocations: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { updatedAt: 'desc' },
      ...(take ? { take } : {}),
    })

    return NextResponse.json({ success: true, data: funds })
  } catch (error) {
    console.error('Error fetching funds:', error)
    return NextResponse.json({ error: 'Failed to fetch funds' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, icon, color, walletAddress, targetPercent } =
      createFundSchema.parse(body)

    // Check if wallet address already exists
    const existingFund = await prisma.fund.findUnique({ where: { walletAddress } })
    if (existingFund) {
      return NextResponse.json(
        { error: 'Кошелек с таким адресом уже существует' },
        { status: 400 }
      )
    }

    const fund = await prisma.fund.create({
      data: {
        name,
        description,
        icon,
        color,
        walletAddress,
        targetPercent,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true, data: fund })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating fund:', error)
    return NextResponse.json({ error: 'Failed to create fund' }, { status: 500 })
  }
}
