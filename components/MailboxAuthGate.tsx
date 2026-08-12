"use client";

import { useState, type FormEvent } from "react";
import { useMailbox } from "./MailboxProvider";

const avatarSymbols = ["☾","✦","🪶","🦉","🕯","📖","🗝","🌙"];

export default function MailboxAuthGate() {
  const {configured,loading,user,member,error,sendOtp,verifyOtp,redeemInvite,bootstrapOwner}=useMailbox();
  const [email,setEmail]=useState(""); const [token,setToken]=useState(""); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false);
  const [code,setCode]=useState(""); const [displayName,setDisplayName]=useState(""); const [symbol,setSymbol]=useState("🪶"); const [color,setColor]=useState("#2a6a4a");
  const [ownerMode,setOwnerMode]=useState(false); const [ownerSecret,setOwnerSecret]=useState("");

  if(!configured)return <section className="mailbox-unconfigured"><span className="owl-door-seal">SR</span><p className="page-eyebrow">PRIVATE OWL POST · P3.6</p><h1>双人魔法邮局尚未接通信鸦</h1><p>前端已经完成。请根据项目中的 <code>.env.example</code> 和 <code>supabase/</code> 部署说明接入 Supabase，邮局会在下一次部署后自动苏醒。</p><div><b>需要配置</b><span>NEXT_PUBLIC_SUPABASE_URL</span><span>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span></div></section>;
  if(loading)return <section className="mailbox-loading"><span className="checking-rune">🪶</span><p>正在辨认猫头鹰的足迹……</p></section>;
  if(member)return null;

  async function submitEmail(event:FormEvent){event.preventDefault();setBusy(true);const ok=await sendOtp(email.trim());setBusy(false);if(ok)setSent(true);}
  async function submitToken(event:FormEvent){event.preventDefault();setBusy(true);await verifyOtp(email.trim(),token.trim());setBusy(false);}
  async function submitInvite(event:FormEvent){event.preventDefault();setBusy(true);const ok=ownerMode ? await bootstrapOwner({secret:ownerSecret,mailboxName:"拾染randi与友人的猫头鹰邮局",displayName:displayName||"拾染randi",avatarSymbol:symbol,avatarColor:color}) : await redeemInvite({code,displayName,avatarSymbol:symbol,avatarColor:color});setBusy(false);if(ok)window.location.reload();}

  if(!user)return <section className="mailbox-door"><div className="mailbox-door__glow"/><div className="mailbox-slot"><span>SR</span><small>PRIVATE OWL POST</small></div><div className="mailbox-door__copy"><p className="page-eyebrow">LETTERS ACROSS THE NIGHT</p><h1>这里的信，<br/>只写给两个人看。</h1><p>以邮箱领取六位验证符文。邮箱只用于确认身份，不会出现在任何信笺里。</p>{!sent ? <form onSubmit={submitEmail}><label>收信人的邮箱<input type="email" required value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email"/></label><button className="owl-primary" disabled={busy} type="submit">{busy?"正在召唤猫头鹰……":"获取六位验证符文"}</button></form> : <form onSubmit={submitToken}><label>六位验证符文<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={token} onChange={(event)=>setToken(event.target.value.replace(/\D/g,""))} placeholder="000000" autoComplete="one-time-code"/></label><button className="owl-primary" disabled={busy||token.length!==6} type="submit">{busy?"正在核验……":"推开邮局木门"}</button><button className="owl-text-button" type="button" onClick={()=>setSent(false)}>更换邮箱</button></form>}{error?<p className="owl-error" role="alert">{error}</p>:null}</div></section>;

  return <section className="mailbox-invitation"><div className="invitation-parchment"><span className="invitation-parchment__seal">R</span><p className="page-eyebrow">A LETTER FOR THE SECOND SOUL</p><h1>{ownerMode?"首次点亮馆主烛火":"你已抵达邮局门前"}</h1><p>{ownerMode?"只有配置在 Supabase Secrets 中的馆主邮箱与建站密钥可以创建第一座邮局。":"请输入拾染randi亲自交给你的邀请咒语，并留下只在这里使用的名字与印记。"}</p><form onSubmit={submitInvite}>{ownerMode?<label>馆主建站密钥<input type="password" required value={ownerSecret} onChange={(event)=>setOwnerSecret(event.target.value)}/></label>:<label>一次性邀请咒语<input required value={code} onChange={(event)=>setCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters"/></label>}<label>邮局昵称<input required minLength={2} maxLength={16} value={displayName} onChange={(event)=>setDisplayName(event.target.value)} placeholder={ownerMode?"拾染randi":"2–16字"}/></label><fieldset><legend>选择头像符号</legend>{avatarSymbols.map((item)=><button className={symbol===item?"is-active":""} type="button" key={item} onClick={()=>setSymbol(item)}>{item}</button>)}</fieldset><label>蜡封颜色<input type="color" value={color} onChange={(event)=>setColor(event.target.value)}/></label><button className="wax-button" disabled={busy} type="submit">{busy?"正在拆开邀请函……":ownerMode?"创建双人魔法邮局":"拆开邀请函"}</button></form>{error?<p className="owl-error" role="alert">{error}</p>:null}<button className="owner-bootstrap-link" type="button" onClick={()=>setOwnerMode((value)=>!value)}>{ownerMode?"返回朋友邀请入口":"馆主首次建站"}</button></div></section>;
}
