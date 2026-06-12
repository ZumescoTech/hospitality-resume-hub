# Server Functions — TanStack Start on Cloudflare Workers
*Reference for Claude Code when writing any server-side logic.*

---

## What Is a Server Function

TanStack Start `createServerFn` compiles to a Cloudflare Worker endpoint. It runs in a V8 isolate — not Node.js. The function is callable from client components as a typed async function.

**Always** use server functions for:
- Calling Claude API (API key must never reach the browser)
- Calling Stripe API (secret key)
- Supabase admin operations (service role key)
- Stripe webhook handling

**Never** use server functions for:
- File parsing (mammoth, pdfjs-dist) — run client-side
- PDF generation (@react-pdf/renderer) — runs client-side

---

## Basic Pattern

```ts
// src/routes/api/my-function.ts
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const InputSchema = z.object({
  field: z.string().min(1),
});

export const myFunction = createServerFn({ method: 'POST' })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    // Server-only code here
    return { result: 'ok' };
  });

// Calling from client:
const result = await myFunction({ data: { field: 'hello' } });
```

---

## Auth Check Inside Server Functions

```ts
import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { getWebRequest } from '@tanstack/react-start/server';

async function getAuthUser() {
  const request = getWebRequest();
  const authHeader = request?.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!, // use anon key + token for user context
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user;
}

export const protectedFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => MySchema.parse(data))
  .handler(async ({ data }) => {
    const user = await getAuthUser();  // throws 401 if not authed
    // continue with user.id ...
  });
```

---

## Environment Variables in Workers

Workers use `process.env.*` (not `import.meta.env`) for private secrets:

```ts
process.env.SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY
process.env.ANTHROPIC_API_KEY
process.env.STRIPE_SECRET_KEY
process.env.STRIPE_WEBHOOK_SECRET
```

Add these to `wrangler.jsonc` under `[vars]` for local dev, and in the Cloudflare dashboard for production. **Never commit secrets to git.**

---

## Claude Haiku — ATS Scoring

```ts
// src/routes/api/ats-score.ts
import { createServerFn } from '@tanstack/react-start';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const InputSchema = z.object({
  cvText:    z.string().min(50).max(8000),
  roleSlug:  z.string(),
  keywords:  z.array(z.string()),
  baseScore: z.number().min(0).max(100),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const scoreCV = createServerFn({ method: 'POST' })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { cvText, roleSlug, keywords, baseScore } = data;

    const prompt = `You are an expert ATS recruiter specialising in hospitality roles.

Role: ${roleSlug}
Target keywords: ${keywords.join(', ')}
Keyword match score (pre-calculated): ${baseScore}/100

CV text:
---
${cvText}
---

Respond with a JSON object only — no markdown, no explanation:
{
  "score": <integer 0-100, refine the base score based on context and quality>,
  "missingKeywords": ["keyword1", "keyword2"],
  "formattingIssues": ["issue1", "issue2"],
  "improvements": ["specific actionable tip 1", "specific actionable tip 2", "specific actionable tip 3"]
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      return JSON.parse(text) as {
        score: number;
        missingKeywords: string[];
        formattingIssues: string[];
        improvements: string[];
      };
    } catch {
      throw new Error('Score parsing failed');
    }
  });
