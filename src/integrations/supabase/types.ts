export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      calendar_bookings: {
        Row: {
          booker_email: string
          created_at: string
          customer_name: string | null
          description: string | null
          end_time: string
          id: string
          phone_number: string | null
          start_time: string
          status: string | null
          title: string
        }
        Insert: {
          booker_email: string
          created_at?: string
          customer_name?: string | null
          description?: string | null
          end_time: string
          id?: string
          phone_number?: string | null
          start_time: string
          status?: string | null
          title: string
        }
        Update: {
          booker_email?: string
          created_at?: string
          customer_name?: string | null
          description?: string | null
          end_time?: string
          id?: string
          phone_number?: string | null
          start_time?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      chat_rate_limits: {
        Row: {
          ip_address: string
          last_request: string | null
          request_count: number | null
        }
        Insert: {
          ip_address: string
          last_request?: string | null
          request_count?: number | null
        }
        Update: {
          ip_address?: string
          last_request?: string | null
          request_count?: number | null
        }
        Relationships: []
      }
      daily_booking_counts: {
        Row: {
          booking_count: number | null
          booking_date: string
          email: string
        }
        Insert: {
          booking_count?: number | null
          booking_date: string
          email: string
        }
        Update: {
          booking_count?: number | null
          booking_date?: string
          email?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget: number | null
          budget_attitude: string | null
          business_type: string | null
          category: string | null
          contact_completeness: string | null
          created_at: string | null
          decision_maker_type: string | null
          distance: number | null
          email: string | null
          email_type: string | null
          engagement_method: string | null
          id: string
          is_repeat_customer: boolean | null
          job_complexity: string | null
          job_description_quality: string | null
          location: string | null
          message: string | null
          name: string | null
          owner_notified: boolean | null
          phone: string | null
          postcode: string | null
          recommendations: string[] | null
          score: number | null
          service_type: string | null
          urgency: string | null
        }
        Insert: {
          budget?: number | null
          budget_attitude?: string | null
          business_type?: string | null
          category?: string | null
          contact_completeness?: string | null
          created_at?: string | null
          decision_maker_type?: string | null
          distance?: number | null
          email?: string | null
          email_type?: string | null
          engagement_method?: string | null
          id?: string
          is_repeat_customer?: boolean | null
          job_complexity?: string | null
          job_description_quality?: string | null
          location?: string | null
          message?: string | null
          name?: string | null
          owner_notified?: boolean | null
          phone?: string | null
          postcode?: string | null
          recommendations?: string[] | null
          score?: number | null
          service_type?: string | null
          urgency?: string | null
        }
        Update: {
          budget?: number | null
          budget_attitude?: string | null
          business_type?: string | null
          category?: string | null
          contact_completeness?: string | null
          created_at?: string | null
          decision_maker_type?: string | null
          distance?: number | null
          email?: string | null
          email_type?: string | null
          engagement_method?: string | null
          id?: string
          is_repeat_customer?: boolean | null
          job_complexity?: string | null
          job_description_quality?: string | null
          location?: string | null
          message?: string | null
          name?: string | null
          owner_notified?: boolean | null
          phone?: string | null
          postcode?: string | null
          recommendations?: string[] | null
          score?: number | null
          service_type?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
