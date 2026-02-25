import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateContactSchema = z.object({
  name: z.string().min(1).optional(),
  walletAddress: z.string().min(1).optional(),
  notes: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  positionId: z.string().nullable().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        salaryRules: true,
        category: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, icon: true, color: true } },
        employeeProjects: {
          include: { category: { select: { id: true, name: true } }, salaryRules: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 })
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
    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const body = await request.json()
    const data = updateContactSchema.parse(body)

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.walletAddress !== undefined ? { walletAddress: data.walletAddress } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.positionId !== undefined ? { positionId: data.positionId } : {}),
      },
      include: {
        salaryRules: true,
        category: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, icon: true, color: true } },
        employeeProjects: {
          include: { category: { select: { id: true, name: true } }, salaryRules: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error updating contact:', error)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
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
    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.contact.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
  }
}
