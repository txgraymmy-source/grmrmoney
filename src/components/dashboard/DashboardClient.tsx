'use client'

import DashboardCharts, { ProjectStat, DailyBalanceItem, FundStat, ExpenseCategoryStat } from './DashboardCharts'

interface Props {
  projectStats: ProjectStat[]
  businessDailyData: DailyBalanceItem[]
  fundStats: FundStat[]
  expenseCategoryStats: ExpenseCategoryStat[]
  showBar: boolean
  showLine: boolean
  showTable: boolean
  showExpenseCategories: boolean
}

export default function DashboardClient({ projectStats, businessDailyData, fundStats, expenseCategoryStats, showBar, showLine, showTable, showExpenseCategories }: Props) {
  return (
    <DashboardCharts
      projectStats={projectStats}
      businessDailyData={businessDailyData}
      fundStats={fundStats}
      expenseCategoryStats={expenseCategoryStats}
      showBar={showBar}
      showLine={showLine}
      showTable={showTable}
      showExpenseCategories={showExpenseCategories}
    />
  )
}
