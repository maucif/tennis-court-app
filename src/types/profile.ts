export type Role = 'member' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  is_active: boolean
  no_show_count: number
  created_at: string
}
