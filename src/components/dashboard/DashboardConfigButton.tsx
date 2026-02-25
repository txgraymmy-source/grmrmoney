'use client'

import { useRouter } from 'next/navigation'
import DashboardConfigPanel from './DashboardConfigPanel'

interface Widget {
  type: string
  enabled: boolean
  order: number
}

interface DashboardConfigButtonProps {
  widgets: Widget[]
}

export default function DashboardConfigButton({ widgets }: DashboardConfigButtonProps) {
  const router = useRouter()

  const handleSave = async (newWidgets: Widget[]) => {
    await fetch('/api/dashboard-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets: newWidgets }),
    })
    router.refresh()
  }

  return <DashboardConfigPanel initialWidgets={widgets} onSave={handleSave} />
}
