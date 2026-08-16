import type { Letter, Mailbox, MailboxMember } from "@/types/mailbox";

export const LOCAL_MAILBOX_STORAGE_KEY = "randi-local-mailbox-v1";
export const LOCAL_MAILBOX_STORAGE_VERSION = 1;
export const MAILBOX_DRAFT_KEY = "randi-mailbox-draft-v1";

export interface LocalMailboxData {
  mailbox: Mailbox;
  members: MailboxMember[];
  letters: Letter[];
  activeUserId: string;
  lastReadAt: Record<string, string>;
}

interface StoredLocalMailbox extends LocalMailboxData {
  version: number;
}

const MAILBOX_ID = "local-owl-post";
const OWNER_ID = "local-randi";
const GUEST_ID = "local-friend";

export function createDefaultLocalMailbox(): LocalMailboxData {
  const now = new Date().toISOString();
  return {
    mailbox: {
      id: MAILBOX_ID,
      name: "拾染randi的夜枭邮局",
      owner_id: OWNER_ID,
      archive_id: "local-archive",
      max_members: 2,
      moderation_mode: "none",
      reactions_enabled: true,
      presence_enabled: false,
      created_at: now,
    },
    members: [
      {
        id: "local-member-randi",
        mailbox_id: MAILBOX_ID,
        user_id: OWNER_ID,
        role: "owner",
        display_name: "拾染randi",
        avatar_symbol: "🗝",
        avatar_color: "#7a1f1f",
        joined_at: now,
        last_seen_at: null,
        is_active: true,
        first_letter_approved: true,
      },
      {
        id: "local-member-friend",
        mailbox_id: MAILBOX_ID,
        user_id: GUEST_ID,
        role: "guest",
        display_name: "友人",
        avatar_symbol: "🪶",
        avatar_color: "#2a6a4a",
        joined_at: now,
        last_seen_at: null,
        is_active: true,
        first_letter_approved: true,
      },
    ],
    letters: [],
    activeUserId: OWNER_ID,
    lastReadAt: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredMailbox(value: unknown): value is StoredLocalMailbox {
  if (!isRecord(value) || value.version !== LOCAL_MAILBOX_STORAGE_VERSION) return false;
  if (!isRecord(value.mailbox) || typeof value.mailbox.id !== "string") return false;
  if (!Array.isArray(value.members) || value.members.length !== 2) return false;
  if (!value.members.every((member) => isRecord(member) && typeof member.user_id === "string")) return false;
  if (!Array.isArray(value.letters)) return false;
  return typeof value.activeUserId === "string" && isRecord(value.lastReadAt);
}

export function loadLocalMailbox(): LocalMailboxData {
  if (typeof window === "undefined") return createDefaultLocalMailbox();
  try {
    const raw = window.localStorage.getItem(LOCAL_MAILBOX_STORAGE_KEY);
    if (!raw) return createDefaultLocalMailbox();
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredMailbox(parsed)) return createDefaultLocalMailbox();
    return {
      mailbox: parsed.mailbox,
      members: parsed.members,
      letters: parsed.letters,
      activeUserId: parsed.members.some((member) => member.user_id === parsed.activeUserId)
        ? parsed.activeUserId
        : parsed.members[0].user_id,
      lastReadAt: parsed.lastReadAt,
    };
  } catch {
    return createDefaultLocalMailbox();
  }
}

export function saveLocalMailbox(data: LocalMailboxData): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored: StoredLocalMailbox = { version: LOCAL_MAILBOX_STORAGE_VERSION, ...data };
    window.localStorage.setItem(LOCAL_MAILBOX_STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function clearLocalMailbox(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_MAILBOX_STORAGE_KEY);
  window.localStorage.removeItem(MAILBOX_DRAFT_KEY);
}
