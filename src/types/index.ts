export type UserRole = 'member' | 'admin'
export type MemberStatus = 'pending' | 'approved' | 'rejected'
export type LoanStatus = 'requested' | 'active' | 'returned' | 'lost' | 'rejected'
export type PaymentType = 'membership' | 'loan' | 'penalty' | 'digital'
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'
export type WaitlistStatus = 'waiting' | 'notified' | 'fulfilled' | 'cancelled' | 'expired'

export interface Profile {
  id: string; email: string; full_name: string; phone: string
  address: string; emergency_name: string; emergency_phone: string
  fayda_path: string | null; role: UserRole; status: MemberStatus
  reject_reason: string | null; approved_at: string | null
  approved_by: string | null; created_at: string
}
export interface Book {
  id: string; title: string; author: string; pub_year: number | null
  edition: string | null; price_per_day: number; replacement_price: number
  total_copies: number; cover_url: string | null; created_at: string
  pdf_path: string | null; digital_price: number
}
export interface BookCatalog extends Book {
  available_copies: number; waiting_count: number
}
export interface Loan {
  id: string; book_id: string; user_id: string; days_requested: number
  rental_fee: number; status: LoanStatus; requested_at: string
  start_date: string | null; due_date: string | null; returned_at: string | null
  penalty_amount: number; penalty_settled: boolean
}
export interface LoanDetailed extends Loan {
  title: string; author: string; penalty_due: number; is_overdue: boolean
}
export interface Payment {
  id: string; user_id: string; loan_id: string | null; book_id?: string | null; type: PaymentType
  amount: number; method: string; txn_id: string | null; proof_path: string | null
  status: PaymentStatus; reject_reason: string | null; created_at: string
  reviewed_by: string | null; reviewed_at: string | null
}
export interface DigitalAccess {
  id: string; user_id: string; book_id: string; payment_id: string | null; granted_at: string
}
export interface Waitlist {
  id: string; book_id: string; user_id: string; status: WaitlistStatus
  created_at: string; notified_at: string | null
}
export interface AdminStats {
  total_titles: number; total_copies: number; active_loans: number
  overdue_loans: number; members: number; pending_members: number
  pending_payments: number; penalties_collected: number
  penalties_outstanding: number; rental_income: number; checked_at: string
}
export interface Settings { key: string; value: string; description: string | null }
