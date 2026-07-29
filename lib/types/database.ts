// ============================================================
// Milad Fest Management Platform — TypeScript Database Types
// Auto-mirrors supabase_schema.sql
// ============================================================

// ─── Shared primitives ───────────────────────────────────────

export type UUID = string;
export type ISOTimestamp = string; // e.g. "2025-01-01T00:00:00Z"

// ─── Enums ───────────────────────────────────────────────────

export type UserRole = 'admin' | 'judge';
export type GenderRule = 'male' | 'female' | 'mixed';
export type Gender = 'male' | 'female';
export type ParticipantType = 'individual' | 'subgroup';
export type ScheduleStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled';

// ─── JSON column shapes ───────────────────────────────────────

/**
 * Stored in madrassas.id_card_config
 * Describes how student ID cards should be rendered.
 */
export interface IdCardConfig {
  background_color?: string;
  logo_position?: 'top-left' | 'top-center' | 'top-right';
  show_team_color?: boolean;
  show_register_number?: boolean;
  footer_text?: string;
  [key: string]: unknown; // allow madrassa-specific extensions
}

/**
 * Stored in scores.score_data_json
 * Flexible per-event scoring breakdown.
 */
export interface ScoreDataJson {
  criteria?: Record<string, number>; // e.g. { pronunciation: 8, fluency: 7 }
  notes?: string;
  [key: string]: unknown;
}

// ============================================================
// TABLE INTERFACES
// ============================================================

// ─── 1. madrassas ────────────────────────────────────────────

export interface Madrassa {
  id: UUID;
  name: string;
  register_number: string;
  password_hash: string;
  subdomain: string;
  logo_url: string | null;
  id_card_config: IdCardConfig | null;
  drive_refresh_token: string | null;
  created_at: ISOTimestamp;
}

export type MadrassaInsert = Omit<Madrassa, 'id' | 'created_at'> & {
  id?: UUID;
  created_at?: ISOTimestamp;
};

export type MadrassaUpdate = Partial<MadrassaInsert>;

// Public-safe subset (never expose password_hash / drive_refresh_token to client)
export type MadrassaPublic = Omit<Madrassa, 'password_hash' | 'drive_refresh_token'>;

// ─── 2. users ────────────────────────────────────────────────

export interface User {
  id: UUID;
  madrassa_id: UUID;
  phone: string;
  pin: string;
  role: UserRole;
  created_at: ISOTimestamp;
}

export type UserInsert = Omit<User, 'id' | 'created_at'> & {
  id?: UUID;
  created_at?: ISOTimestamp;
};

export type UserUpdate = Partial<UserInsert>;

// Client-safe: never expose pin
export type UserPublic = Omit<User, 'pin'>;

// ─── 3. categories ───────────────────────────────────────────

export interface Category {
  id: UUID;
  madrassa_id: UUID;
  name: string;
  starting_number: number;
  is_general_category: boolean;
}

export type CategoryInsert = Omit<Category, 'id'> & {
  id?: UUID;
};

export type CategoryUpdate = Partial<CategoryInsert>;

// ─── 4. teams ────────────────────────────────────────────────

export interface Team {
  id: UUID;
  madrassa_id: UUID;
  name: string;
  color_code: string; // hex or CSS color, e.g. "#E63946"
}

export type TeamInsert = Omit<Team, 'id'> & {
  id?: UUID;
};

export type TeamUpdate = Partial<TeamInsert>;

// ─── 5. students ─────────────────────────────────────────────

export interface Student {
  id: UUID;
  madrassa_id: UUID;
  category_id: UUID;
  team_id: UUID | null;
  name: string;
  gender: Gender;
  class_name: string | null;
  register_number_3digit: string; // exactly 3 chars, e.g. "042"
}

export type StudentInsert = Omit<Student, 'id'> & {
  id?: UUID;
};

export type StudentUpdate = Partial<StudentInsert>;

// ─── 6. events ───────────────────────────────────────────────

export interface Event {
  id: UUID;
  madrassa_id: UUID;
  category_id: UUID | null;
  name: string;
  gender_rule: GenderRule;
  is_group_event: boolean;
  group_strength: number | null; // required when is_group_event = true
  points_single: number;
  points_group: number;
}

export type EventInsert = Omit<Event, 'id'> & {
  id?: UUID;
};

export type EventUpdate = Partial<EventInsert>;

// ─── 7. event_registrations ──────────────────────────────────

export interface EventRegistration {
  id: UUID;
  madrassa_id: UUID;
  event_id: UUID;
  student_id: UUID;
}

export type EventRegistrationInsert = Omit<EventRegistration, 'id'> & {
  id?: UUID;
};

export type EventRegistrationUpdate = Partial<EventRegistrationInsert>;

// ─── 8. event_subgroups ──────────────────────────────────────

