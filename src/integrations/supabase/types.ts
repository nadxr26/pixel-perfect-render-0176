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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      conversation_members: {
        Row: {
          conversation_id: string
          hidden_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          hidden_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          hidden_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          name: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id?: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ground_bookings: {
        Row: {
          amount_per_player: number
          booking_date: string
          created_at: string
          end_hour: number
          ground_id: string
          host_id: string
          id: string
          platform_fee_per_player: number
          required_players: number
          start_hour: number
          status: string
          total_price: number
        }
        Insert: {
          amount_per_player?: number
          booking_date: string
          created_at?: string
          end_hour: number
          ground_id: string
          host_id?: string
          id?: string
          platform_fee_per_player?: number
          required_players: number
          start_hour: number
          status?: string
          total_price: number
        }
        Update: {
          amount_per_player?: number
          booking_date?: string
          created_at?: string
          end_hour?: number
          ground_id?: string
          host_id?: string
          id?: string
          platform_fee_per_player?: number
          required_players?: number
          start_hour?: number
          status?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "ground_bookings_ground_id_fkey"
            columns: ["ground_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ground_bookings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_participants: {
        Row: {
          amount: number | null
          joined_at: string
          match_id: string
          paid_at: string | null
          payment_status: string
          spots: number
          user_id: string
        }
        Insert: {
          amount?: number | null
          joined_at?: string
          match_id: string
          paid_at?: string | null
          payment_status?: string
          spots?: number
          user_id: string
        }
        Update: {
          amount?: number | null
          joined_at?: string
          match_id?: string
          paid_at?: string | null
          payment_status?: string
          spots?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_participants_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_waitlist: {
        Row: {
          created_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_waitlist_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          amount_per_player: number | null
          booking_id: string | null
          created_at: string
          description: string
          end_hour: number
          fee: number
          ground_id: string
          ground_price: number | null
          host_id: string
          id: string
          match_date: string
          max_players: number
          skill: string
          sport: string
          start_hour: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_per_player?: number | null
          booking_id?: string | null
          created_at?: string
          description?: string
          end_hour: number
          fee?: number
          ground_id: string
          ground_price?: number | null
          host_id?: string
          id?: string
          match_date: string
          max_players: number
          skill?: string
          sport: string
          start_hour: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_per_player?: number | null
          booking_id?: string | null
          created_at?: string
          description?: string
          end_hour?: number
          fee?: number
          ground_id?: string
          ground_price?: number | null
          host_id?: string
          id?: string
          match_date?: string
          max_players?: number
          skill?: string
          sport?: string
          start_hour?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "ground_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          reply_to: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          reply_to?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          reply_to?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      player_ratings: {
        Row: {
          created_at: string
          match_id: string
          mvp: boolean
          punctuality: number
          rated_id: string
          rater_id: string
          skill: number
          sportsmanship: number
        }
        Insert: {
          created_at?: string
          match_id: string
          mvp?: boolean
          punctuality: number
          rated_id: string
          rater_id?: string
          skill: number
          sportsmanship: number
        }
        Update: {
          created_at?: string
          match_id?: string
          mvp?: boolean
          punctuality?: number
          rated_id?: string
          rater_id?: string
          skill?: number
          sportsmanship?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_ratings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          city: string | null
          created_at: string
          id: string
          last_seen: string
          location_sharing: boolean
          name: string
          photo: string | null
          skill_level: string
          sports: string[]
        }
        Insert: {
          city?: string | null
          created_at?: string
          id: string
          last_seen?: string
          location_sharing?: boolean
          name?: string
          photo?: string | null
          skill_level?: string
          sports?: string[]
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          last_seen?: string
          location_sharing?: boolean
          name?: string
          photo?: string | null
          skill_level?: string
          sports?: string[]
        }
        Relationships: []
      }
      team_members: {
        Row: {
          joined_at: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          captain_id: string
          city: string
          created_at: string
          id: string
          name: string
          sport: string
        }
        Insert: {
          captain_id?: string
          city?: string
          created_at?: string
          id?: string
          name: string
          sport: string
        }
        Update: {
          captain_id?: string
          city?: string
          created_at?: string
          id?: string
          name?: string
          sport?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_fixtures: {
        Row: {
          created_at: string
          id: string
          round: number
          score_a: number | null
          score_b: number | null
          status: string
          team_a: string
          team_b: string
          tournament_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          round: number
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a: string
          team_b: string
          tournament_id: string
        }
        Update: {
          created_at?: string
          id?: string
          round?: number
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a?: string
          team_b?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_fixtures_team_a_fkey"
            columns: ["team_a"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_fixtures_team_b_fkey"
            columns: ["team_b"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_fixtures_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          registered_at: string
          team_id: string
          tournament_id: string
        }
        Insert: {
          registered_at?: string
          team_id: string
          tournament_id: string
        }
        Update: {
          registered_at?: string
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          description: string
          entry_fee: number
          format: string
          ground_id: string | null
          id: string
          max_teams: number
          organizer_id: string
          prize: string
          sport: string
          start_date: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          entry_fee?: number
          format?: string
          ground_id?: string | null
          id?: string
          max_teams?: number
          organizer_id?: string
          prize?: string
          sport: string
          start_date: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          entry_fee?: number
          format?: string
          ground_id?: string | null
          id?: string
          max_teams?: number
          organizer_id?: string
          prize?: string
          sport?: string
          start_date?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_ground_id_fkey"
            columns: ["ground_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          lat: number
          lng: number
          updated_at: string
          user_id: string
        }
        Insert: {
          lat: number
          lng: number
          updated_at?: string
          user_id: string
        }
        Update: {
          lat?: number
          lng?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          access: string
          active: boolean
          address: string | null
          area: string
          bookable: boolean
          created_at: string
          id: string
          kind: string
          location_verified: boolean
          name: string
          phone: string | null
          price_per_hour: number | null
          sports: string[]
        }
        Insert: {
          access?: string
          active?: boolean
          address?: string | null
          area: string
          bookable?: boolean
          created_at?: string
          id: string
          kind: string
          location_verified?: boolean
          name: string
          phone?: string | null
          price_per_hour?: number | null
          sports?: string[]
        }
        Update: {
          access?: string
          active?: boolean
          address?: string | null
          area?: string
          bookable?: boolean
          created_at?: string
          id?: string
          kind?: string
          location_verified?: boolean
          name?: string
          phone?: string | null
          price_per_hour?: number | null
          sports?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_match_participant_list: {
        Args: { _match_id: string }
        Returns: boolean
      }
      create_group: {
        Args: { _members: string[]; _name: string }
        Returns: string
      }
      get_follow_counts: {
        Args: { _profile_id: string }
        Returns: {
          followers: number
          following: number
        }[]
      }
      get_match_payment_details: {
        Args: { _match_ids: string[] }
        Returns: {
          amount: number
          match_id: string
          paid_at: string
          payment_status: string
          user_id: string
        }[]
      }
      get_or_create_dm: { Args: { _other: string }; Returns: string }
      get_player_stats: {
        Args: { _u: string }
        Returns: {
          avg_punctuality: number
          avg_skill: number
          avg_sportsmanship: number
          matches_played: number
          mvp_count: number
          ratings_count: number
        }[]
      }
      get_waitlist_counts: {
        Args: { _match_ids: string[] }
        Returns: {
          match_id: string
          my_position: number
          waitlist_count: number
        }[]
      }
      hide_conversation: { Args: { _c: string }; Returns: undefined }
      is_member: { Args: { _conv: string; _user: string }; Returns: boolean }
      join_match: { Args: { _m: string; _spots?: number }; Returns: undefined }
      join_team: { Args: { _t: string }; Returns: undefined }
      join_waitlist: { Args: { _m: string }; Returns: undefined }
      leave_match: { Args: { _m: string }; Returns: undefined }
      leave_team: { Args: { _t: string }; Returns: undefined }
      leave_waitlist: { Args: { _m: string }; Returns: undefined }
      list_players: {
        Args: never
        Returns: {
          city: string
          distance_hidden: boolean
          distance_km: number
          id: string
          last_seen: string
          name: string
          photo: string
          skill_level: string
          sports: string[]
        }[]
      }
      list_teams: {
        Args: never
        Returns: {
          captain_id: string
          captain_name: string
          city: string
          created_at: string
          id: string
          is_member: boolean
          member_count: number
          name: string
          sport: string
        }[]
      }
      mark_read: { Args: { _conv: string }; Returns: undefined }
      my_match_history: {
        Args: never
        Returns: {
          ground_id: string
          is_host: boolean
          match_date: string
          match_id: string
          sport: string
          start_hour: number
          status: string
          title: string
        }[]
      }
      pay_demo: { Args: { _m: string }; Returns: undefined }
      rate_player: {
        Args: {
          _m: string
          _mvp: boolean
          _punct: number
          _skill: number
          _sport: number
          _u: string
        }
        Returns: undefined
      }
      rateable_players: {
        Args: { _m: string }
        Returns: {
          my_mvp: boolean
          my_punctuality: number
          my_skill: number
          my_sportsmanship: number
          name: string
          photo: string
          user_id: string
        }[]
      }
      register_team: { Args: { _t: string; _team: string }; Returns: undefined }
      remove_player: { Args: { _m: string; _u: string }; Returns: undefined }
      set_fixture_result: {
        Args: { _a: number; _b: number; _f: string }
        Returns: undefined
      }
      start_tournament: { Args: { _t: string }; Returns: undefined }
      sync_payments: { Args: { _m: string }; Returns: undefined }
      team_roster: {
        Args: { _t: string }
        Returns: {
          name: string
          photo: string
          skill_level: string
          user_id: string
        }[]
      }
      unsend_message: { Args: { _id: string }; Returns: undefined }
      withdraw_team: { Args: { _t: string; _team: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
