import { ResumeData, Certification, Hospitality } from "@/types/resume";
import { Field } from "../Field";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/resume-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── STCW common certificate names ─────────────────────────────────────────────
const STCW_NAMES = [
  "STCW Basic Safety Training (BST)",
  "Crowd Management",
  "Crisis Management and Human Behaviour",
  "Security Awareness",
  "Food Safety / HACCP",
  "Proficiency in Survival Craft",
  "Medical First Aid",
];

const MONTHS = [
  "01 — Jan", "02 — Feb", "03 — Mar", "04 — Apr",
  "05 — May", "06 — Jun", "07 — Jul", "08 — Aug",
  "09 — Sep", "10 — Oct", "11 — Nov", "12 — Dec",
];

const CURRENT_YEAR = new Date().getFullYear();
const EXPIRY_YEARS = Array.from({ length: 11 }, (_, i) => String(CURRENT_YEAR + i));

// ── Language data ──────────────────────────────────────────────────────────────
const LANG_SUGGESTIONS = [
  "English", "French", "Spanish", "Portuguese", "Italian", "German", "Dutch",
  "Mandarin", "Japanese", "Arabic", "Swahili", "Zulu", "Xhosa", "Afrikaans",
  "Hindi", "Tagalog", "Russian", "Korean", "Turkish", "Polish", "Greek",
  "Romanian", "Hungarian", "Czech", "Swedish", "Norwegian", "Danish",
  "Finnish", "Thai", "Indonesian",
];

const LANG_LEVELS = ["Native", "Fluent", "Conversational", "Basic"] as const;

export function CertificationsSection({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (n: Partial<ResumeData>) => void;
}) {
  // ── Certifications helpers ──────────────────────────────────────────────────
  const updateCert = (i: number, patch: Partial<Certification>) =>
    onChange({
      certifications: data.certifications.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    });

  const removeCert = (i: number) =>
    onChange({ certifications: data.certifications.filter((_, idx) => idx !== i) });

  const addCert = () => {
    if (data.certifications.length >= 8) return;
    onChange({
      certifications: [...data.certifications, { id: uid(), name: "", issuer: "", year: "", expiry: "" }],
    });
  };

  // Parse stored expiry "MM/YYYY" back to month/year selects
  function parseExpiry(expiry?: string): { month: string; year: string } {
    if (!expiry) return { month: "", year: "" };
    const [m, y] = expiry.split("/");
    return { month: m ?? "", year: y ?? "" };
  }

  function buildExpiry(month: string, year: string): string {
    if (!month && !year) return "";
    if (month && year) return `${month}/${year}`;
    return month || year;
  }

  // ── Languages helpers ───────────────────────────────────────────────────────
  const h = data.hospitality;

  const setLangs = (languages: Hospitality["languages"]) =>
    onChange({ hospitality: { ...h, languages } });

  const updateLang = (i: number, patch: Partial<Hospitality["languages"][number]>) =>
    setLangs(h.languages.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const removeLang = (i: number) =>
    setLangs(h.languages.filter((_, idx) => idx !== i));

  const addLang = () => {
    if (h.languages.length >= 6) return;
    setLangs([...h.languages, { name: "", level: "Conversational" }]);
  };

  return (
    <div className="space-y-8">

      {/* ── Section 1: Certificates & Training ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⚓</span>
          <h3 className="font-semibold text-foreground">Certificates &amp; Training</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          STCW certificates are required by all cruise lines. Add any you hold.
        </p>

        {/* Certificate name datalist */}
        <datalist id="stcw-names">
          {STCW_NAMES.map((n) => <option key={n} value={n} />)}
        </datalist>

        {data.certifications.map((c, i) => {
          const { month, year: exYear } = parseExpiry(c.expiry);
          return (
            <div key={c.id} className="rounded-lg border border-border bg-background p-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                {/* Certificate name with STCW datalist */}
                <Field label="Certificate name">
                  <input
                    list="stcw-names"
                    value={c.name}
                    onChange={(e) => updateCert(i, { name: e.target.value })}
                    placeholder="e.g. STCW Basic Safety Training (BST)"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </Field>

                {/* Issuing body */}
                <Field label="Issuing body">
                  <input
                    value={c.issuer}
                    onChange={(e) => updateCert(i, { issuer: e.target.value })}
                    placeholder="e.g. SAMSA, MCA, STCW Centre"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </Field>
              </div>

              {/* Expiry date + trash */}
              <div className="flex items-end gap-3">
                <Field label="Expiry date (optional)" hint="Leave blank if certificate does not expire.">
                  <div className="flex gap-2">
                    <Select
                      value={month}
                      onValueChange={(m) => updateCert(i, { expiry: buildExpiry(m, exYear) })}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No month</SelectItem>
                        {MONTHS.map((m) => (
                          <SelectItem key={m} value={m.slice(0, 2)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={exYear}
                      onValueChange={(y) => updateCert(i, { expiry: buildExpiry(month, y) })}
                    >
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No year</SelectItem>
                        {EXPIRY_YEARS.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 shrink-0"
                  onClick={() => removeCert(i)}
                  aria-label="Remove certificate"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          onClick={addCert}
          disabled={data.certifications.length >= 8}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" /> Add certificate
        </Button>
        {data.certifications.length >= 8 && (
          <p className="text-xs text-muted-foreground text-center">Maximum 8 certificates reached.</p>
        )}
      </div>

      {/* ── Section 2: Languages ── */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground">Languages</h3>

        {/* Language name datalist */}
        <datalist id="lang-names">
          {LANG_SUGGESTIONS.map((l) => <option key={l} value={l} />)}
        </datalist>

        {h.languages.map((l, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              list="lang-names"
              value={l.name}
              placeholder="Language"
              onChange={(e) => updateLang(i, { name: e.target.value })}
              className="flex-1 flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Select
              value={l.level}
              onValueChange={(v) => updateLang(i, { level: v as typeof LANG_LEVELS[number] })}
            >
              <SelectTrigger className="w-[160px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANG_LEVELS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLang(i)}
              aria-label="Remove language"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLang}
          disabled={h.languages.length >= 6}
        >
          <Plus className="mr-2 h-4 w-4" /> Add language
        </Button>
        {h.languages.length >= 6 && (
          <p className="text-xs text-muted-foreground">Maximum 6 languages reached.</p>
        )}
      </div>
    </div>
  );
}
