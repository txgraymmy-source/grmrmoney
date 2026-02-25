'use client'

import DashboardCharts, { ProjectStat, DailyBalanceItem, FundStat } from './DashboardCharts'

interface Props {
  projectStats: ProjectStat[]
  businessDailyData: DailyBalanceItem[]
  fundStats: FundStat[]
  showBar: boolean
  showLine: boolean
  showTable: boolean
}

export default function DashboardClient({ projectStats, businessDailyData, fundStats, showBar, showLine, showTable }: Props) {
  return (
    <DashboardCharts
      projectStats={projectStats}
      businessDailyData={businessDailyData}
      fundStats={fundStats}
      showBar={showBar}
      showLine={showLine}
      showTable={showTable}
    />
  )
}
