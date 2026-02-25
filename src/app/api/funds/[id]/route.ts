import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateFundSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  targetPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
})

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
      include: {
        allocations: {
          include: { transaction: true },
          orderBy: { createdAt: 'desc' },
        },
        encryptedWallet: true,
      },
    })

    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: fund })
  } catch (error) {
    console.error('Error fetching fund:', error)
    return NextResponse.json({ error: 'Failed to fetch fund' }, { status: 500 })
  }
}

export async function PATCH(
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
    const data = updateFundSchema.parse(body)

    const fund = await prisma.fund.findUnique({ where: { id } })
    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    const updated = await prisma.fund.update({ where: { id }, data })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error updating fund:', error)
    return NextResponse.json({ error: 'Failed to update fund' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const fund = await prisma.fund.findUnique({ where: { id } })
    if (!fund || fund.userId !== session.user.id) {
      return NextResponse.json({ error: 'Fund not found' }, { status: 404 })
    }

    await prisma.fund.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting fund:', error)
    return NextResponse.json({ error: 'Failed to delete fund' }, { status: 500 })
  }
}
