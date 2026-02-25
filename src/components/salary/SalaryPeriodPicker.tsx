'use client'

import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  value: string
}

export default function SalaryPeriodPicker({ value }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', e.target.value)
    router.push(`/dashboard/salary?${params.toString()}`)
  }

  return (
    <input
      type="month"
      value={value}
      onChange={handleChange}
      className="bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)] [color-scheme:dark]"
    />
  )
}
