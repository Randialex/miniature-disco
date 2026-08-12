"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Letter, LetterAttachment, LetterReaction, LetterType, Mailbox, MailboxInviteSummary, MailboxMember, ReactionType } from "@/types/mailbox";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/utils/supabase";

interface SendLetterInput { content:string; letterType:LetterType; parentId?:string | null; moodStamp?:ReactionType | null; attachment?:LetterAttachment | null }
interface InviteProfile { code:string; displayName:string; avatarSymbol:string; avatarColor:string }
interface BootstrapProfile { secret:string; mailboxName:string; displayName:string; avatarSymbol:string; avatarColor:string }

interface MailboxContextValue {
  configured:boolean; loading:boolean; session:Session|null; user:User|null; mailbox:Mailbox|null; member:MailboxMember|null;
  members:MailboxMember[]; letters:Letter[]; invites:MailboxInviteSummary[]; unreadCount:number; error:string;
  onlineUserIds:string[]; typingUserIds:string[]; setTyping:(typing:boolean)=>void;
  sendOtp:(email:string)=>Promise<boolean>; verifyOtp:(email:string,token:string)=>Promise<boolean>; signOut:()=>Promise<void>;
  redeemInvite:(profile:InviteProfile)=>Promise<boolean>; bootstrapOwner:(profile:BootstrapProfile)=>Promise<boolean>;
  refresh:()=>Promise<void>; sendLetter:(input:SendLetterInput)=>Promise<boolean>; editLetter:(id:string,content:string)=>Promise<boolean>;
  deleteLetter:(id:string)=>Promise<boolean>; moderateLetter:(id:string,status:"visible"|"rejected")=>Promise<boolean>;
  togglePin:(letter:Letter)=>Promise<boolean>; toggleReaction:(letterId:string,reaction:ReactionType)=>Promise<boolean>; markRead:()=>Promise<void>;
  updateProfile:(change:Pick<MailboxMember,"display_name"|"avatar_symbol"|"avatar_color">)=>Promise<boolean>;
  updateMailbox:(change:Partial<Pick<Mailbox,"name"|"moderation_mode"|"reactions_enabled"|"presence_enabled">>)=>Promise<boolean>;
  createInvite:(email:string,validHours:number)=>Promise<{code:string;expires_at:string}|null>; revokeInvite:(id:string)=>Promise<boolean>;
  setGuestActive:(memberId:string,active:boolean)=>Promise<boolean>;
}

const MailboxContext = createContext<MailboxContextValue|null>(null);

