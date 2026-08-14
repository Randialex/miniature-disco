"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Letter, LetterAttachment, LetterReaction, LetterType, Mailbox, MailboxMember, ReactionType } from "@/types/mailbox";
import { clearLocalMailbox, createDefaultLocalMailbox, loadLocalMailbox, LOCAL_MAILBOX_STORAGE_KEY, saveLocalMailbox, type LocalMailboxData } from "@/utils/mailboxStorage";

interface SendLetterInput {
  content: string;
  letterType: LetterType;
  parentId?: string | null;
  moodStamp?: ReactionType | null;
  attachment?: LetterAttachment | null;
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
  markRead: () => Promise<void>;
  updateProfile: (userId: string, change: Pick<MailboxMember, "display_name" | "avatar_symbol" | "avatar_color">) => Promise<boolean>;
  updateMailbox: (change: Partial<Pick<Mailbox, "name" | "reactions_enabled">>) => Promise<boolean>;
  resetMailbox: () => void;
}

const MailboxContext = createContext<MailboxContextValue | null>(null);

function uniqueId(prefix: string): string {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${value}`;
}

export function MailboxProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<LocalMailboxData | null>(null);
  const [error, setError] = useState("");
  const hydrated = useRef(false);

  useEffect(() => {
    setData(loadLocalMailbox());
    hydrated.current = true;
    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === LOCAL_MAILBOX_STORAGE_KEY) setData(loadLocalMailbox());
    };
    window.addEventListener("storage", syncAcrossTabs);
    return () => window.removeEventListener("storage", syncAcrossTabs);
  }, []);

  useEffect(() => {
    if (!hydrated.current || !data) return;
    if (!saveLocalMailbox(data)) setError("本地留言簿保存失败，请检查浏览器存储空间");
  }, [data]);

  const member = useMemo(
    () => data?.members.find((item) => item.user_id === data.activeUserId) ?? null,
    [data],
  );

  const letters = useMemo(() => {
    if (!data) return [];
    const memberMap = new Map(data.members.map((item) => [item.user_id, item]));
    return data.letters
      .filter((letter) => !letter.deleted_at)
      .map((letter) => ({ ...letter, author: memberMap.get(letter.author_id) }))
      .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.created_at.localeCompare(a.created_at));
  }, [data]);

  const mutate = useCallback((change: (current: LocalMailboxData) => LocalMailboxData): boolean => {
    setError("");
    setData((current) => current ? change(current) : current);
    return true;
  }, []);

  const switchMember = useCallback((userId: string) => {
    mutate((current) => current.members.some((item) => item.user_id === userId)
      ? { ...current, activeUserId: userId }
      : current);
  }, [mutate]);

  const sendLetter = useCallback(async (input: SendLetterInput) => {
    if (!member || !input.content.trim()) return false;
    const now = new Date().toISOString();
    const letter: Letter = {
      id: uniqueId("letter"),
      mailbox_id: member.mailbox_id,
      author_id: member.user_id,
      parent_id: input.parentId ?? null,
      content: input.content.trim(),
      letter_type: input.letterType,
      status: "visible",
      is_pinned: false,
      mood_stamp: input.moodStamp ?? null,
      attachment: input.attachment ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reactions: [],
    };
    return mutate((current) => ({ ...current, letters: [letter, ...current.letters] }));
  }, [member, mutate]);

  const editLetter = useCallback(async (id: string, content: string) => {
    if (!member || !content.trim()) return false;
    return mutate((current) => ({
      ...current,
      letters: current.letters.map((letter) => letter.id === id && letter.author_id === member.user_id
        ? { ...letter, content: content.trim(), updated_at: new Date().toISOString() }
        : letter),
    }));
  }, [member, mutate]);

  const deleteLetter = useCallback(async (id: string) => {
    if (!member) return false;
    const targetIds = new Set([id, ...letters.filter((letter) => letter.parent_id === id).map((letter) => letter.id)]);
    return mutate((current) => ({
      ...current,
      letters: current.letters.map((letter) => targetIds.has(letter.id) && letter.author_id === member.user_id
        ? { ...letter, deleted_at: new Date().toISOString() }
        : letter),
    }));
  }, [letters, member, mutate]);

  const togglePin = useCallback(async (letter: Letter) => mutate((current) => ({
    ...current,
    letters: current.letters.map((item) => item.id === letter.id ? { ...item, is_pinned: !item.is_pinned } : item),
  })), [mutate]);

  const toggleReaction = useCallback(async (letterId: string, reaction: ReactionType) => {
    if (!member) return false;
    return mutate((current) => ({
      ...current,
      letters: current.letters.map((letter) => {
        if (letter.id !== letterId) return letter;
        const reactions = letter.reactions ?? [];
        const exists = reactions.some((item) => item.user_id === member.user_id && item.reaction === reaction);
        const nextReactions: LetterReaction[] = exists
          ? reactions.filter((item) => !(item.user_id === member.user_id && item.reaction === reaction))
          : [...reactions, { id: uniqueId("reaction"), letter_id: letterId, user_id: member.user_id, reaction, created_at: new Date().toISOString() }];
        return { ...letter, reactions: nextReactions };
      }),
    }));
  }, [member, mutate]);

  const markRead = useCallback(async () => {
    if (!member) return;
    mutate((current) => ({
      ...current,
      lastReadAt: { ...current.lastReadAt, [member.user_id]: new Date().toISOString() },
    }));
  }, [member, mutate]);

  const updateProfile = useCallback(async (userId: string, change: Pick<MailboxMember, "display_name" | "avatar_symbol" | "avatar_color">) => {
    if (!change.display_name.trim()) return false;
    return mutate((current) => ({
      ...current,
      members: current.members.map((item) => item.user_id === userId
        ? { ...item, ...change, display_name: change.display_name.trim() }
        : item),
    }));
  }, [mutate]);

  const updateMailbox = useCallback(async (change: Partial<Pick<Mailbox, "name" | "reactions_enabled">>) => mutate((current) => ({
    ...current,
    mailbox: { ...current.mailbox, ...change, name: change.name?.trim() || current.mailbox.name },
  })), [mutate]);

  const resetMailbox = useCallback(() => {
    clearLocalMailbox();
    setData(createDefaultLocalMailbox());
    setError("");
  }, []);

  const unreadCount = useMemo(() => {
    if (!data || !member) return 0;
    const lastReadAt = data.lastReadAt[member.user_id];
    return letters.filter((letter) => letter.author_id !== member.user_id && (!lastReadAt || letter.created_at > lastReadAt)).length;
  }, [data, letters, member]);

  const value = useMemo<MailboxContextValue>(() => ({
    loading: !data,
    mailbox: data?.mailbox ?? null,
    member,
    members: data?.members ?? [],
    letters,
    unreadCount,
    error,
    switchMember,
    sendLetter,
    editLetter,
    deleteLetter,
    togglePin,
    toggleReaction,
    markRead,
    updateProfile,
    updateMailbox,
    resetMailbox,
  }), [data, deleteLetter, editLetter, error, letters, markRead, member, resetMailbox, sendLetter, switchMember, togglePin, toggleReaction, unreadCount, updateMailbox, updateProfile]);

  return <MailboxContext.Provider value={value}>{children}</MailboxContext.Provider>;
}

export function useMailbox() {
  const value = useContext(MailboxContext);
  if (!value) throw new Error("useMailbox 必须在 MailboxProvider 内使用");
  return value;
}
