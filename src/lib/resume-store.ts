import { useEffect, useMemo, useSyncExternalStore } from "react";
import { emptyResume, sampleResume, type ResumeData } from "@/types/resume";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { getTemplateColours, type TemplateColours } from "@/lib/template-colours";
import { ResumePersistence, type ResumeCloud } from "@/lib/resume-persistence";

const cloud: ResumeCloud = {
  async load(userId, id, signal) {
    if (!supabase) throw new Error("Cloud storage is unavailable");
    let query = supabase.from("resumes").select("id, data, template_id").eq("user_id", userId);
    if (id) query = query.eq("id", id);
    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .abortSignal(signal)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  async save(userId, id, data, signal) {
    if (!supabase) throw new Error("Cloud storage is unavailable");
    const { error } = await supabase
      .from("resumes")
      .upsert(
        {
          id,
          user_id: userId,
          title: data.personal.fullName || "My CV",
          data: data as unknown as Record<string, unknown>,
          template_id: data.templateId,
        },
        { onConflict: "id" },
      )
      .abortSignal(signal);
    if (error) throw error;
  },
};

/** Call once in the editor; pass status to read-only UI rather than creating another store. */
export function useResumeStore() {
  const { user, loading } = useUser();
  const owner = user?.id ?? null;
  const store = useMemo(
    () => new ResumePersistence(loading ? null : owner, cloud),
    [owner, loading],
  );
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => {
    if (loading) return;
    return store.start();
  }, [store, loading]);

  return {
    ...state,
    syncing: state.saveStatus === "saving",
    setData: store.setData,
    retrySave: store.retrySave,
    resolveRecovery: store.resolveRecovery,
    downloadRecovery: store.downloadRecovery,
    update: <K extends keyof ResumeData>(key: K, value: ResumeData[K]) =>
      store.setData((data) => ({ ...data, [key]: value })),
    reset: () => store.setData(emptyResume),
    loadSample: () => store.setData(sampleResume),
    setTemplateColours: (templateId: string, colours: Partial<TemplateColours>) =>
      store.setData((data) => ({
        ...data,
        templateColours: {
          ...data.templateColours,
          [templateId]: { ...getTemplateColours(templateId, data.templateColours), ...colours },
        },
      })),
    resetTemplateColours: (templateId: string) =>
      store.setData((data) => {
        const next = { ...data.templateColours };
        delete next[templateId];
        return { ...data, templateColours: next };
      }),
  };
}

export { uid } from "@/lib/utils";
