'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Category { id: string; name: string }
interface Fund { id: string; name: string; icon?: string | null }

interface Props {
  categories: Category[]
  funds: Fund[]
}

const PERIOD_LABELS: Record<string, string> = {
  '7': '7 дней', '14': '14 дней', '30': '30 дней', 'all': 'Всё время', 'custom': 'Период',
}

export default function DashboardFilterBar({ categories, funds }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [fundSearch, setFundSearch] = useState('')

  // null = all selected (param absent), '' = none selected, 'ids' = specific
  const rawCats = searchParams.get('categories')
  const rawFunds = searchParams.get('funds')

  const appliedPeriod = searchParams.get('period') || '7'
  const appliedDateFrom = searchParams.get('dateFrom') || ''
  const appliedDateTo = searchParams.get('dateTo') || ''
  const allCatsSelected = rawCats === null
  const appliedCats = rawCats ? rawCats.split(',').filter(Boolean) : []
  const allFundsSelected = rawFunds === null
  const appliedFunds = rawFunds ? rawFunds.split(',').filter(Boolean) : []

  // Local (pending) state inside dropdown
  const [period, setPeriod] = useState(appliedPeriod)
  const [dateFrom, setDateFrom] = useState(appliedDateFrom)
  const [dateTo, setDateTo] = useState(appliedDateTo)
  const [selCats, setSelCats] = useState<Set<string>>(new Set())
  const [selFunds, setSelFunds] = useState<Set<string>>(new Set())

  const handleOpen = () => {
    setPeriod(appliedPeriod)
    setDateFrom(appliedDateFrom)
    setDateTo(appliedDateTo)
    setSelCats(allCatsSelected ? new Set(categories.map(c => c.id)) : new Set(appliedCats))
    setSelFunds(allFundsSelected ? new Set(funds.map(f => f.id)) : new Set(appliedFunds))
    setCatSearch('')
    setFundSearch('')
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const apply = () => {
    const params = new URLSearchParams()
    params.set('period', period)
    if (period === 'custom') {
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    }
    // Only omit param when ALL are selected (= no filter). Empty string = none selected.
    if (selCats.size < categories.length) {
      params.set('categories', [...selCats].join(','))
    }
    if (selFunds.size < funds.length) {
      params.set('funds', [...selFunds].join(','))
    }
    router.push(`/dashboard?${params.toString()}`)
    setOpen(false)
  }

  const reset = () => { router.push('/dashboard'); setOpen(false) }

  // Button label
  const periodLabel = appliedPeriod === 'custom' && appliedDateFrom && appliedDateTo
    ? `${appliedDateFrom} – ${appliedDateTo}`
    : PERIOD_LABELS[appliedPeriod] || '7 дней'

  const hasCustomFilter = !allCatsSelected || !allFundsSelected || appliedPeriod !== '7'
  const activeCatCount = allCatsSelected ? categories.length : appliedCats.length
  const activeFundCount = allFundsSelected ? funds.length : appliedFunds.length

  const toggleCat = (id: string) => setSelCats(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleFund = (id: string) => setSelFunds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const visibleCats = catSearch
    ? categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()))
    : categories
  const visibleFunds = fundSearch
    ? funds.filter(f => f.name.toLowerCase().includes(fundSearch.toLowerCase()))
    : funds

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className={`flex items-center gap-2 h-[46px] px-5 rounded-[14px] border text-[15px] font-medium transition-all ${
          hasCustomFilter
            ? 'border-[#d6d3ff]/30 bg-[#d6d3ff]/[0.08] text-[#d6d3ff]'
            : 'border-[rgba(120,120,128,0.2)] bg-[rgba(118,118,128,0.08)] text-white/50 hover:text-white hover:border-[rgba(120,120,128,0.35)]'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{periodLabel}</span>
        {(activeCatCount < categories.length || activeFundCount < funds.length) && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#d6d3ff] flex-shrink-0" />
        )}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[310px] rounded-[18px] border border-[rgba(120,120,128,0.2)] bg-[#17171a] shadow-2xl z-50 overflow-hidden">

          {/* Period */}
          <div className="p-4 border-b border-[rgba(120,120,128,0.1)]">
            <p className="text-[11px] text-white/35 uppercase tracking-wide mb-2.5">Период</p>
            <div className="flex flex-wrap gap-1.5">
              {[['7','7 дней'],['14','14 дней'],['30','30 дней'],['all','Всё время'],['custom','Свой']].map(([v, l]) => (
                <button key={v} onClick={() => setPeriod(v)}
                  className={`h-7 px-3 rounded-[8px] text-[12px] font-medium transition-all ${
                    period === v ? 'bg-[#d6d3ff] text-[#090909]' : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex gap-2 mt-2.5 items-center">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="flex-1 h-8 px-2.5 rounded-[8px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[12px] focus:outline-none focus:border-[#d6d3ff]/40"/>
                <span className="text-white/25 text-[11px]">—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="flex-1 h-8 px-2.5 rounded-[8px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[12px] focus:outline-none focus:border-[#d6d3ff]/40"/>
              </div>
            )}
          </div>

          {/* Projects */}
          {categories.length > 0 && (
            <div className="p-4 border-b border-[rgba(120,120,128,0.1)]">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] text-white/35 uppercase tracking-wide">Проекты</p>
                <button onClick={() => setSelCats(selCats.size === categories.length ? new Set() : new Set(categories.map(c => c.id)))}
                  className="text-[11px] text-[#d6d3ff]/60 hover:text-[#d6d3ff] transition-colors">
                  {selCats.size === categories.length ? 'Снять все' : 'Все'}
                </button>
              </div>
              {categories.length > 6 && (
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  className="w-full h-7 px-2.5 mb-2 rounded-[8px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[12px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40"
                />
              )}
              <div className="space-y-0.5 max-h-[130px] overflow-y-auto">
                {visibleCats.map(c => (
                  <label key={c.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] hover:bg-white/[0.04] cursor-pointer">
                    <Checkbox checked={selCats.has(c.id)} onChange={() => toggleCat(c.id)} />
                    <span className="text-white text-[13px] truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Funds */}
          {funds.length > 0 && (
            <div className="p-4 border-b border-[rgba(120,120,128,0.1)]">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] text-white/35 uppercase tracking-wide">Фонды</p>
                <button onClick={() => setSelFunds(selFunds.size === funds.length ? new Set() : new Set(funds.map(f => f.id)))}
                  className="text-[11px] text-[#d6d3ff]/60 hover:text-[#d6d3ff] transition-colors">
                  {selFunds.size === funds.length ? 'Снять все' : 'Все'}
                </button>
              </div>
              {funds.length > 6 && (
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={fundSearch}
                  onChange={e => setFundSearch(e.target.value)}
                  className="w-full h-7 px-2.5 mb-2 rounded-[8px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[12px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40"
                />
              )}
              <div className="space-y-0.5 max-h-[100px] overflow-y-auto">
                {visibleFunds.map(f => (
                  <label key={f.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-[8px] hover:bg-white/[0.04] cursor-pointer">
                    <Checkbox checked={selFunds.has(f.id)} onChange={() => toggleFund(f.id)} />
                    {f.icon && <span className="text-[12px]">{f.icon}</span>}
                    <span className="text-white text-[13px] truncate">{f.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-3 flex gap-2">
            <button onClick={reset}
              className="flex-1 h-8 rounded-[10px] bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white text-[13px] transition-colors">
              Сбросить
            </button>
            <button onClick={apply}
              className="flex-1 h-8 rounded-[10px] bg-[#d6d3ff] text-[#090909] font-medium text-[13px] hover:opacity-90 transition-opacity">
              Применить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div onClick={onChange}
      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
        checked ? 'border-[#d6d3ff] bg-[#d6d3ff]' : 'border-[rgba(120,120,128,0.3)] bg-transparent'
      }`}>
      {checked && (
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="text-[#090909]">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  )
}
