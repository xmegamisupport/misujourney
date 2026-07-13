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
      customer_goals: {
        Row: {
          created_at: string
          current_stage: number
          customer_id: string
          goal_status: Database["public"]["Enums"]["goal_status"]
          id: string
          long_term_goal_weight: number | null
          stage_goal_weight: number
        }
        Insert: {
          created_at?: string
          current_stage?: number
          customer_id: string
          goal_status: Database["public"]["Enums"]["goal_status"]
          id?: string
          long_term_goal_weight?: number | null
          stage_goal_weight: number
        }
        Update: {
          created_at?: string
          current_stage?: number
          customer_id?: string
          goal_status?: Database["public"]["Enums"]["goal_status"]
          id?: string
          long_term_goal_weight?: number | null
          stage_goal_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_goals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_inventory: {
        Row: {
          boxes_purchased: number
          created_at: string
          customer_id: string
          id: string
          initial_units: number
          product_code: Database["public"]["Enums"]["product_code"]
          remaining_units: number
          total_added_units: number
          total_used_units: number
          units_per_box: number
          updated_at: string
        }
        Insert: {
          boxes_purchased?: number
          created_at?: string
          customer_id: string
          id?: string
          initial_units?: number
          product_code: Database["public"]["Enums"]["product_code"]
          remaining_units?: number
          total_added_units?: number
          total_used_units?: number
          units_per_box?: number
          updated_at?: string
        }
        Update: {
          boxes_purchased?: number
          created_at?: string
          customer_id?: string
          id?: string
          initial_units?: number
          product_code?: Database["public"]["Enums"]["product_code"]
          remaining_units?: number
          total_added_units?: number
          total_used_units?: number
          units_per_box?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_inventory_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checkins: {
        Row: {
          bedtime: string
          checkin_date: string
          created_at: string
          customer_id: string
          id: string
          poop_count: Database["public"]["Enums"]["poop_count"]
          updated_at: string
          wake_time: string
          weight: number
        }
        Insert: {
          bedtime: string
          checkin_date: string
          created_at?: string
          customer_id: string
          id?: string
          poop_count: Database["public"]["Enums"]["poop_count"]
          updated_at?: string
          wake_time: string
          weight: number
        }
        Update: {
          bedtime?: string
          checkin_date?: string
          created_at?: string
          customer_id?: string
          id?: string
          poop_count?: Database["public"]["Enums"]["poop_count"]
          updated_at?: string
          wake_time?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_assessments: {
        Row: {
          bmi: number
          bmi_category: Database["public"]["Enums"]["bmi_category"]
          created_at: string
          customer_id: string
          goal_status: Database["public"]["Enums"]["goal_status"]
          id: string
          long_term_goal: number | null
          suggested_stage_goal: number
        }
        Insert: {
          bmi: number
          bmi_category: Database["public"]["Enums"]["bmi_category"]
          created_at?: string
          customer_id: string
          goal_status: Database["public"]["Enums"]["goal_status"]
          id?: string
          long_term_goal?: number | null
          suggested_stage_goal: number
        }
        Update: {
          bmi?: number
          bmi_category?: Database["public"]["Enums"]["bmi_category"]
          created_at?: string
          customer_id?: string
          goal_status?: Database["public"]["Enums"]["goal_status"]
          id?: string
          long_term_goal?: number | null
          suggested_stage_goal?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_assessments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_plans: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          journey_days: number
          target_211_meals: number
          target_check_in_days: number
          target_misu_days: number
          target_water_days: number
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          journey_days: number
          target_211_meals: number
          target_check_in_days: number
          target_misu_days: number
          target_water_days: number
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          journey_days?: number
          target_211_meals?: number
          target_check_in_days?: number
          target_misu_days?: number
          target_water_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          balance_after: number
          created_at: string
          created_by: string
          customer_id: string
          id: string
          note: string | null
          product_code: Database["public"]["Enums"]["product_code"]
          quantity_change: number
          related_record_id: string | null
          type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Insert: {
          balance_after: number
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          note?: string | null
          product_code: Database["public"]["Enums"]["product_code"]
          quantity_change: number
          related_record_id?: string | null
          type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Update: {
          balance_after?: number
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          note?: string | null
          product_code?: Database["public"]["Enums"]["product_code"]
          quantity_change?: number
          related_record_id?: string | null
          type?: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          customer_id: string
          fat: number
          fiber: number
          food_items: Json
          good_points: string[]
          id: string
          improve_points: string[]
          meal_time: string
          meal_type: string
          misu_items: Json
          misu_score: number
          name: string
          photo_emoji: string | null
          portion: string | null
          protein: number
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          customer_id: string
          fat?: number
          fiber?: number
          food_items?: Json
          good_points?: string[]
          id?: string
          improve_points?: string[]
          meal_time: string
          meal_type: string
          misu_items?: Json
          misu_score?: number
          name: string
          photo_emoji?: string | null
          portion?: string | null
          protein?: number
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          customer_id?: string
          fat?: number
          fiber?: number
          food_items?: Json
          good_points?: string[]
          id?: string
          improve_points?: string[]
          meal_time?: string
          meal_type?: string
          misu_items?: Json
          misu_score?: number
          name?: string
          photo_emoji?: string | null
          portion?: string | null
          protein?: number
        }
        Relationships: [
          {
            foreignKeyName: "meals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          age: number | null
          avatar: string | null
          coach_id: string | null
          created_at: string
          diet_type: Database["public"]["Enums"]["diet_type"] | null
          gender: string | null
          height: number | null
          id: string
          name: string
          onboarding_completed_at: string | null
          phone: string | null
          referral_code: string | null
          role: Database["public"]["Enums"]["user_role"]
          start_date: string | null
          start_weight: number | null
          updated_at: string
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          avatar?: string | null
          coach_id?: string | null
          created_at?: string
          diet_type?: Database["public"]["Enums"]["diet_type"] | null
          gender?: string | null
          height?: number | null
          id: string
          name: string
          onboarding_completed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          start_date?: string | null
          start_weight?: number | null
          updated_at?: string
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          age?: number | null
          avatar?: string | null
          coach_id?: string | null
          created_at?: string
          diet_type?: Database["public"]["Enums"]["diet_type"] | null
          gender?: string | null
          height?: number | null
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          start_date?: string | null
          start_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repurchase_alerts: {
        Row: {
          alert_level: Database["public"]["Enums"]["repurchase_alert_level"]
          completed_at: string | null
          customer_id: string
          followed_up_at: string | null
          followed_up_by: string | null
          id: string
          note: string | null
          product_code: Database["public"]["Enums"]["product_code"]
          remaining_units_when_triggered: number
          status: Database["public"]["Enums"]["repurchase_alert_status"]
          triggered_at: string
        }
        Insert: {
          alert_level: Database["public"]["Enums"]["repurchase_alert_level"]
          completed_at?: string | null
          customer_id: string
          followed_up_at?: string | null
          followed_up_by?: string | null
          id?: string
          note?: string | null
          product_code: Database["public"]["Enums"]["product_code"]
          remaining_units_when_triggered: number
          status?: Database["public"]["Enums"]["repurchase_alert_status"]
          triggered_at?: string
        }
        Update: {
          alert_level?: Database["public"]["Enums"]["repurchase_alert_level"]
          completed_at?: string | null
          customer_id?: string
          followed_up_at?: string | null
          followed_up_by?: string | null
          id?: string
          note?: string | null
          product_code?: Database["public"]["Enums"]["product_code"]
          remaining_units_when_triggered?: number
          status?: Database["public"]["Enums"]["repurchase_alert_status"]
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repurchase_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repurchase_alerts_followed_up_by_fkey"
            columns: ["followed_up_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _check_and_update_alert: {
        Args: {
          p_customer_id: string
          p_product_code: Database["public"]["Enums"]["product_code"]
          p_remaining: number
        }
        Returns: undefined
      }
      _complete_alerts_for_repurchase: {
        Args: {
          p_customer_id: string
          p_product_code: Database["public"]["Enums"]["product_code"]
        }
        Returns: undefined
      }
      complete_registration_goals: {
        Args: {
          p_activity_level: Database["public"]["Enums"]["activity_level"]
          p_age: number
          p_current_weight: number
          p_customer_id: string
          p_diet_type: Database["public"]["Enums"]["diet_type"]
          p_gender: string
          p_goal_type: Database["public"]["Enums"]["goal_type"]
          p_height: number
          p_journey_days: number
          p_long_term_goal_weight?: number
          p_name: string
          p_phone: string
          p_referral_code?: string
        }
        Returns: Json
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_inventory_alert_status: {
        Args: {
          p_product_code: Database["public"]["Enums"]["product_code"]
          p_remaining: number
        }
        Returns: string
      }
      init_customer_inventory: {
        Args: {
          p_boxes_dx_plus: number
          p_boxes_n_plus: number
          p_customer_id: string
        }
        Returns: undefined
      }
      init_legacy_balance: {
        Args: {
          p_customer_id: string
          p_remaining_dx_plus: number
          p_remaining_n_plus: number
        }
        Returns: undefined
      }
      manual_adjustment: {
        Args: {
          p_customer_id: string
          p_delta: number
          p_product_code: Database["public"]["Enums"]["product_code"]
          p_reason: string
        }
        Returns: undefined
      }
      mark_alert_followed_up: {
        Args: { p_alert_id: string }
        Returns: undefined
      }
      record_meal: {
        Args: {
          p_calories: number
          p_carbs: number
          p_customer_id: string
          p_fat: number
          p_fiber: number
          p_food_items: Json
          p_good_points: string[]
          p_improve_points: string[]
          p_meal_id: string
          p_meal_time: string
          p_meal_type: string
          p_misu_items: Json
          p_misu_score: number
          p_name: string
          p_photo_emoji: string
          p_portion: string
          p_protein: number
        }
        Returns: Json
      }
      record_repurchase: {
        Args: {
          p_boxes: number
          p_customer_id: string
          p_date: string
          p_note: string
          p_product_code: Database["public"]["Enums"]["product_code"]
        }
        Returns: undefined
      }
    }
    Enums: {
      activity_level: "sedentary" | "light" | "moderate" | "high"
      bmi_category: "underweight" | "normal" | "overweight" | "obese"
      diet_type:
        | "regular"
        | "vegetarian"
        | "ovo_lacto_vegetarian"
        | "vegan"
        | "other"
      goal_status: "auto_approved" | "auto_adjusted" | "goal_restricted"
      goal_type:
        | "improve_diet"
        | "lose_weight"
        | "improve_routine"
        | "maintain_weight"
      inventory_transaction_type:
        | "INITIAL_PURCHASE"
        | "CHECK_IN_USAGE"
        | "MEAL_USAGE"
        | "REPURCHASE"
        | "MANUAL_ADJUSTMENT"
        | "CHECK_IN_EDIT"
        | "CHECK_IN_DELETE"
        | "MANUAL_INITIAL_BALANCE"
      poop_count: "0" | "1" | "2" | "3+"
      product_code: "MISU_N_PLUS" | "MISU_DX_PLUS"
      repurchase_alert_level: "REPURCHASE_SOON" | "URGENT" | "OUT_OF_STOCK"
      repurchase_alert_status:
        | "OPEN"
        | "FOLLOWED_UP"
        | "COMPLETED"
        | "DISMISSED"
      user_role: "customer" | "coach" | "admin"
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
      activity_level: ["sedentary", "light", "moderate", "high"],
      bmi_category: ["underweight", "normal", "overweight", "obese"],
      diet_type: [
        "regular",
        "vegetarian",
        "ovo_lacto_vegetarian",
        "vegan",
        "other",
      ],
      goal_status: ["auto_approved", "auto_adjusted", "goal_restricted"],
      goal_type: [
        "improve_diet",
        "lose_weight",
        "improve_routine",
        "maintain_weight",
      ],
      inventory_transaction_type: [
        "INITIAL_PURCHASE",
        "CHECK_IN_USAGE",
        "MEAL_USAGE",
        "REPURCHASE",
        "MANUAL_ADJUSTMENT",
        "CHECK_IN_EDIT",
        "CHECK_IN_DELETE",
        "MANUAL_INITIAL_BALANCE",
      ],
      poop_count: ["0", "1", "2", "3+"],
      product_code: ["MISU_N_PLUS", "MISU_DX_PLUS"],
      repurchase_alert_level: ["REPURCHASE_SOON", "URGENT", "OUT_OF_STOCK"],
      repurchase_alert_status: [
        "OPEN",
        "FOLLOWED_UP",
        "COMPLETED",
        "DISMISSED",
      ],
      user_role: ["customer", "coach", "admin"],
    },
  },
} as const
