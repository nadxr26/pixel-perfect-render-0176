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
          user_id: string
        }
        Insert: {
          conversation_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string
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
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
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
          joined_at: string
          match_id: string
          spots: number
          user_id: string
        }
        Insert: {
          joined_at?: string
          match_id: string
          spots?: number
          user_id: string
        }
        Update: {
          joined_at?: string
          match_id?: string
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
          created_at: string
          description: string
          end_hour: number
          fee: number
          ground_id: string
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
          created_at?: string
          description?: string
          end_hour: number
          fee?: number
          ground_id: string
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
          created_at?: string
          description?: string
          end_hour?: number
          fee?: number
          ground_id?: string
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
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          message: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
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
      get_or_create_dm: { Args: { _other: string }; Returns: string }
      is_member: { Args: { _conv: string; _user: string }; Returns: boolean }
      join_match: { Args: { _m: string; _spots?: number }; Returns: undefined }
      join_waitlist: { Args: { _m: string }; Returns: undefined }
      leave_match: { Args: { _m: string }; Returns: undefined }
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
      mark_read: { Args: { _conv: string }; Returns: undefined }
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
