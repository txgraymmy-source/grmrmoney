'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import PayModal from './PayModal'
import { ruleDescription, SalaryRuleInput } from '@/lib/salary'
import { truncateAddress } from '@/lib/utils'

interface Props {
  contact: {
    id: string
    name: string
    walletAddress: string
    category?: { id: string; name: string } | null
    salaryRules: SalaryRuleInput[]
  }
  calculatedAmount: number
  period: string
}

export default function ContactCard({ contact, calculatedAmount, period }: Props) {
  const [showPay, setShowPay] = useState(false)

  return (
    <>
      <div className="bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.2)] rounded-[20px] p-5 hover:border-[rgba(120,120,128,0.35)] transition-colors">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <Link href={`/dashboard/salary/${contact.id}`} className="text-white font-semibold text-[16px] hover:text-[#d6d3ff] transition-colors">
              {contact.name}
            </Link>
            {contact.category && (
              <p className="text-white/40 text-[13px] mt-0.5">
                Проект: {contact.category.name}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[#d6d3ff] font-semibold text-[18px]">
              ≈ {calculatedAmount.toFixed(2)} USDT
            </p>
          </div>
        </div>

        <div className="mb-3">
          {contact.salaryRules.length > 0 ? (
            <p className="text-white/50 text-[13px]">
              {contact.salaryRules.map(r => ruleDescription(r)).join(' + ')}
            </p>
          ) : (
            <p className="text-white/25 text-[13px] italic">Правила не настроены</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="font-mono text-[12px] text-white/30">
            {truncateAddress(contact.walletAddress, 8, 6)}
          </p>
          <Button size="sm" onClick={() => setShowPay(true)}>
            Выплатить →
          </Button>
        </div>
      </div>

      {showPay && (
        <PayModal
          contact={contact}
          suggestedAmount={calculatedAmount}
          period={period}
          onClose={() => setShowPay(false)}
          onSuccess={() => setShowPay(false)}
        />
      )}
    </>
  )
}
