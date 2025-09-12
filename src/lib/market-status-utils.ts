/**
 * Market Status Utilities
 * Handles timezone-aware market status calculations for global users
 */

export interface MarketStatusInfo {
  isOpen: boolean
  status: 'pre-market' | 'regular' | 'after-hours' | 'closed'
  currentTimeET: string
  currentTimeLocal: string
  nextOpenET?: string
  nextCloseET?: string
  tradingSession: string
  timezoneInfo: {
    userTimezone: string
    marketTimezone: string
  }
}

export interface MarketHours {
  preMarketOpen: number  // minutes from midnight
  regularOpen: number
  regularClose: number
  afterHoursClose: number
}

// US Market hours in Eastern Time (ET)
const US_MARKET_HOURS: MarketHours = {
  preMarketOpen: 4 * 60,      // 4:00 AM ET
  regularOpen: 9 * 60 + 30,   // 9:30 AM ET
  regularClose: 16 * 60,      // 4:00 PM ET
  afterHoursClose: 20 * 60    // 8:00 PM ET
}

/**
 * Get user's timezone from various sources
 */
export function getUserTimezone(userPreferences?: { timezone?: string }): string {
  // 1. Check user preferences first
  if (userPreferences?.timezone && userPreferences.timezone !== 'UTC') {
    return userPreferences.timezone
  }
  
  // 2. Try to detect browser timezone
  try {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (browserTimezone) {
      return browserTimezone
    }
  } catch (error) {
    console.warn('Could not detect browser timezone:', error)
  }
  
  // 3. Fallback to UTC
  return 'UTC'
}

/**
 * Format time in a specific timezone
 */
export function formatTimeInTimezone(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date)
  } catch (error) {
    console.warn(`Error formatting time for timezone ${timezone}:`, error)
    return date.toLocaleString()
  }
}

/**
 * Get market status with timezone awareness
 */
export function getMarketStatus(
  userTimezone?: string,
  userPreferences?: { timezone?: string }
): MarketStatusInfo {
  const now = new Date()
  const userTz = userTimezone || getUserTimezone(userPreferences)
  
  // Always calculate market status in ET (market timezone)
  const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const day = etTime.getDay()
  const minutes = etTime.getHours() * 60 + etTime.getMinutes()
  
  // Market is closed on weekends
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      status: 'closed',
      currentTimeET: formatTimeInTimezone(now, 'America/New_York'),
      currentTimeLocal: formatTimeInTimezone(now, userTz),
      tradingSession: 'Market Closed (Weekend)',
      timezoneInfo: {
        userTimezone: userTz,
        marketTimezone: 'America/New_York'
      }
    }
  }
  
  // Check trading sessions
  const { preMarketOpen, regularOpen, regularClose, afterHoursClose } = US_MARKET_HOURS
  
  let status: MarketStatusInfo['status']
  let tradingSession: string
  let isOpen: boolean
  
  if (minutes >= preMarketOpen && minutes < regularOpen) {
    status = 'pre-market'
    tradingSession = 'Pre-Market Trading'
    isOpen = true
  } else if (minutes >= regularOpen && minutes < regularClose) {
    status = 'regular'
    tradingSession = 'Regular Trading Hours'
    isOpen = true
  } else if (minutes >= regularClose && minutes < afterHoursClose) {
    status = 'after-hours'
    tradingSession = 'After-Hours Trading'
    isOpen = true
  } else {
    status = 'closed'
    tradingSession = 'Market Closed'
    isOpen = false
  }
  
  // Calculate next open/close times
  const nextOpenET = getNextMarketOpen(etTime)
  const nextCloseET = getNextMarketClose(etTime)
  
  return {
    isOpen,
    status,
    currentTimeET: formatTimeInTimezone(now, 'America/New_York'),
    currentTimeLocal: formatTimeInTimezone(now, userTz),
    nextOpenET: nextOpenET ? formatTimeInTimezone(nextOpenET, 'America/New_York') : undefined,
    nextCloseET: nextCloseET ? formatTimeInTimezone(nextCloseET, 'America/New_York') : undefined,
    tradingSession,
    timezoneInfo: {
      userTimezone: userTz,
      marketTimezone: 'America/New_York'
    }
  }
}

