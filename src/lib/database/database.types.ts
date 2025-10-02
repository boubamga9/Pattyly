export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      anti_fraud: {
        Row: {
          created_at: string | null
          email: string
          fingerprint: string
          id: string
          instagram: string | null
          ip_address: unknown
          tiktok: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          fingerprint: string
          id?: string
          instagram?: string | null
          ip_address: unknown
          tiktok?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          fingerprint?: string
          id?: string
          instagram?: string | null
          ip_address?: unknown
          tiktok?: string | null
        }
        Relationships: []
      }
      availabilities: {
        Row: {
          created_at: string | null
          daily_order_limit: number | null
          day: number
          id: string
          is_open: boolean | null
          shop_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_order_limit?: number | null
          day: number
          id?: string
          is_open?: boolean | null
          shop_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_order_limit?: number | null
          day?: number
          id?: string
          is_open?: boolean | null
          shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          shop_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          shop_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          shop_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          body: string
          created_at: string | null
          email: string
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          email: string
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      faq: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          question: string
          shop_id: string
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          question: string
          shop_id: string
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          question?: string
          shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          created_at: string | null
          form_id: string
          id: string
          label: string
          options: Json | null
          order: number
          required: boolean | null
          type: Database["public"]["Enums"]["form_field_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          form_id: string
          id?: string
          label: string
          options?: Json | null
          order: number
          required?: boolean | null
          type: Database["public"]["Enums"]["form_field_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          form_id?: string
          id?: string
          label?: string
          options?: Json | null
          order?: number
          required?: boolean | null
          type?: Database["public"]["Enums"]["form_field_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_custom_form: boolean | null
          shop_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom_form?: boolean | null
          shop_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_custom_form?: boolean | null
          shop_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forms_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          additional_information: string | null
          chef_message: string | null
          chef_pickup_date: string | null
          created_at: string | null
          customer_email: string
          customer_instagram: string | null
          customer_name: string
          customer_phone: string | null
          customization_data: Json | null
          id: string
          inspiration_photos: string[] | null
          paid_amount: number | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          paypal_payment_id: string | null
          pickup_date: string
          product_base_price: number | null
          product_id: string | null
          product_name: string | null
          refused_by: Database["public"]["Enums"]["refused_by"] | null
          shop_id: string
          status: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          additional_information?: string | null
          chef_message?: string | null
          chef_pickup_date?: string | null
          created_at?: string | null
          customer_email: string
          customer_instagram?: string | null
          customer_name: string
          customer_phone?: string | null
          customization_data?: Json | null
          id?: string
          inspiration_photos?: string[] | null
          paid_amount?: number | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          pickup_date: string
          product_base_price?: number | null
          product_id?: string | null
          product_name?: string | null
          refused_by?: Database["public"]["Enums"]["refused_by"] | null
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          additional_information?: string | null
          chef_message?: string | null
          chef_pickup_date?: string | null
          created_at?: string | null
          customer_email?: string
          customer_instagram?: string | null
          customer_name?: string
          customer_phone?: string | null
          customization_data?: Json | null
          id?: string
          inspiration_photos?: string[] | null
          paid_amount?: number | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payment_id?: string | null
          pickup_date?: string
          product_base_price?: number | null
          product_id?: string | null
          product_name?: string | null
          refused_by?: Database["public"]["Enums"]["refused_by"] | null
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"] | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_commissions: {
        Row: {
          commission_amount: number
          created_at: string | null
          id: string
          month_year: string
          paid_at: string | null
          referral_id: string
          status: string | null
          stripe_transfer_id: string | null
          subscription_amount: number
        }
        Insert: {
          commission_amount: number
          created_at?: string | null
          id?: string
          month_year: string
          paid_at?: string | null
          referral_id: string
          status?: string | null
          stripe_transfer_id?: string | null
          subscription_amount: number
        }
        Update: {
          commission_amount?: number
          created_at?: string | null
          id?: string
          month_year?: string
          paid_at?: string | null
          referral_id?: string
          status?: string | null
          stripe_transfer_id?: string | null
          subscription_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          commission_rate: number | null
          company_insta: string | null
          company_name: string
          company_tiktok: string | null
          company_website: string | null
          created_at: string | null
          id: string
          profiles_id: string
          referral_code: string
          status: string | null
          total_earnings: number | null
          total_referrals: number | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          company_insta?: string | null
          company_name: string
          company_tiktok?: string | null
          company_website?: string | null
          created_at?: string | null
          id?: string
          profiles_id: string
          referral_code: string
          status?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          company_insta?: string | null
          company_name?: string
          company_tiktok?: string | null
          company_website?: string | null
          created_at?: string | null
          id?: string
          profiles_id?: string
          referral_code?: string
          status?: string | null
          total_earnings?: number | null
          total_referrals?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_profiles_id_fkey"
            columns: ["profiles_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_accounts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          onboarding_status: string | null
          onboarding_url: string | null
          paypal_merchant_id: string | null
          profile_id: string
          tracking_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          onboarding_status?: string | null
          onboarding_url?: string | null
          paypal_merchant_id?: string | null
          profile_id: string
          tracking_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          onboarding_status?: string | null
          onboarding_url?: string | null
          paypal_merchant_id?: string | null
          profile_id?: string
          tracking_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paypal_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          created_at: string | null
          id: string
          order_data: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_data: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          order_data?: Json
        }
        Relationships: []
      }
      personal_order_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          order_id: string
          shop_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          order_id: string
          shop_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          order_id?: string
          shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_order_notes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          form_id: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          min_days_notice: number
          name: string
          shop_id: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          form_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_days_notice?: number
          name: string
          shop_id: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          form_id?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          min_days_notice?: number
          name?: string
          shop_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_stripe_free: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_stripe_free?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_stripe_free?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          partner_id: string
          shop_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          partner_id: string
          shop_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          partner_id?: string
          shop_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          bio: string | null
          catalog_version: number | null
          created_at: string | null
          id: string
          instagram: string | null
          is_active: boolean | null
          is_custom_accepted: boolean | null
          logo_url: string | null
          name: string
          profile_id: string
          slug: string
          tiktok: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          catalog_version?: number | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_custom_accepted?: boolean | null
          logo_url?: string | null
          name: string
          profile_id: string
          slug: string
          tiktok?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          catalog_version?: number | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean | null
          is_custom_accepted?: boolean | null
          logo_url?: string | null
          name?: string
          profile_id?: string
          slug?: string
          tiktok?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          profile_id: string
          stripe_account_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          profile_id: string
          stripe_account_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          profile_id?: string
          stripe_account_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_customers: {
        Row: {
          created_at: string | null
          profile_id: string
          stripe_customer_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          stripe_customer_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          stripe_customer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string | null
          id: string
        }
        Insert: {
          created_at?: string | null
          id: string
        }
        Update: {
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      unavailabilities: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          shop_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          shop_id: string
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          shop_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unavailabilities_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      user_products: {
        Row: {
          created_at: string | null
          profile_id: string
          stripe_product_id: string
          stripe_subscription_id: string | null
          subscription_status:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          profile_id: string
          stripe_product_id: string
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          profile_id?: string
          stripe_product_id?: string
          stripe_subscription_id?: string | null
          subscription_status?:
            | Database["public"]["Enums"]["subscription_status"]
            | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_products_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
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
      check_and_create_trial: {
        Args: {
          p_email: string
          p_fingerprint: string
          p_instagram: string
          p_ip_address: string
          p_profile_id: string
          p_stripe_customer_id: string
          p_subscription_id: string
          p_tiktok: string
        }
        Returns: Json
      }
      cleanup_old_paypal_events: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      create_shop_with_availabilities: {
        Args: {
          p_bio: string
          p_instagram: string
          p_logo_url: string
          p_name: string
          p_profile_id: string
          p_slug: string
          p_tiktok: string
          p_website: string
        }
        Returns: Json
      }
      get_availability_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_custom_form_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_dashboard_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_faq_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_onboarding_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_order_data: {
        Args: { p_product_id?: string; p_slug: string }
        Returns: Json
      }
      get_order_detail_data: {
        Args: { p_order_id: string; p_profile_id: string }
        Returns: Json
      }
      get_orders_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_orders_metrics: {
        Args: { p_shop_id: string }
        Returns: Json
      }
      get_paypal_account_for_shop: {
        Args: { shop_uuid: string }
        Returns: {
          is_active: boolean
          paypal_merchant_id: string
        }[]
      }
      get_product_count: {
        Args: { profile_id: string }
        Returns: number
      }
      get_products_data: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_shop_owner_email: {
        Args: { shop_uuid: string }
        Returns: string
      }
      get_stripe_connect_for_shop: {
        Args: { shop_uuid: string }
        Returns: {
          is_active: boolean
          stripe_account_id: string
        }[]
      }
      get_user_permissions: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      get_user_plan: {
        Args: {
          basic_product_id?: string
          p_profile_id: string
          premium_product_id?: string
        }
        Returns: string
      }
      user_password_set: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      form_field_type:
        | "short-text"
        | "long-text"
        | "number"
        | "single-select"
        | "multi-select"
      order_status:
        | "pending"
        | "quoted"
        | "confirmed"
        | "ready"
        | "refused"
        | "completed"
      refused_by: "pastry_chef" | "client"
      subscription_status: "active" | "inactive"
      user_role: "pastry_chef" | "admin" | "partner"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      form_field_type: [
        "short-text",
        "long-text",
        "number",
        "single-select",
        "multi-select",
      ],
      order_status: [
        "pending",
        "quoted",
        "confirmed",
        "ready",
        "refused",
        "completed",
      ],
      refused_by: ["pastry_chef", "client"],
      subscription_status: ["active", "inactive"],
      user_role: ["pastry_chef", "admin", "partner"],
    },
  },
} as const

