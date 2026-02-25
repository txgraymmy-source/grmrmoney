import CategoryManagerWrapper from '@/components/settings/CategoryManagerWrapper'

export default function CategoriesSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold text-white">Категории</h1>
        <p className="text-white/50 mt-1">Настройка категорий доходов и расходов</p>
      </div>

      <CategoryManagerWrapper />
    </div>
  )
}
