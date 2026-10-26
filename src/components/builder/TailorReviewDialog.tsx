import { useEffect, useState } from "react";
import type { ResumeData } from "@/types/resume";
import { entryBullets } from "@/lib/tailor-cv";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface TailorReview {
  before: ResumeData;
  proposed: ResumeData;
  suggestedSkills: string[];
}

interface Props {
  review: TailorReview | null;
  onApply: (skillsToAdd: string[]) => void;
  onDiscard: () => void;
}

/**
 * Before/after review for "Customise CV to this job". Nothing changes until
 * the candidate clicks Apply; suggested skills are opt-in tick-boxes so a
 * skill only reaches the CV when the candidate confirms they have it.
 */
export function TailorReviewDialog({ review, onApply, onDiscard }: Props) {
  const [chosenSkills, setChosenSkills] = useState<string[]>([]);
  useEffect(() => setChosenSkills([]), [review]);

  if (!review) return null;
  const { before, proposed, suggestedSkills } = review;

  const changedEntries = proposed.experience
    .map((exp, i) => ({ exp, was: entryBullets(before.experience[i]), now: entryBullets(exp) }))
    .filter(({ was, now }) => was.join("\n") !== now.join("\n"));
  const summaryChanged = before.summary !== proposed.summary;
  const placeholders = (JSON.stringify(proposed.summary) + JSON.stringify(proposed.experience)).match(/\[X\]/g)?.length ?? 0;

  const toggle = (skill: string, on: boolean) =>
    setChosenSkills((s) => (on ? [...s, skill] : s.filter((x) => x !== skill)));

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onDiscard(); }}>
      <AlertDialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto" data-testid="tailor-review">
        <AlertDialogHeader>
          <AlertDialogTitle>Review your customised CV</AlertDialogTitle>
          <AlertDialogDescription>
            Nothing changes until you apply. Your job titles, employers and dates stay the same.
            {placeholders > 0 && ` ${placeholders} figure${placeholders === 1 ? "" : "s"} marked [X] need your real numbers.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 text-sm">
          {!summaryChanged && changedEntries.length === 0 && (
            <p className="text-muted-foreground">The AI suggested no changes for this job ad.</p>
          )}

          {summaryChanged && (
            <section data-testid="tailor-review-summary">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Professional summary</h3>
              <ReviewPair was={[before.summary || "(empty)"]} now={[proposed.summary]} />
            </section>
          )}

          {changedEntries.map(({ exp, was, now }) => (
            <section key={exp.id} data-testid="tailor-review-entry">
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {exp.role}{exp.venue ? ` — ${exp.venue}` : ""}
              </h3>
              <ReviewPair was={was.length ? was : ["(no bullet points)"]} now={now} />
            </section>
          ))}

          {suggestedSkills.length > 0 && (
            <section data-testid="tailor-review-skills">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills the job ad asks for</h3>
              <p className="mb-2 text-xs text-muted-foreground">Tick only the ones you genuinely have — they&apos;ll be added to your skills.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {suggestedSkills.map((skill) => (
                  <label key={skill} className="flex items-center gap-2">
                    <Checkbox
                      checked={chosenSkills.includes(skill)}
                      onCheckedChange={(v) => toggle(skill, v === true)}
                      aria-label={`I have ${skill}`}
                    />
                    {skill}
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard} data-testid="tailor-review-discard">Keep my original</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onApply(chosenSkills)}
            data-testid="tailor-review-apply"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            Apply changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReviewPair({ was, now }: { was: string[]; now: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-md border border-border bg-muted/40 p-2.5">
        <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">Now</p>
        <ul className="space-y-1 text-muted-foreground">{was.map((b, i) => <li key={i}>{b}</li>)}</ul>
      </div>
      <div className="rounded-md border border-emerald-600/40 bg-emerald-50 p-2.5">
        <p className="mb-1 text-[10px] font-semibold uppercase text-emerald-700">Suggested</p>
        <ul className="space-y-1 text-foreground">{now.map((b, i) => <li key={i}>{b}</li>)}</ul>
      </div>
    </div>
  );
}
