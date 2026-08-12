import { corsHeaders, json } from "../_shared/cors.ts";
import { admin, authenticatedUser, inviteCode, sha256 } from "../_shared/security.ts";

async function ownerMailbox(userId: string) {
  const { data } = await admin.from("mailbox_members").select("mailbox_id").eq("user_id", userId).eq("role", "owner").eq("is_active", true).maybeSingle();
  return data?.mailbox_id as string | undefined;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const user = await authenticatedUser(request);
  if (!user?.email) return json({ error: "请先完成邮箱验证" }, 401);
  const body = await request.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "bootstrap") {
    const ownerEmail = Deno.env.get("MAILBOX_OWNER_EMAIL")?.trim().toLocaleLowerCase();
    const bootstrapSecret = Deno.env.get("MAILBOX_BOOTSTRAP_SECRET");
    if (!ownerEmail || user.email.toLocaleLowerCase() !== ownerEmail || !bootstrapSecret || body.secret !== bootstrapSecret) return json({ error: "馆主身份校验失败" }, 403);
    const { data, error } = await admin.rpc("bootstrap_mailbox_owner", { target_user:user.id, mailbox_name:String(body.mailboxName || "拾染randi与友人的猫头鹰邮局"), owner_name:String(body.displayName || "拾染randi"), owner_symbol:String(body.avatarSymbol || "🗝"), owner_color:String(body.avatarColor || "#7a1f1f") });
    return error ? json({ error: "邮局已被创建或资料无效" }, 400) : json({ mailboxId:data });
  }

  const mailboxId = await ownerMailbox(user.id);
  if (!mailboxId) return json({ error: "仅馆主可以执行此操作" }, 403);

  if (action === "create-invite") {
    const email = String(body.email ?? "").trim().toLocaleLowerCase();
    const hours = Math.min(168, Math.max(1, Number(body.validHours ?? 72)));
    const code = inviteCode();
    const { data, error } = await admin.from("mailbox_invites").insert({ mailbox_id:mailboxId, code_hash:await sha256(code), allowed_email_hash:email ? await sha256(email) : null, allowed_email_hint:email ? `${email.slice(0,2)}***@${email.split("@")[1] ?? "***"}` : null, expires_at:new Date(Date.now()+hours*60*60*1000).toISOString() }).select("id,expires_at,allowed_email_hint").single();
    return error ? json({ error:"生成邀请失败" },400) : json({ ...data, code });
  }
  if (action === "revoke-invite") {
    const { error } = await admin.from("mailbox_invites").update({ revoked_at:new Date().toISOString() }).eq("id",body.inviteId).eq("mailbox_id",mailboxId).is("used_at",null);
    return error ? json({ error:"撤销失败" },400) : json({ ok:true });
  }
  if (action === "set-member-active") {
    const { error } = await admin.from("mailbox_members").update({ is_active:Boolean(body.active) }).eq("id",body.memberId).eq("mailbox_id",mailboxId).eq("role","guest");
    return error ? json({ error:"成员状态更新失败" },400) : json({ ok:true });
  }
  return json({ error:"unknown_action" },400);
});
