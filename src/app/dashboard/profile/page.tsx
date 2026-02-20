'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    agencyName: '',
    phone: '',
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) {
        const { data } = await res.json()
        setFormData({
          name: data.name || '',
          agencyName: data.agencyName || '',
          phone: data.phone || '',
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Профиль</h1>
        <p className="text-gray-400 mt-1">
          Настройки вашего аккаунта
        </p>
      </div>

      {/* Account Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Информация об аккаунте</CardTitle>
          <CardDescription>Email адрес для входа</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p className="text-white font-medium">{session?.user?.email}</p>
            </div>
            <div className="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs rounded-lg">
              Подтвержден
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-gray-900 border-gray-800">
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
              <Label htmlFor="name" className="text-gray-300">
                Ваше имя
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Например: Иван Иванов"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencyName" className="text-gray-300">
                Название агентства
              </Label>
              <Input
                id="agencyName"
                type="text"
                placeholder="Например: GRMR Agency"
                value={formData.agencyName}
                onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">
                Телефон
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
