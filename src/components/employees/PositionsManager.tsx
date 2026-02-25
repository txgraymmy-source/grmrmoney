'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface Position {
  id: string
  name: string
  icon: string | null
  color: string | null
  _count: { employees: number }
}

interface Props {
  initialPositions: Position[]
}

const COLOR_PRESETS = ['#d6d3ff', '#a78bfa', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6']

export default function PositionsManager({ initialPositions }: Props) {
  const [positions, setPositions] = useState<Position[]>(initialPositions)
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // New position form
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('')
  const [newColor, setNewColor] = useState('#d6d3ff')
  const [newError, setNewError] = useState('')
  const [newLoading, setNewLoading] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setNewError('')
    setNewLoading(true)
    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon || undefined, color: newColor }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setNewError(data.error || 'Ошибка')
        return
      }
      setPositions(prev => [...prev, data.data])
      setCreating(false)
      setNewName('')
      setNewIcon('')
      setNewColor('#d6d3ff')
    } catch {
      setNewError('Ошибка соединения')
    } finally {
      setNewLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/positions/${id}`, { method: 'DELETE' })
      setPositions(prev => prev.filter(p => p.id !== id))
    } catch {}
  }

  return (
    <div className="space-y-3">
      {positions.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-12 bg-[rgba(37,37,37,0.5)] border border-[rgba(120,120,128,0.15)] rounded-[16px]">
          <p className="text-white/30 text-[14px] mb-4">Должностей пока нет</p>
        </div>
      )}

      {positions.map(pos => (
        <PositionRow
          key={pos.id}
          position={pos}
          isEditing={editId === pos.id}
          onEdit={() => setEditId(editId === pos.id ? null : pos.id)}
          onDelete={() => handleDelete(pos.id)}
          onUpdated={(updated) => {
            setPositions(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
            setEditId(null)
          }}
        />
      ))}

      {creating ? (
        <Card className="card-rounded">
          <CardContent className="pt-4 space-y-3">
            <p className="text-white font-medium text-[14px]">Новая должность</p>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Название</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Чаттер, Менеджер..." autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Иконка (эмодзи)</Label>
              <Input value={newIcon} onChange={e => setNewIcon(e.target.value)} placeholder="👤" className="w-20" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${newColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            {newError && <p className="text-sm text-red-400">{newError}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCreating(false)} className="flex-1">Отмена</Button>
              <Button onClick={handleCreate} disabled={newLoading || !newName.trim()} className="flex-1">
                {newLoading ? 'Создание...' : 'Создать'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full h-[44px] rounded-[14px] border border-dashed border-[rgba(120,120,128,0.3)] text-white/40 hover:text-white/60 hover:border-[rgba(120,120,128,0.5)] transition-all text-[14px]"
        >
          + Добавить должность
        </button>
      )}
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface PositionRowProps {
  position: Position
  isEditing: boolean
  onEdit: () => void
  onDelete: () => void
  onUpdated: (updated: Partial<Position> & { id: string }) => void
}

function PositionRow({ position, isEditing, onEdit, onDelete, onUpdated }: PositionRowProps) {
  const [name, setName] = useState(position.name)
  const [icon, setIcon] = useState(position.icon ?? '')
  const [color, setColor] = useState(position.color ?? '#d6d3ff')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/positions/${position.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon: icon || null, color }),
      })
      const data = await res.json()
      if (res.ok && data.success) onUpdated(data.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="card-rounded">
      <CardContent className="pt-4">
        {!isEditing ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[16px]"
              style={{ background: `${color}20`, border: `1px solid ${color}40` }}
            >
              {icon || <span style={{ color }}>●</span>}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{position.name}</p>
              <p className="text-white/30 text-[12px]">{position._count.employees} сотрудников</p>
            </div>
            <button onClick={onEdit} className="text-white/40 hover:text-white text-[13px] transition-colors px-3 py-1.5">
              Изменить
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Иконка</Label>
              <Input value={icon} onChange={e => setIcon(e.target.value)} className="w-20" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-[13px]">Цвет</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : ''}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onEdit} className="flex-1 text-[13px]">Отмена</Button>
              <Button onClick={handleSave} disabled={saving} className="flex-1 text-[13px]">
                {saving ? '...' : 'Сохранить'}
              </Button>
            </div>
            {deleteConfirm ? (
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setDeleteConfirm(false)} className="flex-1 text-[13px]">Отмена</Button>
                <button
                  onClick={onDelete}
                  className="flex-1 h-[40px] rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[13px] transition-colors"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full text-red-400/50 hover:text-red-400 text-[13px] transition-colors py-1"
              >
                Удалить должность
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
