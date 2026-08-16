"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type {
  ArchiveComment,
  ArchiveCommentAuthor,
  ArchiveCommentReaction,
  ArchiveNotification,
  ArchiveNotificationPayload,
  CommentAnchorType,
  CommentReactionType,
  CommentStatus,
  CommentVisibility,
  NotificationEventType,
} from "@/types/social";
import { useArchiveData } from "./ArchiveDataProvider";

interface CreateCommentInput {
  entryId: string;
  content: string;
  parentId?: string | null;
  anchorType?: CommentAnchorType;
  anchorRef?: string | null;
  quotedText?: string | null;
  visibility?: CommentVisibility;
}

interface ArchiveSocialContextValue {
  loading: boolean;
  error: string;
  comments: ArchiveComment[];
  notifications: ArchiveNotification[];
  unreadCount: number;
  createComment: (input: CreateCommentInput) => Promise<boolean>;
  toggleCommentReaction: (commentId: string, reaction: CommentReactionType) => Promise<boolean>;
  moderateComment: (commentId: string, status: CommentStatus) => Promise<boolean>;
  markNotificationRead: (ids: string | string[]) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  markContextRead: (context: { letterId?: string; entryId?: string }) => Promise<void>;
  refreshSocial: () => Promise<void>;
}

const READ_QUEUE_KEY = "randi-notification-read-queue-v1";
const ArchiveSocialContext = createContext<ArchiveSocialContextValue | null>(null);

