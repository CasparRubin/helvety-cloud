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
      billing_events: {
        Row: {
          id: string
          payload: Json
          received_at: string
          stripe_event_id: string
          type: string
          workspace_id: string | null
        }
        Insert: {
          id?: string
          payload: Json
          received_at?: string
          stripe_event_id: string
          type: string
          workspace_id?: string | null
        }
        Update: {
          id?: string
          payload?: Json
          received_at?: string
          stripe_event_id?: string
          type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          deleted_at: string | null
          encrypted_blob: Json
          id: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob: Json
          id: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob?: Json
          id?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_links: {
        Row: {
          created_at: string
          id: string
          source_id: string
          source_kind: string
          target_id: string
          target_kind: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          source_kind: string
          target_id: string
          target_kind: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          source_kind?: string
          target_id?: string
          target_kind?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_links_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          deleted_at: string | null
          encrypted_blob: Json
          id: string
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob: Json
          id: string
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob?: Json
          id?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          deleted_at: string | null
          encrypted_blob: Json
          id: string
          label_id: string | null
          milestone_id: string | null
          priority_id: string | null
          project_id: string
          sort_order: number
          stage_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob: Json
          id: string
          label_id?: string | null
          milestone_id?: string | null
          priority_id?: string | null
          project_id: string
          sort_order?: number
          stage_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob?: Json
          id?: string
          label_id?: string | null
          milestone_id?: string | null
          priority_id?: string | null
          project_id?: string
          sort_order?: number
          stage_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          deleted_at: string | null
          encrypted_blob: Json
          id: string
          project_id: string | null
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob: Json
          id: string
          project_id?: string | null
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob?: Json
          id?: string
          project_id?: string | null
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_acceptances: {
        Row: {
          accepted_at: string
          id: string
          policy: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          policy: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: string
          policy?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          deleted_at: string | null
          encrypted_blob: Json
          id: string
          sort_order: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob: Json
          id: string
          sort_order?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          encrypted_blob?: Json
          id?: string
          sort_order?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_crypto: {
        Row: {
          created_at: string
          key_check: Json
          key_version: number
          prf_salt: string
          public_key: string
          updated_at: string
          user_id: string
          wrapped_private_key: Json
          wrapped_user_key: Json
        }
        Insert: {
          created_at?: string
          key_check: Json
          key_version?: number
          prf_salt: string
          public_key: string
          updated_at?: string
          user_id: string
          wrapped_private_key: Json
          wrapped_user_key: Json
        }
        Update: {
          created_at?: string
          key_check?: Json
          key_version?: number
          prf_salt?: string
          public_key?: string
          updated_at?: string
          user_id?: string
          wrapped_private_key?: Json
          wrapped_user_key?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_crypto_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_invitations: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          claimed_at: string | null
          claimed_by: string | null
          claimed_public_key: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          sealed_at: string | null
          sealed_by: string | null
          sealed_workspace_key: Json | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          claimed_public_key?: string | null
          created_at?: string
          email: string
          id: string
          invited_by: string
          role: string
          sealed_at?: string | null
          sealed_by?: string | null
          sealed_workspace_key?: Json | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          claimed_public_key?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: string
          sealed_at?: string | null
          sealed_by?: string | null
          sealed_workspace_key?: Json | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invitations_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_sealed_by_fkey"
            columns: ["sealed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_invitations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id: string
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wrapped_keys: {
        Row: {
          created_at: string
          subject_id: string
          subject_type: string
          updated_at: string
          user_id: string
          wrapped_key: Json
        }
        Insert: {
          created_at?: string
          subject_id: string
          subject_type: string
          updated_at?: string
          user_id: string
          wrapped_key: Json
        }
        Update: {
          created_at?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string
          user_id?: string
          wrapped_key?: Json
        }
        Relationships: [
          {
            foreignKeyName: "wrapped_keys_user_id_fkey"
            columns: ["user_id"]
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
      accept_workspace_invitation: {
        Args: { invitation_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          claimed_at: string | null
          claimed_by: string | null
          claimed_public_key: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          sealed_at: string | null
          sealed_by: string | null
          sealed_workspace_key: Json | null
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workspace_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_workspace_invitation: {
        Args: { invitation_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          claimed_at: string | null
          claimed_by: string | null
          claimed_public_key: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          sealed_at: string | null
          sealed_by: string | null
          sealed_workspace_key: Json | null
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workspace_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_account: { Args: never; Returns: undefined }
      delete_workspace: { Args: { ws_id: string }; Returns: undefined }
      claim_workspace_invitation: {
        Args: { invitation_id: string; public_key: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          claimed_at: string | null
          claimed_by: string | null
          claimed_public_key: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          sealed_at: string | null
          sealed_by: string | null
          sealed_workspace_key: Json | null
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workspace_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_workspace_admin: { Args: { ws_id: string }; Returns: boolean }
      is_workspace_member: { Args: { ws_id: string }; Returns: boolean }
      normalized_auth_email: { Args: never; Returns: string }
      seal_workspace_invitation: {
        Args: { invitation_id: string; sealed_key: Json }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          claimed_at: string | null
          claimed_by: string | null
          claimed_public_key: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: string
          sealed_at: string | null
          sealed_by: string | null
          sealed_workspace_key: Json | null
          updated_at: string
          workspace_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workspace_invitations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      workspace_seat_usage: {
        Args: { ws_id: string }
        Returns: {
          member_count: number
          plan: string
          status: string
        }[]
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
    Enums: {},
  },
} as const
