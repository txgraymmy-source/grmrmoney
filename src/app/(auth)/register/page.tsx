'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Step = 'info' | 'type'
type AccountType = 'crypto' | 'accounting'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('info')
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '' })
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (formData.password !== formData.confirmPassword) { setError('Пароли не совпадают'); return }
    if (formData.password.length < 8) { setError('Пароль должен содержать минимум 8 символов'); return }
    setStep('type')
  }

  const handleRegister = async (type: AccountType) => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, password: formData.password, name: formData.name, accountType: type }),
      })
      const data = await response.json()
      if (!response.ok) { setError(data.error || 'Ошибка при регистрации'); setStep('info'); return }
      router.push('/login?registered=true')
    } catch {
      setError('Ошибка при регистрации')
      setStep('info')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#101012] px-4">
      <div className="w-full max-w-[440px] space-y-6">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="VAULT by grmr" className="h-12" />
        </div>

        {step === 'info' ? (
          <div className="rounded-[24px] border border-[rgba(120,120,128,0.2)] bg-[rgba(37,37,37,0.5)] backdrop-blur-xl p-8 space-y-6">
            <div>
              <h1 className="text-white font-semibold text-[22px]">Регистрация</h1>
              <p className="text-white/40 text-[14px] mt-1">Создайте аккаунт для управления финансами</p>
            </div>

            {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px]">{error}</div>}

            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] text-white/50">Имя</label>
                <input type="text" placeholder="Иван Иванов" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[14px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-white/50">Email <span className="text-red-400">*</span></label>
                <input type="email" placeholder="example@mail.com" required value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[14px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-white/50">Пароль <span className="text-red-400">*</span></label>
                <input type="password" placeholder="Минимум 8 символов" required value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[14px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors"/>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] text-white/50">Подтвердите пароль <span className="text-red-400">*</span></label>
                <input type="password" placeholder="Повторите пароль" required value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full h-[46px] px-4 rounded-[12px] bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] text-white text-[14px] placeholder:text-white/25 focus:outline-none focus:border-[#d6d3ff]/40 transition-colors"/>
              </div>
              <button type="submit"
                className="w-full h-[46px] rounded-[14px] bg-[#d6d3ff] text-[#090909] font-medium text-[15px] hover:opacity-90 transition-opacity shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)] mt-2">
                Продолжить →
              </button>
            </form>

            <p className="text-[13px] text-center text-white/30">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-[#d6d3ff] hover:opacity-80 transition-opacity">Войти</Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h1 className="text-white font-semibold text-[22px]">Как вы хотите использовать Vault?</h1>
              <p className="text-white/40 text-[14px] mt-2">Выберите режим работы — его можно будет изменить в настройках</p>
            </div>

            {error && <div className="p-3 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 text-[13px] text-center">{error}</div>}

            <div className="grid gap-3">
              {/* Crypto mode */}
              <button onClick={() => handleRegister('crypto')} disabled={isLoading}
                className="w-full rounded-[20px] border border-[rgba(120,120,128,0.2)] bg-[rgba(37,37,37,0.5)] hover:border-[#d6d3ff]/30 hover:bg-[rgba(214,211,255,0.04)] transition-all p-6 text-left group disabled:opacity-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[14px] bg-[#d6d3ff]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#d6d3ff]/15 transition-colors">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d6d3ff" strokeWidth="1.8">
                      <rect x="2" y="5" width="20" height="14" rx="3"/>
                      <path d="M16 12a2 2 0 1 1 0-.001"/>
                      <path d="M2 9h20"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-white font-semibold text-[16px]">С крипто-кошельками</p>
                      <span className="px-2 py-0.5 rounded-[6px] bg-[#d6d3ff]/10 text-[#d6d3ff] text-[11px] font-medium">Рекомендуется</span>
                    </div>
                    <p className="text-white/45 text-[13px] leading-relaxed">
                      Полный функционал — создание TRON-кошельков, отправка и получение USDT, управление фондами, автоматическая синхронизация транзакций из блокчейна.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['TRON кошельки', 'Автосинхронизация', 'Фонды', 'Вывод USDT'].map(f => (
                        <span key={f} className="px-2 py-0.5 rounded-[6px] bg-[rgba(118,118,128,0.12)] text-white/40 text-[11px]">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>

              {/* Accounting mode */}
              <button onClick={() => handleRegister('accounting')} disabled={isLoading}
                className="w-full rounded-[20px] border border-[rgba(120,120,128,0.2)] bg-[rgba(37,37,37,0.5)] hover:border-white/15 hover:bg-[rgba(255,255,255,0.02)] transition-all p-6 text-left group disabled:opacity-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[14px] bg-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:bg-white/[0.09] transition-colors">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <line x1="10" y1="9" x2="8" y2="9"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-[16px] mb-1">Только учёт и бухгалтерия</p>
                    <p className="text-white/45 text-[13px] leading-relaxed">
                      Ручной ввод транзакций, отслеживание доходов и расходов, аналитика. Можно прикрепить адрес кошелька для мониторинга поступлений — без управления ключами.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {['Ручные транзакции', 'Аналитика', 'Мониторинг', 'Без ключей'].map(f => (
                        <span key={f} className="px-2 py-0.5 rounded-[6px] bg-[rgba(118,118,128,0.12)] text-white/40 text-[11px]">{f}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <button onClick={() => setStep('info')} disabled={isLoading}
              className="w-full h-[40px] text-white/30 hover:text-white/60 transition-colors text-[13px] disabled:opacity-50">
              ← Назад
            </button>

            {isLoading && (
              <div className="flex justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-[#d6d3ff] border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
