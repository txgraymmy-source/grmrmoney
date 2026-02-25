'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

interface Widget {
  type: string
  enabled: boolean
  order: number
}

const WIDGET_LABELS: Record<string, { label: string; icon: string }> = {
  stat_cards:         { label: 'Верхние плашки', icon: '🔢' },
  project_bar:        { label: 'Сравнение проектов', icon: '📊' },
  of_line:            { label: 'Динамика бизнеса', icon: '📈' },
  income_table:       { label: 'Таблицы поступлений', icon: '📋' },
  expense_categories: { label: 'Расходы по категориям', icon: '🍩' },
  fund_overview:      { label: 'Фонды (нижняя колонка)', icon: '💰' },
  categories_list:    { label: 'Модели (нижняя колонка)', icon: '👤' },
  transactions_list:  { label: 'Последние транзакции', icon: '⚡' },
}

interface DashboardConfigPanelProps {
  initialWidgets: Widget[]
  onSave: (widgets: Widget[]) => Promise<void>
}

export default function DashboardConfigPanel({ initialWidgets, onSave }: DashboardConfigPanelProps) {
  const [open, setOpen] = useState(false)
  const [widgets, setWidgets] = useState<Widget[]>(
    [...initialWidgets].sort((a, b) => a.order - b.order)
  )
  const [saving, setSaving] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragNode = useRef<HTMLDivElement | null>(null)

  const handleToggle = (type: string) => {
    setWidgets(prev =>
      prev.map(w => w.type === type ? { ...w, enabled: !w.enabled } : w)
    )
  }

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    setWidgets(prev => {
      const arr = [...prev]
      const [removed] = arr.splice(dragIdx, 1)
      arr.splice(dropIdx, 0, removed)
      return arr.map((w, i) => ({ ...w, order: i }))
    })
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(widgets)
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleOpen = () => {
    // Reset to fresh copy from props when opening
    setWidgets([...initialWidgets].sort((a, b) => a.order - b.order))
    setOpen(true)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center justify-center w-[46px] h-[46px] rounded-[14px] bg-[rgba(118,118,128,0.12)] text-white/60 hover:text-white hover:bg-[rgba(118,118,128,0.2)] transition-all"
        title="Настроить дашборд"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />

          <div className="fixed right-0 top-0 h-full w-[380px] bg-[#111113] border-l border-[rgba(120,120,128,0.2)] z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(120,120,128,0.1)]">
              <div>
                <h2 className="text-white font-semibold text-[16px]">Настройка дашборда</h2>
                <p className="text-white/40 text-[12px] mt-0.5">Перетащите для изменения порядка</p>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-[8px] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all text-[18px]">
                ×
              </button>
            </div>

            {/* Widget list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
              {widgets.map((widget, idx) => {
                const info = WIDGET_LABELS[widget.type]
                const isDragging = dragIdx === idx
                const isOver = overIdx === idx && dragIdx !== idx

                return (
                  <div
                    key={widget.type}
                    onDragOver={e => handleDragOver(e, idx)}
                    onDrop={e => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    ref={dragIdx === idx ? dragNode : undefined}
                    className={`flex items-center gap-3 p-3.5 rounded-[14px] border transition-all ${
                      isDragging
                        ? 'opacity-40 border-[rgba(120,120,128,0.3)] bg-[rgba(118,118,128,0.12)]'
                        : isOver
                        ? 'border-[#d6d3ff]/40 bg-[#d6d3ff]/[0.05] scale-[1.01]'
                        : widget.enabled
                        ? 'border-[rgba(120,120,128,0.18)] bg-[rgba(118,118,128,0.06)] hover:border-[rgba(120,120,128,0.28)]'
                        : 'border-[rgba(120,120,128,0.08)] bg-transparent'
                    }`}
                  >
                    {/* Drag handle — only this is draggable so toggle clicks work */}
                    <div
                      draggable
                      onDragStart={e => handleDragStart(e, idx)}
                      className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/50 transition-colors flex-shrink-0 select-none"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                        <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                        <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                      </svg>
                    </div>

                    {/* Icon */}
                    <span className={`text-[18px] flex-shrink-0 transition-opacity ${!widget.enabled ? 'opacity-30' : ''}`}>
                      {info?.icon || '📦'}
                    </span>

                    {/* Label */}
                    <span className={`flex-1 text-[14px] transition-colors ${widget.enabled ? 'text-white' : 'text-white/30'}`}>
                      {info?.label || widget.type}
                    </span>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(widget.type)}
                      className={`relative w-[44px] h-[26px] rounded-full flex-shrink-0 transition-colors duration-200 ${
                        widget.enabled ? 'bg-[#d6d3ff]' : 'bg-[rgba(118,118,128,0.3)]'
                      }`}
                    >
                      <span
                        className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          widget.enabled ? 'translate-x-[18px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-5 border-t border-[rgba(120,120,128,0.1)] space-y-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <button
                onClick={() => setOpen(false)}
                className="w-full h-[40px] rounded-[12px] text-white/50 hover:text-white text-[14px] transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
