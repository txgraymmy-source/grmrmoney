'use client'

import { SessionProvider } from 'next-auth/react'
import { WalletProvider } from '@/contexts/WalletContext'

export default function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </SessionProvider>
  )
}
