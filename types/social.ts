export type CommentAnchorType = "entry" | "quote" | "scene" | "session" | "reflection" | "note";
export type CommentVisibility = "archive_members" | "owner_only" | "participants";
export type CommentStatus = "visible" | "hidden" | "archived" | "deleted";
export type CommentReactionType = "resonance" | "heartbreak" | "healed" | "rewatch" | "revelation" | "hug";
export type NotificationEventType = "new_letter" | "letter_reply" | "mention" | "archive_update" | "capsule_open";

export interface ArchiveCommentAuthor {
  userId: string;
  displayName: string;
  avatarSymbol: string;
  avatarColor: string;
}

export interface ArchiveCommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction: CommentReactionType;
  created_at: string;
}

export interface ArchiveComment {
  id: string;
  archive_id: string;
  entry_id: string;
  author_id: string;
  parent_id: string | null;
  anchor_type: CommentAnchorType;
  anchor_ref: string | null;
  quoted_text: string | null;
  content: string;
  visibility: CommentVisibility;
  status: CommentStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author?: ArchiveCommentAuthor;
  reactions?: ArchiveCommentReaction[];
}

export interface ArchiveNotificationPayload {
  title?: string;
  archive_title?: string;
  entry_title?: string;
  href?: string;
}

export interface ArchiveNotification {
  id: string;
  archive_id: string;
  recipient_id: string;
  actor_id: string | null;
  event_type: NotificationEventType;
  letter_id: string | null;
  comment_id: string | null;
  entry_id: string | null;
  payload: ArchiveNotificationPayload;
  read_at: string | null;
  created_at: string;
  actor?: ArchiveCommentAuthor;
}

export interface CommentAnchorOption {
  type: CommentAnchorType;
  ref: string;
  label: string;
  excerpt?: string;
}

export interface ArchiveEntryIdentity {
  kind: "book" | "film" | "cp";
  legacyId: string;
  title: string;
}
