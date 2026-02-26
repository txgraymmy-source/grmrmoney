'use client'

import { useState, useEffect, useMemo } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { sendUSDT, sendTRX } from '@/lib/tron/transactions'
import { isValidTronAddress } from '@/lib/tron/tronweb'
import UnlockWalletModal from '@/components/wallet/UnlockWalletModal'

interface Wallet {
  id: string
  name: string
  walletAddress: string
  type: 'category' | 'fund'
  icon?: string | null
}

interface Fund {
  id: string
  name: string
  icon?: string | null
  walletAddress: string
  targetPercent: number
  isActive: boolean
}

interface TxCategory {
  id: string
  name: string
  icon: string
  color: string
  type: string
}

/* ─── Shared: compact wallet selector ───────────────────────────── */
function WalletSelector({
  wallets,
  selectedId,
  onSelect,
  excludeId,
  label,
}: {
  wallets: Wallet[]
  selectedId: string | null
  onSelect: (id: string) => void
  excludeId?: string | null
  label: string
}) {
  const [tab, setTab] = useState<'category' | 'fund'>('category')
  const [search, setSearch] = useState('')

  const counts = {
    category: wallets.filter(w => w.type === 'category').length,
    fund: wallets.filter(w => w.type === 'fund').length,
  }

  const filtered = useMemo(() =>
    wallets.filter(w =>
      w.type === tab &&
      w.id !== excludeId &&
      w.name.toLowerCase().includes(search.toLowerCase())
    )
  , [wallets, tab, search, excludeId])

  return (
    <div>
      <label className="text-[12px] text-white/40 mb-1.5 block">{label}</label>
      <div className="flex gap-1 p-1 rounded-[10px] bg-[rgba(118,118,128,0.1)] mb-1.5">
        {(['category', 'fund'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-6 rounded-[7px] text-[12px] transition-all ${tab === t ? 'bg-white text-[#101012] font-medium' : 'text-white/50 hover:text-white'}`}>
            {t === 'category' ? `Модели (${counts.category})` : `Фонды (${counts.fund})`}
          </button>
        ))}
      </div>
      <div className="relative mb-1.5">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full h-[32px] pl-7 pr-3 rounded-[8px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.15)] text-white text-[12px] placeholder:text-white/30 focus:outline-none focus:border-[rgba(120,120,128,0.3)]"
        />
      </div>
      <div className="space-y-1 max-h-[110px] overflow-y-auto pr-0.5">
        {wallets.length === 0 ? (
          <div className="flex justify-center py-3"><div className="w-4 h-4 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/30 text-[12px] py-2">Ничего не найдено</p>
        ) : filtered.map(w => (
          <button key={w.id} onClick={() => onSelect(w.id)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-[8px] border text-left transition-all ${
              selectedId === w.id
                ? 'border-[#d6d3ff]/40 bg-[#d6d3ff]/[0.06]'
                : 'border-[rgba(120,120,128,0.12)] bg-transparent hover:border-[rgba(120,120,128,0.22)]'
            }`}>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedId === w.id ? 'bg-[#d6d3ff]' : 'bg-white/20'}`} />
            {w.icon && <span className="text-[13px]">{w.icon}</span>}
            <span className="text-white text-[13px] truncate flex-1">{w.name}</span>
            <span className="font-mono text-[10px] text-white/25 flex-shrink-0 hidden sm:block">
              {w.walletAddress.slice(0, 5)}…{w.walletAddress.slice(-4)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── Deposit Modal ──────────────────────────────────────────────── */
function DepositModal({ onClose }: { onClose: () => void }) {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'category' | 'fund'>('category')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/funds').then(r => r.json()),
    ]).then(([cats, funds]) => {
      setWallets([
        ...(cats.data || []).map((c: any) => ({ id: c.id, name: c.name, walletAddress: c.walletAddress, type: 'category' as const })),
        ...(funds.data || []).map((f: any) => ({ id: f.id, name: f.name, walletAddress: f.walletAddress, type: 'fund' as const, icon: f.icon })),
      ])
    })
  }, [])

  const filtered = useMemo(() =>
    wallets.filter(w => w.type === tab && w.name.toLowerCase().includes(search.toLowerCase()))
  , [wallets, tab, search])

  const copy = (addr: string) => {
    navigator.clipboard.writeText(addr)
    setCopied(addr)
    setTimeout(() => setCopied(null), 2000)
  }

  const counts = { category: wallets.filter(w => w.type === 'category').length, fund: wallets.filter(w => w.type === 'fund').length }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-[24px] border border-[rgba(120,120,128,0.2)] bg-[#14141a] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(120,120,128,0.1)]">
          <h2 className="text-white font-semibold text-[17px]">Пополнить</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all text-[20px]">×</button>
        </div>
        <div className="px-5 pt-4 space-y-3">
          <div className="flex gap-1 p-1 rounded-[14px] bg-[rgba(118,118,128,0.1)]">
            {(['category', 'fund'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 h-8 rounded-[10px] text-[13px] font-medium transition-all ${tab === t ? 'bg-white text-[#101012]' : 'text-white/50 hover:text-white'}`}>
                {t === 'category' ? `Модели (${counts.category})` : `Фонды (${counts.fund})`}
              </button>
            ))}
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-[38px] pl-9 pr-3 rounded-[10px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.15)] text-white text-[14px] placeholder:text-white/30 focus:outline-none focus:border-[rgba(120,120,128,0.3)]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1.5 min-h-0">
          {wallets.length === 0 ? (
            <div className="flex items-center justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-white/30 text-[13px] py-6">Ничего не найдено</p>
          ) : filtered.map(w => (
            <div key={w.id} className="flex items-center gap-3 p-3 rounded-[14px] border border-[rgba(120,120,128,0.14)] bg-[rgba(118,118,128,0.04)]">
              {w.icon ? <span className="text-[16px] flex-shrink-0">{w.icon}</span> : <div className="w-6 h-6 rounded-[6px] bg-[rgba(118,118,128,0.2)] flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-white text-[14px] truncate">{w.name}</p>
                <p className="font-mono text-[11px] text-white/30 truncate">{w.walletAddress}</p>
              </div>
              <button onClick={() => copy(w.walletAddress)}
                className={`flex-shrink-0 h-7 px-2.5 rounded-[8px] text-[12px] font-medium transition-all whitespace-nowrap ${
                  copied === w.walletAddress ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white'
                }`}>
                {copied === w.walletAddress ? '✓' : 'Копировать'}
              </button>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-[rgba(120,120,128,0.1)]">
          <button onClick={onClose} className="w-full h-[44px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[14px]">Закрыть</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Send Modal ─────────────────────────────────────────────────── */
function SendModal({ onClose }: { onClose: () => void }) {
  const { getWallet, isUnlocked } = useWallet()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [txCategories, setTxCategories] = useState<TxCategory[]>([])
  const [tab, setTab] = useState<'category' | 'fund'>('category')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showUnlock, setShowUnlock] = useState(false)
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [txCategoryId, setTxCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/funds').then(r => r.json()),
      fetch('/api/transaction-categories').then(r => r.json()),
    ]).then(([cats, funds, txCats]) => {
      const items: Wallet[] = [
        ...(cats.data || []).map((c: any) => ({ id: c.id, name: c.name, walletAddress: c.walletAddress, type: 'category' as const })),
        ...(funds.data || []).map((f: any) => ({ id: f.id, name: f.name, walletAddress: f.walletAddress, type: 'fund' as const, icon: f.icon })),
      ]
      setWallets(items)
      setTxCategories(txCats.data || [])
      const first = items.find(w => w.type === 'category')
      if (first) setSelectedId(first.id)
    })
  }, [])

  const filtered = useMemo(() =>
    wallets.filter(w => w.type === tab && w.name.toLowerCase().includes(search.toLowerCase()))
  , [wallets, tab, search])

  const counts = { category: wallets.filter(w => w.type === 'category').length, fund: wallets.filter(w => w.type === 'fund').length }
  const expenseCategories = txCategories.filter(c => c.type === 'expense')

  const handleSend = async () => {
    setError('')
    if (!selectedId) { setError('Выберите кошелёк отправителя'); return }
    if (!txCategoryId) { setError('Выберите категорию расхода'); return }
    if (!description.trim()) { setError('Введите описание'); return }
    if (!toAddress.trim()) { setError('Введите адрес получателя'); return }
    if (!isValidTronAddress(toAddress)) { setError('Неверный TRON адрес'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Введите корректную сумму'); return }
    if (!isUnlocked) { setShowUnlock(true); return }
    const wallet = getWallet(selectedId)
    if (!wallet) { setShowUnlock(true); return }

    setLoading(true)
    try {
      const result = await sendUSDT({ fromPrivateKey: wallet.privateKey, toAddress, amount: amt })
      if (!result.success) throw new Error(result.error)
      await fetch('/api/transactions/manual', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toAddress, amount: amt.toString(), type: 'outgoing', categoryId: selectedId, transactionCategoryId: txCategoryId, description, txHash: result.txHash }),
      })
      setSuccess(`Готово! Hash: ${result.txHash?.slice(0, 20)}...`)
    } catch (e: any) {
      setError(e.message || 'Ошибка при отправке')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-lg rounded-[24px] border border-[rgba(120,120,128,0.2)] bg-[#14141a] shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(120,120,128,0.1)] flex-shrink-0">
            <h2 className="text-white font-semibold text-[17px]">Отправить USDT</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all text-[20px]">×</button>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-5 py-5 space-y-5">
              {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}
              {success && <div className="p-3 rounded-[12px] bg-green-500/10 border border-green-500/20 text-green-400 text-[13px] break-all">{success}</div>}
              <div>
                <label className="text-[13px] text-white/40 mb-2 block">Отправить с кошелька <span className="text-red-400">*</span></label>
                <div className="flex gap-1 p-1 rounded-[12px] bg-[rgba(118,118,128,0.1)] mb-2">
                  {(['category', 'fund'] as const).map(t => (
                    <button key={t} onClick={() => { setTab(t); setSelectedId(wallets.find(w => w.type === t)?.id ?? null) }}
                      className={`flex-1 h-7 rounded-[8px] text-[13px] transition-all ${tab === t ? 'bg-white text-[#101012] font-medium' : 'text-white/50 hover:text-white'}`}>
                      {t === 'category' ? `Модели (${counts.category})` : `Фонды (${counts.fund})`}
                    </button>
                  ))}
                </div>
                <div className="relative mb-2">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full h-[36px] pl-8 pr-3 rounded-[10px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.15)] text-white text-[13px] placeholder:text-white/30 focus:outline-none"/>
                </div>
                <div className="space-y-1 max-h-[160px] overflow-y-auto pr-0.5">
                  {filtered.map(w => (
                    <button key={w.id} onClick={() => setSelectedId(w.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border text-left transition-all ${selectedId === w.id ? 'border-[#d6d3ff]/40 bg-[#d6d3ff]/[0.06]' : 'border-[rgba(120,120,128,0.14)] hover:border-[rgba(120,120,128,0.25)]'}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedId === w.id ? 'bg-[#d6d3ff]' : 'bg-white/20'}`} />
                      {w.icon && <span className="text-[14px]">{w.icon}</span>}
                      <span className="text-white text-[14px] truncate flex-1">{w.name}</span>
                      <span className="font-mono text-[11px] text-white/30 flex-shrink-0">{w.walletAddress.slice(0, 6)}…{w.walletAddress.slice(-4)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] text-white/40 mb-1.5 block">Адрес получателя <span className="text-red-400">*</span></label>
                <input type="text" placeholder="TRON адрес (T...)" value={toAddress} onChange={e => setToAddress(e.target.value)} disabled={loading}
                  className="w-full h-[44px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.2)] text-white text-[13px] font-mono placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors disabled:opacity-50"/>
              </div>
              <div>
                <label className="text-[13px] text-white/40 mb-1.5 block">Сумма USDT <span className="text-red-400">*</span></label>
                <input type="number" placeholder="0.00" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading}
                  className="w-full h-[44px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.2)] text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors disabled:opacity-50"/>
              </div>
              <div>
                <label className="text-[13px] text-white/40 mb-1.5 block">Категория расхода <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-1.5">
                  {expenseCategories.map(c => (
                    <button key={c.id} onClick={() => setTxCategoryId(c.id)}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-[10px] border text-[13px] transition-all ${txCategoryId === c.id ? 'border-[#d6d3ff]/40 bg-[#d6d3ff]/10 text-white' : 'border-[rgba(120,120,128,0.2)] text-white/50 hover:text-white hover:border-[rgba(120,120,128,0.35)]'}`}>
                      <span>{c.icon}</span><span>{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[13px] text-white/40 mb-1.5 block">Описание <span className="text-red-400">*</span></label>
                <input type="text" placeholder="За что отправка?" value={description} onChange={e => setDescription(e.target.value)} disabled={loading}
                  className="w-full h-[44px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.2)] text-white text-[14px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors disabled:opacity-50"/>
              </div>
              <p className="text-[12px] text-white/25">⚠️ Транзакции в блокчейне необратимы.</p>
            </div>
          </div>
          <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-[rgba(120,120,128,0.08)] flex-shrink-0">
            <button onClick={onClose} className="flex-1 h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[15px]">Отмена</button>
            <button onClick={handleSend} disabled={loading || !!success}
              className="flex-1 h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 disabled:opacity-50 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
              {loading ? 'Отправка...' : 'Отправить'}
            </button>
          </div>
        </div>
      </div>
      {showUnlock && <UnlockWalletModal isOpen={showUnlock} onClose={() => setShowUnlock(false)} onUnlock={() => { setShowUnlock(false); handleSend() }} />}
    </>
  )
}

/* ─── Transfer Modal ─────────────────────────────────────────────── */
type TransferTab = 'manual' | 'auto'

function TransferModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TransferTab>('manual')

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-[24px] border border-[rgba(120,120,128,0.2)] bg-[#14141a] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(120,120,128,0.1)] flex-shrink-0">
          <h2 className="text-white font-semibold text-[17px]">Перевод</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all text-[20px]">×</button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4 pb-0 flex-shrink-0">
          <div className="flex gap-1 p-1 rounded-[14px] bg-[rgba(118,118,128,0.1)]">
            <button onClick={() => setActiveTab('manual')}
              className={`flex-1 h-8 rounded-[10px] text-[13px] font-medium transition-all ${activeTab === 'manual' ? 'bg-white text-[#101012]' : 'text-white/50 hover:text-white'}`}>
              Между кошельками
            </button>
            <button onClick={() => setActiveTab('auto')}
              className={`flex-1 h-8 rounded-[10px] text-[13px] font-medium transition-all ${activeTab === 'auto' ? 'bg-white text-[#101012]' : 'text-white/50 hover:text-white'}`}>
              По фондам
            </button>
          </div>
        </div>

        {activeTab === 'manual'
          ? <ManualTransferBody onClose={onClose} />
          : <AutoDistributeBody onClose={onClose} />
        }
      </div>
    </div>
  )
}

/* ─── Manual Transfer (wallet → wallet) ─────────────────────────── */
function ManualTransferBody({ onClose }: { onClose: () => void }) {
  const { getWallet, isUnlocked, masterPassword } = useWallet()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [fromId, setFromId] = useState<string | null>(null)
  const [toId, setToId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/funds').then(r => r.json()),
    ]).then(([cats, funds]) => {
      setWallets([
        ...(cats.data || []).map((c: any) => ({ id: c.id, name: c.name, walletAddress: c.walletAddress, type: 'category' as const })),
        ...(funds.data || []).map((f: any) => ({ id: f.id, name: f.name, walletAddress: f.walletAddress, type: 'fund' as const, icon: f.icon })),
      ])
    })
  }, [])

  const handleTransfer = async () => {
    setError('')
    if (!fromId || !toId) { setError('Выберите оба кошелька'); return }
    if (fromId === toId) { setError('Источник и назначение совпадают'); return }
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Введите корректную сумму'); return }
    if (!isUnlocked) { setShowUnlock(true); return }

    setLoading(true)
    try {
      const fromWallet = wallets.find(w => w.id === fromId)!
      const toWallet = wallets.find(w => w.id === toId)!
      let privateKey: string

      if (fromWallet.type === 'category') {
        const w = getWallet(fromId)
        if (!w) { setShowUnlock(true); setLoading(false); return }
        privateKey = w.privateKey
      } else {
        if (!masterPassword) throw new Error('Кошельки не разблокированы')
        const res = await fetch(`/api/funds/${fromId}/wallet`)
        if (!res.ok) throw new Error('Кошелёк фонда не найден')
        const { data } = await res.json()
        if (!data?.encryptedData) throw new Error('У фонда нет кошелька')
        const { decryptData } = await import('@/lib/crypto/encryption')
        const parsed = JSON.parse(decryptData(data.encryptedData, masterPassword))
        privateKey = parsed.privateKey
      }

      const result = await sendUSDT({ fromPrivateKey: privateKey, toAddress: toWallet.walletAddress, amount: amt })
      if (!result.success) throw new Error(result.error)
      setSuccess(`Готово! Hash: ${result.txHash?.slice(0, 20)}...`)
    } catch (e: any) {
      setError(e.message || 'Ошибка при переводе')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 py-4 space-y-4">
          {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}
          {success && <div className="p-3 rounded-[12px] bg-green-500/10 border border-green-500/20 text-green-400 text-[13px] break-all">{success}</div>}

          <WalletSelector wallets={wallets} selectedId={fromId} onSelect={setFromId} label="Откуда (источник) *" />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(120,120,128,0.12)]" />
            <div className="w-7 h-7 rounded-full bg-[rgba(118,118,128,0.12)] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <path d="M7 3v18M7 21l-4-4M7 21l4-4M17 21V3M17 3l-4 4M17 3l4 4"/>
              </svg>
            </div>
            <div className="flex-1 h-px bg-[rgba(120,120,128,0.12)]" />
          </div>

          <WalletSelector wallets={wallets} selectedId={toId} onSelect={setToId} excludeId={fromId} label="Куда (назначение) *" />

          <div>
            <label className="text-[13px] text-white/40 mb-1.5 block">Сумма USDT <span className="text-red-400">*</span></label>
            <input type="number" placeholder="0.00" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading}
              className="w-full h-[44px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.2)] text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 disabled:opacity-50"/>
          </div>
          <p className="text-[12px] text-white/25">⚠️ Транзакции в блокчейне необратимы.</p>
        </div>
      </div>
      <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-[rgba(120,120,128,0.08)] flex-shrink-0">
        <button onClick={onClose} className="flex-1 h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[15px]">Отмена</button>
        <button onClick={handleTransfer} disabled={loading || !!success}
          className="flex-1 h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 disabled:opacity-50 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
          {loading ? 'Отправка...' : 'Перевести'}
        </button>
      </div>
      {showUnlock && <UnlockWalletModal isOpen={showUnlock} onClose={() => setShowUnlock(false)} onUnlock={() => { setShowUnlock(false); handleTransfer() }} />}
    </>
  )
}

