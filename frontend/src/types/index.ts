export type Role = 'learner' | 'tutor';

export interface TutorProfile {
  id: number;
  user_id: number;
  hourly_rate: number | string;
  teaching_subjects?: string | null;
  experience_years: number;
  experience_description?: string | null;
  average_rating: number | string;
  total_reviews: number;
  total_sessions_completed: number;
  updated_at: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  avatar_url?: string | null;
  bio?: string | null;
  college?: string | null;
  department?: string | null;
  year_of_study?: string | null;
  learning_interests?: string | null;
  is_active: boolean;
  created_at: string;
  tutor_profile?: TutorProfile | null;
}

export interface Offering {
  id: number;
  tutor_id: number;
  title: string;
  subject: string;
  description: string;
  level: string;
  hourly_rate: number | string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tutor_name?: string | null;
  tutor_avatar?: string | null;
}

export interface Review {
  id: number;
  session_id: number;
  learner_id: number;
  learner_name: string;
  learner_avatar?: string | null;
  tutor_id: number;
  rating: number;
  comment?: string | null;
  created_at: string;
}

export interface TutorMarketplaceCard {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  college?: string | null;
  department?: string | null;
  year_of_study?: string | null;
  hourly_rate: number | string;
  teaching_subjects?: string | null;
  experience_years: number;
  experience_description?: string | null;
  average_rating: number | string;
  total_reviews: number;
  total_sessions_completed: number;
  active_offerings_count: number;
  offerings: Offering[];
}

export interface TutorDetailResponse {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  bio?: string | null;
  college?: string | null;
  department?: string | null;
  year_of_study?: string | null;
  hourly_rate: number | string;
  teaching_subjects?: string | null;
  experience_years: number;
  experience_description?: string | null;
  average_rating: number | string;
  total_reviews: number;
  total_sessions_completed: number;
  offerings: Offering[];
  reviews: Review[];
}

export interface PaginatedTutorsResponse {
  items: TutorMarketplaceCard[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface UserRegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: Role;
  college?: string;
  department?: string;
  year_of_study?: string;
  bio?: string;
  learning_interests?: string;
  avatar_url?: string;
  hourly_rate?: number;
  teaching_subjects?: string;
  experience_years?: number;
  experience_description?: string;
}

export interface UserProfileUpdatePayload {
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  college?: string;
  department?: string;
  year_of_study?: string;
  learning_interests?: string;
  hourly_rate?: number;
  teaching_subjects?: string;
  experience_years?: number;
  experience_description?: string;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export type SessionStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

/** Matches SessionDetailResponse from backend */
export interface Session {
  id: number;
  offering_id: number;
  offering_title: string;
  subject: string;
  hourly_rate: number | string;
  learner_id: number;
  learner_name: string;
  learner_avatar?: string | null;
  tutor_id: number;
  tutor_name: string;
  tutor_avatar?: string | null;
  scheduled_start: string;
  scheduled_end: string;
  duration_minutes: number;
  status: SessionStatus;
  learner_notes?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  review?: Review | null;
}

export interface SessionCreate {
  offering_id: number;
  scheduled_start: string; // ISO datetime string
  duration_minutes: number;
  learner_notes?: string;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  unread_count: number;
}

// ─── Review payload ──────────────────────────────────────────────────────────

export interface ReviewCreate {
  session_id: number;
  rating: number;
  comment?: string;
}

// ─── Offering management payloads ─────────────────────────────────────────────

export interface OfferingCreatePayload {
  title: string;
  subject: string;
  description: string;
  level: string;
  hourly_rate: number;
  is_active?: boolean;
}

export interface OfferingUpdatePayload {
  title?: string;
  subject?: string;
  description?: string;
  level?: string;
  hourly_rate?: number;
  is_active?: boolean;
}
