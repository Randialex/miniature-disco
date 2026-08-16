"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";
import type { Letter, LetterAttachment, LetterReaction, LetterType, LetterVisibility, LetterWorkflowStatus, Mailbox, MailboxMember, ReactionType } from "@/types/mailbox";
import { useArchiveData } from "./ArchiveDataProvider";

interface SendLetterInput {
  content: string;
  letterType: LetterType;
  parentId?: string | null;
  moodStamp?: ReactionType | null;
  attachment?: LetterAttachment | null;
  visibility?: LetterVisibility;
}

interface MailboxContextValue {
  loading: boolean;
  mailbox: Mailbox | null;
  member: MailboxMember | null;
  members: MailboxMember[];
  letters: Letter[];
  unreadCount: number;
  error: string;
  switchMember: (userId: string) => void;
  sendLetter: (input: SendLetterInput) => Promise<boolean>;
  editLetter: (id: string, content: string) => Promise<boolean>;
  deleteLetter: (id: string) => Promise<boolean>;
  togglePin: (letter: Letter) => Promise<boolean>;
  toggleReaction: (letterId: string, reaction: ReactionType) => Promise<boolean>;
  setLetterState: (letter: Letter, state: { workflow?: LetterWorkflowStatus; hidden?: boolean }) => Promise<boolean>;
  markLettersOpened: () => Promise<void>;
  markRead: () => Promise<void>;
  updateProfile: (userId: string, change: Pick<MailboxMember, "display_name" | "avatar_symbol" | "avatar_color">) => Promise<boolean>;
  updateMailbox: (change: Partial<Pick<Mailbox, "name" | "reactions_enabled">>) => Promise<boolean>;
  resetMailbox: () => void;
}

const MailboxContext = createContext<MailboxContextValue | null>(null);

