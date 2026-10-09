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
      car_models: {
        Row: {
          class: string
          id: string
          name: string
          prestige: number
          price: number
        }
        Insert: {
          class: string
          id: string
          name: string
          prestige?: number
          price: number
        }
        Update: {
          class?: string
          id?: string
          name?: string
          prestige?: number
          price?: number
        }
        Relationships: []
      }
      cars: {
        Row: {
          bought_at: string
          bought_price: number
          id: string
          model_id: string
          upgrade_level: number
          user_id: string
        }
        Insert: {
          bought_at?: string
          bought_price: number
          id?: string
          model_id: string
          upgrade_level?: number
          user_id: string
        }
        Update: {
          bought_at?: string
          bought_price?: number
          id?: string
          model_id?: string
          upgrade_level?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cars_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "car_models"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee: string
          bond: number
          created_at: string
          id: string
          met_in: string | null
          requester: string
          status: string
        }
        Insert: {
          addressee: string
          bond?: number
          created_at?: string
          id?: string
          met_in?: string | null
          requester: string
          status?: string
        }
        Update: {
          addressee?: string
          bond?: number
          created_at?: string
          id?: string
          met_in?: string | null
          requester?: string
          status?: string
        }
        Relationships: []
      }
      lives: {
        Row: {
          age: number
          born_city: string
          career: string | null
          city_id: string
          countries: number
          created_at: string
          data: Json
          decisions: number
          id: string
          is_branch: boolean
          label: string
          net_worth: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number
          born_city: string
          career?: string | null
          city_id: string
          countries?: number
          created_at?: string
          data: Json
          decisions?: number
          id: string
          is_branch?: boolean
          label: string
          net_worth?: number
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          born_city?: string
          career?: string | null
          city_id?: string
          countries?: number
          created_at?: string
          data?: Json
          decisions?: number
          id?: string
          is_branch?: boolean
          label?: string
          net_worth?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          recipient: string
          sender: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          recipient: string
          sender: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          recipient?: string
          sender?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          city_id: string | null
          contact: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          last_seen: string
        }
        Insert: {
          city_id?: string | null
          contact?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          last_seen?: string
        }
        Update: {
          city_id?: string | null
          contact?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          last_seen?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          cash: number
          created_at: string
          last_interest_at: string
          last_work_at: string | null
          savings: number
          total_earned: number
          user_id: string
        }
        Insert: {
          cash?: number
          created_at?: string
          last_interest_at?: string
          last_work_at?: string | null
          savings?: number
          total_earned?: number
          user_id: string
        }
        Update: {
          cash?: number
          created_at?: string
          last_interest_at?: string
          last_work_at?: string | null
          savings?: number
          total_earned?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      befriend: { Args: { _met_in?: string; _other: string }; Returns: string }
      buy_car: { Args: { _model: string }; Returns: string }
      car_value: {
        Args: { _c: Database["public"]["Tables"]["cars"]["Row"] }
        Returns: number
      }
      directory: {
        Args: { _city?: string; _q?: string }
        Returns: {
          cars: number
          city_id: string
          display_name: string
          id: string
          last_seen: string
        }[]
      }
      friend_contacts: {
        Args: never
        Returns: {
          contact: string
          other: string
        }[]
      }
      friend_list: {
        Args: never
        Returns: {
          bond: number
          city_id: string
          display_name: string
          friendship_id: string
          incoming: boolean
          met_in: string
          other: string
          status: string
        }[]
      }
      hang_out: { Args: { _friend: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_savings: {
        Args: { _amount: number; _to_savings: boolean }
        Returns: {
          cash: number
          created_at: string
          last_interest_at: string
          last_work_at: string | null
          savings: number
          total_earned: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_wallet: {
        Args: never
        Returns: {
          cash: number
          created_at: string
          last_interest_at: string
          last_work_at: string | null
          savings: number
          total_earned: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sell_car: { Args: { _car: string }; Returns: number }
      send_message: { Args: { _body: string; _to: string }; Returns: undefined }
      upgrade_car: { Args: { _car: string }; Returns: number }
      work_shift: { Args: { _job: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
