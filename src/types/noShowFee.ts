export type FeeStatus = 'pending' | 'charged' | 'waived'

export interface NoShowFeeRow {
  id: string
  status: FeeStatus
  note: string | null
  created_at: string
  resolved_at: string | null
  profiles: { full_name: string | null; email: string | null } | null
  reservations: {
    start_time: string
    end_time: string
    courts: { number: number } | null
  } | null
}
