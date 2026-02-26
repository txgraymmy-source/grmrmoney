export type PaymentFrequency = 'monthly' | 'twice_monthly' | 'biweekly' | 'weekly'

export const FREQUENCIES: { value: PaymentFrequency; label: string }[] = [
  { value: 'monthly',       label: 'Раз в месяц' },
  { value: 'twice_monthly', label: 'Дважды в месяц' },
  { value: 'biweekly',      label: 'Каждые 2 недели' },
  { value: 'weekly',        label: 'Еженедельно' },
]

export const DAYS_OF_WEEK = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
]

/** Использует ли частота числа месяца (иначе — дни недели) */
export function usesMonthDays(freq: PaymentFrequency | null | undefined): boolean {
  return freq === 'monthly' || freq === 'twice_monthly'
}

/** Парсит paymentDates строку в массив чисел */
export function parseDates(dates: string | null | undefined): number[] {
  if (!dates) return []
  return dates.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
}

/** Сериализует массив чисел в строку */
export function serializeDates(dates: number[]): string {
  return dates.join(',')
}

/** Суффикс числа для русского языка */
function daySuffix(n: number): string {
  if (n >= 11 && n <= 14) return '-е'
  const last = n % 10
  if (last === 1) return '-е'
  if (last >= 2 && last <= 4) return '-е'
  return '-е'
}

/** Человекочитаемое описание расписания */
export function scheduleLabel(
  freq: PaymentFrequency | null | undefined,
  dates: string | null | undefined
): string {
  if (!freq) return ''
  const nums = parseDates(dates)
  const suffix = ' (если нет — в последний день месяца)'

  if (freq === 'twice_monthly') {
    if (nums.length === 2) return `${nums[0]}${daySuffix(nums[0])} и ${nums[1]}${daySuffix(nums[1])} числа${nums.some(n => n > 28) ? suffix : ''}`
    if (nums.length === 1) return `${nums[0]}${daySuffix(nums[0])} число (нужно выбрать 2)`
    return 'Дважды в месяц — выберите 2 числа'
  }
  if (freq === 'monthly') {
    return nums.length
      ? `${nums.map(n => `${n}${daySuffix(n)}`).join(', ')} числа каждого месяца${nums.some(n => n > 28) ? suffix : ''}`
      : 'Раз в месяц'
  }
  if (freq === 'biweekly' || freq === 'weekly') {
    const dayNames = nums
      .map(n => DAYS_OF_WEEK.find(d => d.value === n)?.label.toLowerCase())
      .filter(Boolean)
    const prefix = freq === 'biweekly' ? 'Каждые 2 недели' : 'Еженедельно'
    return dayNames.length ? `${prefix}: ${dayNames.join(', ')}` : prefix
  }
  return ''
}
