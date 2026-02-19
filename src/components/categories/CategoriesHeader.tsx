'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ImportWalletModal from '@/components/wallet/ImportWalletModal'

interface CategoriesHeaderProps {
  userId: string
}

export default function CategoriesHeader({ userId }: CategoriesHeaderProps) {
  const [showImportModal, setShowImportModal] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Направления</h1>
          <p className="text-muted-foreground mt-1">
            Управление направлениями работы и кошельками
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowImportModal(true)}
          >
            Импортировать кошелек
          </Button>
          <Link href="/categories/new">
            <Button>Создать направление</Button>
          </Link>
        </div>
      </div>

      <ImportWalletModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        userId={userId}
      />
    </>
  )
}
