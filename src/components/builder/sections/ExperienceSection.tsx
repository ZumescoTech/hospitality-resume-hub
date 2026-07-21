import { useRef } from "react";
import { ResumeData, Experience } from "@/types/resume";
import { TextField, Field } from "../Field";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/resume-store";
import { Checkbox } from "@/components/ui/checkbox";
import { BulletEditor } from "../BulletEditor";
import { PhrasingChips } from "../PhrasingChips";

interface Props {
  data: ResumeData;
  onChange: (next: Partial<ResumeData>) => void;
  /** When true, show required-field errors even without blur (triggered by Continue tap). */
  showErrors?: boolean;
}

export function ExperienceSection({ data, onChange, showErrors }: Props) {
  // Refs for each entry container — used to focus the textarea after chip insertion
  const entryRefs = useRef<(HTMLDivElement | null)[]>([]);

  const update = (i: number, patch: Partial<Experience>) => {
    const next = data.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e));
    onChange({ experience: next });
  };
  const remove = (i: number) =>
    onChange({ experience: data.experience.filter((_, idx) => idx !== i) });
  const add = () =>
    onChange({
      experience: [
        ...data.experience,
        { id: uid(), role: "", venue: "", location: "", startDate: "", endDate: "", description: "" },
      ],
    });

  const handleSkillsAccepted = (newSkills: string[]) => {
    const merged = [...data.skills, ...newSkills.filter((s) => !data.skills.includes(s))];
    onChange({ skills: merged });
  };

  const hasValidEntry = data.experience.some((e) => e.role.trim() && e.venue.trim());

  return (
    <div className="space-y-4">
      {showErrors && !hasValidEntry && (
        <p className="text-xs font-medium text-destructive">At least one job title and employer is required to continue</p>
      )}
      {data.experience.length === 0 && (
        <p className="text-sm text-muted-foreground">No roles added yet.</p>
      )}
      {data.experience.map((exp, i) => {
        function handleChipInsert(chipText: string) {
          // Derive current bullets — fall back to splitting description if bullets absent
          const current: string[] =
            exp.bullets && exp.bullets.length > 0
              ? exp.bullets
              : exp.description
              ? [exp.description]
              : [];
          update(i, { bullets: [...current.filter((b) => b.trim()), chipText] });
          requestAnimationFrame(() => {
            const textareas = entryRefs.current[i]?.querySelectorAll("textarea");
            if (textareas && textareas.length > 0) {
              (textareas[textareas.length - 1] as HTMLTextAreaElement).focus();
            }
          });
        }

        return (
          <div
            key={exp.id}
            ref={(el) => { entryRefs.current[i] = el; }}
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Role #{i + 1}
              </p>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-3 min-[480px]:grid-cols-2" data-field-grid>
              <TextField
                label="Role"
                required
                value={exp.role}
                onChange={(e) => update(i, { role: e.target.value })}
                placeholder="Head Sommelier"
              />
              <TextField
                label="Venue / Restaurant"
                required
                value={exp.venue}
                onChange={(e) => update(i, { venue: e.target.value })}
                placeholder="Maison Laurent"
              />
              <TextField
                label="Location"
                value={exp.location ?? ""}
                onChange={(e) => update(i, { location: e.target.value })}
                placeholder="London"
              />
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3" data-field-grid>
                <TextField
                  label="Start"
                  type="month"
                  value={exp.startDate}
                  onChange={(e) => update(i, { startDate: e.target.value })}
                />
                <TextField
                  label="End"
                  type="month"
                  value={exp.endDate}
                  disabled={exp.current}
                  onChange={(e) => update(i, { endDate: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground min-[480px]:col-span-2">
                <Checkbox
                  checked={!!exp.current}
                  onCheckedChange={(v) => update(i, { current: !!v, endDate: v ? "" : exp.endDate })}
                />
                I currently work here
              </label>
            </div>
            <div className="mt-3">
              <BulletEditor
                bullets={
                  exp.bullets && exp.bullets.length > 0
                    ? exp.bullets
                    : exp.description
                    ? [exp.description]
                    : []
                }
                onChange={(bullets) => update(i, { bullets })}
                placeholder="Curate a 420-bin list. Lead service for 80 covers nightly. Train 6 commis."
                maxBullets={8}
              />
              {/* Phrasing chips insert as a new bullet */}
              <PhrasingChips
                roleSlug={data.targetRoleSlug}
                jobTitle={exp.role || data.personal.title || undefined}
                onInsert={handleChipInsert}
              />
            </div>
          </div>
        );
      })}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add role
      </Button>
    </div>
  );
}