/* ─── Auto Distribute (wallet → funds by targetPercent) ─────────── */
function AutoDistributeBody({ onClose }: { onClose: () => void }) {
  const { getWallet, isUnlocked, masterPassword } = useWallet()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [funds, setFunds] = useState<Fund[]>([])
  const [fromId, setFromId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<{ name: string; amount: number; ok: boolean; error?: string }[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/funds').then(r => r.json()),
    ]).then(([cats, fundsRes]) => {
      setWallets((cats.data || []).map((c: any) => ({ id: c.id, name: c.name, walletAddress: c.walletAddress, type: 'category' as const })))
      const activeFunds = (fundsRes.data || []).filter((f: any) => f.isActive && f.targetPercent > 0)
      setFunds(activeFunds)
    })
  }, [])

  const totalPercent = funds.reduce((s, f) => s + f.targetPercent, 0)
  const amt = parseFloat(amount) || 0

  const allocations = funds.map(f => ({
    ...f,
    allocated: amt > 0 ? parseFloat((amt * f.targetPercent / 100).toFixed(6)) : 0,
  }))

  const handleDistribute = async () => {
    setError('')
    if (!fromId) { setError('Выберите кошелёк источника'); return }
    if (amt <= 0) { setError('Введите сумму'); return }
    if (funds.length === 0) { setError('Нет активных фондов с заданным %'); return }
    if (!isUnlocked) { setShowUnlock(true); return }

    const fromWallet = wallets.find(w => w.id === fromId)
    if (!fromWallet) { setError('Кошелёк не найден'); return }
    const w = getWallet(fromId)
    if (!w) { setShowUnlock(true); return }

    setLoading(true)
    setProgress({ done: 0, total: allocations.length })
    const res: typeof results = []

    for (let i = 0; i < allocations.length; i++) {
      const f = allocations[i]
      if (f.allocated <= 0) { setProgress({ done: i + 1, total: allocations.length }); continue }
      try {
        const result = await sendUSDT({ fromPrivateKey: w.privateKey, toAddress: f.walletAddress, amount: f.allocated })
        res.push({ name: f.name, amount: f.allocated, ok: result.success, error: result.error })
      } catch (e: any) {
        res.push({ name: f.name, amount: f.allocated, ok: false, error: e.message })
      }
      setProgress({ done: i + 1, total: allocations.length })
    }

    setLoading(false)
    setResults(res)
    setDone(true)
  }

  if (done) {
    return (
      <>
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-3">
          <p className="text-white font-medium text-[14px]">
            Готово: {results.filter(r => r.ok).length}/{results.length} фондов пополнено
          </p>
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] ${r.ok ? 'bg-green-500/[0.06] border border-green-500/15' : 'bg-red-500/[0.06] border border-red-500/15'}`}>
              <span className={`text-[13px] ${r.ok ? 'text-green-400' : 'text-red-400'}`}>{r.ok ? '✓' : '✗'}</span>
              <span className="text-white text-[13px] flex-1 truncate">{r.name}</span>
              <span className="text-white/40 text-[12px]">{r.amount} USDT</span>
            </div>
          ))}
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-[rgba(120,120,128,0.08)]">
          <button onClick={onClose} className="w-full h-[44px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[14px]">Закрыть</button>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 py-4 space-y-4">
          {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}

          {loading && progress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[12px] text-white/40">
                <span>Распределяем...</span><span>{progress.done}/{progress.total}</span>
              </div>
              <div className="h-1.5 rounded-full bg-[rgba(118,118,128,0.15)] overflow-hidden">
                <div className="h-full bg-[#d6d3ff] transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </div>
            </div>
          )}

          <WalletSelector wallets={wallets} selectedId={fromId} onSelect={setFromId} label="Источник (откуда списываем) *" />

          <div>
            <label className="text-[13px] text-white/40 mb-1.5 block">Общая сумма для распределения (USDT) <span className="text-red-400">*</span></label>
            <input type="number" placeholder="0.00" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading}
              className="w-full h-[44px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.2)] text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 disabled:opacity-50"/>
          </div>

          {/* Funds preview */}
          {funds.length === 0 ? (
            <div className="p-4 rounded-[14px] bg-[rgba(118,118,128,0.06)] border border-[rgba(120,120,128,0.12)] text-center">
              <p className="text-white/40 text-[13px]">Нет активных фондов с заданным %</p>
              <p className="text-white/25 text-[12px] mt-1">Создайте фонды и задайте им процент распределения</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] text-white/40">Распределение по фондам</label>
                <span className={`text-[12px] ${Math.abs(totalPercent - 100) < 0.01 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {totalPercent.toFixed(0)}% в сумме
                </span>
              </div>
              <div className="space-y-1.5">
                {allocations.map(f => (
                  <div key={f.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-[rgba(120,120,128,0.14)] bg-[rgba(118,118,128,0.04)]">
                    {f.icon ? <span className="text-[14px]">{f.icon}</span> : <div className="w-5 h-5 rounded-[6px] bg-[rgba(118,118,128,0.2)]" />}
                    <span className="text-white text-[13px] flex-1 truncate">{f.name}</span>
                    <span className="text-white/40 text-[12px]">{f.targetPercent}%</span>
                    {amt > 0 && (
                      <span className="text-[#d6d3ff] text-[13px] font-medium ml-1">{f.allocated} USDT</span>
                    )}
                  </div>
                ))}
              </div>
              {amt > 0 && (
                <p className="mt-2 text-[12px] text-white/30">
                  Итого: <span className="text-white/50">{allocations.reduce((s, f) => s + f.allocated, 0).toFixed(2)} USDT</span>
                  {Math.abs(totalPercent - 100) > 0.1 && (
                    <span className="text-yellow-400/70"> · Сумма % ≠ 100, остаток остаётся на источнике</span>
                  )}
                </p>
              )}
            </div>
          )}

          <p className="text-[12px] text-white/25">⚠️ Транзакции в блокчейне необратимы.</p>
        </div>
      </div>
      <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-[rgba(120,120,128,0.08)] flex-shrink-0">
        <button onClick={onClose} className="flex-1 h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[15px]">Отмена</button>
        <button onClick={handleDistribute} disabled={loading || funds.length === 0 || !fromId || amt <= 0}
          className="flex-1 h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 disabled:opacity-40 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
          {loading ? `Распределяем ${progress?.done}/${progress?.total}...` : `Распределить → ${funds.length} фондов`}
        </button>
      </div>
      {showUnlock && <UnlockWalletModal isOpen={showUnlock} onClose={() => setShowUnlock(false)} onUnlock={() => { setShowUnlock(false); handleDistribute() }} />}
    </>
  )
}

