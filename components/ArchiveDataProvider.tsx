"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { books as staticBooks } from "@/data/books";
import { films as staticFilms } from "@/data/films";
import { cps as staticCps } from "@/data/cps";
import type { Book, Cp, Film } from "@/types";
import { loadArchiveData, saveArchiveData, type ArchiveData } from "@/utils/storage";

interface ArchiveContextValue extends ArchiveData {
  ready: boolean;
  saveBooks: (books: Book[]) => boolean;
  saveFilms: (films: Film[]) => boolean;
  saveCps: (cps: Cp[]) => boolean;
}

const fallback: ArchiveData = { books: staticBooks, films: staticFilms, cps: staticCps };
const ArchiveContext = createContext<ArchiveContextValue | null>(null);

export function ArchiveDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ArchiveData>(fallback);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadArchiveData(fallback));
    setReady(true);
  }, []);

  const update = useCallback((next: ArchiveData) => {
    if (!saveArchiveData(next)) return false;
    setData(next);
    return true;
  }, []);

  const value = useMemo<ArchiveContextValue>(() => ({
    ...data,
    ready,
    saveBooks: (books) => update({ ...data, books }),
    saveFilms: (films) => update({ ...data, films }),
    saveCps: (cps) => update({ ...data, cps }),
  }), [data, ready, update]);

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchiveData() {
  const value = useContext(ArchiveContext);
  if (!value) throw new Error("useArchiveData 必须在 ArchiveDataProvider 内使用");
  return value;
}