/**
 * Get next market open time
 */
function getNextMarketOpen(currentTime: Date): Date | null {
  const etTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const day = etTime.getDay()
  const minutes = etTime.getHours() * 60 + etTime.getMinutes()
  
  // If it's weekend, next open is Monday 4:00 AM ET
  if (day === 0) { // Sunday
    const nextMonday = new Date(etTime)
    nextMonday.setDate(etTime.getDate() + 1)
    nextMonday.setHours(4, 0, 0, 0)
    return nextMonday
  } else if (day === 6) { // Saturday
    const nextMonday = new Date(etTime)
    nextMonday.setDate(etTime.getDate() + 2)
    nextMonday.setHours(4, 0, 0, 0)
    return nextMonday
  }
  
  // If it's a weekday and before 4:00 AM, next open is today at 4:00 AM
  if (minutes < US_MARKET_HOURS.preMarketOpen) {
    const nextOpen = new Date(etTime)
    nextOpen.setHours(4, 0, 0, 0)
    return nextOpen
  }
  
  // If it's after 8:00 PM, next open is tomorrow at 4:00 AM
  if (minutes >= US_MARKET_HOURS.afterHoursClose) {
    const nextOpen = new Date(etTime)
    nextOpen.setDate(etTime.getDate() + 1)
    nextOpen.setHours(4, 0, 0, 0)
    return nextOpen
  }
  
  return null
}

/**
 * Get next market close time
 */
function getNextMarketClose(currentTime: Date): Date | null {
  const etTime = new Date(currentTime.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const day = etTime.getDay()
  const minutes = etTime.getHours() * 60 + etTime.getMinutes()
  
  // If it's weekend, next close is Monday 8:00 PM ET
  if (day === 0) { // Sunday
    const nextMonday = new Date(etTime)
    nextMonday.setDate(etTime.getDate() + 1)
    nextMonday.setHours(20, 0, 0, 0)
    return nextMonday
  } else if (day === 6) { // Saturday
    const nextMonday = new Date(etTime)
    nextMonday.setDate(etTime.getDate() + 2)
    nextMonday.setHours(20, 0, 0, 0)
    return nextMonday
  }
  
  // If it's before 8:00 PM, next close is today at 8:00 PM
  if (minutes < US_MARKET_HOURS.afterHoursClose) {
    const nextClose = new Date(etTime)
    nextClose.setHours(20, 0, 0, 0)
    return nextClose
  }
  
  // If it's after 8:00 PM, next close is tomorrow at 8:00 PM
  const nextClose = new Date(etTime)
  nextClose.setDate(etTime.getDate() + 1)
  nextClose.setHours(20, 0, 0, 0)
  return nextClose
}

/**
 * Format market status message for display
 */
export function formatMarketStatusMessage(marketStatus: MarketStatusInfo): string {
  if (marketStatus.isOpen) {
    return `${marketStatus.tradingSession} • Local: ${marketStatus.currentTimeLocal} • ET: ${marketStatus.currentTimeET}`
  } else {
    const nextOpen = marketStatus.nextOpenET ? ` • Next Open: ${marketStatus.nextOpenET} ET` : ''
    return `Market Closed • Local: ${marketStatus.currentTimeLocal} • ET: ${marketStatus.currentTimeET}${nextOpen}`
  }
}

/**
 * Get timezone display name
 */
export function getTimezoneDisplayName(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    })
    return formatter.formatToParts(new Date())
      .find(part => part.type === 'timeZoneName')?.value || timezone
  } catch (error) {
    return timezone
  }
}
