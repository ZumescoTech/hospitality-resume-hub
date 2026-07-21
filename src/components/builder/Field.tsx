import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex max-w-full items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="truncate">{label}</span>
        {required && <span className="ml-1 shrink-0 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  required?: boolean;
  validate?: (value: string) => string | undefined;
  className?: string;
}

export function TextField({
  label,
  hint,
  required,
  validate,
  className,
  onBlur,
  ...props
}: TextFieldProps) {
  const [touched, setTouched] = useState(false);
  const value = String(props.value ?? "");
  let error: string | undefined;
  if (touched) {
    if (required && !value.trim()) error = `${label} is required`;
    else if (validate) error = validate(value);
    else if (props.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      error = "Please enter a valid email";
    }
  }

  return (
    <div className={className}>
      <Field label={label} hint={hint} required={required} error={error}>
        <Input
          {...props}
          aria-invalid={!!error}
          className={cn(
            // Only horizontal padding flexes with width; height (h-9) stays fixed.
            "px-2.5 min-[480px]:px-3",
            error && "border-destructive focus-visible:ring-destructive",
          )}
          onBlur={(e) => {
            setTouched(true);
            onBlur?.(e);
          }}
        />
      </Field>
    </div>
  );
}
