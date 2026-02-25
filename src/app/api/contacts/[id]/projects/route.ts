import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const pairs = await prisma.contactCategory.findMany({
      where: { contactId: id },
      include: {
        category: { select: { id: true, name: true } },
        salaryRules: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: pairs })
  } catch (error) {
    console.error('Error fetching employee projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

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
    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const { categoryId } = await request.json()
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    }

    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const pair = await prisma.contactCategory.create({
      data: { contactId: id, categoryId },
      include: {
        category: { select: { id: true, name: true } },
        salaryRules: true,
      },
    })

    return NextResponse.json({ success: true, data: pair })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Already attached to this project' }, { status: 409 })
    }
    console.error('Error attaching project:', error)
    return NextResponse.json({ error: 'Failed to attach project' }, { status: 500 })
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
    const contact = await prisma.contact.findUnique({ where: { id } })
    if (!contact || contact.userId !== session.user.id) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const categoryId = request.nextUrl.searchParams.get('categoryId')
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
    }

    await prisma.contactCategory.delete({
      where: { contactId_categoryId: { contactId: id, categoryId } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error detaching project:', error)
    return NextResponse.json({ error: 'Failed to detach project' }, { status: 500 })
  }
}
