'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface Position {
  id: string
  name: string
  icon: string | null
  color: string | null
}

interface Props {
  positions: Position[]
}

export default function NewEmployeeForm({ positions }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [positionId, setPositionId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          walletAddress,
          notes: notes || undefined,
          positionId: positionId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Ошибка при создании')
        return
      }
      router.push(`/dashboard/employees/${data.data.id}`)
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="card-rounded">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Имя / Ник</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Иван Петров"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">TRON-адрес кошелька</Label>
            <Input
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value)}
              placeholder="T..."
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Должность</Label>
            <select
              value={positionId}
              onChange={e => setPositionId(e.target.value)}
              className="w-full bg-[rgba(118,118,128,0.12)] border border-[rgba(120,120,128,0.2)] rounded-[12px] h-[46px] px-4 text-white text-[14px] focus:outline-none focus:border-[rgba(214,211,255,0.4)]"
            >
              <option value="">Без должности</option>
              {positions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.icon ? `${p.icon} ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70 text-[13px]">Заметки</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Создание...' : 'Создать сотрудника'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
