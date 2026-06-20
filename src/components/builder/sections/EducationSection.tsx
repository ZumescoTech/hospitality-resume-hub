import { ResumeData, Education } from "@/types/resume";
import { TextField } from "../Field";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/resume-store";

export function EducationSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (n: Partial<ResumeData>) => void;
}) {
  const update = (i: number, patch: Partial<Education>) =>
    onChange({ education: data.education.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) });
  const remove = (i: number) => onChange({ education: data.education.filter((_, idx) => idx !== i) });
  const add = () =>
    onChange({
      education: [
        ...data.education,
        { id: uid(), school: "", degree: "", field: "", startDate: "", endDate: "" },
      ],
    });

  return (
    <div className="space-y-4">
      {data.education.length === 0 && (
        <p className="text-sm text-muted-foreground">No education added yet.</p>
      )}
      {data.education.map((ed, i) => (
        <div key={ed.id} className="rounded-lg border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Entry #{i + 1}
            </p>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="School"
              value={ed.school}
              onChange={(e) => update(i, { school: e.target.value })}
              placeholder="Wine & Spirit Education Trust"
            />
            <TextField
              label="Degree / Award"
              value={ed.degree}
              onChange={(e) => update(i, { degree: e.target.value })}
              placeholder="WSET Level 3 Award"
            />
            <TextField
              label="Field"
              value={ed.field ?? ""}
              onChange={(e) => update(i, { field: e.target.value })}
              placeholder="Wines"
            />
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
              <TextField
                label="Start year"
                value={ed.startDate}
                onChange={(e) => update(i, { startDate: e.target.value })}
                placeholder="2018"
              />
              <TextField
                label="End year"
                value={ed.endDate}
                onChange={(e) => update(i, { endDate: e.target.value })}
                placeholder="2019"
              />
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={add} className="w-full">
        <Plus className="mr-2 h-4 w-4" /> Add education
      </Button>
    </div>
  );
}
