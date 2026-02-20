import OnlyMonsterSettings from '@/components/settings/OnlyMonsterSettings'

export default function OnlyMonsterSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Настройки OnlyMonster</h1>
        <p className="text-gray-400 mt-1">
          Интеграция с OnlyMonster API
        </p>
      </div>

      <OnlyMonsterSettings />
    </div>
  )
}
