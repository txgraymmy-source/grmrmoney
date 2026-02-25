import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.transactionCategory.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    console.error('Error fetching transaction categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, icon, color, type } = await request.json()

    if (!name || !icon || !color || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const category = await prisma.transactionCategory.create({
      data: {
        name,
        icon,
        color,
        type,
        userId: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: category,
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
