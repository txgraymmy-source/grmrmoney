import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  icon: z.string().optional(),
  color: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const positions = await prisma.position.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { employees: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: positions })
  } catch (error) {
    console.error('Error fetching positions:', error)
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, icon, color } = createSchema.parse(body)

    const position = await prisma.position.create({
      data: { name, icon, color, userId: session.user.id },
      include: { _count: { select: { employees: true } } },
    })

    return NextResponse.json({ success: true, data: position })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating position:', error)
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
  }
}
