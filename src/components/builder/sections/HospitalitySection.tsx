import { ResumeData, Hospitality } from "@/types/resume";
import { Field, TextField } from "../Field";
import { TagInput } from "../TagInput";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const SERVICE = ["Fine dining", "Bistro", "Brasserie", "Banquet", "Tasting menu", "À la carte", "Cocktail bar", "Wine bar", "Café", "Hotel F&B"];
const POS = ["Toast", "Square", "Lightspeed", "Micros", "Aloha", "Resy", "OpenTable", "TouchBistro"];
const WINE = ["None", "Beginner", "Intermediate", "Advanced", "Sommelier"] as const;
const SPIRITS = ["None", "Beginner", "Intermediate", "Advanced", "Mixologist"] as const;
const LANG_LEVELS = ["Basic", "Conversational", "Fluent", "Native"] as const;

export function HospitalitySection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (n: Partial<ResumeData>) => void;
}) {
  const set = (patch: Partial<Hospitality>) =>
    onChange({ hospitality: { ...data.hospitality, ...patch } });
  const h = data.hospitality;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Wine knowledge">
          <Select value={h.wineKnowledge} onValueChange={(v) => set({ wineKnowledge: v as Hospitality["wineKnowledge"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {WINE.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Spirits / cocktails">
          <Select value={h.spiritsKnowledge} onValueChange={(v) => set({ spiritsKnowledge: v as Hospitality["spiritsKnowledge"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPIRITS.map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Service styles" hint="Select or type to add.">
        <TagInput values={h.serviceStyles} onChange={(serviceStyles) => set({ serviceStyles })} placeholder="e.g. Fine dining" suggestions={SERVICE} />
      </Field>

      <Field label="POS systems">
        <TagInput values={h.posSystems} onChange={(posSystems) => set({ posSystems })} placeholder="e.g. Toast" suggestions={POS} />
      </Field>

      <Field label="Languages">
        <div className="space-y-2">
          {h.languages.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={l.name}
                placeholder="Language"
                onChange={(e) => {
                  const next = [...h.languages];
                  next[i] = { ...l, name: e.target.value };
                  set({ languages: next });
                }}
              />
              <Select
                value={l.level}
                onValueChange={(v) => {
                  const next = [...h.languages];
                  next[i] = { ...l, level: v as typeof LANG_LEVELS[number] };
                  set({ languages: next });
                }}
              >
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANG_LEVELS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => set({ languages: h.languages.filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set({ languages: [...h.languages, { name: "", level: "Conversational" }] })}
          >
            <Plus className="mr-2 h-4 w-4" /> Add language
          </Button>
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Food safety"
          value={h.foodSafety ?? ""}
          onChange={(e) => set({ foodSafety: e.target.value })}
          placeholder="ServSafe / Level 2 Food Safety"
        />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <Checkbox checked={h.allergens} onCheckedChange={(v) => set({ allergens: !!v })} />
          <span>Allergen-awareness trained</span>
        </label>
      </div>
    </div>
  );
}
