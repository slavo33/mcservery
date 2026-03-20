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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bug_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          description: string
          id: string
          reporter_id: string
          resolved_at: string | null
          screenshot_url: string | null
          status: string
          title: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          description: string
          id?: string
          reporter_id: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          title: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          description?: string
          id?: string
          reporter_id?: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          server_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          server_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_code_usage: {
        Row: {
          created_at: string
          discount_code_id: string
          id: string
          tier: string
          user_id: string
          vip_purchase_id: string | null
        }
        Insert: {
          created_at?: string
          discount_code_id: string
          id?: string
          tier: string
          user_id: string
          vip_purchase_id?: string | null
        }
        Update: {
          created_at?: string
          discount_code_id?: string
          id?: string
          tier?: string
          user_id?: string
          vip_purchase_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_usage_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_usage_vip_purchase_id_fkey"
            columns: ["vip_purchase_id"]
            isOneToOne: false
            referencedRelation: "vip_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          max_uses: number | null
          percent_off: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          percent_off?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_uses?: number | null
          percent_off?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          nickname: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id: string
          nickname?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          nickname?: string
          updated_at?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction: Database["public"]["Enums"]["reaction_type"]
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction?: Database["public"]["Enums"]["reaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          report_type: Database["public"]["Enums"]["report_type"]
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          report_type: Database["public"]["Enums"]["report_type"]
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          report_type?: Database["public"]["Enums"]["report_type"]
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
        }
        Relationships: []
      }
      server_likes: {
        Row: {
          created_at: string
          id: string
          server_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          server_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_likes_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_secrets: {
        Row: {
          id: string
          server_id: string
          vote_api_key: string | null
          votifier_ip: string | null
          votifier_port: number | null
          votifier_public_key: string | null
          votifier_token: string | null
        }
        Insert: {
          id?: string
          server_id: string
          vote_api_key?: string | null
          votifier_ip?: string | null
          votifier_port?: number | null
          votifier_public_key?: string | null
          votifier_token?: string | null
        }
        Update: {
          id?: string
          server_id?: string
          vote_api_key?: string | null
          votifier_ip?: string | null
          votifier_port?: number | null
          votifier_public_key?: string | null
          votifier_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "server_secrets_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: true
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string
          description: string
          discord_url: string | null
          has_whitelist: boolean
          id: string
          images: string[]
          instagram_url: string | null
          ip: string
          is_featured: boolean
          is_warez: boolean
          likes_count: number
          max_players: number
          minigames: string[]
          name: string
          owner_id: string
          platform: string[]
          proxy: string | null
          slug: string
          software: string
          tags: string[]
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          version: string
          vip_expires_at: string | null
          vote_cooldown_hours: number
          vote_count: number
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          discord_url?: string | null
          has_whitelist?: boolean
          id?: string
          images?: string[]
          instagram_url?: string | null
          ip: string
          is_featured?: boolean
          is_warez?: boolean
          likes_count?: number
          max_players?: number
          minigames?: string[]
          name: string
          owner_id: string
          platform?: string[]
          proxy?: string | null
          slug: string
          software?: string
          tags?: string[]
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          version?: string
          vip_expires_at?: string | null
          vote_cooldown_hours?: number
          vote_count?: number
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          discord_url?: string | null
          has_whitelist?: boolean
          id?: string
          images?: string[]
          instagram_url?: string | null
          ip?: string
          is_featured?: boolean
          is_warez?: boolean
          likes_count?: number
          max_players?: number
          minigames?: string[]
          name?: string
          owner_id?: string
          platform?: string[]
          proxy?: string | null
          slug?: string
          software?: string
          tags?: string[]
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          version?: string
          vip_expires_at?: string | null
          vote_cooldown_hours?: number
          vote_count?: number
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      staff_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          staff_post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          staff_post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          staff_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_comments_staff_post_id_fkey"
            columns: ["staff_post_id"]
            isOneToOne: false
            referencedRelation: "staff_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_post_likes: {
        Row: {
          created_at: string
          id: string
          staff_post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          staff_post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          staff_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_post_likes_staff_post_id_fkey"
            columns: ["staff_post_id"]
            isOneToOne: false
            referencedRelation: "staff_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_posts: {
        Row: {
          created_at: string
          description: string
          discord_url: string | null
          id: string
          images: string[]
          is_active: boolean
          likes_count: number
          owner_id: string
          position: string
          requirements: string
          server_id: string
          server_ip: string
          slug: string
          updated_at: string
          vip_expires_at: string | null
          vip_tier: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          discord_url?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          likes_count?: number
          owner_id: string
          position: string
          requirements?: string
          server_id: string
          server_ip?: string
          slug?: string
          updated_at?: string
          vip_expires_at?: string | null
          vip_tier?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          discord_url?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          likes_count?: number
          owner_id?: string
          position?: string
          requirements?: string
          server_id?: string
          server_ip?: string
          slug?: string
          updated_at?: string
          vip_expires_at?: string | null
          vip_tier?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_posts_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_reactions: {
        Row: {
          created_at: string
          id: string
          reaction: string
          staff_comment_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction: string
          staff_comment_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction?: string
          staff_comment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_reactions_staff_comment_id_fkey"
            columns: ["staff_comment_id"]
            isOneToOne: false
            referencedRelation: "staff_comments"
            referencedColumns: ["id"]
          },
        ]
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
      vip_purchases: {
        Row: {
          amount_paid: number
          created_at: string
          discount_code_id: string | null
          expires_at: string
          id: string
          price_id: string
          server_id: string
          starts_at: string
          stripe_session_id: string | null
          tier: string
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          discount_code_id?: string | null
          expires_at: string
          id?: string
          price_id: string
          server_id: string
          starts_at?: string
          stripe_session_id?: string | null
          tier: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          discount_code_id?: string | null
          expires_at?: string
          id?: string
          price_id?: string
          server_id?: string
          starts_at?: string
          stripe_session_id?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_purchases_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          claimed: boolean
          created_at: string
          id: string
          minecraft_nick: string
          server_id: string
          voter_ip: string
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          id?: string
          minecraft_nick: string
          server_id: string
          voter_ip: string
        }
        Update: {
          claimed?: boolean
          created_at?: string
          id?: string
          minecraft_nick?: string
          server_id?: string
          voter_ip?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_server_slug: { Args: { server_ip: string }; Returns: string }
      generate_staff_post_slug: {
        Args: { server_ip_val: string }
        Returns: string
      }
      get_top_voters: {
        Args: { p_limit?: number; p_server_id: string }
        Returns: {
          nick: string
          vote_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      reaction_type:
        | "heart"
        | "thumbs_up"
        | "thumbs_down"
        | "laugh"
        | "fire"
        | "sad"
      report_status: "pending" | "resolved" | "dismissed"
      report_type: "server" | "comment" | "staff_post"
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
      app_role: ["admin", "moderator", "user"],
      reaction_type: [
        "heart",
        "thumbs_up",
        "thumbs_down",
        "laugh",
        "fire",
        "sad",
      ],
      report_status: ["pending", "resolved", "dismissed"],
      report_type: ["server", "comment", "staff_post"],
    },
  },
} as const
