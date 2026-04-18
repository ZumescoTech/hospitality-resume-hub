import { useEffect, useState, useCallback } from "react";
import { ResumeData, STORAGE_KEY, emptyResume, sampleResume } from "@/types/resume";

export function useResumeStore() {
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) {
        setData({ ...emptyResume, ...JSON.parse(raw) });
      } else {
        setData(sampleResume);
      }
    } catch {
      setData(sampleResume);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [data, hydrated]);

  const update = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  const reset = useCallback(() => setData(emptyResume), []);
  const loadSample = useCallback(() => setData(sampleResume), []);

  return { data, setData, update, reset, loadSample, hydrated };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
