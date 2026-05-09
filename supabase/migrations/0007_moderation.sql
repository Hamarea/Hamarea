-- 0007_moderation.sql
-- Dedicated moderation surface for reviews:
--  - extra columns to track flagging + moderator decisions
--  - RPCs `moderate_review` and `flag_review` (security definer, role-checked)
--  - audit_logs entry for every moderation action

alter table public.reviews
  add column if not exists flagged_count int not null default 0,
  add column if not exists flag_reasons jsonb not null default '[]'::jsonb,
  add column if not exists moderator_id uuid references public.profiles(id) on delete set null,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderation_note text;

create index if not exists reviews_status_idx on public.reviews (status);
create index if not exists reviews_flagged_idx on public.reviews (flagged_count) where flagged_count > 0;
create index if not exists reviews_pending_created_idx on public.reviews (created_at desc) where status = 'pending';

-- ---------------------------------------------------------------------------
-- moderate_review(p_id, p_status, p_note)
--   Sets status + moderator metadata, writes an audit_logs entry.
--   Caller must be authenticated AND have role admin|staff (checked inside).
-- ---------------------------------------------------------------------------
create or replace function public.moderate_review(
  p_id uuid,
  p_status public.review_status,
  p_note text default null
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_role public.user_role;
  v_row public.reviews;
begin
  if v_actor is null then
    raise exception 'unauthenticated' using errcode = 'PT001';
  end if;

  select role into v_role from public.profiles where id = v_actor;
  if v_role is null or v_role not in ('admin','staff') then
    raise exception 'forbidden' using errcode = 'PT002';
  end if;

  update public.reviews
     set status = p_status,
         moderator_id = v_actor,
         moderated_at = now(),
         moderation_note = p_note
   where id = p_id
   returning * into v_row;

  if v_row.id is null then
    raise exception 'review_not_found' using errcode = 'PT003';
  end if;

  insert into public.audit_logs(actor_id, action, entity, entity_id, data)
  values (
    v_actor,
    'review.moderate',
    'reviews',
    v_row.id::text,
    jsonb_build_object(
      'status', p_status,
      'note', p_note,
      'rating', v_row.rating,
      'product_id', v_row.product_id
    )
  );

  return v_row;
end;
$$;

revoke all on function public.moderate_review(uuid, public.review_status, text) from public;
grant execute on function public.moderate_review(uuid, public.review_status, text) to authenticated;

-- ---------------------------------------------------------------------------
-- flag_review(p_id, p_reason)
--   Any authenticated user can flag a review once; we just append a record.
--   The dedup is a soft check (admin sees flag_reasons array).
-- ---------------------------------------------------------------------------
create or replace function public.flag_review(
  p_id uuid,
  p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'unauthenticated' using errcode = 'PT001';
  end if;

  update public.reviews
     set flagged_count = coalesce(flagged_count, 0) + 1,
         flag_reasons  = coalesce(flag_reasons, '[]'::jsonb) ||
                         jsonb_build_object(
                           'by', v_actor,
                           'reason', p_reason,
                           'at', now()
                         )
   where id = p_id;
end;
$$;

revoke all on function public.flag_review(uuid, text) from public;
grant execute on function public.flag_review(uuid, text) to authenticated;
