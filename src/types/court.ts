export interface Court {
  id: string
  number: number
  name: string
  latitude: number
  longitude: number
  is_active: boolean
}

export type ReservationStatus =
  | 'booked'
  | 'confirmed'
  | 'completed'
  | 'no_show'
  | 'cancelled'

export interface Reservation {
  id: string
  court_id: string
  member_id: string
  start_time: string
  end_time: string
  status: ReservationStatus
  confirmed_at: string | null
  validated_at: string | null
  reminder_sent_at: string | null
  created_at: string
}

export interface AvailabilitySlot {
  court_id: string
  start_time: string
  end_time: string
}
