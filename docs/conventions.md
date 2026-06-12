# Code Conventions
*Reference for Claude Code when generating or editing any file in this project.*

---

## TypeScript

- Strict mode is on. Zero `any` unless wrapping a third-party type hole — document why.
- Prefer `interface` for object shapes, `type` for unions/aliases.
- All props interfaces named `Props`, defined at the top of the file.
- All server function data shapes validated with `zod` before use.
- `unknown` for untyped external data — narrow before using.

```ts
// ✅
interface Props {
  data: ResumeData;
  onChange: (patch: Partial<ResumeData>) => void;
}

// ❌ — never
const handleData = (data: any) => { ... }
```

---

## File & Folder Naming

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase.tsx | `ExperienceSection.tsx` |
| Hooks | use-kebab-case.ts | `use-subscription.ts` |
| Utilities / services | kebab-case.ts | `parse-docx.ts` |
| Route files | kebab-case.tsx | `sign-in.tsx` |
| Types | kebab-case.ts | `subscription.ts` |
| Docs | kebab-case.md | `supabase.md` |

---

## React Components

### Structure (in order)
1. Imports
2. Types / interfaces
3. Constants (outside component if stable, inside if dynamic)
4. Component function
5. Helper sub-components (at the bottom of the same file if small, separate file if reused)

### Rules
- One component per file (exception: small, file-local helpers at bottom)
- No business logic inside components — delegate to hooks or services
- No `useEffect` for data fetching — use TanStack Query (`useQuery`)
- No inline `style={}` — use Tailwind classes via `cn()`
- Loading + error states required on every async component

```tsx
// ✅ Structure example
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface Props {
  resumeId: string;
}

export function ResumeCard({ resumeId }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['resume', resumeId],
    queryFn: () => fetchResume(resumeId),
  });

  if (isLoading) return <Skeleton />;
  if (error)     return <ErrorState message={error.message} />;
  if (!data)     return null;

  return <div className="...">{data.personal.fullName}</div>;
}
```

---

## Hooks

- Live in `src/hooks/` — reused across multiple components.
- One hook per file.
- Return objects (not arrays) unless the hook mirrors a tuple convention (e.g. `useState`).
- Always handle loading and error states.

```ts
// ✅
export function useSubscription() {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // ...
  return { isPro, isLoading };
}
```

---

## Services (`src/services/`)

Pure functions, no React. No side effects other than what the function name promises. No UI imports.

```ts
// src/services/scoring/scoreResume.ts
export function scoreResume(cvText: string, keywords: string[]): number {
  const matched = keywords.filter(kw =>
    cvText.toLowerCase().includes(kw.toLowerCase())
  );
  return Math.round((matched.length / keywords.length) * 100);
}
```

---

## Server Functions (TanStack Start)

See `docs/server-functions.md` for full patterns.

Quick rules:
- All in `src/routes/api/`
- Validate input with zod before anything else
- Auth check before subscription check before calling Claude
- Never return raw error messages to the client — log server-side, return safe message

```ts
// ✅ Shape every server function follows
export const myFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => MyZodSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Auth check
    // 2. Subscription check (if Pro feature)
    // 3. Business logic
    // 4. Return typed response
  });
```

---

## Supabase Queries

See `docs/supabase.md` for full schema and RLS.

- Always select only the columns you need — no `select('*')` in production queries.
- Always handle the `error` return — never ignore it silently.
- Use `upsert` with `onConflict` for idempotent webhook handlers.

```ts
// ✅
const { data, error } = await supabase
  .from('resumes')
  .select('id, data, template_id, updated_at')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

if (error) throw error;

// ❌
const { data } = await supabase.from('resumes').select('*'); // don't ignore error
```

---

## Tailwind

- Tailwind v4 — use `@theme inline` tokens from `src/styles.css` for brand colours.
- Available brand tokens: `--color-wine`, `--color-brass`, `--color-cream`, `--color-ink`
- `cn()` from `@/lib/utils` for conditional classes.
- Dark mode via `.dark` class — all shadcn components already handle it.

```tsx
// ✅
<div className={cn("rounded-lg border p-4", isActive && "border-primary bg-primary/5")}>

// ❌
<div style={{ backgroundColor: '#3a1119' }}>
```

---

## State Management

| Data | Where |
|---|---|
| Resume form data (anon user) | `useResumeStore` → localStorage |
| Resume form data (authed user) | `useResumeStore` → Supabase `resumes` table (Sprint 2) |
| Auth state | `useUser()` hook → Supabase auth session |
| Subscription tier | `useSubscription()` hook → Supabase `subscriptions` table |
| Server data (dashboard, scores) | TanStack Query (`useQuery`) |
| UI state (modals, tabs, step) | `useState` local to the component |

Do not put UI state in a global store. Do not put server data in `useState`.

---

## Error Handling

```tsx
// User-facing errors → toast
import { toast } from 'sonner';
toast.error('Something went wrong. Please try again.');

// Async component errors → error boundary or inline state
const { error } = useQuery(...);
if (error) return <p className="text-sm text-destructive">{error.message}</p>;

// Server function errors → log server-side, return safe message
try {
  // ...
} catch (err) {
  console.error('[ats-score]', err); // server log
  throw new Error('Scoring failed. Please try again.'); // safe client message
}
```

---

## Imports

Use the `@/` alias for all project imports — never relative paths that go more than one level up.

```ts
// ✅
import { ResumePDF } from '@/lib/pdf/ResumePDF';
import type { ResumeData } from '@/types/resume';

// ❌
import { ResumePDF } from '../../../lib/pdf/ResumePDF';
```

Order: external packages → internal `@/` imports → types.

---

## Comments

- File-level JSDoc comment on every non-trivial file explaining its purpose.
- Inline comments only for non-obvious logic — not for obvious code.
- `// TODO(sprint-N):` for planned work. Include the sprint number.

```ts
// TODO(sprint-4): Replace with Supabase keyword fetch once role_keywords table is seeded
const PLACEHOLDER_KEYWORDS = ['service', 'hospitality', ...];
```
