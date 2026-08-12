import {
  DEFAULT_SITE_PASSWORD,
  SITE_PASSWORD_KEY,
  SPELL_FAILURES_KEY,
  SPELL_FAILURE_WINDOW_MS,
} from "./constants";

interface FailureRecord {
  count: number;
  startedAt: number;
}

export type PasswordValidation =
  | { ok: true }
  | { ok: false; field: "current" | "next" | "confirm"; message: string };

export function getSitePassword(): string {
  if (typeof window === "undefined") return DEFAULT_SITE_PASSWORD;
  return window.localStorage.getItem(SITE_PASSWORD_KEY) || DEFAULT_SITE_PASSWORD;
}

export function matchesSitePassword(candidate: string): boolean {
  return candidate === getSitePassword();
}

export function validatePasswordChange(current: string, next: string, confirm: string): PasswordValidation {
  if (!current) return { ok: false, field: "current", message: "请输入当前通行咒语" };
  if (!matchesSitePassword(current)) return { ok: false, field: "current", message: "原咒语不符，请核对后重试" };
  if (next.length < 6) return { ok: false, field: "next", message: "咒语长度不足，至少6位字符" };
  if (next.length > 20) return { ok: false, field: "next", message: "咒语过长，不超过20位字符" };
  if (next !== confirm) return { ok: false, field: "confirm", message: "两次咒语输入不一致，请核对" };
  return { ok: true };
}

export function updateSitePassword(password: string): void {
  window.localStorage.setItem(SITE_PASSWORD_KEY, password);
  clearSpellFailures();
}

export function resetSitePassword(): void {
  window.localStorage.removeItem(SITE_PASSWORD_KEY);
  clearSpellFailures();
}

export function getSpellFailureCount(now = Date.now()): number {
  try {
    const raw = window.localStorage.getItem(SPELL_FAILURES_KEY);
    if (!raw) return 0;
    const record = JSON.parse(raw) as Partial<FailureRecord>;
    if (typeof record.count !== "number" || typeof record.startedAt !== "number" || now - record.startedAt >= SPELL_FAILURE_WINDOW_MS) {
      clearSpellFailures();
      return 0;
    }
    return record.count;
  } catch {
    clearSpellFailures();
    return 0;
  }
}

export function recordSpellFailure(now = Date.now()): number {
  const previous = getSpellFailureCount(now);
  let startedAt = now;
  try {
    const raw = window.localStorage.getItem(SPELL_FAILURES_KEY);
    if (raw) {
      const record = JSON.parse(raw) as Partial<FailureRecord>;
      if (typeof record.startedAt === "number" && now - record.startedAt < SPELL_FAILURE_WINDOW_MS) startedAt = record.startedAt;
    }
  } catch {
    // A fresh record replaces malformed local state.
  }
  const count = previous + 1;
  window.localStorage.setItem(SPELL_FAILURES_KEY, JSON.stringify({ count, startedAt } satisfies FailureRecord));
  return count;
}

export function clearSpellFailures(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(SPELL_FAILURES_KEY);
}
