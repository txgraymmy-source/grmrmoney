import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getRecentTransactions } from '@/lib/tron/monitor'

// GET - синхронизировать транзакции для всех кошельков пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем все категории пользователя
    const categories = await prisma.category.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        walletAddress: true,
      },
    })

    let totalNewTransactions = 0

    // Для каждой категории проверяем новые транзакции
    for (const category of categories) {
      try {
        // Получаем последние транзакции с блокчейна
        const blockchainTxs = await getRecentTransactions(category.walletAddress, 20)

        // Для каждой транзакции проверяем, есть ли она в БД
        for (const tx of blockchainTxs) {
          const existingTx = await prisma.transaction.findUnique({
            where: { txHash: tx.txHash },
          })

          if (!existingTx) {
            // Создаём новую транзакцию
            await prisma.transaction.create({
              data: {
                txHash: tx.txHash,
                fromAddress: tx.from,
                toAddress: tx.to,
                amount: tx.amount.toString(),
                type: tx.type,
                status: 'confirmed',
                blockNumber: tx.blockNumber,
                timestamp: new Date(tx.timestamp),
                categoryId: category.id,
                userId: session.user.id,
              },
            })

            totalNewTransactions++
          }
        }
      } catch (error) {
        console.error(`Error syncing transactions for category ${category.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        categoriesChecked: categories.length,
        newTransactions: totalNewTransactions,
      },
    })
  } catch (error) {
    console.error('Error syncing transactions:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}

// POST - синхронизировать транзакции для конкретной категории
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId } = await request.json()

    if (!categoryId) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Проверяем, что категория принадлежит пользователю
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
        userId: session.user.id,
      },
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Получаем транзакции с блокчейна
    const blockchainTxs = await getRecentTransactions(category.walletAddress, 50)

    let newTransactions = 0

    for (const tx of blockchainTxs) {
      const existingTx = await prisma.transaction.findUnique({
        where: { txHash: tx.txHash },
      })

      if (!existingTx) {
        await prisma.transaction.create({
          data: {
            txHash: tx.txHash,
            fromAddress: tx.from,
            toAddress: tx.to,
            amount: tx.amount.toString(),
            type: tx.type,
            status: 'confirmed',
            blockNumber: tx.blockNumber,
            timestamp: new Date(tx.timestamp),
            categoryId: category.id,
            userId: session.user.id,
          },
        })

        newTransactions++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        newTransactions,
        totalChecked: blockchainTxs.length,
      },
    })
  } catch (error) {
    console.error('Error syncing category transactions:', error)
    return NextResponse.json(
      { error: 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}
