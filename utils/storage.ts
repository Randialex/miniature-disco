import type { Book, Cp, Film } from "@/types";

export const ARCHIVE_STORAGE_KEY = "randi-archive-data-v3";
export const ARCHIVE_STORAGE_VERSION = 1;

function storageKey(scope?: string): string {
  return scope ? `${ARCHIVE_STORAGE_KEY}:${scope}` : ARCHIVE_STORAGE_KEY;
}

export interface ArchiveData {
  books: Book[];
  films: Film[];
  cps: Cp[];
}

interface StoredArchive extends ArchiveData {
  version: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function validList(value: unknown): value is Array<{ id: string }> {
  return Array.isArray(value) && value.every((item) => isObject(item) && typeof item.id === "string");
}

export function loadArchiveData(fallback: ArchiveData, scope?: string): ArchiveData {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(scope));
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<StoredArchive>;
    if (
      stored.version !== ARCHIVE_STORAGE_VERSION ||
      !validList(stored.books) ||
      !validList(stored.films) ||
      !validList(stored.cps)
    ) return fallback;
    return { books: stored.books as Book[], films: stored.films as Film[], cps: stored.cps as Cp[] };
  } catch {
    return fallback;
  }
}

export function saveArchiveData(data: ArchiveData, scope?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey(scope), JSON.stringify({ version: ARCHIVE_STORAGE_VERSION, ...data }));
    return true;
  } catch {
    return false;
  }
}

export function isValidArchiveData(value: unknown): value is ArchiveData {
  if (!isObject(value)) return false;
  return validList(value.books) && validList(value.films) && validList(value.cps);
}

export function parseArchiveBackup(raw: string): { data: ArchiveData; exportedAt?: string } | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return null;
    const candidate = isObject(parsed.data) ? parsed.data : parsed;
    if (!isValidArchiveData(candidate)) return null;
    return {
      data: { books: candidate.books, films: candidate.films, cps: candidate.cps },
      exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : undefined,
    };
  } catch {
    return null;
  }
}

export function clearArchiveData(): void {
  if (typeof window === "undefined") return;
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key === ARCHIVE_STORAGE_KEY || key?.startsWith(`${ARCHIVE_STORAGE_KEY}:`)) {
      window.localStorage.removeItem(key);
    }
  }
}
