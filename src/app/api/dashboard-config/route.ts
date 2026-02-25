import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DEFAULT_WIDGETS = [
  { type: 'stat_cards',       enabled: true, order: 0 },
  { type: 'project_bar',      enabled: true, order: 1 },
  { type: 'of_line',          enabled: true, order: 2 },
  { type: 'income_table',     enabled: true, order: 3 },
  { type: 'fund_overview',    enabled: true, order: 4 },
  { type: 'categories_list',  enabled: true, order: 5 },
  { type: 'transactions_list', enabled: true, order: 6 },
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: session.user.id },
    })

    if (!config) {
      return NextResponse.json({ success: true, data: { widgets: DEFAULT_WIDGETS } })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Error fetching dashboard config:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { widgets } = body

    if (!Array.isArray(widgets)) {
      return NextResponse.json({ error: 'widgets must be an array' }, { status: 400 })
    }

    const config = await prisma.dashboardConfig.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, widgets },
      update: { widgets },
    })

    return NextResponse.json({ success: true, data: config })
  } catch (error) {
    console.error('Error saving dashboard config:', error)
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