```

---

## Claude Haiku — AI Auto-Edit (Pro only)

```ts
// src/routes/api/ai-edit.ts
import { createServerFn } from '@tanstack/react-start';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const InputSchema = z.object({
  cvData:   z.object({}).passthrough(),  // ResumeData shape
  roleSlug: z.string(),
  keywords: z.array(z.string()),
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const aiEditCV = createServerFn({ method: 'POST' })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    // 1. Auth check
    const user = await getAuthUser();

    // 2. Subscription check — MUST be server-side
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .single();

    const isPro = sub?.status === 'active' &&
      new Date(sub.current_period_end!) > new Date();

    if (!isPro) throw new Error('Pro subscription required');

    // 3. Claude call
    const { cvData, roleSlug, keywords } = data;

    const prompt = `You are an expert CV writer specialising in hospitality roles.

Role target: ${roleSlug}
Keywords to weave in naturally: ${keywords.slice(0, 15).join(', ')}

Current CV data (JSON):
${JSON.stringify(cvData, null, 2)}

Rewrite ONLY the "summary" field and the "description" field of each experience entry.
- Preserve the candidate's original tone and voice — improve, do not replace.
- Use active language and quantify achievements where possible.
- Weave in relevant keywords naturally — do not keyword-stuff.
- Keep descriptions concise (3–5 lines max per role).

Return a JSON object with this exact shape:
{
  "summary": "improved summary text",
  "experience": [
    { "id": "original-id", "description": "improved description" }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return JSON.parse(text);
  });
```

---

## Claude Haiku — Cover Letter (Pro only)

```ts
// src/routes/api/cover-letter.ts
const InputSchema = z.object({
  cvData:      z.object({}).passthrough(),
  roleSlug:    z.string(),
  mode:        z.enum(['generic', 'job-specific']),
  jobAdText:   z.string().optional(), // required when mode === 'job-specific'
});

// Prompt for generic mode:
const genericPrompt = (cvData: unknown, roleSlug: string) => `
You are a professional cover letter writer specialising in hospitality.
Write a warm, confident, 3-paragraph cover letter for a ${roleSlug} role.
Use the candidate's CV data below to personalise it.
Tone: professional but human. First person. No clichés.

CV data: ${JSON.stringify(cvData)}

Return plain text only — no markdown, no subject line.
`;

// Prompt for job-specific mode:
const jobSpecificPrompt = (cvData: unknown, jobAd: string) => `
You are a professional cover letter writer specialising in hospitality.
Write a warm, confident, 3-paragraph cover letter tailored to the specific job ad below.
Use the candidate's CV data to personalise it. Mirror the language of the job ad naturally.
Tone: professional but human. First person. No clichés.

Job ad:
---
${jobAd}
---

CV data: ${JSON.stringify(cvData)}

Return plain text only — no markdown, no subject line.
`;
```

---

## Stripe Checkout Session

```ts
// src/routes/api/checkout.ts
import { createServerFn } from '@tanstack/react-start';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  // httpClient: Stripe.createFetchHttpClient(), // use if Workers fetch issues arise
});

const InputSchema = z.object({
  priceId:    z.string(),
  successUrl: z.string().url(),
  cancelUrl:  z.string().url(),
});

export const createCheckoutSession = createServerFn({ method: 'POST' })
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const user = await getAuthUser();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: data.priceId, quantity: 1 }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,  // critical — links Stripe to Supabase
        },
      },
    });

    return { url: session.url };
  });
```

---

## Stripe Webhook Handler

**Key difference from Node.js**: Use `constructEventAsync` (Web Crypto API) not `constructEvent`.

```ts
// src/routes/api/stripe-webhook.ts
import { createServerFn } from '@tanstack/react-start';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { getWebRequest } from '@tanstack/react-start/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// This is a GET/POST raw handler — not a typed server function
// In TanStack Start, use an API route handler:
export const stripeWebhookHandler = createServerFn({ method: 'POST' })
  .handler(async () => {
    const request = getWebRequest()!;
    const body = await request.text();
    const sig = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;
    try {
      // constructEventAsync = Web Crypto API version (works in Workers)
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.supabase_user_id;

      if (!userId) {
        console.error('Webhook: missing supabase_user_id in metadata');
        return { received: true };
      }

      // Upsert — idempotent, safe to retry
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: subscription.customer as string,
          stripe_subscription_id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
        }, { onConflict: 'stripe_subscription_id' });

      if (error) console.error('Webhook DB error:', error);
    }

    return { received: true };
  });
```

---

## Error Response Shape

Always return typed errors — never leak internal details:

```ts
// ✅ Safe server error
throw new Error('Scoring failed. Please try again.');

// ❌ Leaks internals
throw new Error(`Anthropic API key invalid: ${process.env.ANTHROPIC_API_KEY}`);
```

Client-side, catch server function errors with try/catch and show via `toast.error()`.