function readQueue(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(READ_QUEUE_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeQueue(ids: string[]) {
  window.localStorage.setItem(READ_QUEUE_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function authorFromProfile(profile: { id: string; display_name: string; avatar_symbol: string; avatar_color: string }): ArchiveCommentAuthor {
  return {
    userId: profile.id,
    displayName: profile.display_name,
    avatarSymbol: profile.avatar_symbol,
    avatarColor: profile.avatar_color,
  };
}

export function ArchiveSocialProvider({ children }: { children: ReactNode }) {
  const { activeArchive, user } = useArchiveData();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<ArchiveComment[]>([]);
  const [notifications, setNotifications] = useState<ArchiveNotification[]>([]);
  const reloadTimer = useRef<number | null>(null);

  const refreshSocial = useCallback(async () => {
    setError("");
    try {
      const [commentsResult, reactionsResult, notificationsResult] = await Promise.all([
        supabase.from("archive_comments").select("*").eq("archive_id", activeArchive.id).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("archive_comment_reactions").select("*").order("created_at"),
        supabase.from("archive_notifications").select("*").eq("recipient_id", user.id).eq("archive_id", activeArchive.id).order("created_at", { ascending: false }).limit(80),
      ]);
      if (commentsResult.error) throw commentsResult.error;
      if (reactionsResult.error) throw reactionsResult.error;
      if (notificationsResult.error) throw notificationsResult.error;

      const actorIds = new Set<string>();
      for (const row of commentsResult.data ?? []) actorIds.add(row.author_id);
      for (const row of notificationsResult.data ?? []) if (row.actor_id) actorIds.add(row.actor_id);
      const profilesResult = actorIds.size
        ? await supabase.from("profiles").select("id,display_name,avatar_symbol,avatar_color").in("id", Array.from(actorIds))
        : { data: [], error: null };
      if (profilesResult.error) throw profilesResult.error;

      const authorMap = new Map((profilesResult.data ?? []).map((profile) => [profile.id, authorFromProfile(profile)]));
      const reactionMap = new Map<string, ArchiveCommentReaction[]>();
      for (const row of reactionsResult.data ?? []) {
        const list = reactionMap.get(row.comment_id) ?? [];
        list.push({ ...row, reaction: row.reaction as CommentReactionType });
        reactionMap.set(row.comment_id, list);
      }

      setComments((commentsResult.data ?? []).map((row) => ({
        ...row,
        anchor_type: row.anchor_type as CommentAnchorType,
        visibility: row.visibility as CommentVisibility,
        status: row.status as CommentStatus,
        author: authorMap.get(row.author_id),
        reactions: reactionMap.get(row.id) ?? [],
      })));
      setNotifications((notificationsResult.data ?? []).map((row) => ({
        ...row,
        event_type: row.event_type as NotificationEventType,
        payload: row.payload as ArchiveNotificationPayload,
        actor: row.actor_id ? authorMap.get(row.actor_id) : undefined,
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取馆内通信失败");
    } finally {
      setLoading(false);
    }
  }, [activeArchive.id, supabase, user.id]);

  const flushReadQueue = useCallback(async () => {
    const ids = readQueue();
    if (!ids.length) return;
    const { error: queueError } = await supabase
      .from("archive_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", user.id)
      .in("id", ids);
    if (!queueError) writeQueue([]);
  }, [supabase, user.id]);

  useEffect(() => {
    void refreshSocial();
    void flushReadQueue();
  }, [flushReadQueue, refreshSocial]);

  useEffect(() => {
    const handleOnline = () => { void flushReadQueue().then(refreshSocial); };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushReadQueue, refreshSocial]);

  useEffect(() => {
    const scheduleReload = () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => void refreshSocial(), 180);
    };
    const channel = supabase
      .channel(`archive-social-${activeArchive.id}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "archive_comments", filter: `archive_id=eq.${activeArchive.id}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "archive_comment_reactions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "archive_notifications", filter: `recipient_id=eq.${user.id}` }, scheduleReload)
      .subscribe();
    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [activeArchive.id, refreshSocial, supabase, user.id]);

  const run = useCallback(async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError("");
    const result = await operation();
    if (result.error) {
      setError(result.error.message);
      return false;
    }
    await refreshSocial();
    return true;
  }, [refreshSocial]);

  const createComment = useCallback(async (input: CreateCommentInput) => {
    if (!input.content.trim()) return false;
    return run(() => supabase.from("archive_comments").insert({
      archive_id: activeArchive.id,
      entry_id: input.entryId,
      author_id: user.id,
      parent_id: input.parentId ?? null,
      anchor_type: input.anchorType ?? "entry",
      anchor_ref: input.anchorRef ?? null,
      quoted_text: input.quotedText?.trim() || null,
      content: input.content.trim(),
      visibility: input.visibility ?? "archive_members",
    }));
  }, [activeArchive.id, run, supabase, user.id]);

  const toggleCommentReaction = useCallback(async (commentId: string, reaction: CommentReactionType) => {
    const exists = comments.find((comment) => comment.id === commentId)?.reactions?.some((item) => item.user_id === user.id && item.reaction === reaction);
    return exists
      ? run(() => supabase.from("archive_comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id).eq("reaction", reaction))
      : run(() => supabase.from("archive_comment_reactions").insert({ comment_id: commentId, user_id: user.id, reaction }));
  }, [comments, run, supabase, user.id]);

  const moderateComment = useCallback(async (commentId: string, status: CommentStatus) => run(() => supabase
    .from("archive_comments")
    .update({ status, deleted_at: status === "deleted" ? new Date().toISOString() : null })
    .eq("id", commentId)), [run, supabase]);

  const markNotificationRead = useCallback(async (value: string | string[]) => {
    const ids = Array.isArray(value) ? value : [value];
    if (!ids.length) return;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ids.includes(item.id) ? { ...item, read_at: readAt } : item));
    const { error: readError } = await supabase.from("archive_notifications").update({ read_at: readAt }).eq("recipient_id", user.id).in("id", ids);
    if (readError) writeQueue([...readQueue(), ...ids]);
  }, [supabase, user.id]);

  const markAllNotificationsRead = useCallback(async () => {
    const ids = notifications.filter((item) => !item.read_at).map((item) => item.id);
    await markNotificationRead(ids);
  }, [markNotificationRead, notifications]);

  const markContextRead = useCallback(async ({ letterId, entryId }: { letterId?: string; entryId?: string }) => {
    const ids = notifications
      .filter((item) => !item.read_at && (letterId ? item.letter_id === letterId : entryId ? item.entry_id === entryId : false))
      .map((item) => item.id);
    await markNotificationRead(ids);
  }, [markNotificationRead, notifications]);

  const unreadCount = notifications.reduce((count, item) => count + (item.read_at ? 0 : 1), 0);
  const value = useMemo<ArchiveSocialContextValue>(() => ({
    loading,
    error,
    comments,
    notifications,
    unreadCount,
    createComment,
    toggleCommentReaction,
    moderateComment,
    markNotificationRead,
    markAllNotificationsRead,
    markContextRead,
    refreshSocial,
  }), [comments, createComment, error, loading, markAllNotificationsRead, markContextRead, markNotificationRead, moderateComment, notifications, refreshSocial, toggleCommentReaction, unreadCount]);

  return <ArchiveSocialContext.Provider value={value}>{children}</ArchiveSocialContext.Provider>;
}

export function useArchiveSocial() {
  const value = useContext(ArchiveSocialContext);
  if (!value) throw new Error("useArchiveSocial 必须在 ArchiveSocialProvider 内使用");
  return value;
}