/* ─── Gas Modal (Vault gas wallet) ───────────────────────────────── */
type GasStep = 'loading' | 'create' | 'seed' | 'address' | 'distribute'

interface PendingWallet {
  address: string
  privateKey: string
  mnemonic: string
}

function GasModal({ onClose }: { onClose: () => void }) {
  const { isUnlocked, masterPassword } = useWallet()
  const [step, setStep] = useState<GasStep>('loading')
  const [gasAddress, setGasAddress] = useState<string | null>(null)
  const [pendingWallet, setPendingWallet] = useState<PendingWallet | null>(null)
  const [seedConfirmed, setSeedConfirmed] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [amountPerWallet, setAmountPerWallet] = useState('15')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<{ name: string; ok: boolean; error?: string }[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedWord, setCopiedWord] = useState(false)
  const [showUnlock, setShowUnlock] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/gas-wallet').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/funds').then(r => r.json()),
    ]).then(([gw, cats, funds]) => {
      const items: Wallet[] = [
        ...(cats.data || []).map((c: any) => ({ id: c.id, name: c.name, walletAddress: c.walletAddress, type: 'category' as const })),
        ...(funds.data || []).map((f: any) => ({ id: f.id, name: f.name, walletAddress: f.walletAddress, type: 'fund' as const, icon: f.icon })),
      ]
      setWallets(items)
      setSelectedIds(new Set(items.map(w => w.id)))
      if (gw.data?.walletAddress) {
        setGasAddress(gw.data.walletAddress)
        setStep('address')
      } else {
        setStep('create')
      }
    })
  }, [])

  // Step 1: generate wallet and go to seed-phrase screen
  const handleCreate = async () => {
    if (!isUnlocked || !masterPassword) { setShowUnlock(true); return }
    setCreating(true)
    setError('')
    try {
      const { generateWallet } = await import('@/lib/tron/wallet')
      const wallet = await generateWallet()
      setPendingWallet(wallet)
      setSeedConfirmed(false)
      setStep('seed')
    } catch (e: any) {
      setError(e.message || 'Ошибка генерации кошелька')
    } finally {
      setCreating(false)
    }
  }

  // Step 2: user confirmed seed phrase → encrypt & save
  const handleSaveSeed = async () => {
    if (!pendingWallet || !masterPassword) return
    setSaving(true)
    setError('')
    try {
      const { encryptData } = await import('@/lib/crypto/encryption')
      const encrypted = encryptData(
        JSON.stringify({ address: pendingWallet.address, privateKey: pendingWallet.privateKey, mnemonic: pendingWallet.mnemonic }),
        masterPassword
      )
      const res = await fetch('/api/gas-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: pendingWallet.address, encryptedData: encrypted }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Ошибка сохранения')
      }
      setGasAddress(pendingWallet.address)
      setPendingWallet(null)
      setStep('address')
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const copySeed = () => {
    if (pendingWallet) {
      navigator.clipboard.writeText(pendingWallet.mnemonic)
      setCopiedWord(true)
      setTimeout(() => setCopiedWord(false), 2000)
    }
  }

  const copy = () => {
    if (gasAddress) {
      navigator.clipboard.writeText(gasAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const selected = wallets.filter(w => selectedIds.has(w.id))
  const totalTRX = (selected.length * parseFloat(amountPerWallet || '0')).toFixed(2)

  const toggleAll = () => {
    if (selectedIds.size === wallets.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(wallets.map(w => w.id)))
  }

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleDistribute = async () => {
    if (!isUnlocked || !masterPassword) { setShowUnlock(true); return }
    if (selected.length === 0) { setError('Выберите кошельки'); return }
    const amt = parseFloat(amountPerWallet)
    if (isNaN(amt) || amt <= 0) { setError('Введите сумму'); return }

    setLoading(true)
    setError('')
    setProgress({ done: 0, total: selected.length })

    try {
      // Fetch & decrypt gas wallet private key
      const encRes = await fetch('/api/gas-wallet', { method: 'PUT' })
      if (!encRes.ok) throw new Error('Кошелёк газа не найден')
      const { data } = await encRes.json()
      const { decryptData } = await import('@/lib/crypto/encryption')
      const parsed = JSON.parse(decryptData(data.encryptedData, masterPassword))
      const privateKey = parsed.privateKey

      const res: typeof results = []
      for (let i = 0; i < selected.length; i++) {
        const w = selected[i]
        try {
          const result = await sendTRX({ fromPrivateKey: privateKey, toAddress: w.walletAddress, amount: amt })
          res.push({ name: w.name, ok: result.success, error: result.error })
        } catch (e: any) {
          res.push({ name: w.name, ok: false, error: e.message })
        }
        setProgress({ done: i + 1, total: selected.length })
      }
      setResults(res)
      setDone(true)
    } catch (e: any) {
      setError(e.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md rounded-[24px] border border-[rgba(120,120,128,0.2)] bg-[#14141a] shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(120,120,128,0.1)] flex-shrink-0">
            <div>
              <h2 className="text-white font-semibold text-[17px]">Газ (TRX)</h2>
              <p className="text-white/35 text-[12px] mt-0.5">Единый кошелёк Vault для раздачи TRX</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all text-[20px]">×</button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-5 py-4 space-y-4">

              {/* Loading */}
              {step === 'loading' && (
                <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin" /></div>
              )}

              {/* Create wallet */}
              {step === 'create' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-[16px] bg-[rgba(214,211,255,0.04)] border border-[rgba(214,211,255,0.12)] space-y-2">
                    <p className="text-white text-[14px] font-medium">Газ-кошелёк не создан</p>
                    <p className="text-white/50 text-[13px]">
                      Создайте единый Vault-кошелёк — на него переводите TRX, а одной кнопкой рассылает его по всем кошелькам моделей и фондов.
                    </p>
                  </div>
                  {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}
                  <button onClick={handleCreate} disabled={creating}
                    className="w-full h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 disabled:opacity-50 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
                    {creating ? 'Генерируем...' : 'Создать газ-кошелёк'}
                  </button>
                </div>
              )}

              {/* Seed phrase */}
              {step === 'seed' && pendingWallet && (
                <div className="space-y-4">
                  <div>
                    <p className="text-white font-semibold text-[15px] mb-1">⚠️ Сохраните Seed Phrase</p>
                    <p className="text-white/50 text-[13px]">
                      Эти 12 слов — единственный способ восстановить доступ к газ-кошельку.{' '}
                      <span className="text-red-400">Они больше не будут показаны!</span>
                    </p>
                  </div>

                  <div className="bg-yellow-500/[0.05] border border-yellow-500/25 rounded-[16px] p-4">
                    <div className="grid grid-cols-3 gap-2.5 mb-3">
                      {pendingWallet.mnemonic.split(' ').map((word, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-[11px] text-white/25 w-4 text-right flex-shrink-0">{i + 1}.</span>
                          <span className="font-mono text-[12px] text-yellow-300 font-semibold">{word}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={copySeed}
                      className={`w-full h-7 rounded-[8px] text-[12px] transition-all ${copiedWord ? 'bg-green-500/20 text-green-400' : 'bg-[rgba(255,255,255,0.06)] text-white/40 hover:text-white'}`}>
                      {copiedWord ? '✓ Скопировано' : 'Копировать все слова'}
                    </button>
                  </div>

                  <div className="p-3 rounded-[12px] bg-[rgba(118,118,128,0.08)] border border-[rgba(120,120,128,0.12)]">
                    <p className="text-white/30 text-[11px] mb-1">Адрес кошелька</p>
                    <p className="font-mono text-[12px] text-white/60 break-all">{pendingWallet.address}</p>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer p-3 bg-[rgba(118,118,128,0.06)] rounded-[12px] border border-[rgba(120,120,128,0.12)]">
                    <input type="checkbox" checked={seedConfirmed} onChange={e => setSeedConfirmed(e.target.checked)} className="mt-0.5 accent-[#d6d3ff] flex-shrink-0" />
                    <span className="text-[13px] text-white/60">
                      Я сохранил seed phrase в безопасном месте и понимаю, что без него не смогу восстановить кошелёк.
                    </span>
                  </label>

                  {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}
                </div>
              )}

              {/* Address + distribute */}
              {(step === 'address' || step === 'distribute') && gasAddress && (
                <>
                  {/* Gas wallet address card */}
                  <div className="p-4 rounded-[16px] bg-[rgba(214,211,255,0.04)] border border-[rgba(214,211,255,0.12)] space-y-2">
                    <p className="text-white/50 text-[12px]">Адрес газ-кошелька Vault — переводите TRX сюда</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[13px] text-white/80 flex-1 break-all">{gasAddress}</p>
                      <button onClick={copy}
                        className={`flex-shrink-0 h-7 px-2.5 rounded-[8px] text-[12px] font-medium transition-all whitespace-nowrap ${copied ? 'bg-green-500/20 text-green-400' : 'bg-[rgba(118,118,128,0.15)] text-white/50 hover:text-white'}`}>
                        {copied ? '✓' : 'Копировать'}
                      </button>
                    </div>
                  </div>

                  {/* Results */}
                  {done ? (
                    <div className="space-y-2">
                      <p className="text-white font-medium text-[14px]">
                        Готово: {results.filter(r => r.ok).length}/{results.length}
                      </p>
                      <div className="space-y-1 max-h-[200px] overflow-y-auto">
                        {results.map((r, i) => (
                          <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] ${r.ok ? 'bg-green-500/[0.06] border border-green-500/15' : 'bg-red-500/[0.06] border border-red-500/15'}`}>
                            <span className={`text-[13px] ${r.ok ? 'text-green-400' : 'text-red-400'}`}>{r.ok ? '✓' : '✗'}</span>
                            <span className="text-white text-[13px] flex-1 truncate">{r.name}</span>
                            {r.error && <span className="text-red-400 text-[11px] truncate max-w-[120px]">{r.error}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}

                      {loading && progress && (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[12px] text-white/40">
                            <span>Рассылаем...</span><span>{progress.done}/{progress.total}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[rgba(118,118,128,0.15)] overflow-hidden">
                            <div className="h-full bg-[#d6d3ff] transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Amount */}
                      <div>
                        <label className="text-[13px] text-white/40 mb-1.5 block">TRX на каждый кошелёк</label>
                        <div className="flex items-center gap-2">
                          <input type="number" placeholder="15" step="1" min="1" value={amountPerWallet} onChange={e => setAmountPerWallet(e.target.value)} disabled={loading}
                            className="flex-1 h-[44px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.1)] border border-[rgba(120,120,128,0.2)] text-white text-[15px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 disabled:opacity-50"/>
                          <span className="text-white/40 text-[13px]">TRX</span>
                        </div>
                        {selected.length > 0 && (
                          <p className="mt-1 text-[12px] text-white/35">
                            Итого: <span className="text-white/60">{totalTRX} TRX</span> на {selected.length} кошельков
                          </p>
                        )}
                      </div>

                      {/* Wallet list */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[13px] text-white/40">Кошельки для пополнения</label>
                          <button onClick={toggleAll} disabled={loading} className="text-[12px] text-[#d6d3ff]/70 hover:text-[#d6d3ff] transition-colors disabled:opacity-40">
                            {selectedIds.size === wallets.length ? 'Снять все' : 'Выбрать все'}
                          </button>
                        </div>
                        <div className="space-y-1 max-h-[200px] overflow-y-auto pr-0.5">
                          {wallets.map(w => (
                            <label key={w.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] border cursor-pointer transition-all ${
                              selectedIds.has(w.id) ? 'border-[#d6d3ff]/25 bg-[#d6d3ff]/[0.04]' : 'border-[rgba(120,120,128,0.12)]'
                            } ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                              <div className={`w-4 h-4 rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-all ${selectedIds.has(w.id) ? 'border-[#d6d3ff] bg-[#d6d3ff]' : 'border-[rgba(120,120,128,0.3)]'}`}>
                                {selectedIds.has(w.id) && (
                                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" className="text-[#090909]">
                                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                              <input type="checkbox" className="sr-only" checked={selectedIds.has(w.id)} onChange={() => toggle(w.id)} />
                              {w.icon && <span className="text-[13px]">{w.icon}</span>}
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-[13px] truncate">{w.name}</p>
                                <p className="font-mono text-[10px] text-white/25 truncate">{w.walletAddress}</p>
                              </div>
                              <span className="text-[11px] text-white/25 flex-shrink-0">{w.type === 'fund' ? 'Фонд' : 'Модель'}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="px-5 pb-5 pt-3 flex gap-2 border-t border-[rgba(120,120,128,0.08)] flex-shrink-0">
            {done ? (
              <button onClick={onClose} className="w-full h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[15px]">Закрыть</button>
            ) : step === 'seed' ? (
              <>
                <button onClick={() => { setStep('create'); setPendingWallet(null) }} disabled={saving}
                  className="flex-1 h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[15px] disabled:opacity-50">
                  Назад
                </button>
                <button onClick={handleSaveSeed} disabled={!seedConfirmed || saving}
                  className="flex-1 h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 disabled:opacity-40 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
                  {saving ? 'Сохраняем...' : 'Сохранил, продолжить'}
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} disabled={loading} className="flex-1 h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/70 hover:text-white transition-colors text-[15px] disabled:opacity-50">Отмена</button>
                {(step === 'address' || step === 'distribute') && (
                  <button onClick={handleDistribute} disabled={loading || selected.length === 0 || !parseFloat(amountPerWallet)}
                    className="flex-1 h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 disabled:opacity-40 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
                    {loading ? `Рассылаем ${progress?.done}/${progress?.total}...` : `Разослать → ${selected.length}`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showUnlock && (
        <UnlockWalletModal isOpen={showUnlock} onClose={() => setShowUnlock(false)}
          onUnlock={() => {
            setShowUnlock(false)
            if (step === 'create') handleCreate()
            else handleDistribute()
          }}
        />
      )}
    </>
  )
}

/* ─── Header Actions ─────────────────────────────────────────────── */
export default function HeaderActions() {
  const [modal, setModal] = useState<'send' | 'deposit' | 'transfer' | 'gas' | null>(null)

  return (
    <>
      <button onClick={() => setModal('transfer')} title="Перевод между кошельками"
        className="w-[46px] h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white hover:bg-[rgba(118,118,128,0.2)] transition-all flex items-center justify-center flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3v18M7 21l-3.5-3.5M7 21l3.5-3.5"/>
          <path d="M17 21V3M17 3l-3.5 3.5M17 3l3.5 3.5"/>
        </svg>
      </button>

      <button onClick={() => setModal('gas')} title="Газ (TRX)"
        className="w-[46px] h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/50 hover:text-white hover:bg-[rgba(118,118,128,0.2)] transition-all flex items-center justify-center flex-shrink-0">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 22V5a2 2 0 012-2h8a2 2 0 012 2v17"/>
          <path d="M3 22H15"/>
          <path d="M3 9H13"/>
          <path d="M13 6h2l3 3v7.5"/>
          <path d="M17 12h2a1 1 0 011 1v3a1 1 0 01-1 1h-2"/>
          <path d="M18 17v2"/>
        </svg>
      </button>

      <button onClick={() => setModal('deposit')}
        className="h-[46px] px-5 rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white text-[15px] font-medium transition-opacity hover:opacity-80">
        Пополнить
      </button>
      <button onClick={() => setModal('send')}
        className="h-[46px] px-5 rounded-[14px] bg-[#d6d3ff] text-[#090909] text-[15px] font-medium hover:opacity-90 transition-opacity shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]">
        Отправить
      </button>

      {modal === 'deposit'  && <DepositModal  onClose={() => setModal(null)} />}
      {modal === 'send'     && <SendModal     onClose={() => setModal(null)} />}
      {modal === 'transfer' && <TransferModal onClose={() => setModal(null)} />}
      {modal === 'gas'      && <GasModal      onClose={() => setModal(null)} />}
    </>
  )
}
