"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useArchiveData } from "./ArchiveDataProvider";
import { useTheme, type ThemeMode } from "./ThemeProvider";
import { parseArchiveBackup } from "@/utils/storage";
import { updateSitePassword, validatePasswordChange } from "@/utils/password";
import { SITE_NAME, SITE_VERSION } from "@/utils/constants";
import MailboxAdmin from "./MailboxAdmin";

type Tab = "theme" | "password" | "data" | "mailbox" | "about";
type ErrorField = "current" | "next" | "confirm" | null;

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "theme", label: "主题设置" }, { id: "password", label: "咒语管理" },
  { id: "data", label: "数据管理" }, { id: "mailbox", label: "猫头鹰邮局" },
  { id: "about", label: "关于本站" },
];
const themeOptions: Array<{ id: ThemeMode; label: string; icon: string }> = [
  { id: "dark", label: "星夜哥特", icon: "☾" }, { id: "light", label: "羊皮卷旧书", icon: "✒" }, { id: "system", label: "跟随系统", icon: "↻" },
];

export default function AdminPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { books, films, cps, replaceAll, resetAll } = useArchiveData();
  const { mode, setMode, complexMotion, setComplexMotion } = useTheme();
  const [tab, setTab] = useState<Tab>("theme");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<{ field: ErrorField; message: string }>({ field: null, message: "" });
  const [notice, setNotice] = useState("");
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseArchiveBackup>>(null);
  const [resetPhrase, setResetPhrase] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose, open]);

  if (!open) return null;

  function submitPassword(event: FormEvent) {
    event.preventDefault();
    const result = validatePasswordChange(current, next, confirm);
    if (!result.ok) {
      setError({ field: result.field, message: result.message });
      return;
    }
    updateSitePassword(next);
    setCurrent(""); setNext(""); setConfirm(""); setError({ field: null, message: "" });
    setNotice("咒语已更新，请妥善保管");
    window.setTimeout(() => setNotice(""), 3000);
  }

  function exportBackup() {
    const exportedAt = new Date().toISOString();
    const content = JSON.stringify({ format: "shiying-randi-backup", version: 1, exportedAt, data: { books, films, cps } }, null, 2);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    link.download = `shiying-randi-backup-${exportedAt.slice(0, 10).replaceAll("-", "")}.json`;
    link.click(); URL.revokeObjectURL(link.href);
  }

  function readBackup(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseArchiveBackup(String(reader.result));
      if (!parsed) { setNotice("备份文件格式无效"); setPendingImport(null); return; }
      setPendingImport(parsed); setNotice("");
    };
    reader.readAsText(file);
  }

  function importChange(event: ChangeEvent<HTMLInputElement>) { readBackup(event.target.files?.[0]); }
  function importDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); readBackup(event.dataTransfer.files[0]); }
  function confirmImport() {
    if (!pendingImport) return;
    replaceAll(pendingImport.data);
    window.location.reload();
  }
  function confirmReset() {
    if (resetPhrase !== "确认清空") return;
    resetAll(); window.location.reload();
  }

  return <div className="admin-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="admin-panel" role="dialog" aria-modal="true" aria-label="站长工具面板">
      <header><div><small>KEEPER&apos;S ARCANE CONSOLE</small><h2>站长工具</h2></div><button type="button" onClick={onClose} aria-label="关闭站长工具">×</button></header>
      <div className="admin-layout">
        <nav aria-label="站长工具分类">{tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
        <div className="admin-content">
          {tab === "theme" ? <section><h3>主题设置</h3><p className="admin-lead">选择档案馆的光线与纸张质感，设置将保存在当前浏览器。</p><div className="theme-options">{themeOptions.map((item) => <label key={item.id} className={mode === item.id ? "is-active" : ""}><input type="radio" name="theme" checked={mode === item.id} onChange={() => setMode(item.id)} /><span>{item.icon}</span><b>{item.label}</b></label>)}</div><label className="motion-switch"><input type="checkbox" checked={complexMotion} onChange={(event) => setComplexMotion(event.target.checked)} /><span><b>启用复杂动效</b><small>粒子、翻页与魔法微光；关闭后仅保留基础淡入淡出</small></span></label></section> : null}
          {tab === "password" ? <section><h3>咒语管理</h3><p className="admin-lead">更新后立即生效，当前已登录状态不会中断。</p><form className="password-form" onSubmit={submitPassword}>{([ ["current","当前通行咒语",current,setCurrent], ["next","新咒语（6-20位）",next,setNext], ["confirm","确认新咒语",confirm,setConfirm] ] as const).map(([id,label,value,setter]) => <label className={`admin-field${error.field === id || (error.field === "confirm" && id === "next") ? " has-error" : ""}`} key={id}><span>{label}</span><div><input type={visible ? "text" : "password"} value={value} maxLength={20} onChange={(event) => { setter(event.target.value); setError({ field:null,message:"" }); }} /><button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "隐藏咒语" : "显示咒语"}>{visible ? "◉" : "◎"}</button></div></label>)}<p className="admin-error" aria-live="polite">{error.message}</p><button className="wax-button" type="submit">更新咒语</button></form><small className="admin-note">咒语仅保存在当前浏览器，换设备需重新设置</small></section> : null}
          {tab === "data" ? <section><h3>数据管理</h3><p className="admin-lead">备份和恢复书籍、影视、CP 以及它们的全部关联内容。</p><div className="data-actions"><button type="button" onClick={exportBackup}>↓ 导出全量备份</button><div className="drop-zone" onDragOver={(event) => event.preventDefault()} onDrop={importDrop}><input ref={fileRef} type="file" accept="application/json,.json" onChange={importChange} /><button type="button" onClick={() => fileRef.current?.click()}>选择备份文件导入</button><small>也可将 JSON 文件拖到这里</small></div></div>{pendingImport ? <div className="import-confirm"><p>备份日期：{pendingImport.exportedAt ? new Date(pendingImport.exportedAt).toLocaleString("zh-CN") : "未记录"}</p><p>书籍 {pendingImport.data.books.length} · 影视 {pendingImport.data.films.length} · CP {pendingImport.data.cps.length}</p><button type="button" onClick={confirmImport}>确认覆盖当前数据</button></div> : null}<div className="danger-zone"><h4>重置为初始内容</h4><p>保留主题、密码及偏好，只清除本地编辑内容。</p><input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} placeholder="输入“确认清空”" /><button type="button" disabled={resetPhrase !== "确认清空"} onClick={confirmReset}>确认重置</button></div></section> : null}
          {tab === "mailbox" ? <MailboxAdmin /> : null}
          {tab === "about" ? <section className="about-site"><span className="about-crest">SR</span><h3>{SITE_NAME}</h3><dl><div><dt>版本号</dt><dd>{SITE_VERSION}</dd></div><div><dt>站长</dt><dd>拾染randi</dd></div><div><dt>部署方式</dt><dd>GitHub Pages 托管</dd></div></dl><small>纯前端网站，数据保存在本地浏览器</small></section> : null}
          {notice ? <div className="parchment-toast" role="status">{notice}</div> : null}
        </div>
      </div>
    </section>
  </div>;
}
