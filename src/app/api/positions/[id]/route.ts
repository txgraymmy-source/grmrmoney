import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
})

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
    const position = await prisma.position.findUnique({ where: { id } })
    if (!position || position.userId !== session.user.id) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    const updated = await prisma.position.update({
      where: { id },
      data,
      include: { _count: { select: { employees: true } } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error updating position:', error)
    return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const position = await prisma.position.findUnique({ where: { id } })
    if (!position || position.userId !== session.user.id) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    await prisma.position.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting position:', error)
    return NextResponse.json({ error: 'Failed to delete position' }, { status: 500 })
  }
}
