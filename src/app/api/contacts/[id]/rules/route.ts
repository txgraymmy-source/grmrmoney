import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const ruleSchema = z.object({
  type: z.enum(['fixed', 'percent']),
  amount: z.number().optional().nullable(),
  percent: z.number().min(0).max(100).optional().nullable(),
  source: z.enum(['of_gross', 'of_net', 'crypto', 'total']).optional().nullable(),
  label: z.string().optional().nullable(),
})

const rulesSchema = z.array(ruleSchema)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contactId } = await params
    const contact = await prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const body = await request.json()
    const rules = rulesSchema.parse(body)

    await prisma.salaryRule.deleteMany({ where: { contactId } })

    if (rules.length > 0) {
      await prisma.salaryRule.createMany({
        data: rules.map(r => ({
          contactId,
          type: r.type,
          amount: r.amount ?? null,
          percent: r.percent ?? null,
          source: r.source ?? null,
          label: r.label ?? null,
        })),
      })
    }

    const updated = await prisma.salaryRule.findMany({ where: { contactId } })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error updating rules:', error)
    return NextResponse.json({ error: 'Failed to update rules' }, { status: 500 })
  }
}
