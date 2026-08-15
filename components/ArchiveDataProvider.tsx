"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { books as staticBooks } from "@/data/books";
import { films as staticFilms } from "@/data/films";
import { cps as staticCps } from "@/data/cps";
import type { Book, Cp, Film } from "@/types";
import type { Json, TablesInsert } from "@/types/database";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { loadArchiveData, saveArchiveData, type ArchiveData } from "@/utils/storage";
import CloudAuthGate from "./CloudAuthGate";

type ArchiveKind = "book" | "film" | "cp";
export type CloudSyncState = "checking" | "loading" | "saving" | "synced" | "offline" | "error";

interface ArchiveContextValue extends ArchiveData {
  ready: boolean;
  user: User;
  syncState: CloudSyncState;
  syncMessage: string;
  lastSyncedAt: string | null;
  saveBooks: (books: Book[]) => boolean;
  saveFilms: (films: Film[]) => boolean;
  saveCps: (cps: Cp[]) => boolean;
  replaceAll: (data: ArchiveData) => boolean;
  resetAll: () => void;
  refreshCloud: () => Promise<void>;
  signOutCloud: () => Promise<void>;
}

const fallback: ArchiveData = { books: staticBooks, films: staticFilms, cps: staticCps };
const ArchiveContext = createContext<ArchiveContextValue | null>(null);
const PENDING_SYNC_KEY = "randi-archive-cloud-pending-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasId(value: unknown): value is { id: string } {
  return isRecord(value) && typeof value.id === "string";
}

function archiveFromRows(rows: Array<{ kind: ArchiveKind; payload: Json }>): ArchiveData {
  const data: ArchiveData = { books: [], films: [], cps: [] };
  for (const row of rows) {
    if (!hasId(row.payload)) continue;
    if (row.kind === "book") data.books.push(row.payload as unknown as Book);
    if (row.kind === "film") data.films.push(row.payload as unknown as Film);
    if (row.kind === "cp") data.cps.push(row.payload as unknown as Cp);
  }
  return data;
}

function rowsForKind(userId: string, kind: ArchiveKind, items: Array<Book | Film | Cp>): TablesInsert<"archive_entries">[] {
  return items.map((item) => ({
    owner_id: userId,
    kind,
    legacy_id: item.id,
    title: kind === "cp" ? (item as Cp).name : (item as Book | Film).title,
    event_date: kind === "book" ? (item as Book).readDate || null : kind === "film" ? (item as Film).watchDate || null : (item as Cp).startDate || null,
    rating: item.rating,
    payload: item as unknown as Json,
  }));
}

