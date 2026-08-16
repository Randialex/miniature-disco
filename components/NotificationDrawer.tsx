"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useArchiveSocial } from "./ArchiveSocialProvider";
import type { NotificationEventType } from "@/types/social";

type NotificationFilter = "all" | "waiting" | "reply" | "mention" | "archive" | "capsule";

const filters: Array<{ value: NotificationFilter; label: string; events?: NotificationEventType[] }> = [
  { value: "all", label: "全部信讯" },
  { value: "waiting", label: "等待我的回信", events: ["new_letter"] },
  { value: "reply", label: "有人回复了我", events: ["letter_reply"] },
  { value: "mention", label: "有人提到了我", events: ["mention"] },
  { value: "archive", label: "档案发生变化", events: ["archive_update"] },
  { value: "capsule", label: "时间胶囊", events: ["capsule_open"] },
];

const eventSymbols: Record<NotificationEventType, string> = {
  new_letter: "✉",
  letter_reply: "↩",
  mention: "@",
  archive_update: "✦",
  capsule_open: "⌛",
};

export default function NotificationDrawer() {
  const router = useRouter();
  const { notifications, unreadCount, loading, error, markNotificationRead, markAllNotificationsRead } = useArchiveSocial();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("open-randi-notifications", show);
    return () => window.removeEventListener("open-randi-notifications", show);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const visible = useMemo(() => {
    const events = filters.find((item) => item.value === filter)?.events;
    return events ? notifications.filter((item) => events.includes(item.event_type)) : notifications;
  }, [filter, notifications]);

  if (!open) return null;

  async function openNotification(id: string, href?: string) {
    await markNotificationRead(id);
    setOpen(false);
    if (href) router.push(href);
  }

  return <div className="notification-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
    <aside className="notification-drawer" role="dialog" aria-modal="true" aria-labelledby="notification-title">
      <header>
        <div><small>NOCTUA POST · QUIET NOTICES</small><h2 id="notification-title">通知信匣</h2><p>只收纳值得你回来回应的动静。</p></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="关闭通知信匣">×</button>
      </header>
      <div className="notification-toolbar">
        <span>{unreadCount ? `${unreadCount > 9 ? "9+" : unreadCount} 封未读` : "今夜已全部读完"}</span>
        {unreadCount ? <button type="button" onClick={() => void markAllNotificationsRead()}>全部标为已读</button> : null}
      </div>
      <nav aria-label="通知分类">
        {filters.map((item) => <button className={filter === item.value ? "is-active" : ""} type="button" key={item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
      </nav>
      <div className="notification-list">
        {loading ? <p className="notification-empty">正在听取远处的振翅声……</p> : null}
        {!loading && !visible.length ? <div className="notification-empty"><span>✉</span><b>今夜的信匣还很安静</b><p>有新的回信、提及或档案变化时，它们会在这里留下邮戳。</p></div> : null}
        {visible.map((item) => <button className={`notification-item${item.read_at ? "" : " is-unread"}`} type="button" key={item.id} onClick={() => void openNotification(item.id, item.payload.href)}>
          <span>{eventSymbols[item.event_type]}</span>
          <div><small>{item.actor?.displayName ?? "档案馆"} · {new Date(item.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</small><strong>{item.payload.title ?? "馆内有一封新信讯"}</strong><p>{item.payload.entry_title ?? item.payload.archive_title ?? "前往相关记忆查看"}</p></div>
          {!item.read_at ? <i aria-label="未读" /> : null}
        </button>)}
      </div>
      {error ? <p className="owl-error" role="alert">{error}</p> : null}
    </aside>
  </div>;
}
