"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ACCESS_DURATION_MS, ACCESS_STORAGE_KEY, SITE_PASSWORD_KEY, SPELL_FAILURES_KEY } from "@/utils/constants";
import { clearSpellFailures, getSpellFailureCount, matchesSitePassword, recordSpellFailure, resetSitePassword } from "@/utils/password";
import { clearArchiveData } from "@/utils/storage";

export const ACCESS_SESSION_KEY = "randi-archive-session-access-v1";

const DATE_BLESSINGS: Record<string, string> = {
  "01-01": "新岁的第一页，愿所有好故事如约启封。",
  "10-31": "万圣夜的黑雾已为你让出一条小径。",
  "12-24": "愿冬夜的星光，落在你珍藏的每一页。",
};

type InvitationState = "sealed" | "opening" | "opened" | "vanishing";

export function hasValidAccess(): boolean {
  try {
    if (window.sessionStorage.getItem(ACCESS_SESSION_KEY) === "verified") return true;
    const stored = window.localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!stored) return false;
    const access = JSON.parse(stored) as { expiresAt?: number };
    if (typeof access.expiresAt === "number" && access.expiresAt > Date.now()) return true;
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
  }
  return false;
}

export default function EnvelopeCover() {
  const router = useRouter();
  const [invitationState, setInvitationState] = useState<InvitationState>("sealed");
  const [spell, setSpell] = useState("");
  const [error, setError] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [dateBlessing, setDateBlessing] = useState("");
  const [remember, setRemember] = useState(false);
  const [failureCount, setFailureCount] = useState(0);
  const [showReset, setShowReset] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setCheckingAccess(false);
    setFailureCount(getSpellFailureCount());
    const now = new Date();
    const dateKey = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setDateBlessing(DATE_BLESSINGS[dateKey] ?? "");
    return () => timers.current.forEach(window.clearTimeout);
  }, [router]);

  function beginOpening() {
    setInvitationState("opening");
    const timer = window.setTimeout(() => setInvitationState("opened"), 2900);
    timers.current.push(timer);
  }

  function verifySpell(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matchesSitePassword(spell)) {
      setError(true);
      setFailureCount(recordSpellFailure());
      return;
    }

    const verifiedAt = Date.now();
    clearSpellFailures();
    if (remember) window.localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify({ verifiedAt, expiresAt: verifiedAt + ACCESS_DURATION_MS }));
    else window.sessionStorage.setItem(ACCESS_SESSION_KEY, "verified");
    setError(false);
    setInvitationState("vanishing");
    const timer = window.setTimeout(() => router.replace("/home"), 1900);
    timers.current.push(timer);
  }

  function forceReset() {
    if (resetPhrase !== "确认重置") return;
    resetSitePassword();
    clearArchiveData();
    window.localStorage.removeItem(ACCESS_STORAGE_KEY);
    window.sessionStorage.removeItem(ACCESS_SESSION_KEY);
    window.localStorage.removeItem(SITE_PASSWORD_KEY);
    window.localStorage.removeItem(SPELL_FAILURES_KEY);
    window.location.reload();
  }

  if (checkingAccess) {
    return (
      <main className="invitation invitation--checking" aria-label="正在校验通行凭证">
        <span className="checking-rune" aria-hidden="true">R</span>
      </main>
    );
  }

  return (
    <main className={`invitation invitation--${invitationState}`}>
      <div className="night-mist" aria-hidden="true" />
      <div className="star-field" aria-hidden="true" />
      <p className="invitation__eyebrow">PRIVATE CORRESPONDENCE · MMXXVI</p>
      {dateBlessing ? <p className="date-blessing">✦ {dateBlessing} ✦</p> : null}

      <section className="envelope-scene" aria-label="拾染randi的私人邀请函">
        <div className="envelope">
          <article className="letter" aria-hidden={invitationState === "sealed"}>
            <div className="letter__border">
              <p className="letter__kicker">BY OWL POST · 私人函件</p>
              <div className="letter__crest" aria-hidden="true"><span>SR</span></div>
              <h1>书影私藏魔法录</h1>
              <div className="letter__ornament" aria-hidden="true">◆</div>
              <p className="letter__salutation">亲爱的私藏者：</p>
              <p className="letter__copy">
                诚邀你步入拾染randi的私藏档案馆。愿书页里的低语、银幕上的微光，
                与故事中隐秘而恒久的羁绊，在今夜为你一一苏醒。
              </p>
              <p className="letter__signature">谨候来访<br /><strong>拾染randi</strong></p>

              <form className={`spell-form${error ? " spell-form--error" : ""}`} onSubmit={verifySpell}>
                <label htmlFor="spell">请输入通行咒语</label>
                <div className="spell-form__field">
                  <span aria-hidden="true">✦</span>
                  <input
                    id="spell"
                    type="password"
                    value={spell}
                    onChange={(event) => {
                      setSpell(event.target.value);
                      if (error) setError(false);
                    }}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={invitationState !== "opened"}
                    aria-invalid={error}
                    aria-describedby="spell-message"
                    placeholder="低声念出咒语……"
                  />
                  <button type="submit" aria-label="验证咒语">进入</button>
                </div>
                <p id="spell-message" className="spell-form__message" aria-live="polite">
                  {error ? "咒语有误，请重试" : "墨迹将辨认真正的来访者"}
                </p>
                <label className="remember-spell"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />记住通行咒语 · 7天免验证</label>
                {failureCount >= 5 ? <button className="reset-spell-link" type="button" onClick={() => setShowReset(true)}>重置咒语</button> : null}
              </form>
            </div>
          </article>

          <div className="envelope__back" aria-hidden="true" />
          <div className="envelope__pocket" aria-hidden="true" />
          <div className="envelope__flap" aria-hidden="true" />
          <div className="envelope__front">
            <div className="envelope__address">
              <span>致</span>
              <strong>拾染randi 的私藏者</strong>
              <small>只予被故事选中的来访者</small>
            </div>
          </div>
          <div className="wax-seal" aria-hidden="true">
            <span>R</span>
          </div>
          <div className="seal-cracks" aria-hidden="true"><i /><i /><i /></div>
        </div>
      </section>

      <button
        className="unseal-button"
        type="button"
        onClick={beginOpening}
        disabled={invitationState !== "sealed"}
      >
        <span aria-hidden="true">—</span> 启封 <span aria-hidden="true">—</span>
      </button>

      <div className="gold-burst" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => <i key={index} />)}
      </div>
      <p className="invitation__hint">点击蜡封下方启封 · 请开启声音之外的想象</p>
      {showReset ? <div className="reset-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowReset(false)}><section className="reset-dialog" role="dialog" aria-modal="true" aria-label="重置咒语"><button type="button" className="reset-dialog__close" onClick={() => setShowReset(false)} aria-label="关闭">×</button><span>⚠</span><h2>重置通行咒语</h2><p>重置将恢复初始咒语，并清空所有本地编辑的书影 CP 数据，恢复为默认内容。主题设置与搜索历史会保留。</p><label>请输入「确认重置」<input value={resetPhrase} onChange={(event) => setResetPhrase(event.target.value)} /></label><button className="wax-button" type="button" disabled={resetPhrase !== "确认重置"} onClick={forceReset}>确认重置</button></section></div> : null}
    </main>
  );
}
