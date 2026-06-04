-- 0014_waitlist.sql
-- Brand waitlist: segment newsletter signups by source and product interest.
-- Additive & idempotent. Reuses the existing public-insert RLS policy on
-- newsletter_subscribers (see 0005), so anonymous visitors can join the list.

alter table public.newsletter_subscribers
  add column if not exists source text not null default 'newsletter';

alter table public.newsletter_subscribers
  add column if not exists interests text[] not null default '{}'::text[];

-- Optional: a confirmation token for double opt-in (GDPR proof of consent).
-- Nullable: a single-opt-in row simply leaves it null until confirmation is wired.
alter table public.newsletter_subscribers
  add column if not exists confirmed_at timestamptz;

create index if not exists newsletter_subscribers_source_idx
  on public.newsletter_subscribers (source);

comment on column public.newsletter_subscribers.source is
  'Acquisition source, e.g. ''newsletter'' or ''waitlist''.';
comment on column public.newsletter_subscribers.interests is
  'Product keys the subscriber opted into (sacoche, lycra, capuche, cup, accessoires).';
