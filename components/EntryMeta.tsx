import type { ArchiveProgress, ArchiveStatus } from "@/types";

const statusLabels: Record<ArchiveStatus, Record<"book" | "film" | "cp", string>> = {
  planned: { book: "想读", film: "想看", cp: "待入坑" }, active: { book: "在读", film: "在看", cp: "追更中" },
  completed: { book: "已读完", film: "已看完", cp: "已完结" }, paused: { book: "搁置", film: "搁置", cp: "躺平坑底" },
  dropped: { book: "弃坑", film: "弃坑", cp: "暂退坑" },
};

export function EntryMeta({ kind, status = "completed", progress }: { kind: "book" | "film" | "cp"; status?: ArchiveStatus; progress?: ArchiveProgress }) {
  const percent = progress?.total ? Math.min(100, Math.round(progress.current / progress.total * 100)) : status === "completed" ? 100 : 0;
  return <div className="entry-meta"><span className={`status-badge status-badge--${status}`}>{statusLabels[status][kind]}</span>{progress ? <div className="progress-track" title={`${progress.current}/${progress.total} ${progress.unit}`}><i style={{ width: `${percent}%` }} /><small>{percent}%</small></div> : null}</div>;
}

export const STATUS_OPTIONS: Array<{ value: ArchiveStatus; label: string }> = [
  { value: "planned", label: "计划" }, { value: "active", label: "进行中" }, { value: "completed", label: "已完成" }, { value: "paused", label: "搁置" }, { value: "dropped", label: "弃坑/暂退" },
];
