import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    const { name, icon, color, type } = await request.json()

    // Verify ownership
    const existing = await prisma.transactionCategory.findUnique({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const category = await prisma.transactionCategory.update({
      where: { id },
      data: { name, icon, color, type },
    })

    return NextResponse.json({
      success: true,
      data: category,
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
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

    // Verify ownership
    const existing = await prisma.transactionCategory.findUnique({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Delete category (transactions will have transactionCategoryId set to null due to onDelete: SetNull)
    await prisma.transactionCategory.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Category deleted',
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