export function MailboxProvider({ children }: { children: ReactNode }) {
  const { user, activeArchive, entries } = useArchiveData();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [member, setMember] = useState<MailboxMember | null>(null);
  const [members, setMembers] = useState<MailboxMember[]>([]);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const reloadTimer = useRef<number | null>(null);

  const loadMailbox = useCallback(async () => {
    setError("");
    try {
      const { data: mailboxId, error: ensureError } = await supabase.rpc("ensure_archive_mailbox", { p_archive_id: activeArchive.id });
      if (ensureError) throw ensureError;
      if (!mailboxId) throw new Error("夜枭邮局尚未完成初始化");
      const [mailboxResult, membersResult, lettersResult, reactionsResult, readResult] = await Promise.all([
        supabase.from("mailboxes").select("*").eq("id", mailboxId).single(),
        supabase.from("mailbox_members").select("*").eq("mailbox_id", mailboxId).eq("is_active", true).order("joined_at"),
        supabase.from("letters").select("*").eq("mailbox_id", mailboxId).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("letter_reactions").select("*").order("created_at"),
        supabase.from("mailbox_read_states").select("last_read_at").eq("mailbox_id", mailboxId).eq("user_id", user.id).maybeSingle(),
      ]);
      if (mailboxResult.error) throw mailboxResult.error;
      if (membersResult.error) throw membersResult.error;
      if (lettersResult.error) throw lettersResult.error;
      if (reactionsResult.error) throw reactionsResult.error;
      if (readResult.error) throw readResult.error;

      const memberRows = membersResult.data ?? [];
      const userIds = memberRows.map((item) => item.user_id);
      const profileResult = userIds.length
        ? await supabase.from("profiles").select("*").in("id", userIds)
        : { data: [], error: null };
      if (profileResult.error) throw profileResult.error;
      const profiles = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
      const mappedMembers: MailboxMember[] = memberRows.map((row) => {
        const profile = profiles.get(row.user_id);
        return {
          ...row,
          display_name: profile?.display_name ?? "无名访客",
          avatar_symbol: profile?.avatar_symbol ?? "🪶",
          avatar_color: profile?.avatar_color ?? "#7d383d",
          first_letter_approved: true,
        };
      });
      const memberMap = new Map(mappedMembers.map((item) => [item.user_id, item]));
      const reactionMap = new Map<string, LetterReaction[]>();
      for (const row of reactionsResult.data ?? []) {
        const list = reactionMap.get(row.letter_id) ?? [];
        list.push({ ...row, reaction: row.reaction as ReactionType });
        reactionMap.set(row.letter_id, list);
      }
      const mappedLetters: Letter[] = (lettersResult.data ?? []).map((row) => ({
        ...row,
        letter_type: row.letter_type as LetterType,
        mood_stamp: row.mood_stamp as ReactionType | null,
        visibility: row.visibility as LetterVisibility,
        workflow_status: row.workflow_status as LetterWorkflowStatus,
        attachment: row.attachment as unknown as LetterAttachment | null,
        author: memberMap.get(row.author_id),
        reactions: reactionMap.get(row.id) ?? [],
      }));

      setMailbox({
        ...mailboxResult.data,
        max_members: 2,
        moderation_mode: "none",
        presence_enabled: true,
      });
      setMembers(mappedMembers);
      setMember(mappedMembers.find((item) => item.user_id === user.id) ?? null);
      setLetters(mappedLetters);
      setLastReadAt(readResult.data?.last_read_at ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "读取云端邮局失败");
    } finally {
      setLoading(false);
    }
  }, [activeArchive.id, supabase, user.id]);

  useEffect(() => { void loadMailbox(); }, [loadMailbox]);

  useEffect(() => {
    if (!mailbox) return;
    const scheduleReload = () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => void loadMailbox(), 150);
    };
    const lettersChannel = supabase
      .channel(`mailbox-letters-${mailbox.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "letters", filter: `mailbox_id=eq.${mailbox.id}` }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "letter_reactions" }, scheduleReload)
      .subscribe();
    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      void supabase.removeChannel(lettersChannel);
    };
  }, [loadMailbox, mailbox, supabase]);

  const run = useCallback(async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    setError("");
    const { error: operationError } = await operation();
    if (operationError) {
      setError(operationError.message);
      return false;
    }
    await loadMailbox();
    return true;
  }, [loadMailbox]);

  const sendLetter = useCallback(async (input: SendLetterInput) => {
    if (!mailbox || !input.content.trim()) return false;
    const entryId = input.attachment?.localId
      ? entries.find((entry) => entry.archive_id === activeArchive.id && entry.kind === input.attachment?.type && entry.legacy_id === input.attachment.localId)?.id ?? null
      : null;
    return run(() => supabase.from("letters").insert({
      mailbox_id: mailbox.id,
      archive_id: activeArchive.id,
      author_id: user.id,
      parent_id: input.parentId ?? null,
      content: input.content.trim(),
      letter_type: input.letterType,
      mood_stamp: input.moodStamp ?? null,
      attachment: input.attachment as unknown as Json,
      entry_id: entryId,
      visibility: input.visibility ?? "archive_members",
    }));
  }, [activeArchive.id, entries, mailbox, run, supabase, user.id]);

  const editLetter = useCallback(async (id: string, content: string) => {
    if (!content.trim()) return false;
    return run(() => supabase.from("letters").update({ content: content.trim(), edited_at: new Date().toISOString() }).eq("id", id).eq("author_id", user.id));
  }, [run, supabase, user.id]);

  const deleteLetter = useCallback(async (id: string) => run(() => supabase
    .from("letters")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", user.id)), [run, supabase, user.id]);

  const togglePin = useCallback(async (letter: Letter) => run(() => supabase
    .from("letters")
    .update({ is_pinned: !letter.is_pinned })
    .eq("id", letter.id)), [run, supabase]);

  const toggleReaction = useCallback(async (letterId: string, reaction: ReactionType) => {
    const letter = letters.find((item) => item.id === letterId);
    const exists = letter?.reactions?.some((item) => item.user_id === user.id && item.reaction === reaction);
    return exists
      ? run(() => supabase.from("letter_reactions").delete().eq("letter_id", letterId).eq("user_id", user.id).eq("reaction", reaction))
      : run(() => supabase.from("letter_reactions").insert({ letter_id: letterId, user_id: user.id, reaction }));
  }, [letters, run, supabase, user.id]);

  const setLetterState = useCallback(async (letter: Letter, state: { workflow?: LetterWorkflowStatus; hidden?: boolean }) => {
    if (member?.role !== "owner" && letter.author_id !== user.id) return false;
    return run(() => supabase.from("letters").update({
      ...(state.workflow ? { workflow_status: state.workflow } : {}),
      ...(state.hidden !== undefined ? { status: state.hidden ? "rejected" as const : "visible" as const } : {}),
    }).eq("id", letter.id));
  }, [member?.role, run, supabase, user.id]);

  const markLettersOpened = useCallback(async () => {
    if (!mailbox) return;
    const pendingIds = letters.filter((letter) => letter.author_id !== user.id && letter.workflow_status === "pending").map((letter) => letter.id);
    if (!pendingIds.length) return;
    const { error: openedError } = await supabase.from("letters").update({ workflow_status: "opened", read_at: new Date().toISOString() }).in("id", pendingIds);
    if (openedError) setError(openedError.message);
  }, [letters, mailbox, supabase, user.id]);

  const markRead = useCallback(async () => {
    if (!mailbox) return;
    const latest = letters[0];
    const now = new Date().toISOString();
    const { error: readError } = await supabase.from("mailbox_read_states").upsert({
      mailbox_id: mailbox.id,
      user_id: user.id,
      last_read_at: now,
      last_read_letter_id: latest?.id ?? null,
    });
    if (readError) setError(readError.message);
    else setLastReadAt(now);
  }, [letters, mailbox, supabase, user.id]);

  const updateProfile = useCallback(async (userId: string, change: Pick<MailboxMember, "display_name" | "avatar_symbol" | "avatar_color">) => {
    if (userId !== user.id || !change.display_name.trim()) return false;
    return run(() => supabase.from("profiles").update({ ...change, display_name: change.display_name.trim() }).eq("id", user.id));
  }, [run, supabase, user.id]);

  const updateMailbox = useCallback(async (change: Partial<Pick<Mailbox, "name" | "reactions_enabled">>) => {
    if (!mailbox || member?.role !== "owner") return false;
    return run(() => supabase.from("mailboxes").update({
      ...(change.name !== undefined ? { name: change.name.trim() || mailbox.name } : {}),
      ...(change.reactions_enabled !== undefined ? { reactions_enabled: change.reactions_enabled } : {}),
    }).eq("id", mailbox.id));
  }, [mailbox, member?.role, run, supabase]);

  const resetMailbox = useCallback(() => {
    if (!mailbox || member?.role !== "owner") return;
    void run(() => supabase.from("letters").update({ status: "deleted", deleted_at: new Date().toISOString() }).eq("mailbox_id", mailbox.id));
  }, [mailbox, member?.role, run, supabase]);

  const unreadCount = useMemo(() => letters.filter((letter) => letter.author_id !== user.id && (!lastReadAt || letter.created_at > lastReadAt)).length, [lastReadAt, letters, user.id]);

  const value = useMemo<MailboxContextValue>(() => ({
    loading,
    mailbox,
    member,
    members,
    letters,
    unreadCount,
    error,
    switchMember: () => undefined,
    sendLetter,
    editLetter,
    deleteLetter,
    togglePin,
    toggleReaction,
    setLetterState,
    markLettersOpened,
    markRead,
    updateProfile,
    updateMailbox,
    resetMailbox,
  }), [deleteLetter, editLetter, error, letters, loading, mailbox, markLettersOpened, markRead, member, members, resetMailbox, sendLetter, setLetterState, togglePin, toggleReaction, unreadCount, updateMailbox, updateProfile]);

  return <MailboxContext.Provider value={value}>{children}</MailboxContext.Provider>;
}

export function useMailbox() {
  const value = useContext(MailboxContext);
  if (!value) throw new Error("useMailbox 必须在 MailboxProvider 内使用");
  return value;
}
