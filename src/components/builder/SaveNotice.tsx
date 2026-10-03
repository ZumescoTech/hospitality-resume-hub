import { useState } from "react";
import type { SaveStatus } from "@/lib/resume-persistence";
import { Button } from "@/components/ui/button";

interface Props {
  status: SaveStatus;
  issue: string | null;
  onRetry: () => void;
  onDownload: () => void;
  onResolve: () => void;
}

export function SaveNotice({ status, issue, onRetry, onDownload, onResolve }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  if (!issue) return null;
  return (
    <section
      role="alert"
      className="mx-4 my-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <p>{issue}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {status !== "conflict" && status !== "recovery-needed" && (
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        {status !== "load-failed" && (
          <Button size="sm" variant="outline" onClick={onDownload}>
            Download recovery copy
          </Button>
        )}
        {status === "conflict" && (
          <Button size="sm" variant="outline" onClick={onResolve}>
            Keep a backup and load other copy
          </Button>
        )}
        {status === "recovery-needed" &&
          (confirmReset ? (
            <>
              <p className="w-full">
                Start a blank CV? The unreadable original will be kept as a device recovery backup.
              </p>
              <Button
                size="sm"
                onClick={() => {
                  onResolve();
                  setConfirmReset(false);
                }}
              >
                Back up original and start fresh
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setConfirmReset(true)}>
              Start fresh…
            </Button>
          ))}
      </div>
    </section>
  );
}
