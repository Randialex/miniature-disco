"use client";

import { useEffect, useState } from "react";
import type { ArchiveAssetDisplay } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useArchiveData } from "./ArchiveDataProvider";

const BUCKET = "archive-assets";

export function useArchiveAssetUrl(asset?: ArchiveAssetDisplay, fallback?: string) {
  const [url, setUrl] = useState(fallback);
  useEffect(() => {
    setUrl(fallback);
    if (!asset?.path) return;
    const supabase = createSupabaseBrowserClient();
    let active = true;
    void supabase.storage.from(BUCKET).createSignedUrl(asset.path, 3600).then(({ data }) => { if (active && data?.signedUrl) setUrl(data.signedUrl); });
    return () => { active = false; };
  }, [asset?.path, fallback]);
  return url;
}

export default function ArchiveAssetField({ entryId, kind, ratio, value, onChange }: { entryId: string; kind: "book" | "film"; ratio: "book" | "poster"; value?: ArchiveAssetDisplay; onChange: (asset?: ArchiveAssetDisplay, signedUrl?: string) => void }) {
  const { activeArchive, user, entries } = useArchiveData();
  const cloudEntry = entries.find((entry) => entry.kind === kind && entry.legacy_id === entryId && !entry.deleted_at);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    if (!cloudEntry) { setStatus("新档案请先封存一次，再回来上传素材"); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setStatus("仅支持 JPG、PNG 与 WebP"); return; }
    if (file.size > 5 * 1024 * 1024) { setStatus("图片不可超过 5MB"); return; }
    setStatus("正在检查图片并安全上传……");
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = objectUrl;
    await image.decode();
    if (image.width < 240 || image.height < 320) { URL.revokeObjectURL(objectUrl); setStatus("图片至少需要 240 × 320 像素"); return; }
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d"); context?.drawImage(image, 0, 0, 1, 1);
    const pixel = context?.getImageData(0, 0, 1, 1).data;
    const themeColor = pixel ? `#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, "0")).join("")}` : "#49396d";
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${activeArchive.id}/${cloudEntry.id}/${crypto.randomUUID()}.${extension}`;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
    if (error) { URL.revokeObjectURL(objectUrl); setStatus(`上传失败：${error.message}`); return; }
    if (value?.path && value.path !== path) await supabase.storage.from(BUCKET).remove([value.path]);
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    const asset: ArchiveAssetDisplay = { path, cropRatio: ratio, focusX: 50, focusY: 50, themeColor, overlay: 35, altText: file.name.replace(/\.[^.]+$/, ""), originalWidth: image.width, originalHeight: image.height, uploadedBy: user.id };
    setPreview(objectUrl); setStatus("已上传私有素材；保存档案后生效");
    onChange(asset, data?.signedUrl ?? objectUrl);
  }

  function patch(change: Partial<ArchiveAssetDisplay>) {
    if (!value) return;
    onChange({ ...value, ...change }, preview);
  }

  async function remove() {
    if (!value?.path) return;
    setStatus("正在移除私有素材……");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage.from(BUCKET).remove([value.path]);
    if (error) { setStatus(`删除失败：${error.message}`); return; }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(""); setStatus("素材已移除，保存档案后生效"); onChange(undefined, "");
  }

  return <fieldset className="asset-field"><legend>私有封面素材</legend><div className={`asset-preview asset-preview--${ratio}`} style={{ backgroundImage: preview ? `url(${preview})` : undefined, backgroundPosition: value ? `${value.focusX}% ${value.focusY}%` : undefined }}>{!preview && value?.path ? <span>已关联私有素材</span> : !preview ? <span>JPG · PNG · WebP</span> : null}</div><div className="asset-controls"><label className={`asset-upload${!cloudEntry ? " is-disabled" : ""}`}><input disabled={!cloudEntry} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event.target.files?.[0])} />{cloudEntry ? "选择 / 替换图片" : "先保存新档案后上传"}</label>{value ? <><label><span>焦点 X</span><input type="range" min="0" max="100" value={value.focusX} onChange={(event) => patch({ focusX: Number(event.target.value) })} /></label><label><span>焦点 Y</span><input type="range" min="0" max="100" value={value.focusY} onChange={(event) => patch({ focusY: Number(event.target.value) })} /></label><label><span>明暗遮罩</span><input type="range" min="0" max="70" value={value.overlay} onChange={(event) => patch({ overlay: Number(event.target.value) })} /></label><label><span>替代文字</span><input value={value.altText} onChange={(event) => patch({ altText: event.target.value })} /></label><button className="asset-remove" type="button" onClick={() => void remove()}>删除当前素材</button></> : null}<small>{status || "素材会存入私有空间，访客只取得短期查看地址。"}</small></div></fieldset>;
}
