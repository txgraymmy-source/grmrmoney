'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  initialData: {
    name: string
    agencyName: string
    phone: string
  }
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(initialData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при сохранении')
      }

      setSuccess('Профиль успешно обновлен!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-[rgba(37,37,37,0.5)] border-[rgba(120,120,128,0.2)]">
        <CardHeader>
          <CardTitle className="text-white">Личные данные</CardTitle>
          <CardDescription>Информация о вас и вашем агентстве</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-3 rounded-xl">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-white/70">
              Ваше имя
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Например: Иван Иванов"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agencyName" className="text-white/70">
              Название агентства
            </Label>
            <Input
              id="agencyName"
              type="text"
              placeholder="Например: GRMR Agency"
              value={formData.agencyName}
              onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
              className="bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white/70">
              Телефон
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+7 (999) 123-45-67"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="bg-[rgba(118,118,128,0.12)] border-[rgba(120,120,128,0.2)] text-white"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Сохранение...' : 'Сохранить изменения'}
          </Button>
        </CardContent>
      </Card>
    </form>
  )
}
