import { useEffect, useState, useCallback, useRef } from "react";
import { ResumeData, STORAGE_KEY, emptyResume, sampleResume } from "@/types/resume";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";

export function useResumeStore() {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState<ResumeData>(emptyResume);
  const [hydrated, setHydrated] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  // Prevents double-hydration on re-renders while auth state resolves
  const hydratedRef = useRef(false);

  // --- Hydration: load from Supabase (authed) or localStorage (anon) ---
  useEffect(() => {
    if (userLoading || hydratedRef.current) return;
    hydratedRef.current = true;

    if (user) {
      supabase
        .from("resumes")
        .select("id, data, template_id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: row }) => {
          if (row) {
            // Resume found — load it
            setResumeId(row.id as string);
            setData({
              ...emptyResume,
              ...(row.data as ResumeData),
              templateId: row.template_id as string,
            });
          } else {
            // New user — generate an ID and migrate any anonymous localStorage work
            setResumeId(crypto.randomUUID());
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              setData(raw ? { ...emptyResume, ...JSON.parse(raw) } : emptyResume);
            } catch {
              setData(emptyResume);
            }
          }
          setHydrated(true);
        });
    } else {
      // Anonymous — localStorage only
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        setData(raw ? { ...emptyResume, ...JSON.parse(raw) } : emptyResume);
      } catch {
        setData(emptyResume);
      }
      setHydrated(true);
    }
  }, [userLoading, user]);

  // --- Auto-save: debounced Supabase upsert (authed) or immediate localStorage (anon) ---
  useEffect(() => {
    if (!hydrated) return;

    if (user && resumeId) {
      // Debounce writes to avoid hammering Supabase on every keystroke
      const timer = setTimeout(() => {
        setSyncing(true);
        void (async () => {
          try {
            await supabase
              .from("resumes")
              .upsert(
                {
                  id: resumeId,
                  user_id: user.id,
                  title: data.personal.fullName || "My CV",
                  data: data as unknown as Record<string, unknown>,
                  template_id: data.templateId,
                },
                { onConflict: "id" },
              );
          } finally {
            setSyncing(false);
          }
        })();
      }, 1500);
      return () => clearTimeout(timer);
    } else if (!user) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch { /* ignore */ }
    }
  }, [data, hydrated, user, resumeId]);

  const update = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  const setTemplateColours = useCallback((templateId: string, colours: Partial<{ primary: string; accent: string; text: string; background: string }>) => {
    setData((d) => ({
      ...d,
      templateColours: {
        ...d.templateColours,
        [templateId]: { ...(d.templateColours?.[templateId] ?? {}), ...colours },
      },
    }));
  }, []);

  const resetTemplateColours = useCallback((templateId: string) => {
    setData((d) => {
      const next = { ...(d.templateColours ?? {}) };
      delete next[templateId];
      return { ...d, templateColours: next };
    });
  }, []);

  const reset = useCallback(() => setData(emptyResume), []);
  const loadSample = useCallback(() => setData(sampleResume), []);

  return { data, setData, update, reset, loadSample, hydrated, resumeId, syncing, setTemplateColours, resetTemplateColours };
}

export { uid } from "@/lib/utils";
