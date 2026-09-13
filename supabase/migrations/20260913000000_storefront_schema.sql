-- Nike Storefront schema, reconstructed from the application code (queries in
-- src/app/api/**, src/lib/category-shoes.ts, src/types/database.ts).
--
-- Constraints are deliberately minimal (keys, NOT NULL, foreign keys): the
-- business rules — stock never negative, one review per shopper, discount
-- limits — are enforced (or not) by the app, which is what the QA fleet tests.

create extension if not exists pgcrypto;

create table public.shoes (
  id            uuid primary key default gen_random_uuid(),
  shoe_name     text not null,
  display_image text,
  gender        text,                      -- 'men' | 'women' | null (unisex)
  age           text,                      -- 'adult' | 'kids'
  msrp          numeric(10, 2) not null,
  is_sport      boolean not null default false,
  is_classic    boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.stock (
  id                uuid primary key default gen_random_uuid(),
  shoe_id           uuid not null references public.shoes (id) on delete cascade,
  size              text not null,
  color             text not null,
  quantity          integer not null default 0,
  reserved_quantity integer not null default 0,
  sale_percent      numeric(5, 2) not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (shoe_id, size, color)
);

create table public.user_favorites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  shoe_id    uuid not null references public.shoes (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id         uuid primary key default gen_random_uuid(),
  shoe_id    uuid not null references public.shoes (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  text       text,
  rating     integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  shoe_id    uuid not null references public.shoes (id) on delete cascade,
  size       text not null,
  color      text not null,
  quantity   integer not null default 1,
  created_at timestamptz not null default now()
);

create table public.discount_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  type            text not null,           -- 'percent' | 'fixed' (cents)
  value           numeric(10, 2) not null,
  min_order_cents integer not null default 0,
  valid_from      timestamptz,
  valid_until     timestamptz,
  max_uses        integer,
  used_count      integer not null default 0,
  created_at      timestamptz not null default now()
);

create table public.orders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  discount_code         text,
  discount_amount_cents integer not null default 0,
  created_at            timestamptz not null default now()
);

create table public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  shoe_id    uuid not null references public.shoes (id),
  size       text not null,
  color      text not null,
  quantity   integer not null,
  unit_price numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index on public.stock (shoe_id);
create index on public.cart_items (user_id);
create index on public.user_favorites (user_id);
create index on public.reviews (shoe_id);
create index on public.orders (user_id);
create index on public.order_items (order_id);

-- Row level security. API routes call Supabase with the shopper's JWT and the
-- anon key, so these policies are what the app runs under.
alter table public.shoes          enable row level security;
alter table public.stock          enable row level security;
alter table public.user_favorites enable row level security;
alter table public.reviews        enable row level security;
alter table public.cart_items     enable row level security;
alter table public.discount_codes enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;

-- Catalog: public read.
create policy "shoes are public" on public.shoes for select to anon, authenticated using (true);
create policy "stock is public" on public.stock for select to anon, authenticated using (true);
create policy "reviews are public" on public.reviews for select to anon, authenticated using (true);
-- Validation reads codes with the anon key.
create policy "discount codes are readable" on public.discount_codes for select to anon, authenticated using (true);

-- The app updates stock reservations and discount usage as the shopper.
create policy "shoppers update stock" on public.stock for update to authenticated using (true) with check (true);
create policy "shoppers update discount usage" on public.discount_codes for update to authenticated using (true) with check (true);

-- Shopper-owned rows.
create policy "own cart" on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own favorites" on public.user_favorites for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own reviews" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "create own orders" on public.orders for insert to authenticated with check (user_id = auth.uid());
create policy "own order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "create own order items" on public.order_items for insert to authenticated
  with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
