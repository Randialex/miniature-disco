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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      archive_backups: {
        Row: {
          archive_id: string
          created_at: string
          created_by: string | null
          entry_count: number
          id: string
          snapshot: Json
          snapshot_date: string
        }
        Insert: {
          archive_id: string
          created_at?: string
          created_by?: string | null
          entry_count?: number
          id?: string
          snapshot: Json
          snapshot_date?: string
        }
        Update: {
          archive_id?: string
          created_at?: string
          created_by?: string | null
          entry_count?: number
          id?: string
          snapshot?: Json
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_backups_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_backups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "archive_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_comments: {
        Row: {
          anchor_ref: string | null
          anchor_type: string
          archive_id: string
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          entry_id: string
          id: string
          parent_id: string | null
          quoted_text: string | null
          status: string
          updated_at: string
          visibility: string
        }
        Insert: {
          anchor_ref?: string | null
          anchor_type?: string
          archive_id: string
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          entry_id: string
          id?: string
          parent_id?: string | null
          quoted_text?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          anchor_ref?: string | null
          anchor_type?: string
          archive_id?: string
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          entry_id?: string
          id?: string
          parent_id?: string | null
          quoted_text?: string | null
          status?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_comments_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "archive_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "archive_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_notifications: {
        Row: {
          actor_id: string | null
          archive_id: string
          comment_id: string | null
          created_at: string
          entry_id: string | null
          event_type: string
          id: string
          letter_id: string | null
          payload: Json
          read_at: string | null
          recipient_id: string
        }
        Insert: {
          actor_id?: string | null
          archive_id: string
          comment_id?: string | null
          created_at?: string
          entry_id?: string | null
          event_type: string
          id?: string
          letter_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_id: string
        }
        Update: {
          actor_id?: string | null
          archive_id?: string
          comment_id?: string | null
          created_at?: string
          entry_id?: string | null
          event_type?: string
          id?: string
          letter_id?: string | null
          payload?: Json
          read_at?: string | null
          recipient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_notifications_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "archive_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_notifications_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "archive_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_notifications_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_entries: {
        Row: {
          archive_id: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          event_date: string | null
          id: string
          kind: Database["public"]["Enums"]["archive_kind"]
          legacy_id: string
          owner_id: string
          payload: Json
          rating: number | null
          revision: number
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archive_id: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          event_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["archive_kind"]
          legacy_id: string
          owner_id: string
          payload?: Json
          rating?: number | null
          revision?: number
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archive_id?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          event_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["archive_kind"]
          legacy_id?: string
          owner_id?: string
          payload?: Json
          rating?: number | null
          revision?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "archive_entries_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_entries_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_entries_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_entry_versions: {
        Row: {
          archive_id: string
          changed_at: string
          changed_by: string | null
          deleted_at: string | null
          entry_id: string
          event_date: string | null
          id: string
          kind: Database["public"]["Enums"]["archive_kind"]
          legacy_id: string
          payload: Json
          rating: number | null
          revision: number
          title: string
        }
        Insert: {
          archive_id: string
          changed_at?: string
          changed_by?: string | null
          deleted_at?: string | null
          entry_id: string
          event_date?: string | null
          id?: string
          kind: Database["public"]["Enums"]["archive_kind"]
          legacy_id: string
          payload: Json
          rating?: number | null
          revision: number
          title: string
        }
        Update: {
          archive_id?: string
          changed_at?: string
          changed_by?: string | null
          deleted_at?: string | null
          entry_id?: string
          event_date?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["archive_kind"]
          legacy_id?: string
          payload?: Json
          rating?: number | null
          revision?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_entry_versions_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_entry_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_entry_versions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "archive_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          archive_id: string
          created_at: string
          expires_at: string
          id: string
          invited_by: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["archive_member_role"]
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          archive_id: string
          created_at?: string
          expires_at: string
          id?: string
          invited_by: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["archive_member_role"]
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          archive_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invited_by?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["archive_member_role"]
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_invitations_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_invitations_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_links: {
        Row: {
          created_at: string
          id: string
          label: string
          owner_id: string
          source_id: string
          target_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          owner_id: string
          source_id: string
          target_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          owner_id?: string
          source_id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_links_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "archive_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_links_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "archive_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_members: {
        Row: {
          archive_id: string
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["archive_member_role"]
          user_id: string
        }
        Insert: {
          archive_id: string
          is_active?: boolean
          joined_at?: string
          role: Database["public"]["Enums"]["archive_member_role"]
          user_id: string
        }
        Update: {
          archive_id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["archive_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_members_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_spaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_spaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_sync_operations: {
        Row: {
          applied_at: string
          archive_id: string
          operation_id: string
          result: Json
          user_id: string
        }
        Insert: {
          applied_at?: string
          archive_id: string
          operation_id: string
          result: Json
          user_id: string
        }
        Update: {
          applied_at?: string
          archive_id?: string
          operation_id?: string
          result?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "archive_sync_operations_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "archive_sync_operations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_reactions: {
        Row: {
          created_at: string
          id: string
          letter_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          letter_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          letter_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "letter_reactions_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letter_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          archive_id: string
          attachment: Json | null
          author_id: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_pinned: boolean
          letter_type: string
          mailbox_id: string
          mood_stamp: string | null
          parent_id: string | null
          entry_id: string | null
          session_id: string | null
          read_at: string | null
          edited_at: string | null
          status: Database["public"]["Enums"]["letter_status"]
          updated_at: string
          visibility: string
          workflow_status: string
        }
        Insert: {
          archive_id: string
          attachment?: Json | null
          author_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean
          letter_type?: string
          mailbox_id: string
          mood_stamp?: string | null
          parent_id?: string | null
          entry_id?: string | null
          session_id?: string | null
          read_at?: string | null
          edited_at?: string | null
          status?: Database["public"]["Enums"]["letter_status"]
          updated_at?: string
          visibility?: string
          workflow_status?: string
        }
        Update: {
          archive_id?: string
          attachment?: Json | null
          author_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean
          letter_type?: string
          mailbox_id?: string
          mood_stamp?: string | null
          parent_id?: string | null
          entry_id?: string | null
          session_id?: string | null
          read_at?: string | null
          edited_at?: string | null
          status?: Database["public"]["Enums"]["letter_status"]
          updated_at?: string
          visibility?: string
          workflow_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "letters_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: false
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "archive_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "mailboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "letters_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
        ]
      }
      mailbox_members: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          last_seen_at: string | null
          mailbox_id: string
          role: Database["public"]["Enums"]["mailbox_role"]
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_seen_at?: string | null
          mailbox_id: string
          role?: Database["public"]["Enums"]["mailbox_role"]
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          last_seen_at?: string | null
          mailbox_id?: string
          role?: Database["public"]["Enums"]["mailbox_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailbox_members_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "mailboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailbox_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mailbox_read_states: {
        Row: {
          last_read_at: string
          last_read_letter_id: string | null
          mailbox_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          last_read_letter_id?: string | null
          mailbox_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          last_read_letter_id?: string | null
          mailbox_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailbox_read_states_last_read_letter_id_fkey"
            columns: ["last_read_letter_id"]
            isOneToOne: false
            referencedRelation: "letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailbox_read_states_mailbox_id_fkey"
            columns: ["mailbox_id"]
            isOneToOne: false
            referencedRelation: "mailboxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailbox_read_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mailboxes: {
        Row: {
          archive_id: string
          created_at: string
          id: string
          name: string
          owner_id: string
          reactions_enabled: boolean
          updated_at: string
        }
        Insert: {
          archive_id: string
          created_at?: string
          id?: string
          name: string
          owner_id: string
          reactions_enabled?: boolean
          updated_at?: string
        }
        Update: {
          archive_id?: string
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          reactions_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mailboxes_archive_id_fkey"
            columns: ["archive_id"]
            isOneToOne: true
            referencedRelation: "archive_spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mailboxes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_color: string
          avatar_symbol: string
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          avatar_symbol?: string
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          avatar_symbol?: string
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      time_capsules: {
        Row: {
          created_at: string
          id: string
          message: string
          opens_at: string
          owner_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          opens_at: string
          owner_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          opens_at?: string
          owner_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_capsules_owner_id_fkey"
            columns: ["owner_id"]
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
      accept_archive_invitation: { Args: { p_token: string }; Returns: Json }
      apply_archive_entry_mutation: {
        Args: {
          p_archive_id: string
          p_base_revision: number
          p_deleted?: boolean
          p_event_date: string
          p_kind: Database["public"]["Enums"]["archive_kind"]
          p_legacy_id: string
          p_operation_id: string
          p_payload: Json
          p_rating: number
          p_title: string
        }
        Returns: Json
      }
      create_archive_invitation: {
        Args: {
          p_archive_id: string
          p_expires_in_hours?: number
          p_role: Database["public"]["Enums"]["archive_member_role"]
        }
        Returns: Json
      }
      ensure_personal_archive: { Args: never; Returns: Json }
      ensure_archive_mailbox: { Args: { p_archive_id: string }; Returns: string }
      maintain_archive: { Args: { p_archive_id: string }; Returns: Json }
      restore_archive_backup: { Args: { p_backup_id: string }; Returns: number }
      restore_archive_entry_version: {
        Args: { p_version_id: string }
        Returns: Json
      }
      revoke_archive_invitation: {
        Args: { p_invitation_id: string }
        Returns: boolean
      }
      update_archive_member_role: {
        Args: {
          p_archive_id: string
          p_is_active?: boolean
          p_role: Database["public"]["Enums"]["archive_member_role"]
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      archive_kind: "book" | "film" | "cp"
      archive_member_role: "owner" | "editor" | "viewer"
      letter_status: "pending" | "visible" | "rejected" | "deleted"
      mailbox_role: "owner" | "guest"
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
      archive_kind: ["book", "film", "cp"],
      archive_member_role: ["owner", "editor", "viewer"],
      letter_status: ["pending", "visible", "rejected", "deleted"],
      mailbox_role: ["owner", "guest"],
    },
  },
} as const