export function MailboxProvider({children}:{children:ReactNode}) {
  const client = getSupabaseBrowserClient();
  const [loading,setLoading]=useState(isSupabaseConfigured);
  const [session,setSession]=useState<Session|null>(null);
  const [mailbox,setMailbox]=useState<Mailbox|null>(null);
  const [member,setMember]=useState<MailboxMember|null>(null);
  const [members,setMembers]=useState<MailboxMember[]>([]);
  const [letters,setLetters]=useState<Letter[]>([]);
  const [invites,setInvites]=useState<MailboxInviteSummary[]>([]);
  const [lastReadAt,setLastReadAt]=useState<string|null>(null);
  const [error,setError]=useState("");
  const [onlineUserIds,setOnlineUserIds]=useState<string[]>([]);
  const [typingUserIds,setTypingUserIds]=useState<string[]>([]);
  const currentUserId=useRef<string>();
  const refreshTimer=useRef<number>();
  const presenceChannel=useRef<ReturnType<NonNullable<typeof client>["channel"]>|null>(null);
  const typingTimers=useRef(new Map<string,number>());

  const clearMailbox = useCallback(() => { setMailbox(null);setMember(null);setMembers([]);setLetters([]);setInvites([]);setLastReadAt(null); },[]);

  const loadMailbox = useCallback(async (userId?:string) => {
    if(!client){setLoading(false);return;}
    const id=userId ?? currentUserId.current;
    if(!id){clearMailbox();setLoading(false);return;}
    setLoading(true);setError("");
    const membership=await client.from("mailbox_members").select("*").eq("user_id",id).eq("is_active",true).maybeSingle();
    if(membership.error){setError("邮局身份读取失败，请稍后重试");clearMailbox();setLoading(false);return;}
    if(!membership.data){clearMailbox();setLoading(false);return;}
    const currentMember=membership.data as MailboxMember;
    const [mailboxResult,membersResult,lettersResult,reactionsResult,readResult,invitesResult]=await Promise.all([
      client.from("mailboxes").select("*").eq("id",currentMember.mailbox_id).single(),
      client.from("mailbox_members").select("*").eq("mailbox_id",currentMember.mailbox_id).order("joined_at"),
      client.from("letters").select("*").eq("mailbox_id",currentMember.mailbox_id).order("is_pinned",{ascending:false}).order("created_at",{ascending:false}),
      client.from("letter_reactions").select("*").order("created_at"),
      client.from("mailbox_read_state").select("last_read_at").eq("mailbox_id",currentMember.mailbox_id).eq("user_id",id).maybeSingle(),
      currentMember.role==="owner" ? client.from("mailbox_invites").select("id,expires_at,used_at,revoked_at,allowed_email_hint").eq("mailbox_id",currentMember.mailbox_id).order("created_at",{ascending:false}).limit(8) : Promise.resolve({data:[],error:null}),
    ]);
    const firstError=[mailboxResult,membersResult,lettersResult,reactionsResult].find((result)=>result.error)?.error;
    if(firstError){setError("信件暂时无法显影，请检查网络或权限配置");setLoading(false);return;}
    const allMembers=(membersResult.data ?? []) as MailboxMember[];
    const memberMap=new Map(allMembers.map((item)=>[item.user_id,item]));
    const reactionMap=new Map<string,LetterReaction[]>();
    for(const reaction of (reactionsResult.data ?? []) as LetterReaction[]){const list=reactionMap.get(reaction.letter_id)??[];list.push(reaction);reactionMap.set(reaction.letter_id,list);}
    setMember(currentMember);setMailbox(mailboxResult.data as Mailbox);setMembers(allMembers);
    setLetters(((lettersResult.data ?? []) as Letter[]).map((letter)=>({...letter,author:memberMap.get(letter.author_id),reactions:reactionMap.get(letter.id)??[]})));
    setInvites((invitesResult.data ?? []) as MailboxInviteSummary[]);setLastReadAt(readResult.data?.last_read_at ?? null);setLoading(false);
    void client.from("mailbox_members").update({last_seen_at:new Date().toISOString()}).eq("id",currentMember.id);
  },[clearMailbox,client]);

  useEffect(()=>{
    if(!client){setLoading(false);return;}
    client.auth.getSession().then(({data})=>{currentUserId.current=data.session?.user.id;setSession(data.session);void loadMailbox(data.session?.user.id);});
    const {data}=client.auth.onAuthStateChange((_event,next)=>{currentUserId.current=next?.user.id;setSession(next);window.setTimeout(()=>void loadMailbox(next?.user.id),0);});
    return ()=>data.subscription.unsubscribe();
  },[client,loadMailbox]);

  useEffect(()=>{
    if(!client||!mailbox?.id)return;
    const schedule=()=>{window.clearTimeout(refreshTimer.current);refreshTimer.current=window.setTimeout(()=>void loadMailbox(),180);};
    const channel=client.channel(`owl-post-${mailbox.id}`).on("postgres_changes",{event:"*",schema:"public",table:"letters",filter:`mailbox_id=eq.${mailbox.id}`},schedule).on("postgres_changes",{event:"*",schema:"public",table:"letter_reactions"},schedule).on("postgres_changes",{event:"*",schema:"public",table:"mailbox_read_state",filter:`mailbox_id=eq.${mailbox.id}`},schedule).subscribe();
    return ()=>{window.clearTimeout(refreshTimer.current);void client.removeChannel(channel);};
  },[client,loadMailbox,mailbox?.id]);

  useEffect(()=>{
    if(!client||!mailbox?.id||!session?.user.id||!mailbox.presence_enabled){setOnlineUserIds([]);setTypingUserIds([]);return;}
    let cancelled=false;
    const channel=client.channel(`mailbox:${mailbox.id}:presence`,{config:{private:true,presence:{key:session.user.id},broadcast:{self:false}}});
    presenceChannel.current=channel;
    channel.on("presence",{event:"sync"},()=>setOnlineUserIds(Object.keys(channel.presenceState()))).on("broadcast",{event:"typing"},({payload})=>{
      const userId=String(payload.userId??"");if(!userId||userId===session.user.id)return;
      setTypingUserIds((items)=>payload.typing?Array.from(new Set([...items,userId])):items.filter((item)=>item!==userId));
      window.clearTimeout(typingTimers.current.get(userId));
      if(payload.typing)typingTimers.current.set(userId,window.setTimeout(()=>setTypingUserIds((items)=>items.filter((item)=>item!==userId)),5000));
    });
    void client.realtime.setAuth().then(()=>{
      if(cancelled)return;
      channel.subscribe(async(status)=>{if(status==="SUBSCRIBED")await channel.track({online_at:new Date().toISOString()});});
    }).catch(()=>{if(!cancelled)setError("实时邮路认证失败，请刷新后重试");});
    return ()=>{cancelled=true;presenceChannel.current=null;typingTimers.current.forEach(window.clearTimeout);typingTimers.current.clear();void client.removeChannel(channel);};
  },[client,mailbox?.id,mailbox?.presence_enabled,session?.user.id]);

  const run = useCallback(async(action:()=>PromiseLike<{error:unknown}>,failure:string)=>{setError("");const result=await action();if(result.error){setError(failure);return false;}await loadMailbox();return true;},[loadMailbox]);
  const invoke = useCallback(async(name:string,body:Record<string,unknown>)=>{if(!client)return null;setError("");const {data,error:invokeError}=await client.functions.invoke(name,{body});if(invokeError||data?.error){setError(data?.error||"邮局咒术执行失败");return null;}await loadMailbox();return data as Record<string,unknown>;},[client,loadMailbox]);
  const sendOtp=useCallback(async(email:string)=>{if(!client)return false;setError("");const {error:otpError}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(otpError){setError("验证符文发送失败，请检查邮箱后重试");return false;}return true;},[client]);
  const verifyOtp=useCallback(async(email:string,token:string)=>{if(!client)return false;setError("");const {data,error:verifyError}=await client.auth.verifyOtp({email,token,type:"email"});if(verifyError){setError("验证符文不正确或已经失效");return false;}currentUserId.current=data.user?.id;setSession(data.session);await loadMailbox(data.user?.id);return true;},[client,loadMailbox]);
  const signOut=useCallback(async()=>{await client?.auth.signOut();currentUserId.current=undefined;setSession(null);clearMailbox();},[clearMailbox,client]);
  const sendLetter=useCallback(async(input:SendLetterInput)=>{if(!client||!member)return false;return run(()=>client.from("letters").insert({mailbox_id:member.mailbox_id,author_id:member.user_id,parent_id:input.parentId??null,content:input.content.trim(),letter_type:input.letterType,mood_stamp:input.moodStamp??null,attachment:input.attachment??null}),"信笺投递失败，请稍后再试");},[client,member,run]);
  const editLetter=useCallback(async(id:string,content:string)=>client ? run(()=>client.from("letters").update({content:content.trim()}).eq("id",id),"信笺无法修改，可能已超过30分钟") : false,[client,run]);
  const deleteLetter=useCallback(async(id:string)=>client ? run(()=>client.from("letters").update({deleted_at:new Date().toISOString()}).eq("id",id),"信笺删除失败") : false,[client,run]);
  const moderateLetter=useCallback(async(id:string,status:"visible"|"rejected")=>client ? run(()=>client.from("letters").update({status}).eq("id",id),"审核操作失败") : false,[client,run]);
  const togglePin=useCallback(async(letter:Letter)=>client ? run(()=>client.from("letters").update({is_pinned:!letter.is_pinned}).eq("id",letter.id),"置顶操作失败") : false,[client,run]);
  const toggleReaction=useCallback(async(letterId:string,reaction:ReactionType)=>{if(!client||!session)return false;const exists=letters.find((item)=>item.id===letterId)?.reactions?.some((item)=>item.user_id===session.user.id&&item.reaction===reaction);return exists ? run(()=>client.from("letter_reactions").delete().eq("letter_id",letterId).eq("user_id",session.user.id).eq("reaction",reaction),"印章移除失败") : run(()=>client.from("letter_reactions").insert({letter_id:letterId,user_id:session.user.id,reaction}),"印章落印失败");},[client,letters,run,session]);
  const markRead=useCallback(async()=>{if(!client||!member)return;const latest=letters.find((item)=>item.status==="visible");const now=new Date().toISOString();await client.from("mailbox_read_state").upsert({mailbox_id:member.mailbox_id,user_id:member.user_id,last_read_at:now,last_read_letter_id:latest?.id??null},{onConflict:"mailbox_id,user_id"});setLastReadAt(now);},[client,letters,member]);
  const updateProfile=useCallback(async(change:Pick<MailboxMember,"display_name"|"avatar_symbol"|"avatar_color">)=>client&&member ? run(()=>client.from("mailbox_members").update(change).eq("id",member.id),"成员印记更新失败") : false,[client,member,run]);
  const updateMailbox=useCallback(async(change:Partial<Pick<Mailbox,"name"|"moderation_mode"|"reactions_enabled"|"presence_enabled">>)=>client&&mailbox ? run(()=>client.from("mailboxes").update(change).eq("id",mailbox.id),"邮局设置更新失败") : false,[client,mailbox,run]);
  const redeemInvite=useCallback(async(profile:InviteProfile)=>Boolean(await invoke("redeem-mailbox-invite",{...profile})),[invoke]);
  const bootstrapOwner=useCallback(async(profile:BootstrapProfile)=>Boolean(await invoke("mailbox-admin",{action:"bootstrap",...profile})),[invoke]);
  const createInvite=useCallback(async(email:string,validHours:number)=>{const data=await invoke("mailbox-admin",{action:"create-invite",email,validHours});return data ? {code:String(data.code),expires_at:String(data.expires_at)} : null;},[invoke]);
  const revokeInvite=useCallback(async(id:string)=>Boolean(await invoke("mailbox-admin",{action:"revoke-invite",inviteId:id})),[invoke]);
  const setGuestActive=useCallback(async(memberId:string,active:boolean)=>Boolean(await invoke("mailbox-admin",{action:"set-member-active",memberId,active})),[invoke]);
  const setTyping=useCallback((typing:boolean)=>{if(!presenceChannel.current||!session?.user.id)return;void presenceChannel.current.send({type:"broadcast",event:"typing",payload:{userId:session.user.id,typing}});},[session?.user.id]);
  const unreadCount=useMemo(()=>letters.filter((letter)=>letter.author_id!==session?.user.id&&(letter.status==="visible"||(member?.role==="owner"&&letter.status==="pending"))&&(!lastReadAt||letter.created_at>lastReadAt)).length,[lastReadAt,letters,member?.role,session?.user.id]);
  const value=useMemo<MailboxContextValue>(()=>({configured:isSupabaseConfigured,loading,session,user:session?.user??null,mailbox,member,members,letters,invites,unreadCount,error,onlineUserIds,typingUserIds,setTyping,sendOtp,verifyOtp,signOut,redeemInvite,bootstrapOwner,refresh:loadMailbox,sendLetter,editLetter,deleteLetter,moderateLetter,togglePin,toggleReaction,markRead,updateProfile,updateMailbox,createInvite,revokeInvite,setGuestActive}),[bootstrapOwner,createInvite,deleteLetter,editLetter,error,invites,letters,loadMailbox,loading,mailbox,markRead,member,members,moderateLetter,onlineUserIds,redeemInvite,revokeInvite,sendLetter,sendOtp,session,setGuestActive,setTyping,signOut,togglePin,toggleReaction,typingUserIds,unreadCount,updateMailbox,updateProfile,verifyOtp]);
  return <MailboxContext.Provider value={value}>{children}</MailboxContext.Provider>;
}

export function useMailbox(){const value=useContext(MailboxContext);if(!value)throw new Error("useMailbox 必须在 MailboxProvider 内使用");return value;}
