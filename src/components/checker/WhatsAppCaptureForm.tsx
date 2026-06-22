import { useState } from 'react';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCodeSelect, DEFAULT_COUNTRY } from '@/components/ui/CountryCodeSelect';
import type { CountryCode } from '@/components/ui/CountryCodeSelect';
import { saveCvLead } from '@/lib/cruise-cv-check';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  roleSlug: string;
  overallScore: number;
  tier: string;
  topFixes: string[];
  onSuccess: () => void;
  onSkip: () => void;
}

export function WhatsAppCaptureForm({ roleSlug, overallScore, tier, topFixes, onSuccess, onSkip }: Props) {
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [localNumber, setLocalNumber] = useState('');
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState('');

  // Strip formatting chars and combine into E.164
  function buildE164(dial: string, local: string): string {
    const stripped = local.replace(/[\s\-().]/g, '');
    return `${dial}${stripped}`;
  }

  function validateNumber(dial: string, local: string): { e164: string; warning: string } {
    const stripped = local.replace(/[\s\-().]/g, '');
    const e164 = `${dial}${stripped}`;
    let warning = '';
    try {
      const parsed = parsePhoneNumber(e164);
      if (!isValidPhoneNumber(e164) || !parsed.isValid()) {
        warning = 'This number looks incomplete — double-check before submitting.';
      }
    } catch {
      if (stripped.length < 6) {
        warning = 'This number looks too short.';
      }
    }
    return { e164, warning };
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalNumber(e.target.value);
    setPhoneWarning('');
  }

  function handleNumberBlur() {
    if (!localNumber.trim()) return;
    const { warning } = validateNumber(country.dial, localNumber);
    setPhoneWarning(warning);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consented || submitting) return;

    const stripped = localNumber.replace(/[\s\-().]/g, '');
    if (!stripped) return;

    const { e164, warning } = validateNumber(country.dial, localNumber);
    if (warning) setPhoneWarning(warning);
    // Soft warning — do not block submit

    setSubmitting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await saveCvLead({ data: { whatsapp_number: e164, country_code: country.code, roleSlug, overallScore, tier, topFixes, opted_in: true } } as any);
      setSucceeded(true);
      setTimeout(() => onSuccess(), 2000);
    } catch {
      // Never block user progress on lead-capture failure
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  if (succeeded) {
    return (
      <button
        type="button"
        onClick={onSuccess}
        className="w-full rounded-2xl bg-primary border border-primary/20 p-8 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary-foreground" />
        <p className="font-display text-lg font-bold text-primary-foreground">
          You&apos;re in — we&apos;ll be in touch on WhatsApp
        </p>
        <p className="mt-1 text-sm text-primary-foreground/60">Tap to continue</p>
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-primary border border-primary/20 p-6">
      <h3 className="font-display text-xl font-bold text-primary-foreground mb-1">
        Want to know which ships are hiring?
      </h3>
      <p className="text-sm text-primary-foreground/70 mb-5">
        Enter your WhatsApp number — we&apos;ll send you openings that match your role.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Country code + number — side by side, stacks below 480px */}
        <div>
          <Label className="text-xs font-medium text-primary-foreground/80 mb-1.5 block">
            WhatsApp number
          </Label>
          <div className="flex flex-col gap-2 min-[480px]:flex-row">
            {/* Country code — fixed width on wider screens */}
            <div className="min-[480px]:w-32 shrink-0">
              <CountryCodeSelect
                value={country}
                onChange={(c) => {
                  setCountry(c);
                  setPhoneWarning('');
                }}
                disabled={submitting}
              />
            </div>
            {/* Local number */}
            <div className="flex-1">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                value={localNumber}
                onChange={handleNumberChange}
                onBlur={handleNumberBlur}
                placeholder="e.g. 73 123 4567"
                disabled={submitting}
                className={cn(
                  'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/40',
                  phoneWarning && 'border-yellow-400/60',
                )}
              />
            </div>
          </div>
          {phoneWarning && (
            <p className="mt-1.5 text-xs text-yellow-300">{phoneWarning}</p>
          )}
          {localNumber && !phoneWarning && (
            <p className="mt-1.5 text-xs text-primary-foreground/50">
              Will be stored as {buildE164(country.dial, localNumber)}
            </p>
          )}
        </div>

        {/* POPIA consent — real checkbox, required */}
        <div className="flex items-start gap-3">
          <input
            id="whatsapp-consent"
            type="checkbox"
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            disabled={submitting}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-primary-foreground/30 accent-accent"
          />
          <Label
            htmlFor="whatsapp-consent"
            className="text-sm text-primary-foreground/80 leading-relaxed cursor-pointer"
          >
            Send me cruise job tips and CV advice on WhatsApp. You can unsubscribe anytime by replying STOP.
          </Label>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1 min-[400px]:flex-row">
          <Button
            type="submit"
            disabled={!consented || submitting || !localNumber.trim()}
            className="flex-1 bg-accent text-accent-foreground hover:opacity-90 font-semibold"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send me job tips'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={submitting}
            className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 min-[400px]:w-auto"
          >
            Skip for now
          </Button>
        </div>
      </form>
    </div>
  );
}
