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
      financial_transactions: {
        Row: {
          amount_cents: number
          created_at: string
          description: string
          id: string
          producer_id: string
          sale_id: string | null
          transaction_type: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description: string
          id?: string
          producer_id: string
          sale_id?: string | null
          transaction_type: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string
          id?: string
          producer_id?: string
          sale_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_gateways: {
        Row: {
          created_at: string | null
          credentials: Json | null
          gateway_identifier: string
          gateway_name: string
          id: string
          is_active: boolean
          priority: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json | null
          gateway_identifier: string
          gateway_name: string
          id?: string
          is_active?: boolean
          priority?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json | null
          gateway_identifier?: string
          gateway_name?: string
          id?: string
          is_active?: boolean
          priority?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          default_anticipation_fee_percent: number | null
          default_boleto_fee_percent: number | null
          default_boleto_release_days: number | null
          default_card_installments_fees: Json | null
          default_card_release_days: number | null
          default_fees_json: Json
          default_pix_fee_percent: number | null
          default_pix_release_days: number | null
          default_release_rules_json: Json
          default_security_reserve_percent: number | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_anticipation_fee_percent?: number | null
          default_boleto_fee_percent?: number | null
          default_boleto_release_days?: number | null
          default_card_installments_fees?: Json | null
          default_card_release_days?: number | null
          default_fees_json?: Json
          default_pix_fee_percent?: number | null
          default_pix_release_days?: number | null
          default_release_rules_json?: Json
          default_security_reserve_percent?: number | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_anticipation_fee_percent?: number | null
          default_boleto_fee_percent?: number | null
          default_boleto_release_days?: number | null
          default_card_installments_fees?: Json | null
          default_card_release_days?: number | null
          default_fees_json?: Json
          default_pix_fee_percent?: number | null
          default_pix_release_days?: number | null
          default_release_rules_json?: Json
          default_security_reserve_percent?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      producer_financials: {
        Row: {
          available_balance_cents: number
          bank_account_number: string | null
          bank_account_type: string | null
          bank_agency: string | null
          bank_name: string | null
          pending_balance_cents: number
          pix_key: string | null
          producer_id: string
          updated_at: string
        }
        Insert: {
          available_balance_cents?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          pending_balance_cents?: number
          pix_key?: string | null
          producer_id: string
          updated_at?: string
        }
        Update: {
          available_balance_cents?: number
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_agency?: string | null
          bank_name?: string | null
          pending_balance_cents?: number
          pix_key?: string | null
          producer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_financials_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      producer_settings: {
        Row: {
          created_at: string
          custom_fees_json: Json | null
          custom_release_rules_json: Json | null
          id: string
          producer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_fees_json?: Json | null
          custom_release_rules_json?: Json | null
          id?: string
          producer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_fees_json?: Json | null
          custom_release_rules_json?: Json | null
          id?: string
          producer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producer_settings_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allowed_payment_methods: Json
          checkout_background_color: string | null
          checkout_image_url: string | null
          checkout_link_slug: string | null
          created_at: string
          description: string | null
          donation_description: string | null
          donation_title: string | null
          file_url_or_access_info: string | null
          id: string
          is_active: boolean | null
          is_email_optional: boolean
          max_installments_allowed: number | null
          name: string
          price_cents: number
          producer_id: string
          product_type: string
          require_email_confirmation: boolean
          show_order_summary: boolean
          subscription_frequency: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          allowed_payment_methods?: Json
          checkout_background_color?: string | null
          checkout_image_url?: string | null
          checkout_link_slug?: string | null
          created_at?: string
          description?: string | null
          donation_description?: string | null
          donation_title?: string | null
          file_url_or_access_info?: string | null
          id?: string
          is_active?: boolean | null
          is_email_optional?: boolean
          max_installments_allowed?: number | null
          name: string
          price_cents: number
          producer_id: string
          product_type?: string
          require_email_confirmation?: boolean
          show_order_summary?: boolean
          subscription_frequency?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          allowed_payment_methods?: Json
          checkout_background_color?: string | null
          checkout_image_url?: string | null
          checkout_link_slug?: string | null
          created_at?: string
          description?: string | null
          donation_description?: string | null
          donation_title?: string | null
          file_url_or_access_info?: string | null
          id?: string
          is_active?: boolean | null
          is_email_optional?: boolean
          max_installments_allowed?: number | null
          name?: string
          price_cents?: number
          producer_id?: string
          product_type?: string
          require_email_confirmation?: boolean
          show_order_summary?: boolean
          subscription_frequency?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_producer_id_fkey"
            columns: ["producer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf_cnpj: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          instagram_handle: string | null
          iugu_customer_id: string | null
          phone: string | null
          role: string
          updated_at: string
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          iugu_customer_id?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          iugu_customer_id?: string | null
          phone?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_total_cents: number
          buyer_email: string
          buyer_profile_id: string | null
          created_at: string
          error_message_internal: string | null
          error_message_iugu: string | null
          event_attendees: Json | null
          id: string
          installments_chosen: number | null
          iugu_bank_slip_barcode: string | null
          iugu_charge_id: string | null
          iugu_invoice_id: string | null
          iugu_invoice_secure_url: string | null
          iugu_pix_qr_code_base64: string | null
          iugu_pix_qr_code_text: string | null
          iugu_status: string | null
          iugu_subscription_id: string | null
          paid_at: string | null
          payment_method_used: string
          payout_status: string | null
          platform_fee_cents: number
          producer_share_cents: number
          product_id: string
          release_date: string | null
          security_reserve_cents: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_total_cents: number
          buyer_email: string
          buyer_profile_id?: string | null
          created_at?: string
          error_message_internal?: string | null
          error_message_iugu?: string | null
          event_attendees?: Json | null
          id?: string
          installments_chosen?: number | null
          iugu_bank_slip_barcode?: string | null
          iugu_charge_id?: string | null
          iugu_invoice_id?: string | null
          iugu_invoice_secure_url?: string | null
          iugu_pix_qr_code_base64?: string | null
          iugu_pix_qr_code_text?: string | null
          iugu_status?: string | null
          iugu_subscription_id?: string | null
          paid_at?: string | null
          payment_method_used: string
          payout_status?: string | null
          platform_fee_cents?: number
          producer_share_cents?: number
          product_id: string
          release_date?: string | null
          security_reserve_cents?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_total_cents?: number
          buyer_email?: string
          buyer_profile_id?: string | null
          created_at?: string
          error_message_internal?: string | null
          error_message_iugu?: string | null
          event_attendees?: Json | null
          id?: string
          installments_chosen?: number | null
          iugu_bank_slip_barcode?: string | null
          iugu_charge_id?: string | null
          iugu_invoice_id?: string | null
          iugu_invoice_secure_url?: string | null
          iugu_pix_qr_code_base64?: string | null
          iugu_pix_qr_code_text?: string | null
          iugu_status?: string | null
          iugu_subscription_id?: string | null
          paid_at?: string | null
          payment_method_used?: string
          payout_status?: string | null
          platform_fee_cents?: number
          producer_share_cents?: number
          product_id?: string
          release_date?: string | null
          security_reserve_cents?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      upsert_producer_balance: {
        Args: { p_producer_id: string; amount_to_add: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