export function ArchiveDataProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const supabase = useMemo(() => configured ? createSupabaseBrowserClient() : null, [configured]);
  const [data, setData] = useState<ArchiveData>(fallback);
  const dataRef = useRef<ArchiveData>(fallback);
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState<CloudSyncState>("checking");
  const [syncMessage, setSyncMessage] = useState("正在查验云端身份……");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const commitLocal = useCallback((next: ArchiveData) => {
    dataRef.current = next;
    setData(next);
    return saveArchiveData(next);
  }, []);

  const syncKind = useCallback(async (userId: string, kind: ArchiveKind, items: Array<Book | Film | Cp>) => {
    if (!supabase) return;
    const rows = kind === "book"
      ? rowsForKind(userId, "book", items as Book[])
      : kind === "film"
        ? rowsForKind(userId, "film", items as Film[])
        : rowsForKind(userId, "cp", items as Cp[]);

    if (rows.length) {
      const { error } = await supabase.from("archive_entries").upsert(rows, { onConflict: "owner_id,kind,legacy_id" });
      if (error) throw error;
    }

    const { data: existing, error: listError } = await supabase
      .from("archive_entries")
      .select("legacy_id")
      .eq("owner_id", userId)
      .eq("kind", kind);
    if (listError) throw listError;
    const keep = new Set(items.map((item) => item.id));
    const stale = (existing ?? []).map((row) => row.legacy_id).filter((id): id is string => typeof id === "string" && !keep.has(id));
    if (stale.length) {
      const { error: deleteError } = await supabase
        .from("archive_entries")
        .delete()
        .eq("owner_id", userId)
        .eq("kind", kind)
        .in("legacy_id", stale);
      if (deleteError) throw deleteError;
    }
  }, [supabase]);

  const syncAll = useCallback(async (userId: string, next: ArchiveData) => {
    await syncKind(userId, "book", next.books);
    await syncKind(userId, "film", next.films);
    await syncKind(userId, "cp", next.cps);
  }, [syncKind]);

  const loadCloud = useCallback(async (activeUser: User) => {
    if (!supabase) return;
    setSyncState("loading");
    setSyncMessage("正在从 Supabase 打开私人档案……");
    try {
      const local = loadArchiveData(fallback);
      const pending = window.localStorage.getItem(PENDING_SYNC_KEY) === "true";
      const { data: rows, error } = await supabase
        .from("archive_entries")
        .select("kind,payload")
        .eq("owner_id", activeUser.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      if (pending || !rows?.length) {
        await syncAll(activeUser.id, local);
      }

      const { data: freshRows, error: freshError } = await supabase
        .from("archive_entries")
        .select("kind,payload")
        .eq("owner_id", activeUser.id)
        .order("created_at", { ascending: true });
      if (freshError) throw freshError;
      const cloud = archiveFromRows((freshRows ?? []) as Array<{ kind: ArchiveKind; payload: Json }>);
      commitLocal(cloud);
      window.localStorage.removeItem(PENDING_SYNC_KEY);
      const syncedAt = new Date().toISOString();
      setLastSyncedAt(syncedAt);
      setSyncState("synced");
      setSyncMessage(`云端已同步 · ${cloud.books.length + cloud.films.length + cloud.cps.length} 条档案`);
    } catch (error) {
      const local = loadArchiveData(fallback);
      commitLocal(local);
      setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setSyncMessage(error instanceof Error ? `云端暂不可用：${error.message}` : "云端暂不可用，已打开本地缓存");
    } finally {
      setReady(true);
    }
  }, [commitLocal, supabase, syncAll]);

  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      setReady(true);
      setSyncState("error");
      setSyncMessage("尚未配置 Supabase，无法进入云端档案");
      return;
    }
    let active = true;
    void supabase.auth.getUser().then(({ data: authData }) => {
      if (!active) return;
      setUser(authData.user ?? null);
      setAuthChecked(true);
      if (authData.user) void loadCloud(authData.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthChecked(true);
      if (nextUser) void loadCloud(nextUser);
      else {
        setReady(false);
        setSyncState("checking");
        setSyncMessage("请登录私人云端档案");
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadCloud, supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    const scheduleRefresh = () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => void loadCloud(user), 180);
    };
    const channel = supabase
      .channel(`archive-entries-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "archive_entries", filter: `owner_id=eq.${user.id}` }, scheduleRefresh)
      .subscribe();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [loadCloud, supabase, user]);

  useEffect(() => {
    if (!user) return;
    const resumeSync = () => void loadCloud(user);
    window.addEventListener("online", resumeSync);
    return () => window.removeEventListener("online", resumeSync);
  }, [loadCloud, user]);

  const pushChange = useCallback((next: ArchiveData, kind?: ArchiveKind) => {
    const saved = commitLocal(next);
    window.localStorage.setItem(PENDING_SYNC_KEY, "true");
    if (!user) return false;
    setSyncState("saving");
    setSyncMessage("正在把新墨迹写入云端……");
    const task = kind
      ? syncKind(user.id, kind, kind === "book" ? next.books : kind === "film" ? next.films : next.cps)
      : syncAll(user.id, next);
    void task.then(() => {
      window.localStorage.removeItem(PENDING_SYNC_KEY);
      setLastSyncedAt(new Date().toISOString());
      setSyncState("synced");
      setSyncMessage("所有修改均已写入 Supabase");
    }).catch((error: unknown) => {
      setSyncState(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      setSyncMessage(error instanceof Error ? `云端写入失败：${error.message}` : "云端写入失败，修改已保存在本机等待重试");
    });
    return saved || Boolean(user);
  }, [commitLocal, syncAll, syncKind, user]);

  const value = useMemo<ArchiveContextValue | null>(() => user ? ({
    ...data,
    ready,
    user,
    syncState,
    syncMessage,
    lastSyncedAt,
    saveBooks: (books) => pushChange({ ...data, books }, "book"),
    saveFilms: (films) => pushChange({ ...data, films }, "film"),
    saveCps: (cps) => pushChange({ ...data, cps }, "cp"),
    replaceAll: (next) => pushChange(next),
    resetAll: () => { pushChange(fallback); },
    refreshCloud: () => loadCloud(user),
    signOutCloud: async () => { if (supabase) await supabase.auth.signOut(); },
  }) : null, [data, lastSyncedAt, loadCloud, pushChange, ready, supabase, syncMessage, syncState, user]);

  if (!authChecked) return <main className="route-guard" aria-label="正在连接私人云端"><span className="checking-rune" aria-hidden="true">R</span><p>正在连接私人云端……</p></main>;
  if (!configured || !supabase) return <CloudAuthGate unavailable />;
  if (!user || !value) return <CloudAuthGate supabase={supabase} />;
  if (!ready) return <main className="route-guard" aria-label="正在读取云端档案"><span className="checking-rune" aria-hidden="true">R</span><p>{syncMessage}</p></main>;

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchiveData() {
  const value = useContext(ArchiveContext);
  if (!value) throw new Error("useArchiveData 必须在 ArchiveDataProvider 内使用");
  return value;
}
