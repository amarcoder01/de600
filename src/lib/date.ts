export function formatUtcDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '—'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return '—'
  const iso = d.toISOString() // e.g., 2025-09-28T14:30:00.000Z
  return iso.slice(0, 10) // YYYY-MM-DD
}

export function formatUtcDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '—'
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return '—'
  const iso = d.toISOString() // 2025-09-28T14:30:00.000Z
  const date = iso.slice(0, 10)
  const time = iso.slice(11, 16) // HH:MM
  return `${date} ${time} UTC`
}


