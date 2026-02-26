import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createContactSchema = z.object({
  name: z.string().min(1, 'Имя обязательно'),
  walletAddress: z.string().min(1, 'TRON-адрес обязателен'),
  notes: z.string().optional(),
  categoryId: z.string().optional(),
  positionId: z.string().optional(),
  paymentFrequency: z.enum(['monthly', 'twice_monthly', 'biweekly', 'weekly']).optional(),
  paymentDates: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limitParam = request.nextUrl.searchParams.get('limit')
    const take = limitParam ? parseInt(limitParam) : undefined

    const contacts = await prisma.contact.findMany({
      where: { userId: session.user.id },
      include: {
        salaryRules: true,
        category: { select: { id: true, name: true } },
        position: { select: { id: true, name: true, icon: true, color: true } },
        employeeProjects: {
          include: { category: { select: { id: true, name: true } }, salaryRules: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(take ? { take } : {}),
    })

    return NextResponse.json({ success: true, data: contacts })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, walletAddress, notes, categoryId, positionId, paymentFrequency, paymentDates } = createContactSchema.parse(body)

    const contact = await prisma.contact.create({
      data: {
        name,
        walletAddress,
        notes,
        categoryId: categoryId || null,
        positionId: positionId || null,
        paymentFrequency: paymentFrequency || null,
        paymentDates: paymentDates || null,
        userId: session.user.id,
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

    return NextResponse.json({ success: true, data: contact })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
