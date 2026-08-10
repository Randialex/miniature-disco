import type { Book, Cp, Film } from "@/types";

export const ARCHIVE_STORAGE_KEY = "randi-archive-data-v3";
export const ARCHIVE_STORAGE_VERSION = 1;

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

export function loadArchiveData(fallback: ArchiveData): ArchiveData {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
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

export function saveArchiveData(data: ArchiveData): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify({ version: ARCHIVE_STORAGE_VERSION, ...data }));
    return true;
  } catch {
    return false;
  }
}
