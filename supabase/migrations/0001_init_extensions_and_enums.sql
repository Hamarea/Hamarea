-- 0001_init_extensions_and_enums.sql
-- Extensions, enums, helpers
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enums
do $$ begin
  create type public.user_role as enum ('customer', 'staff', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending', 'paid', 'processing', 'shipped',
    'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'requires_action', 'pending', 'succeeded', 'failed', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.address_type as enum ('shipping', 'billing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coupon_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stock_movement_reason as enum (
    'sale', 'return', 'manual', 'reception', 'reservation_release', 'adjustment'
  );
exception when duplicate_object then null; end $$;
