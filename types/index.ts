export type Rating = number;

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
