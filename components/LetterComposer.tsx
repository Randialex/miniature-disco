"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useArchiveData } from "./ArchiveDataProvider";
import { useMailbox } from "./MailboxProvider";
import type { Letter, LetterAttachment, LetterType, ReactionType } from "@/types/mailbox";
import { MAILBOX_DRAFT_KEY } from "@/utils/mailboxStorage";

const types:Array<{value:LetterType;label:string}>=[{value:"letter",label:"普通来信"},{value:"recommendation",label:"书影推荐"},{value:"mood",label:"心情短笺"},{value:"anniversary",label:"纪念信"}];
const stamps:Array<{value:ReactionType;symbol:string}>=[{value:"star",symbol:"✦"},{value:"moon",symbol:"☾"},{value:"feather",symbol:"🪶"},{value:"book",symbol:"📖"},{value:"candle",symbol:"🕯"},{value:"echo",symbol:"💌"}];

export default function LetterComposer({replyTo,onSent,onCancel}:{replyTo?:Letter|null;onSent:()=>void;onCancel:()=>void}){
  const {books,films,cps}=useArchiveData(); const {members,member,sendLetter}=useMailbox();
  const [content,setContent]=useState(""); const [letterType,setLetterType]=useState<LetterType>("letter"); const [stamp,setStamp]=useState<ReactionType|null>(null); const [attachmentKey,setAttachmentKey]=useState(""); const [busy,setBusy]=useState(false);
  const recipient=members.find((item)=>item.user_id!==member?.user_id);
  const attachmentOptions=useMemo(()=>[
    ...books.map((item)=>({key:`book:${item.id}`,attachment:{type:"book",title:item.title,subtitle:item.author,localId:item.id} as LetterAttachment})),
    ...films.map((item)=>({key:`film:${item.id}`,attachment:{type:"film",title:item.title,subtitle:item.originalTitle??String(item.year),localId:item.id} as LetterAttachment})),
    ...cps.map((item)=>({key:`cp:${item.id}`,attachment:{type:"cp",title:item.name,subtitle:item.origin,localId:item.id} as LetterAttachment})),
  ],[books,cps,films]);
  useEffect(()=>{if(replyTo)return;try{const raw=localStorage.getItem(MAILBOX_DRAFT_KEY);if(raw){const draft=JSON.parse(raw);setContent(String(draft.content??""));setLetterType(draft.letterType??"letter");setStamp(draft.stamp??null);setAttachmentKey(String(draft.attachmentKey??""));}}catch{}},[replyTo]);
  useEffect(()=>{if(replyTo)return;const timer=window.setTimeout(()=>localStorage.setItem(MAILBOX_DRAFT_KEY,JSON.stringify({content,letterType,stamp,attachmentKey})),250);return()=>window.clearTimeout(timer);},[attachmentKey,content,letterType,replyTo,stamp]);
  async function submit(event:FormEvent){event.preventDefault();if(!content.trim())return;setBusy(true);const attachment=attachmentOptions.find((item)=>item.key===attachmentKey)?.attachment??null;const ok=await sendLetter({content,letterType,parentId:replyTo?.id??null,moodStamp:stamp,attachment});setBusy(false);if(ok){localStorage.removeItem(MAILBOX_DRAFT_KEY);onSent();}}
  return <div className="letter-composer-backdrop" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&onCancel()}><section className="letter-composer" role="dialog" aria-modal="true" aria-label={replyTo?"写一封回信":"写一封信"}><button className="letter-composer__close" type="button" onClick={onCancel} aria-label="关闭写信面板">×</button><header><small>OWL POST · LOCAL DRAFT</small><h2>{replyTo?"写一封回信":"写一封信"}</h2><p>当前写信人 · {member?.display_name}　收信人 · {recipient?.display_name??"另一位写信人"}</p></header>{replyTo?<div className="reply-reference">回应 {replyTo.author?.display_name} 在 {new Date(replyTo.created_at).toLocaleDateString("zh-CN")} 写下的信</div>:null}<form onSubmit={submit}><div className="composer-options"><label>信件类型<select value={letterType} onChange={(event)=>setLetterType(event.target.value as LetterType)}>{types.map((item)=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>关联本地档案<select value={attachmentKey} onChange={(event)=>setAttachmentKey(event.target.value)}><option value="">不关联</option>{attachmentOptions.map((item)=><option key={item.key} value={item.key}>{item.attachment.title}</option>)}</select></label></div><label className="composer-paper"><span>亲爱的 {recipient?.display_name??"收信人"}：</span><textarea autoFocus required maxLength={2000} value={content} onChange={(event)=>setContent(event.target.value)} placeholder="写下留在这台设备里的话……"/><small>{content.length} / 2000</small></label><fieldset className="mood-stamps"><legend>选择心情印章</legend>{stamps.map((item)=><button className={stamp===item.value?"is-active":""} type="button" key={item.value} onClick={()=>setStamp(stamp===item.value?null:item.value)}>{item.symbol}</button>)}</fieldset><footer><span>草稿和投递后的内容都只保存在当前浏览器。</span><button className="owl-primary" disabled={busy||!content.trim()} type="submit">{busy?"正在收进邮袋……":"留下一封信"}</button></footer></form></section></div>;
}
