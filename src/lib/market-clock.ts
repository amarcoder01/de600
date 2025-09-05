// Market Clock utility for US equities (Eastern Time)
// Provides reusable market status and hours checks with weekend/holiday handling.

export type MarketStatus = {
  isOpen: boolean
  status: 'pre-market' | 'open' | 'after-hours' | 'closed'
  nextOpen: string
  nextClose: string
}

export type MarketClockOptions = {
  extendedHours?: boolean
  now?: Date
}

// Default US market hours (ET)
const MARKET_HOURS = {
  preMarket: { start: '04:00', end: '09:30' },
  regular: { start: '09:30', end: '16:00' },
  afterHours: { start: '16:00', end: '20:00' },
}

function toEastern(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }))
}

function timeHHMM(d: Date): string {
  return d.toTimeString().slice(0, 5)
}

function isWeekend(d: Date): boolean {
  const day = d.getDay() // 0=Sun, 6=Sat
  return day === 0 || day === 6
}

// Basic US market holiday checker (placeholder). Consider integrating a proper holiday calendar.
function isHoliday(d: Date): boolean {
  // Simple static list by month-day for common holidays when markets are closed or early close.
  // This can be expanded or replaced with an API/source.
  const md = `${d.getMonth() + 1}-${d.getDate()}` // month-day
  const commonClosures = new Set<string>([
    '1-1',    // New Year's Day (observed rules not handled here)
    '7-4',    // Independence Day
    '12-25',  // Christmas Day
  ])
  return commonClosures.has(md)
}

function within(a: string, b: string, t: string): boolean {
  return t >= a && t < b
}

export function isRegularOpen(options: MarketClockOptions = {}): boolean {
  const now = toEastern(options.now ?? new Date())
  if (isWeekend(now) || isHoliday(now)) return false
  const t = timeHHMM(now)
  return within(MARKET_HOURS.regular.start, MARKET_HOURS.regular.end, t)
}

export function isPreMarket(options: MarketClockOptions = {}): boolean {
  const now = toEastern(options.now ?? new Date())
  if (isWeekend(now) || isHoliday(now)) return false
  const t = timeHHMM(now)
  return within(MARKET_HOURS.preMarket.start, MARKET_HOURS.preMarket.end, t)
}

export function isAfterHours(options: MarketClockOptions = {}): boolean {
  const now = toEastern(options.now ?? new Date())
  if (isWeekend(now) || isHoliday(now)) return false
  const t = timeHHMM(now)
  return within(MARKET_HOURS.afterHours.start, MARKET_HOURS.afterHours.end, t)
}

export function getMarketStatus(options: MarketClockOptions = {}): MarketStatus {
  const now = toEastern(options.now ?? new Date())
  const open = isRegularOpen({ now })
  const pre = isPreMarket({ now })
  const after = isAfterHours({ now })

  let status: MarketStatus['status'] = 'closed'
  if (pre) status = 'pre-market'
  else if (open) status = 'open'
  else if (after) status = 'after-hours'
  else status = 'closed'

  // For simplicity, we return the standard next open/close times
  return {
    isOpen: open,
    status,
    nextOpen: MARKET_HOURS.regular.start,
    nextClose: MARKET_HOURS.regular.end,
  }
}
