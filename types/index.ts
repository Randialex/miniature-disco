export type Rating = number;

export type ArchiveStatus = "planned" | "active" | "completed" | "paused" | "dropped";
export type NoteKind = "quote" | "thought" | "scene";

export interface ArchiveNote {
  id: string;
  kind: NoteKind;
  content: string;
  reference?: string;
  createdAt: string;
  pinned?: boolean;
  order?: number;
}

export type EmotionStamp = "治愈" | "震撼" | "怅然" | "上头" | "意难平" | "平静";

export interface ArchiveSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  status: ArchiveStatus;
  rating?: Rating;
  progress?: ArchiveProgress;
  emotion?: EmotionStamp;
  reflection?: string;
  isRevisit: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  createdByName?: string;
}

export interface ArchiveAssetDisplay {
  path: string;
  cropRatio: "book" | "poster";
  focusX: number;
  focusY: number;
  themeColor: string;
  overlay: number;
  altText: string;
  originalWidth: number;
  originalHeight: number;
  uploadedBy?: string;
}

export interface ArchiveProgress {
  current: number;
  total: number;
  unit: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genres: string[];
  readDate: string;
  rating: Rating;
  coverTone: string;
  coverUrl?: string;
  monogram: string;
  review: string;
  quotes: string[];
  filmIds?: string[];
  cpIds?: string[];
  status?: ArchiveStatus;
  progress?: ArchiveProgress;
  notes?: ArchiveNote[];
  sessions?: ArchiveSession[];
  asset?: ArchiveAssetDisplay;
  pendingCompletion?: boolean;
}

export interface Film {
  id: string;
  title: string;
  originalTitle?: string;
  year: number;
  genres: string[];
  watchDate: string;
  rating: Rating;
  posterTone: string;
  posterUrl?: string;
  monogram: string;
  review: string;
  lines: string[];
  bookIds?: string[];
  cpIds?: string[];
  status?: ArchiveStatus;
  progress?: ArchiveProgress;
  notes?: ArchiveNote[];
  sessions?: ArchiveSession[];
  asset?: ArchiveAssetDisplay;
  pendingCompletion?: boolean;
}

export interface CpScene {
  title: string;
  note: string;
  motif: string;
}

export interface Cp {
  id: string;
  name: string;
  origin: string;
  startDate: string;
  rating: Rating;
  tone: string;
  monogram: string;
  summary: string;
  scenes: CpScene[];
  bookIds?: string[];
  filmIds?: string[];
  status?: ArchiveStatus;
  progress?: ArchiveProgress;
  notes?: ArchiveNote[];
  sessions?: ArchiveSession[];
  pendingCompletion?: boolean;
}

export type TimelineKind = "book" | "film" | "cp";

export interface TimelineEvent {
  id: string;
  kind: TimelineKind;
  date: string;
  title: string;
  note: string;
  href: string;
}
