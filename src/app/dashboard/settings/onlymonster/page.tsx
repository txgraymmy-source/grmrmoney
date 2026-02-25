import OnlyMonsterSettings from '@/components/settings/OnlyMonsterSettings'

export default function OnlyMonsterSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Интеграции</h1>
        <p className="text-white/50 mt-1">
          Подключение внешних сервисов и API
        </p>
      </div>

      <OnlyMonsterSettings />
    </div>
  )
}
