import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, categoryId } = await params

    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const pair = await prisma.contactCategory.findUnique({
      where: { contactId_categoryId: { contactId: id, categoryId } },
    })
    if (!pair) {
      return NextResponse.json({ error: 'Pair not found' }, { status: 404 })
    }

    const rules = await request.json()
    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: 'rules must be an array' }, { status: 400 })
    }

    await prisma.salaryRule.deleteMany({ where: { contactCategoryId: pair.id } })

    if (rules.length > 0) {
      await prisma.salaryRule.createMany({
        data: rules.map((r: any) => ({
          contactCategoryId: pair.id,
          type: r.type,
          amount: r.amount ?? null,
          percent: r.percent ?? null,
          source: r.source ?? null,
          label: r.label ?? null,
        })),
      })
    }

    const updated = await prisma.contactCategory.findUnique({
      where: { id: pair.id },
      include: {
        category: { select: { id: true, name: true } },
        salaryRules: true,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating rules:', error)
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 })
  }
}
