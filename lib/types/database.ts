export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          is_general_category: boolean
          madrassa_id: string
          name: string
          starting_number: number
        }
        Insert: {
          id?: string
          is_general_category?: boolean
          madrassa_id: string
          name: string
          starting_number?: number
        }
        Update: {
          id?: string
          is_general_category?: boolean
          madrassa_id?: string
          name?: string
          starting_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      event_judges: {
        Row: {
          created_at: string
          event_id: string
          id: string
          judge_id: string
          madrassa_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          judge_id: string
          madrassa_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          judge_id?: string
          madrassa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_judges_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_judges_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_judges_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          code_letter: string
          created_at: string
          event_id: string
          id: string
          madrassa_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          registration_id: string | null
          student_id: string | null
        }
        Insert: {
          code_letter: string
          created_at?: string
          event_id: string
          id?: string
          madrassa_id: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          registration_id?: string | null
          student_id?: string | null
        }
        Update: {
          code_letter?: string
          created_at?: string
          event_id?: string
          id?: string
          madrassa_id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          registration_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string
          id: string
          madrassa_id: string
          student_id: string
          team_id: string | null
        }
        Insert: {
          event_id: string
          id?: string
          madrassa_id: string
          student_id: string
          team_id?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          madrassa_id?: string
          student_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_schedules: {
        Row: {
          end_time: string | null
          event_id: string
          id: string
          madrassa_id: string
          stage_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["schedule_status"]
        }
        Insert: {
          end_time?: string | null
          event_id: string
          id?: string
          madrassa_id: string
          stage_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
        }
        Update: {
          end_time?: string | null
          event_id?: string
          id?: string
          madrassa_id?: string
          stage_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedules_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_schedules_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      event_squads: {
        Row: {
          code_letter: string
          created_at: string
          event_id: string
          id: string
          madrassa_id: string
          member_registration_ids: string[] | null
          member_student_ids: string[] | null
          squad_index: number | null
          team_id: string | null
        }
        Insert: {
          code_letter: string
          created_at?: string
          event_id: string
          id?: string
          madrassa_id: string
          member_registration_ids?: string[] | null
          member_student_ids?: string[] | null
          squad_index?: number | null
          team_id?: string | null
        }
        Update: {
          code_letter?: string
          created_at?: string
          event_id?: string
          id?: string
          madrassa_id?: string
          member_registration_ids?: string[] | null
          member_student_ids?: string[] | null
          squad_index?: number | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_squads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_squads_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_squads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      event_subgroups: {
        Row: {
          code_letter: string
          event_id: string
          id: string
          madrassa_id: string
          member_registration_ids: string[] | null
          member_student_ids: string[] | null
          squad_index: number | null
          squad_number: number
          team_id: string | null
        }
        Insert: {
          code_letter: string
          event_id: string
          id?: string
          madrassa_id: string
          member_registration_ids?: string[] | null
          member_student_ids?: string[] | null
          squad_index?: number | null
          squad_number: number
          team_id?: string | null
        }
        Update: {
          code_letter?: string
          event_id?: string
          id?: string
          madrassa_id?: string
          member_registration_ids?: string[] | null
          member_student_ids?: string[] | null
          squad_index?: number | null
          squad_number?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_subgroups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_subgroups_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_subgroups_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category: string | null
          category_id: string | null
          gender_rule: Database["public"]["Enums"]["gender_rule"]
          group_strength: number | null
          id: string
          is_general: boolean
          is_group_event: boolean
          madrassa_id: string
          name: string
          participant_mode: string | null
          point_rules: Json | null
          points_group: number
          points_single: number
          rubrics: Json | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          gender_rule?: Database["public"]["Enums"]["gender_rule"]
          group_strength?: number | null
          id?: string
          is_general?: boolean
          is_group_event?: boolean
          madrassa_id: string
          name: string
          participant_mode?: string | null
          point_rules?: Json | null
          points_group?: number
          points_single?: number
          rubrics?: Json | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          category?: string | null
          category_id?: string | null
          gender_rule?: Database["public"]["Enums"]["gender_rule"]
          group_strength?: number | null
          id?: string
          is_general?: boolean
          is_group_event?: boolean
          madrassa_id?: string
          name?: string
          participant_mode?: string | null
          point_rules?: Json | null
          points_group?: number
          points_single?: number
          rubrics?: Json | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      madrassas: {
        Row: {
          created_at: string
          drive_refresh_token: string | null
          id: string
          id_card_config: Json | null
          logo_url: string | null
          name: string
          password_hash: string
          register_number: string
          subdomain: string
        }
        Insert: {
          created_at?: string
          drive_refresh_token?: string | null
          id?: string
          id_card_config?: Json | null
          logo_url?: string | null
          name: string
          password_hash: string
          register_number: string
          subdomain: string
        }
        Update: {
          created_at?: string
          drive_refresh_token?: string | null
          id?: string
          id_card_config?: Json | null
          logo_url?: string | null
          name?: string
          password_hash?: string
          register_number?: string
          subdomain?: string
        }
        Relationships: []
      }
      rank_overrides: {
        Row: {
          event_id: string
          id: string
          madrassa_id: string
          override_rank: number
          participant_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          updated_at: string
        }
        Insert: {
          event_id: string
          id?: string
          madrassa_id: string
          override_rank: number
          participant_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          updated_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          madrassa_id?: string
          override_rank?: number
          participant_id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_overrides_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rank_overrides_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          average_score: number | null
          code_letter: string | null
          event_id: string
          final_rank: number | null
          id: string
          is_published: boolean
          madrassa_id: string
          participant_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          points_awarded: number
          published_at: string | null
          rank: number
          team_id: string | null
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          code_letter?: string | null
          event_id: string
          final_rank?: number | null
          id?: string
          is_published?: boolean
          madrassa_id: string
          participant_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          points_awarded?: number
          published_at?: string | null
          rank: number
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          code_letter?: string | null
          event_id?: string
          final_rank?: number | null
          id?: string
          is_published?: boolean
          madrassa_id?: string
          participant_id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          points_awarded?: number
          published_at?: string | null
          rank?: number
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          event_id: string
          id: string
          judge_id: string
          madrassa_id: string
          participant_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          score_data: Json | null
          score_data_json: Json | null
          total_score: number
          updated_at: string
        }
        Insert: {
          event_id: string
          id?: string
          judge_id: string
          madrassa_id: string
          participant_id: string
          participant_type: Database["public"]["Enums"]["participant_type"]
          score_data?: Json | null
          score_data_json?: Json | null
          total_score?: number
          updated_at?: string
        }
        Update: {
          event_id?: string
          id?: string
          judge_id?: string
          madrassa_id?: string
          participant_id?: string
          participant_type?: Database["public"]["Enums"]["participant_type"]
          score_data?: Json | null
          score_data_json?: Json | null
          total_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          id: string
          madrassa_id: string
          name: string
        }
        Insert: {
          id?: string
          madrassa_id: string
          name: string
        }
        Update: {
          id?: string
          madrassa_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "stages_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          category_id: string
          class_name: string | null
          gender: string
          id: string
          madrassa_id: string
          name: string
          register_number_3digit: string
          team_id: string | null
        }
        Insert: {
          category_id: string
          class_name?: string | null
          gender: string
          id?: string
          madrassa_id: string
          name: string
          register_number_3digit: string
          team_id?: string | null
        }
        Update: {
          category_id?: string
          class_name?: string | null
          gender?: string
          id?: string
          madrassa_id?: string
          name?: string
          register_number_3digit?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color_code: string
          id: string
          madrassa_id: string
          name: string
        }
        Insert: {
          color_code: string
          id?: string
          madrassa_id: string
          name: string
        }
        Update: {
          color_code?: string
          id?: string
          madrassa_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          id: string
          madrassa_id: string
          phone: string
          pin: string
          pin_hash: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          madrassa_id: string
          phone: string
          pin: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          id?: string
          madrassa_id?: string
          phone?: string
          pin?: string
          pin_hash?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_madrassa_id_fkey"
            columns: ["madrassa_id"]
            isOneToOne: false
            referencedRelation: "madrassas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_app_user_id: { Args: never; Returns: string }
      current_madrassa_id: { Args: never; Returns: string }
    }
    Enums: {
      event_status: "draft" | "scheduled" | "live" | "completed" | "published"
      gender_rule: "male" | "female" | "mixed"
      participant_type: "individual" | "subgroup"
      schedule_status: "pending" | "ongoing" | "completed" | "cancelled"
      user_role: "admin" | "judge"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_status: ["draft", "scheduled", "live", "completed", "published"],
      gender_rule: ["male", "female", "mixed"],
      participant_type: ["individual", "subgroup"],
      schedule_status: ["pending", "ongoing", "completed", "cancelled"],
      user_role: ["admin", "judge"],
    },
  },
} as const
