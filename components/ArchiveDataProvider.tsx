"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { books as staticBooks } from "@/data/books";
import { films as staticFilms } from "@/data/films";
import { cps as staticCps } from "@/data/cps";
import type { Book, Cp, Film } from "@/types";
import type { Database, Enums, Json, Tables } from "@/types/database";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadArchiveData, saveArchiveData, type ArchiveData } from "@/utils/storage";

export type ArchiveKind = Enums<"archive_kind">;
export type ArchiveRole = Enums<"archive_member_role">;
export type CloudSyncState = "checking" | "loading" | "saving" | "synced" | "offline" | "conflict" | "error";
export type ArchiveEntryRow = Tables<"archive_entries">;
export type ArchiveVersion = Tables<"archive_entry_versions">;

export interface ArchiveSpaceSummary {
  id: string;
  name: string;
  ownerId: string;
  role: ArchiveRole;
  visitorAccessEnabled: boolean;
}

export interface ArchiveMemberSummary {
  userId: string;
  displayName: string;
  avatarSymbol: string;
  role: ArchiveRole;
  isActive: boolean;
  joinedAt: string;
}

export interface ArchiveInvitationSummary {
  id: string;
  role: ArchiveRole;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

export interface ArchiveBackupSummary {
  id: string;
  snapshotDate: string;
  entryCount: number;
  createdAt: string;
}

interface PendingMutation {
  operationId: string;
  archiveId: string;
  kind: ArchiveKind;
  legacyId: string;
  localItem: Book | Film | Cp;
  deleted: boolean;
  baseRevision: number;
  createdAt: string;
}

export interface ArchiveConflict {
  id: string;
  kind: ArchiveKind;
  legacyId: string;
  localItem: Book | Film | Cp;
  deleted: boolean;
  baseRevision: number;
  cloudEntry: ArchiveEntryRow | null;
  createdAt: string;
}

interface ArchiveContextValue extends ArchiveData {
  ready: boolean;
  user: User;
  syncState: CloudSyncState;
  syncMessage: string;
  lastSyncedAt: string | null;
  pendingCount: number;
  canEdit: boolean;
  isOwner: boolean;
  role: ArchiveRole;
  activeArchive: ArchiveSpaceSummary;
  archives: ArchiveSpaceSummary[];
  entries: ArchiveEntryRow[];
  trash: ArchiveEntryRow[];
  conflicts: ArchiveConflict[];
  members: ArchiveMemberSummary[];
  invitations: ArchiveInvitationSummary[];
  backups: ArchiveBackupSummary[];
  saveBooks: (books: Book[]) => boolean;
  saveFilms: (films: Film[]) => boolean;
  saveCps: (cps: Cp[]) => boolean;
  replaceAll: (data: ArchiveData) => boolean;
  resetAll: () => void;
  refreshCloud: () => Promise<void>;
  switchArchive: (archiveId: string) => Promise<void>;
  signOutCloud: () => Promise<void>;
  setVisitorAccess: (enabled: boolean) => Promise<void>;
  resolveConflict: (conflictId: string, choice: "local" | "cloud") => Promise<void>;
  restoreTrashEntry: (entryId: string) => Promise<void>;
  getEntryHistory: (entryId: string) => Promise<ArchiveVersion[]>;
  restoreVersion: (versionId: string) => Promise<void>;
  createInvitation: (role: Exclude<ArchiveRole, "owner">, hours: number) => Promise<string>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  updateMember: (userId: string, role: Exclude<ArchiveRole, "owner">, active: boolean) => Promise<void>;
  restoreBackup: (backupId: string) => Promise<void>;
}

const fallback: ArchiveData = { books: staticBooks, films: staticFilms, cps: staticCps };
const emptyArchive: ArchiveData = { books: [], films: [], cps: [] };
const ArchiveContext = createContext<ArchiveContextValue | null>(null);
const QUEUE_KEY = "randi-archive-sync-queue-v2";
const CONFLICT_KEY = "randi-archive-sync-conflicts-v2";
const ACTIVE_ARCHIVE_KEY = "randi-active-archive-v1";

function scopedKey(key: string, archiveId: string) {
  return `${key}:${archiveId}`;
}

function readStoredList<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

function writeStoredList<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasItemId(value: unknown): value is Book | Film | Cp {
  return isRecord(value) && typeof value.id === "string";
}

function rowKey(kind: ArchiveKind, legacyId: string) {
  return `${kind}:${legacyId}`;
}

function itemTitle(kind: ArchiveKind, item: Book | Film | Cp) {
  return kind === "cp" ? (item as Cp).name : (item as Book | Film).title;
}

function itemDate(kind: ArchiveKind, item: Book | Film | Cp) {
  if (kind === "book") return (item as Book).readDate || null;
  if (kind === "film") return (item as Film).watchDate || null;
  return (item as Cp).startDate || null;
}

function dataItems(data: ArchiveData, kind: ArchiveKind): Array<Book | Film | Cp> {
  if (kind === "book") return data.books;
  if (kind === "film") return data.films;
  return data.cps;
}

function replaceKind(data: ArchiveData, kind: ArchiveKind, items: Array<Book | Film | Cp>): ArchiveData {
  if (kind === "book") return { ...data, books: items as Book[] };
  if (kind === "film") return { ...data, films: items as Film[] };
  return { ...data, cps: items as Cp[] };
}

function putItem(data: ArchiveData, kind: ArchiveKind, item: Book | Film | Cp | null, legacyId: string): ArchiveData {
  const without = dataItems(data, kind).filter((candidate) => candidate.id !== legacyId);
  return replaceKind(data, kind, item ? [...without, item] : without);
}

function archiveFromRows(rows: ArchiveEntryRow[]): ArchiveData {
  let data: ArchiveData = { books: [], films: [], cps: [] };
  for (const row of rows) {
    if (row.deleted_at || !hasItemId(row.payload)) continue;
    data = putItem(data, row.kind, row.payload, row.legacy_id);
  }
  return data;
}

function sameItem(left: Book | Film | Cp | undefined, right: Book | Film | Cp | undefined) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseMutationResponse(value: Json): { status: "applied" | "conflict"; entry: ArchiveEntryRow | null } | null {
  if (!isRecord(value) || (value.status !== "applied" && value.status !== "conflict")) return null;
  const entry = isRecord(value.entry) ? value.entry as unknown as ArchiveEntryRow : null;
  return { status: value.status, entry };
}

function makeOperationId() {
  return crypto.randomUUID();
}

export function ArchiveDataProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => configured ? createSupabaseBrowserClient() : null, [configured]);
  const [data, setData] = useState<ArchiveData>(fallback);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<CloudSyncState>("checking");
  const [syncMessage, setSyncMessage] = useState("正在查验云端身份……");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [archives, setArchives] = useState<ArchiveSpaceSummary[]>([]);
  const [activeArchive, setActiveArchive] = useState<ArchiveSpaceSummary | null>(null);
  const [entries, setEntries] = useState<ArchiveEntryRow[]>([]);
  const [trash, setTrash] = useState<ArchiveEntryRow[]>([]);
  const [conflicts, setConflicts] = useState<ArchiveConflict[]>([]);
  const [members, setMembers] = useState<ArchiveMemberSummary[]>([]);
  const [invitations, setInvitations] = useState<ArchiveInvitationSummary[]>([]);
  const [backups, setBackups] = useState<ArchiveBackupSummary[]>([]);
  const dataRef = useRef<ArchiveData>(fallback);
  const userRef = useRef<User | null>(null);
  const archiveRef = useRef<ArchiveSpaceSummary | null>(null);
  const queueRef = useRef<PendingMutation[]>([]);
  const conflictsRef = useRef<ArchiveConflict[]>([]);
  const rowsRef = useRef<Map<string, ArchiveEntryRow>>(new Map());
  const flushingRef = useRef(false);
  const refreshTimer = useRef<number | null>(null);
  const initializedUserRef = useRef<string | null>(null);

  const commitLocal = useCallback((next: ArchiveData, archiveId?: string) => {
    dataRef.current = next;
    setData(next);
    return saveArchiveData(next, archiveId ?? archiveRef.current?.id);
  }, []);

  const persistQueue = useCallback((next: PendingMutation[], archiveId: string) => {
    queueRef.current = next;
    setPendingCount(next.length);
    writeStoredList(scopedKey(QUEUE_KEY, archiveId), next);
  }, []);

  const persistConflicts = useCallback((next: ArchiveConflict[], archiveId: string) => {
    conflictsRef.current = next;
    setConflicts(next);
    writeStoredList(scopedKey(CONFLICT_KEY, archiveId), next);
  }, []);

  const mergeRemoteRows = useCallback((rows: ArchiveEntryRow[], archiveId: string) => {
    const rowMap = new Map(rows.map((row) => [rowKey(row.kind, row.legacy_id), row]));
    rowsRef.current = rowMap;
    setEntries(rows);
    setTrash(rows.filter((row) => Boolean(row.deleted_at)).sort((a, b) => String(b.deleted_at).localeCompare(String(a.deleted_at))));

    let merged = archiveFromRows(rows);
    const protectedKeys = new Set([
      ...queueRef.current.map((item) => rowKey(item.kind, item.legacyId)),
      ...conflictsRef.current.map((item) => rowKey(item.kind, item.legacyId)),
    ]);
    for (const key of Array.from(protectedKeys)) {
      const [kind, ...idParts] = key.split(":");
      const legacyId = idParts.join(":");
      const local = dataItems(dataRef.current, kind as ArchiveKind).find((item) => item.id === legacyId) ?? null;
      merged = putItem(merged, kind as ArchiveKind, local, legacyId);
    }
    commitLocal(merged, archiveId);
  }, [commitLocal]);

  const fetchRows = useCallback(async (archiveId: string) => {
    if (!supabase) return [];
    const { data: rows, error } = await supabase
      .from("archive_entries")
      .select("*")
      .eq("archive_id", archiveId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  }, [supabase]);

  const loadManagement = useCallback(async (archive: ArchiveSpaceSummary) => {
    if (!supabase) return;
    if (userRef.current?.is_anonymous) {
      setMembers([]);
      setInvitations([]);
      setBackups([]);
      return;
    }
    const { data: memberRows, error: memberError } = await supabase
      .from("archive_members")
      .select("*")
      .eq("archive_id", archive.id)
      .order("joined_at");
    if (memberError) throw memberError;
    const ids = (memberRows ?? []).map((item) => item.user_id);
    const profileResult = ids.length
      ? await supabase.from("profiles").select("id,display_name,avatar_symbol").in("id", ids)
      : { data: [], error: null };
    if (profileResult.error) throw profileResult.error;
    const profileMap = new Map((profileResult.data ?? []).map((profile) => [profile.id, profile]));
    setMembers((memberRows ?? []).map((row) => ({
      userId: row.user_id,
      displayName: profileMap.get(row.user_id)?.display_name ?? "无名访客",
      avatarSymbol: profileMap.get(row.user_id)?.avatar_symbol ?? "🪶",
      role: row.role,
      isActive: row.is_active,
      joinedAt: row.joined_at,
    })));

    if (archive.role !== "owner") {
      setInvitations([]);
      setBackups([]);
      return;
    }

    const [inviteResult, backupResult] = await Promise.all([
      supabase.from("archive_invitations").select("id,role,created_at,expires_at,accepted_at,revoked_at").eq("archive_id", archive.id).order("created_at", { ascending: false }),
      supabase.from("archive_backups").select("id,snapshot_date,entry_count,created_at").eq("archive_id", archive.id).order("snapshot_date", { ascending: false }).limit(30),
    ]);
    if (inviteResult.error) throw inviteResult.error;
    if (backupResult.error) throw backupResult.error;
    setInvitations((inviteResult.data ?? []).map((row) => ({
      id: row.id,
      role: row.role,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      acceptedAt: row.accepted_at,
      revokedAt: row.revoked_at,
    })));
    setBackups((backupResult.data ?? []).map((row) => ({
      id: row.id,
      snapshotDate: row.snapshot_date,
      entryCount: row.entry_count,
      createdAt: row.created_at,
    })));
  }, [supabase]);

  const flushQueue = useCallback(async () => {
    const archive = archiveRef.current;
    if (!supabase || !archive || flushingRef.current || !queueRef.current.length) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncState("offline");
      setSyncMessage(`${queueRef.current.length} 项修改已在本机排队，联网后自动续传`);
      return;
    }
    flushingRef.current = true;
    setSyncState("saving");
    try {
      while (queueRef.current.length) {
        const mutation = queueRef.current[0];
        if (mutation.archiveId !== archive.id) break;
        const item = mutation.localItem;
        const args: Database["public"]["Functions"]["apply_archive_entry_mutation"]["Args"] = {
          p_operation_id: mutation.operationId,
          p_archive_id: mutation.archiveId,
          p_kind: mutation.kind,
          p_legacy_id: mutation.legacyId,
          p_title: itemTitle(mutation.kind, item),
          p_event_date: (itemDate(mutation.kind, item) ?? null) as unknown as string,
          p_rating: (item.rating ?? null) as unknown as number,
          p_payload: item as unknown as Json,
          p_base_revision: mutation.baseRevision,
          p_deleted: mutation.deleted,
        };
        const { data: result, error } = await supabase.rpc("apply_archive_entry_mutation", args);
        if (error) throw error;
        const parsed = parseMutationResponse(result);
        if (!parsed) throw new Error("云端返回了无法识别的同步结果");

        persistQueue(queueRef.current.filter((item) => item.operationId !== mutation.operationId), archive.id);
        if (parsed.status === "conflict") {
          const conflict: ArchiveConflict = {
            id: mutation.operationId,
            kind: mutation.kind,
            legacyId: mutation.legacyId,
            localItem: mutation.localItem,
            deleted: mutation.deleted,
            baseRevision: mutation.baseRevision,
            cloudEntry: parsed.entry,
            createdAt: new Date().toISOString(),
          };
          persistConflicts([...conflictsRef.current.filter((item) => item.id !== conflict.id), conflict], archive.id);
        } else if (parsed.entry) {
          rowsRef.current.set(rowKey(parsed.entry.kind, parsed.entry.legacy_id), parsed.entry);
          const updatedQueue = queueRef.current.map((queued) => rowKey(queued.kind, queued.legacyId) === rowKey(parsed.entry!.kind, parsed.entry!.legacy_id)
            ? { ...queued, baseRevision: parsed.entry!.revision }
            : queued);
          if (updatedQueue !== queueRef.current) persistQueue(updatedQueue, archive.id);
        }
      }

      const rows = await fetchRows(archive.id);
      mergeRemoteRows(rows, archive.id);
      const syncedAt = new Date().toISOString();
      setLastSyncedAt(syncedAt);
      if (conflictsRef.current.length) {
        setSyncState("conflict");
        setSyncMessage(`${conflictsRef.current.length} 项跨设备修改需要选择保留版本`);
      } else {
        setSyncState("synced");
        setSyncMessage(`云端已同步 · ${rows.filter((row) => !row.deleted_at).length} 条档案`);
      }
    } catch (cause) {
      setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setSyncMessage(cause instanceof Error ? `同步暂停：${cause.message}` : "同步暂停，修改仍安全保存在本机");
    } finally {
      flushingRef.current = false;
      setPendingCount(queueRef.current.length);
    }
  }, [fetchRows, mergeRemoteRows, persistConflicts, persistQueue, supabase]);

  const loadArchive = useCallback(async (archive: ArchiveSpaceSummary) => {
    if (!supabase) return;
    archiveRef.current = archive;
    setActiveArchive(archive);
    setReady(false);
    setSyncState("loading");
    setSyncMessage(`正在开启「${archive.name}」……`);
    const scopedLocal = loadArchiveData(loadArchiveData(fallback), archive.id);
    dataRef.current = scopedLocal;
    const storedQueue = readStoredList<PendingMutation>(scopedKey(QUEUE_KEY, archive.id));
    const storedConflicts = readStoredList<ArchiveConflict>(scopedKey(CONFLICT_KEY, archive.id));
    persistQueue(storedQueue, archive.id);
    persistConflicts(storedConflicts, archive.id);

    try {
      const rows = await fetchRows(archive.id);
      rowsRef.current = new Map(rows.map((row) => [rowKey(row.kind, row.legacy_id), row]));
      setEntries(rows);
      if (!rows.length && !storedQueue.length && archive.role === "owner") {
        const seedMutations: PendingMutation[] = (["book", "film", "cp"] as ArchiveKind[]).flatMap((kind) =>
          dataItems(scopedLocal, kind).map((item) => ({
            operationId: makeOperationId(), archiveId: archive.id, kind, legacyId: item.id,
            localItem: item, deleted: false, baseRevision: 0, createdAt: new Date().toISOString(),
          })));
        persistQueue(seedMutations, archive.id);
        commitLocal(scopedLocal, archive.id);
      } else if (storedQueue.length || storedConflicts.length) {
        commitLocal(scopedLocal, archive.id);
        setTrash(rows.filter((row) => Boolean(row.deleted_at)));
      } else {
        mergeRemoteRows(rows, archive.id);
      }
      await loadManagement(archive);
      setReady(true);
      if (queueRef.current.length) await flushQueue();
      else if (storedConflicts.length) {
        setSyncState("conflict");
        setSyncMessage(`${storedConflicts.length} 项跨设备修改需要处理`);
      } else {
        setLastSyncedAt(new Date().toISOString());
        setSyncState("synced");
        setSyncMessage(`云端已同步 · ${rows.filter((row) => !row.deleted_at).length} 条档案`);
      }
      if (archive.role !== "viewer") void supabase.rpc("maintain_archive", { p_archive_id: archive.id });
    } catch (cause) {
      commitLocal(scopedLocal, archive.id);
      setReady(true);
      setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setSyncMessage(cause instanceof Error ? `云端暂不可用：${cause.message}` : "云端暂不可用，已打开本地缓存");
    }
  }, [commitLocal, fetchRows, flushQueue, loadManagement, mergeRemoteRows, persistConflicts, persistQueue, supabase]);

  const bootstrap = useCallback(async (activeUser: User) => {
    if (!supabase) return;
    setReady(false);
    setSyncState("loading");
    setSyncMessage("正在确认档案馆成员身份……");
    let invitedArchiveId: string | null = null;
    if (activeUser.is_anonymous) {
      setSyncMessage("正在为访客开启云端阅览室……");
      const visitorResult = await supabase.rpc("enter_public_archive");
      if (visitorResult.error) {
        if (visitorResult.error.message.includes("visitor_archive_not_enabled")) {
          throw new Error("馆主尚未开启访客阅览；请稍后再来");
        }
        if (visitorResult.error.message.includes("visitor_access_revoked")) {
          throw new Error("此访客会话已被馆主封存");
        }
        throw visitorResult.error;
      }
      invitedArchiveId = visitorResult.data;
    } else {
      const params = new URLSearchParams(window.location.search);
      const inviteToken = params.get("invite");
      if (inviteToken) {
        const { data: accepted, error: acceptError } = await supabase.rpc("accept_archive_invitation", { p_token: inviteToken });
        if (!acceptError && isRecord(accepted) && typeof accepted.archive_id === "string") {
          invitedArchiveId = accepted.archive_id;
          params.delete("invite");
          params.delete("archive");
          const query = params.toString();
          window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
        } else if (acceptError) {
          setSyncMessage(`邀请未能接受：${acceptError.message}`);
        }
      }

      const ensureResult = await supabase.rpc("ensure_personal_archive");
      if (ensureResult.error) throw ensureResult.error;
    }
    const { data: memberRows, error: memberError } = await supabase
      .from("archive_members")
      .select("archive_id,role")
      .eq("user_id", activeUser.id)
      .eq("is_active", true);
    if (memberError) throw memberError;
    const archiveIds = (memberRows ?? []).map((item) => item.archive_id);
    if (!archiveIds.length) throw new Error("此身份尚未获准进入任何档案馆");
    const { data: spaceRows, error: spaceError } = await supabase
      .from("archive_spaces")
      .select("id,name,owner_id,visitor_access_enabled")
      .in("id", archiveIds);
    if (spaceError) throw spaceError;
    const roleMap = new Map((memberRows ?? []).map((item) => [item.archive_id, item.role]));
    const available = (spaceRows ?? []).map((space) => ({
      id: space.id,
      name: space.name,
      ownerId: space.owner_id,
      role: roleMap.get(space.id) ?? "viewer",
      visitorAccessEnabled: space.visitor_access_enabled,
    } satisfies ArchiveSpaceSummary)).sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name)));
    setArchives(available);
    const stored = window.localStorage.getItem(`${ACTIVE_ARCHIVE_KEY}:${activeUser.id}`);
    const selected = available.find((item) => item.id === invitedArchiveId)
      ?? available.find((item) => item.id === stored)
      ?? available[0];
    window.localStorage.setItem(`${ACTIVE_ARCHIVE_KEY}:${activeUser.id}`, selected.id);
    await loadArchive(selected);
  }, [loadArchive, supabase]);

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      setReady(true);
      setSyncState("error");
      setSyncMessage("尚未配置 Supabase，无法进入云端档案");
      return;
    }
    let active = true;

    const initialize = async (nextUser: User) => {
      if (!active) return;
      userRef.current = nextUser;
      setUser(nextUser);
      setAuthChecked(true);
      if (initializedUserRef.current === nextUser.id) return;
      initializedUserRef.current = nextUser.id;
      try {
        await bootstrap(nextUser);
      } catch (cause: unknown) {
        initializedUserRef.current = null;
        setReady(true);
        setSyncState("error");
        setSyncMessage(cause instanceof Error ? cause.message : "云端档案初始化失败");
      }
    };

    const openVisitorSession = async () => {
      setSyncState("checking");
      setSyncMessage("正在安静地开启访客阅览……");
      const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (anonymousError || !anonymousData.user) {
        setAuthChecked(true);
        setReady(true);
        setSyncState("error");
        setSyncMessage(anonymousError
          ? `访客入口尚未启用：${anonymousError.message}`
          : "访客入口暂时无法建立云端会话");
        return;
      }
      await initialize(anonymousData.user);
    };

    void supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!active) return;
      if (authData.user) await initialize(authData.user);
      else await openVisitorSession();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user) {
        void initialize(session.user);
      } else if (event === "SIGNED_OUT") {
        initializedUserRef.current = null;
        archiveRef.current = null;
        setActiveArchive(null);
        setReady(false);
        void openVisitorSession();
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [bootstrap, supabase]);

  useEffect(() => {
    const archive = activeArchive;
    if (!supabase || !archive) return;
    const scheduleRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        void fetchRows(archive.id).then((rows) => mergeRemoteRows(rows, archive.id));
      }, 220);
    };
    const channel = supabase
      .channel(`archive-entries-${archive.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "archive_entries", filter: `archive_id=eq.${archive.id}` }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [activeArchive, fetchRows, mergeRemoteRows, supabase]);

  useEffect(() => {
    const resumeSync = () => void flushQueue();
    window.addEventListener("online", resumeSync);
    return () => window.removeEventListener("online", resumeSync);
  }, [flushQueue]);

  const enqueueDataChange = useCallback((next: ArchiveData, kinds: ArchiveKind[]) => {
    const archive = archiveRef.current;
    if (!archive || archive.role === "viewer") {
      setSyncState("error");
      setSyncMessage("当前身份是只读访客，不能修改档案");
      return false;
    }
    let queue = [...queueRef.current];
    for (const kind of kinds) {
      const before = new Map(dataItems(dataRef.current, kind).map((item) => [item.id, item]));
      const after = new Map(dataItems(next, kind).map((item) => [item.id, item]));
      for (const legacyId of Array.from(new Set([...Array.from(before.keys()), ...Array.from(after.keys())]))) {
        const previous = before.get(legacyId);
        const upcoming = after.get(legacyId);
        if (sameItem(previous, upcoming)) continue;
        const key = rowKey(kind, legacyId);
        const existing = queue.find((item) => rowKey(item.kind, item.legacyId) === key);
        if (!upcoming && existing?.baseRevision === 0) {
          queue = queue.filter((item) => item.operationId !== existing.operationId);
          continue;
        }
        const baseRevision = existing?.baseRevision ?? rowsRef.current.get(key)?.revision ?? 0;
        const mutation: PendingMutation = {
          operationId: makeOperationId(),
          archiveId: archive.id,
          kind,
          legacyId,
          localItem: upcoming ?? previous!,
          deleted: !upcoming,
          baseRevision,
          createdAt: new Date().toISOString(),
        };
        queue = [...queue.filter((item) => rowKey(item.kind, item.legacyId) !== key), mutation];
      }
    }
    const saved = commitLocal(next, archive.id);
    persistQueue(queue, archive.id);
    if (queue.length) void flushQueue();
    return saved || queue.length > 0;
  }, [commitLocal, flushQueue, persistQueue]);

  const refreshCloud = useCallback(async () => {
    const archive = archiveRef.current;
    if (!archive) return;
    if (queueRef.current.length && archive.role !== "viewer") await flushQueue();
    const rows = await fetchRows(archive.id);
    mergeRemoteRows(rows, archive.id);
    await loadManagement(archive);
    setLastSyncedAt(new Date().toISOString());
    if (!conflictsRef.current.length) {
      setSyncState("synced");
      setSyncMessage(`云端已同步 · ${rows.filter((row) => !row.deleted_at).length} 条档案`);
    }
  }, [fetchRows, flushQueue, loadManagement, mergeRemoteRows]);

  const switchArchive = useCallback(async (archiveId: string) => {
    const next = archives.find((item) => item.id === archiveId);
    if (!next || !userRef.current) return;
    window.localStorage.setItem(`${ACTIVE_ARCHIVE_KEY}:${userRef.current.id}`, next.id);
    await loadArchive(next);
  }, [archives, loadArchive]);

  const setVisitorAccess = useCallback(async (enabled: boolean) => {
    const archive = archiveRef.current;
    if (!supabase || !archive || archive.role !== "owner") throw new Error("只有馆主可以调整访客入口");
    const { error } = await supabase
      .from("archive_spaces")
      .update({ visitor_access_enabled: enabled })
      .eq("id", archive.id);
    if (error) throw error;
    const apply = (item: ArchiveSpaceSummary) => item.id === archive.id ? { ...item, visitorAccessEnabled: enabled } : item;
    const nextArchive = apply(archive);
    archiveRef.current = nextArchive;
    setActiveArchive(nextArchive);
    setArchives((current) => current.map(apply));
  }, [supabase]);

  const resolveConflict = useCallback(async (conflictId: string, choice: "local" | "cloud") => {
    const archive = archiveRef.current;
    const conflict = conflictsRef.current.find((item) => item.id === conflictId);
    if (!archive || !conflict) return;
    if (choice === "cloud") {
      const cloudItem = conflict.cloudEntry && !conflict.cloudEntry.deleted_at && hasItemId(conflict.cloudEntry.payload)
        ? conflict.cloudEntry.payload
        : null;
      commitLocal(putItem(dataRef.current, conflict.kind, cloudItem, conflict.legacyId), archive.id);
    } else {
      const mutation: PendingMutation = {
        operationId: makeOperationId(), archiveId: archive.id, kind: conflict.kind,
        legacyId: conflict.legacyId, localItem: conflict.localItem, deleted: conflict.deleted,
        baseRevision: conflict.cloudEntry?.revision ?? 0, createdAt: new Date().toISOString(),
      };
      persistQueue([...queueRef.current.filter((item) => rowKey(item.kind, item.legacyId) !== rowKey(conflict.kind, conflict.legacyId)), mutation], archive.id);
    }
    persistConflicts(conflictsRef.current.filter((item) => item.id !== conflictId), archive.id);
    if (choice === "local") await flushQueue();
    else await refreshCloud();
  }, [commitLocal, flushQueue, persistConflicts, persistQueue, refreshCloud]);

  const restoreTrashEntry = useCallback(async (entryId: string) => {
    const archive = archiveRef.current;
    const entry = trash.find((item) => item.id === entryId);
    if (!archive || !entry || !hasItemId(entry.payload)) return;
    const restored = putItem(dataRef.current, entry.kind, entry.payload, entry.legacy_id);
    commitLocal(restored, archive.id);
    persistQueue([...queueRef.current.filter((item) => rowKey(item.kind, item.legacyId) !== rowKey(entry.kind, entry.legacy_id)), {
      operationId: makeOperationId(), archiveId: archive.id, kind: entry.kind,
      legacyId: entry.legacy_id, localItem: entry.payload, deleted: false,
      baseRevision: entry.revision, createdAt: new Date().toISOString(),
    }], archive.id);
    await flushQueue();
  }, [commitLocal, flushQueue, persistQueue, trash]);

  const getEntryHistory = useCallback(async (entryId: string) => {
    if (!supabase) return [];
    const { data: versions, error } = await supabase.from("archive_entry_versions").select("*").eq("entry_id", entryId).order("revision", { ascending: false });
    if (error) throw error;
    return versions ?? [];
  }, [supabase]);

  const restoreVersion = useCallback(async (versionId: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("restore_archive_entry_version", { p_version_id: versionId });
    if (error) throw error;
    await refreshCloud();
  }, [refreshCloud, supabase]);

  const createInvitation = useCallback(async (role: Exclude<ArchiveRole, "owner">, hours: number) => {
    const archive = archiveRef.current;
    if (!supabase || !archive || archive.role !== "owner") throw new Error("只有馆主可以签发邀请");
    const { data: result, error } = await supabase.rpc("create_archive_invitation", { p_archive_id: archive.id, p_role: role, p_expires_in_hours: hours });
    if (error) throw error;
    if (!isRecord(result) || typeof result.token !== "string") throw new Error("邀请生成失败");
    await loadManagement(archive);
    return `${window.location.origin}/home?invite=${encodeURIComponent(result.token)}&archive=${archive.id}`;
  }, [loadManagement, supabase]);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    const archive = archiveRef.current;
    if (!supabase || !archive) return;
    const { error } = await supabase.rpc("revoke_archive_invitation", { p_invitation_id: invitationId });
    if (error) throw error;
    await loadManagement(archive);
  }, [loadManagement, supabase]);

  const updateMember = useCallback(async (userId: string, role: Exclude<ArchiveRole, "owner">, active: boolean) => {
    const archive = archiveRef.current;
    if (!supabase || !archive) return;
    const { error } = await supabase.rpc("update_archive_member_role", { p_archive_id: archive.id, p_user_id: userId, p_role: role, p_is_active: active });
    if (error) throw error;
    await loadManagement(archive);
  }, [loadManagement, supabase]);

  const restoreBackup = useCallback(async (backupId: string) => {
    if (!supabase) return;
    const { error } = await supabase.rpc("restore_archive_backup", { p_backup_id: backupId });
    if (error) throw error;
    await refreshCloud();
  }, [refreshCloud, supabase]);

  const value = useMemo<ArchiveContextValue | null>(() => user && activeArchive ? ({
    ...data,
    ready,
    user,
    syncState,
    syncMessage,
    lastSyncedAt,
    pendingCount,
    canEdit: activeArchive.role !== "viewer",
    isOwner: activeArchive.role === "owner",
    role: activeArchive.role,
    activeArchive,
    archives,
    entries,
    trash,
    conflicts,
    members,
    invitations,
    backups,
    saveBooks: (books) => enqueueDataChange({ ...dataRef.current, books }, ["book"]),
    saveFilms: (films) => enqueueDataChange({ ...dataRef.current, films }, ["film"]),
    saveCps: (cps) => enqueueDataChange({ ...dataRef.current, cps }, ["cp"]),
    replaceAll: (next) => enqueueDataChange(next, ["book", "film", "cp"]),
    resetAll: () => { enqueueDataChange(fallback, ["book", "film", "cp"]); },
    refreshCloud,
    switchArchive,
    signOutCloud: async () => { if (supabase) await supabase.auth.signOut({ scope: "local" }); },
    setVisitorAccess,
    resolveConflict,
    restoreTrashEntry,
    getEntryHistory,
    restoreVersion,
    createInvitation,
    revokeInvitation,
    updateMember,
    restoreBackup,
  }) : null, [activeArchive, archives, backups, conflicts, data, enqueueDataChange, entries, getEntryHistory, invitations, lastSyncedAt, members, pendingCount, ready, refreshCloud, resolveConflict, restoreBackup, restoreTrashEntry, restoreVersion, revokeInvitation, setVisitorAccess, switchArchive, syncMessage, syncState, supabase, trash, updateMember, user, createInvitation]);

  if (!authChecked) return <main className="route-guard" aria-label="正在连接私人云端"><span className="checking-rune" aria-hidden="true">R</span><p>正在连接私人云端……</p></main>;
  if (!configured || !supabase) return <main className="route-guard" aria-label="云端档案尚未配置"><span className="checking-rune" aria-hidden="true">R</span><p>云端档案尚未配置，访客阅览暂时不可用。</p></main>;
  if (!user || !value) return <main className="route-guard" aria-label="访客阅览暂不可用"><span className="checking-rune" aria-hidden="true">R</span><p>{syncMessage}</p></main>;
  if (!ready) return <main className="route-guard" aria-label="正在读取云端档案"><span className="checking-rune" aria-hidden="true">R</span><p>{syncMessage}</p></main>;

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchiveData() {
  const value = useContext(ArchiveContext);
  if (!value) throw new Error("useArchiveData 必须在 ArchiveDataProvider 内使用");
  return value;
}
