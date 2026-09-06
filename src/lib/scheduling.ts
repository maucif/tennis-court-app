// Club hours for bookable slots. Easy to change if your club's actual hours
// differ — ask and we'll adjust these two numbers.
export const OPEN_HOUR = 7 // 7:00 AM
export const CLOSE_HOUR = 21 // 9:00 PM (last bookable slot starts at 20:00)
export const SLOT_MINUTES = 60

export function todayIsoDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

/** All slot start times (as Date objects, in local time) for a given yyyy-mm-dd date. */
export function slotsForDate(isoDate: string): Date[] {
  const [year, month, day] = isoDate.split('-').map(Number)
  const slots: Date[] = []
  for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour++) {
    slots.push(new Date(year, month - 1, day, hour, 0, 0, 0))
  }
  return slots
}

export function slotEnd(start: Date): Date {
  return new Date(start.getTime() + SLOT_MINUTES * 60000)
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function dayRangeUtc(isoDate: string): { start: string; end: string } {
  const [year, month, day] = isoDate.split('-').map(Number)
  const start = new Date(year, month - 1, day, 0, 0, 0, 0)
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0)
  return { start: start.toISOString(), end: end.toISOString() }
}
