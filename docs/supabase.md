# Supabase — Schema, RLS & Patterns
*Reference for Claude Code when building auth, data persistence, and scoring features.*

---

## Project Setup

```
VITE_SUPABASE_URL=https://xxxx.supabase.co          # public — safe in client
VITE_SUPABASE_ANON_KEY=eyJ...                         # public — safe in client
SUPABASE_SERVICE_ROLE_KEY=eyJ...                      # PRIVATE — server functions only
```

Create `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database'; // generated types (see below)

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
```

For server functions (service role):
```ts
// Inside a createServerFn handler only — never import this in client code
const supabaseAdmin = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

Generate TypeScript types after schema changes:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

---

## Schema

Run these in the Supabase SQL editor in order.

### 1. Profiles

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz default now() not null
);

-- Auto-create profile on user sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### 2. Resumes

```sql
create table resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  title       text not null default 'My CV',
  data        jsonb not null,           -- serialised ResumeData
  template_id text not null default 'classic',
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Auto-update updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger resumes_updated_at
  before update on resumes
  for each row execute procedure touch_updated_at();

create index resumes_user_id_idx on resumes(user_id);
```

### 3. Subscriptions

```sql
create table subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references profiles(id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  status                  text not null default 'inactive',
  -- status values: 'active' | 'inactive' | 'past_due' | 'canceled' | 'trialing'
  current_period_end      timestamptz,
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute procedure touch_updated_at();

create index subscriptions_user_id_idx on subscriptions(user_id);
create index subscriptions_stripe_customer_id_idx on subscriptions(stripe_customer_id);
```

### 4. ATS Role Keywords

```sql
create table role_keywords (
  id          uuid primary key default gen_random_uuid(),
  role_slug   text not null unique,   -- 'waiter', 'sommelier', 'bartender', etc.
  role_label  text not null,
  keywords    text[] not null,        -- flat keyword list for scoring
  sections    jsonb,
  -- sections format: { "required": ["..."], "preferred": ["..."], "nice_to_have": ["..."] }
  updated_at  timestamptz default now() not null
);

-- Seed data (run once — expand as needed)
insert into role_keywords (role_slug, role_label, keywords, sections) values
('waiter', 'Waiter / Waitstaff', array[
  'table service','fine dining','floor management','point of sale','upselling',
  'allergen awareness','food safety','menu knowledge','cash handling','covers',
  'front of house','service recovery','team briefing','reservation','mise en place',
  'tray service','wine service','order taking','customer relations','shift management'
], '{"required":["table service","covers","front of house","allergen awareness"],"preferred":["fine dining","wine service","upselling"],"nice_to_have":["floor management","mise en place"]}'),

('sommelier', 'Sommelier', array[
  'WSET','sommelier','cellar management','wine list','wine pairing','terroir',
  'tasting notes','bin management','wine service','decanting','glassware',
  'producer relations','beverage costing','inventory','natural wine','old world',
  'new world','spirits','cocktail','blind tasting','wine education'
], '{"required":["WSET","wine service","cellar management"],"preferred":["wine list","tasting notes","wine pairing"],"nice_to_have":["producer relations","blind tasting"]}'),

('bartender', 'Bartender / Mixologist', array[
  'cocktail','mixology','spirits','classic cocktails','flair bartending','bar management',
  'inventory control','bar menu','wine knowledge','beer','upselling','POS',
  'allergen awareness','hygiene','responsible service','cellar','keg management',
  'batch cocktails','house-made','fermentation','garnish','speed rail'
], '{"required":["cocktail","spirits","bar management"],"preferred":["mixology","classic cocktails","inventory control"],"nice_to_have":["flair bartending","fermentation"]}'),

('chef', 'Chef / Kitchen Staff', array[
  'mise en place','knife skills','food safety','HACCP','menu development','plating',
  'portion control','cost control','allergen awareness','pastry','butchery',
  'sous vide','brigade','tasting menu','à la carte','prep','line cook',
  'head chef','sous chef','chef de partie','commis','cold section','hot section'
], '{"required":["food safety","HACCP","allergen awareness","mise en place"],"preferred":["menu development","plating","cost control"],"nice_to_have":["sous vide","butchery"]}'),

('front-of-house', 'Front of House / Host', array[
  'reservation management','guest relations','OpenTable','Resy','host','reception',
  'floor plan','waitlist','table management','VIP service','complaint handling',
  'team coordination','upselling','covers','shift briefing','POS','allergens',
  'events coordination','telephone manner','CRM'
], '{"required":["reservation management","guest relations","covers"],"preferred":["OpenTable","Resy","floor plan"],"nice_to_have":["VIP service","events coordination"]}');
```

---

## Row Level Security (RLS)

Enable RLS on all tables. Users can only see their own rows.

```sql
-- Profiles
alter table profiles enable row level security;
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Resumes
alter table resumes enable row level security;
create policy "Users can manage own resumes"
  on resumes for all using (auth.uid() = user_id);

-- Subscriptions (read-only for users — writes only via service role in webhooks)
alter table subscriptions enable row level security;
create policy "Users can view own subscription"
  on subscriptions for select using (auth.uid() = user_id);

-- Role keywords — public read (no auth needed)
alter table role_keywords enable row level security;
create policy "Anyone can read role keywords"
  on role_keywords for select using (true);
```

---

## Auth Patterns

### Sign up (email + password)

```ts
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/dashboard`,
  },
});
if (error) throw error;
// Profile row created automatically via trigger
```

### Sign in

```ts
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw error;
```

### Google OAuth

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${window.location.origin}/dashboard` },
});
```

### Get current user (client)

```ts
const { data: { user } } = await supabase.auth.getUser();
// Returns null if not authenticated
```

### `useUser()` hook (create at `src/hooks/use-user.ts`)

```ts
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

---

## Resume CRUD

### Save (upsert on id)

```ts
const { error } = await supabase
  .from('resumes')
  .upsert({
    id: resumeId,        // provide if updating, omit to insert
    user_id: userId,
    title: data.personal.fullName || 'My CV',
    data: data,          // full ResumeData as jsonb
    template_id: data.templateId,
  }, { onConflict: 'id' });

if (error) throw error;
```

### List user's resumes

```ts
const { data, error } = await supabase
  .from('resumes')
  .select('id, title, template_id, updated_at')
  .eq('user_id', userId)
  .order('updated_at', { ascending: false });

if (error) throw error;
```

### Load single resume

```ts
const { data, error } = await supabase
  .from('resumes')
  .select('id, data, template_id')
  .eq('id', resumeId)
  .eq('user_id', userId)   // RLS double-check
  .single();

if (error) throw error;
// data.data is the ResumeData object
```

---

## Subscription Check

### `useSubscription()` hook

```ts
// src/hooks/use-subscription.ts
export function useSubscription() {
  const { user } = useUser();
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }

    supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        const active = data?.status === 'active' || data?.status === 'trialing';
        const notExpired = !data?.current_period_end ||
          new Date(data.current_period_end) > new Date();
        setIsPro(active && notExpired);
        setIsLoading(false);
      });
  }, [user]);

  return { isPro, isLoading };
}
```

### Server-side subscription check (in server functions)

```ts
// Always validate server-side for Pro features
const { data: sub } = await supabaseAdmin
  .from('subscriptions')
  .select('status, current_period_end')
  .eq('user_id', userId)
  .single();

const isPro = sub?.status === 'active' &&
  new Date(sub.current_period_end!) > new Date();

if (!isPro) {
  throw new Error('Pro subscription required');
}
```

---

## Stripe Webhook Handler (upsert pattern)

```ts
// In stripe-webhook server function
await supabaseAdmin
  .from('subscriptions')
  .upsert({
    user_id: userId,                         // from subscription.metadata.supabase_user_id
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
  }, { onConflict: 'stripe_subscription_id' }); // idempotent — safe to retry
```
