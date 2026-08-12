import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, authenticatedUser, sha256 } from "../_shared/security.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const user = await authenticatedUser(request);
  if (!user?.email) return json({ error: "请先完成邮箱验证" }, 401);
  const recent = await admin.from("invite_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("attempted_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
  if ((recent.count ?? 0) >= 5) return json({ error: "尝试次数过多，请30分钟后再试" }, 429);
  const body = await request.json().catch(() => ({}));
  const code = String(body.code ?? "").trim();
  const displayName = String(body.displayName ?? "").trim();
  const avatarSymbol = String(body.avatarSymbol ?? "🪶").trim();
  const avatarColor = String(body.avatarColor ?? "#2a6a4a").trim();
  if (!code || displayName.length < 2 || displayName.length > 16 || !/^#[0-9a-f]{6}$/i.test(avatarColor)) return json({ error: "邀请信息不完整" }, 400);
  const [codeHash, emailHash] = await Promise.all([sha256(code), sha256(user.email)]);
  const { data, error } = await admin.rpc("redeem_mailbox_invite", { target_user: user.id, target_email_hash: emailHash, target_code_hash: codeHash, guest_name: displayName, guest_symbol: avatarSymbol, guest_color: avatarColor });
  await admin.from("invite_attempts").insert({ user_id: user.id, succeeded: !error });
  if (error) return json({ error: "邀请咒语无效、已过期或不属于当前邮箱" }, 400);
  return json({ mailboxId: data });
});
