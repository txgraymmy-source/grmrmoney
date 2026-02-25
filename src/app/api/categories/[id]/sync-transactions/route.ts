import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOnlyFansTransactions, getOnlyFansChargebacks } from '@/lib/onlymonster/client'

// POST - синхронизировать транзакции OnlyFans
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: categoryId } = await params
    const body = await request.json()
    const { start, end } = body

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start и end даты обязательны (ISO 8601)' },
        { status: 400 }
      )
    }

    // Проверяем права доступа
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: { onlyFansAccounts: true },
    })

    if (!category || category.userId !== session.user.id) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (category.onlyFansAccounts.length === 0) {
      return NextResponse.json(
        { error: 'Нет добавленных OnlyFans аккаунтов' },
        { status: 400 }
      )
    }

    // Получаем API ключ
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { onlyMonsterApiKey: true },
    })

    if (!user?.onlyMonsterApiKey) {
      return NextResponse.json(
        { error: 'OnlyMonster API ключ не настроен' },
        { status: 400 }
      )
    }

    let totalTransactions = 0
    let totalChargebacks = 0

    // Синхронизируем транзакции для каждого аккаунта
    for (const account of category.onlyFansAccounts) {
      try {
        // Получаем транзакции
        const txResult = await getOnlyFansTransactions(
          user.onlyMonsterApiKey,
          account.platformAccountId,
          start,
          end,
          undefined,
          1000 // Max
        )

        // Сохраняем транзакции
        for (const tx of txResult.items) {
          await prisma.transaction.upsert({
            where: { onlyFansTransactionId: tx.id },
            create: {
              userId: session.user.id,
              categoryId,
              amount: tx.amount.toString(),
              type: 'incoming',
              source: 'onlyfans',
              status: tx.status === 'done' ? 'confirmed' : 'pending',
              timestamp: new Date(tx.timestamp),
              onlyFansTransactionId: tx.id,
              onlyFansFanId: tx.fan.id,
              onlyFansType: tx.type,
              description: `${tx.type} от фана ${tx.fan.id}`,
            },
            update: {
              amount: tx.amount.toString(),
              status: tx.status === 'done' ? 'confirmed' : 'pending',
              timestamp: new Date(tx.timestamp),
            },
          })
          totalTransactions++
        }

        // Получаем chargebacks (возвраты)
        const cbResult = await getOnlyFansChargebacks(
          user.onlyMonsterApiKey,
          account.platformAccountId,
          start,
          end,
          undefined,
          1000
        )

        // Сохраняем chargebacks как отрицательные транзакции
        for (const cb of cbResult.items) {
          await prisma.transaction.upsert({
            where: { onlyFansTransactionId: `chargeback_${cb.id}` },
            create: {
              userId: session.user.id,
              categoryId,
              amount: (-cb.amount).toString(), // Отрицательная сумма
              type: 'outgoing',
              source: 'onlyfans',
              status: 'confirmed',
              timestamp: new Date(cb.chargeback_timestamp),
              onlyFansTransactionId: `chargeback_${cb.id}`,
              onlyFansFanId: cb.fan.id,
              onlyFansType: `Chargeback: ${cb.type}`,
              description: `Возврат средств от фана ${cb.fan.id}`,
            },
            update: {
              amount: (-cb.amount).toString(),
              timestamp: new Date(cb.chargeback_timestamp),
            },
          })
          totalChargebacks++
        }

        // Обновляем lastSyncAt
        await prisma.onlyFansAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        })
      } catch (error: any) {
        console.error(
          `Error syncing account ${account.username}:`,
          error.message
        )
        // Продолжаем с другими аккаунтами
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        transactions: totalTransactions,
        chargebacks: totalChargebacks,
        accounts: category.onlyFansAccounts.length,
      },
      message: `Синхронизировано: ${totalTransactions} транзакций, ${totalChargebacks} возвратов`,
    })
  } catch (error: any) {
    console.error('Error syncing OnlyFans transactions:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}
