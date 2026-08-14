export type MailboxRole = "owner" | "guest";
export type ModerationMode = "none" | "first" | "all";
export type LetterStatus = "pending" | "visible" | "rejected" | "deleted";
export type LetterType = "letter" | "recommendation" | "mood" | "anniversary";
export type ReactionType = "star" | "moon" | "feather" | "book" | "candle" | "echo";

export interface Mailbox {
  id: string;
  name: string;
  owner_id: string;
  max_members: number;
  moderation_mode: ModerationMode;
  reactions_enabled: boolean;
  presence_enabled: boolean;
  created_at: string;
}

export interface MailboxMember {
  id: string;
  mailbox_id: string;
  user_id: string;
  role: MailboxRole;
  display_name: string;
  avatar_symbol: string;
  avatar_color: string;
  joined_at: string;
  last_seen_at: string | null;
  is_active: boolean;
  first_letter_approved: boolean;
}

export interface LetterAttachment {
  type: "book" | "film" | "cp";
  title: string;
  subtitle?: string;
  localId?: string;
}

export interface Letter {
  id: string;
  mailbox_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  letter_type: LetterType;
  status: LetterStatus;
  is_pinned: boolean;
  mood_stamp: ReactionType | null;
  attachment: LetterAttachment | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author?: MailboxMember;
  reactions?: LetterReaction[];
}

export interface LetterReaction {
  id: string;
  letter_id: string;
  user_id: string;
  reaction: ReactionType;
  created_at: string;
}

export interface MailboxReadState {
  mailbox_id: string;
  user_id: string;
  last_read_at: string;
  last_read_letter_id: string | null;
}

export interface MailboxInviteSummary {
  id: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  allowed_email_hint: string | null;
}
