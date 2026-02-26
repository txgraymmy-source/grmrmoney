export interface SalaryRuleInput {
  type: string
  amount?: number | null
  percent?: number | null
  source?: string | null
  label?: string | null
}

export interface TransactionInput {
  amount: string
  type: string
  source: string
  timestamp: Date | string
}

export function calculateSalary(
  rules: SalaryRuleInput[],
  transactions: TransactionInput[] | undefined | null,
  period: string
): number {
  const txList = transactions ?? []
  const [year, month] = period.split('-').map(Number)
  const pTxs = txList.filter(tx => {
    const d = new Date(tx.timestamp)
    return d.getFullYear() === year && d.getMonth() + 1 === month
  })

  return rules.reduce((total, rule) => {
    if (rule.type === 'fixed') return total + (rule.amount ?? 0)
    if (rule.type === 'percent') {
      const pct = (rule.percent ?? 0) / 100
      const ofGross = pTxs
        .filter(t => t.source === 'onlyfans' && t.type === 'incoming')
        .reduce((s, t) => s + parseFloat(t.amount), 0)
      const crypto = pTxs
        .filter(t => t.source === 'blockchain' && t.type === 'incoming')
        .reduce((s, t) => s + parseFloat(t.amount), 0)
      const base =
        rule.source === 'of_gross' ? ofGross
        : rule.source === 'of_net' ? ofGross * 0.8
        : rule.source === 'crypto' ? crypto
        : ofGross * 0.8 + crypto
      return total + base * pct
    }
    return total
  }, 0)
}

export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

export function ruleDescription(rule: SalaryRuleInput): string {
  if (rule.type === 'fixed') return `${rule.amount} USDT`
  if (rule.type === 'per_unit') return `${rule.amount} USDT / ${rule.label || 'шт'}`
  if (rule.type === 'manual') return rule.label ? `Вручную (${rule.label})` : 'Вручную'
  const sourceLabel =
    rule.source === 'of_gross' ? 'OF брутто'
    : rule.source === 'of_net' ? 'OF нетто'
    : rule.source === 'crypto' ? 'крипто'
    : 'всё'
  return `${rule.percent}% от ${sourceLabel}`
}

export function isManualRule(rules: SalaryRuleInput[]): boolean {
  return rules.some(r => r.type === 'manual' || r.type === 'per_unit')
}
