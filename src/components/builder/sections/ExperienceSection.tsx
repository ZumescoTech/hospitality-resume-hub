import { ResumeData, Experience } from "@/types/resume";
import { TextField, Field } from "../Field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/resume-store";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  data: ResumeData;
  onChange: (next: Partial<ResumeData>) => void;
}

export function ExperienceSection({ data, onChange }: Props) {
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

  return (
    <div className="space-y-4">
      {data.experience.length === 0 && (
        <p className="text-sm text-muted-foreground">No roles added yet.</p>
      )}
      {data.experience.map((exp, i) => (
        <div key={exp.id} className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Role #{i + 1}
            </p>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div className="grid grid-cols-2 gap-3">
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
            <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
              <Checkbox
                checked={!!exp.current}
                onCheckedChange={(v) => update(i, { current: !!v, endDate: v ? "" : exp.endDate })}
              />
              I currently work here
            </label>
          </div>
          <div className="mt-3">
            <Field label="Highlights" hint="Use short impactful lines. Quantify when you can.">
              <Textarea
                rows={3}
                value={exp.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Curate a 420-bin list. Lead service for 80 covers nightly. Train 6 commis."
              />
            </Field>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add role
      </Button>
    </div>
  );
}