export interface EventSubgroup {
  id: UUID;
  madrassa_id: UUID;
  event_id: UUID;
  team_id: UUID | null;
  squad_number: number;
  code_letter: string; // e.g. "A", "B", "C"
}

export type EventSubgroupInsert = Omit<EventSubgroup, 'id'> & {
  id?: UUID;
};

export type EventSubgroupUpdate = Partial<EventSubgroupInsert>;

// ─── 9. stages ───────────────────────────────────────────────

export interface Stage {
  id: UUID;
  madrassa_id: UUID;
  name: string;
}

export type StageInsert = Omit<Stage, 'id'> & {
  id?: UUID;
};

export type StageUpdate = Partial<StageInsert>;

// ─── 10. event_schedules ─────────────────────────────────────

export interface EventSchedule {
  id: UUID;
  madrassa_id: UUID;
  event_id: UUID;
  stage_id: UUID | null;
  start_time: ISOTimestamp | null;
  status: ScheduleStatus;
}

export type EventScheduleInsert = Omit<EventSchedule, 'id'> & {
  id?: UUID;
};

export type EventScheduleUpdate = Partial<EventScheduleInsert>;

// ─── 11. scores ──────────────────────────────────────────────

export interface Score {
  id: UUID;
  madrassa_id: UUID;
  event_id: UUID;
  judge_id: UUID;
  participant_type: ParticipantType;
  /** UUID of a Student (individual) or EventSubgroup (subgroup) */
  participant_id: UUID;
  score_data_json: ScoreDataJson | null;
  total_score: number;
}

export type ScoreInsert = Omit<Score, 'id'> & {
  id?: UUID;
};

export type ScoreUpdate = Partial<ScoreInsert>;

// ─── 12. results ─────────────────────────────────────────────

export interface Result {
  id: UUID;
  madrassa_id: UUID;
  event_id: UUID;
  participant_type: ParticipantType;
  /** UUID of a Student (individual) or EventSubgroup (subgroup) */
  participant_id: UUID;
  rank: number;
  points_awarded: number;
  is_published: boolean;
}

export type ResultInsert = Omit<Result, 'id'> & {
  id?: UUID;
};

export type ResultUpdate = Partial<ResultInsert>;

// ============================================================
// JOINED / VIEW TYPES  (for common queries)
// ============================================================

/** Student with their category and team resolved */
export interface StudentWithRelations extends Student {
  category: Category;
  team: Team | null;
}

/** Event with its category resolved */
export interface EventWithCategory extends Event {
  category: Category | null;
}

/** Score with judge info (no pin) */
export interface ScoreWithJudge extends Score {
  judge: UserPublic;
}

/** Result with resolved participant (either student or subgroup) */
export interface ResultWithParticipant extends Result {
  student: StudentWithRelations | null;       // populated when participant_type = 'individual'
  subgroup: EventSubgroup | null;             // populated when participant_type = 'subgroup'
}

/** Event schedule with stage and event resolved */
export interface EventScheduleWithRelations extends EventSchedule {
  event: EventWithCategory;
  stage: Stage | null;
}

/** Leaderboard row — team total points */
export interface TeamLeaderboardRow {
  team: Team;
  total_points: number;
  event_wins: number;
}

// ============================================================
// DATABASE MAP  (for typed Supabase client)
// ============================================================

/**
 * Pass this as the generic type parameter when creating your
 * Supabase client for end-to-end type safety:
 *
 *   import { createClient } from '@supabase/supabase-js'
 *   import type { Database } from '@/lib/types/database'
 *
 *   export const supabase = createClient<Database>(url, key)
 */
export interface Database {
  public: {
    Tables: {
      madrassas: {
        Row: Madrassa;
        Insert: MadrassaInsert;
        Update: MadrassaUpdate;
      };
      users: {
        Row: User;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
      };
      teams: {
        Row: Team;
        Insert: TeamInsert;
        Update: TeamUpdate;
      };
      students: {
        Row: Student;
        Insert: StudentInsert;
        Update: StudentUpdate;
      };
      events: {
        Row: Event;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      event_registrations: {
        Row: EventRegistration;
        Insert: EventRegistrationInsert;
        Update: EventRegistrationUpdate;
      };
      event_subgroups: {
        Row: EventSubgroup;
        Insert: EventSubgroupInsert;
        Update: EventSubgroupUpdate;
      };
      stages: {
        Row: Stage;
        Insert: StageInsert;
        Update: StageUpdate;
      };
      event_schedules: {
        Row: EventSchedule;
        Insert: EventScheduleInsert;
        Update: EventScheduleUpdate;
      };
      scores: {
        Row: Score;
        Insert: ScoreInsert;
        Update: ScoreUpdate;
      };
      results: {
        Row: Result;
        Insert: ResultInsert;
        Update: ResultUpdate;
      };
    };
    Enums: {
      user_role: UserRole;
      gender_rule: GenderRule;
      participant_type: ParticipantType;
      schedule_status: ScheduleStatus;
    };
  };
}
