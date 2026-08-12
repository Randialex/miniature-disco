import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
export const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
export const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function authenticatedUser(request: Request) {
  const header = request.headers.get("Authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value.trim().toLocaleLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("").match(/.{1,4}/g)!.join("-");
}
