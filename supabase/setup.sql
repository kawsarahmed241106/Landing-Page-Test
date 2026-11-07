-- Current storefront site setup.
-- Run in Supabase Dashboard > SQL Editor.
create table if not exists public.main_page_settings (
  id integer primary key check (id = 1),
  main_title text not null default 'Your Brand',
  brand_name text not null default 'Your Brand',
  logo_url text not null default '',
  benefit_natural text not null default 'Product Quality',
  benefit_payment text not null default 'Cash on Delivery',
  benefit_delivery text not null default 'Fast Delivery',
  primary_color text not null default '#119b5d',
  secondary_color text not null default '#172637',
  tertiary_color text not null default '#8190a1',
  layout_style text not null default 'classic',
  product_image_url text not null default '',
  product_title text not null default 'Primal Gold (প্রাইমাল গোল্ড) – সুখী দাম্পত্যের সুন্দর মুহূর্তগুলোকে আরো সুন্দর করুন',
  product_pricing jsonb not null default '{"mode":"single","single":{"price":950,"discountPrice":1200,"saved":250},"tiers":[{"size":450,"price":950,"discountPrice":1200,"saved":250},{"size":900,"price":1750,"discountPrice":2000,"saved":250}]}'::jsonb,
  delivery_charges jsonb not null default '[{"name":"Inside Dhaka","charge":60},{"name":"Sub Dhaka","charge":70},{"name":"Outside Dhaka","charge":100}]'::jsonb,
  delivery_message text not null default 'Thank you for your order. Your order number is {order_no}.',
  payment_required boolean not null default false,
  meta_pixel_id text not null default '',
  social_links jsonb not null default '{"facebook":"","instagram":"","linkedin":"","youtube":""}'::jsonb,
  footer_contact jsonb not null default '{"email":"corporate@falaqfood.com","number":"","whatsapp":""}'::jsonb,
  footer_description text not null default 'Quality products, carefully selected and delivered to your door.',
  footer_location text not null default E'Bosila Future Town,\nMohammadpur, Dhaka-1207',
  benefit_trusted text not null default 'Trusted by 10,000+ Customers',
  order_phone text not null default '09613-821489',
  updated_at timestamptz not null default now()
);

alter table public.main_page_settings
add column if not exists brand_name text not null default 'Your Brand';

alter table public.main_page_settings
add column if not exists logo_url text not null default '';

alter table public.main_page_settings
add column if not exists benefit_natural text not null default 'Product Quality',
add column if not exists benefit_payment text not null default 'Cash on Delivery',
add column if not exists benefit_delivery text not null default 'Fast Delivery',
add column if not exists primary_color text not null default '#119b5d',
add column if not exists secondary_color text not null default '#172637',
add column if not exists tertiary_color text not null default '#8190a1',
add column if not exists layout_style text not null default 'classic',
add column if not exists product_image_url text not null default '',
add column if not exists product_title text not null default 'Primal Gold (প্রাইমাল গোল্ড) – সুখী দাম্পত্যের সুন্দর মুহূর্তগুলোকে আরো সুন্দর করুন',
add column if not exists product_pricing jsonb not null default '{"mode":"single","single":{"price":950,"discountPrice":1200,"saved":250},"tiers":[{"size":450,"price":950,"discountPrice":1200,"saved":250},{"size":900,"price":1750,"discountPrice":2000,"saved":250}]}'::jsonb,
add column if not exists delivery_charges jsonb not null default '[{"name":"Inside Dhaka","charge":60},{"name":"Sub Dhaka","charge":70},{"name":"Outside Dhaka","charge":100}]'::jsonb,
add column if not exists delivery_message text not null default 'Thank you for your order. Your order number is {order_no}.',
add column if not exists payment_required boolean not null default false,
add column if not exists meta_pixel_id text not null default '',
add column if not exists social_links jsonb not null default '{"facebook":"","instagram":"","linkedin":"","youtube":""}'::jsonb,
add column if not exists footer_contact jsonb not null default '{"email":"corporate@falaqfood.com","number":"","whatsapp":""}'::jsonb,
add column if not exists footer_description text not null default 'Quality products, carefully selected and delivered to your door.',
add column if not exists footer_location text not null default E'Bosila Future Town,\nMohammadpur, Dhaka-1207',
add column if not exists benefit_trusted text not null default 'Trusted by 10,000+ Customers',
add column if not exists order_phone text not null default '09613-821489';

alter table public.main_page_settings
drop column if exists order_label;

alter table public.main_page_settings enable row level security;

drop policy if exists "Anyone can read main page title" on public.main_page_settings;

create policy "Anyone can read main page title" on public.main_page_settings for
select
  using (true);

-- Demo-only policy for the current client-side admin login.
-- It allows any visitor with the public publishable key to change this one title row.
-- Replace with authenticated Supabase user policies before production use.
drop policy if exists "Demo clients can update main page title" on public.main_page_settings;

create policy "Demo clients can update main page title" on public.main_page_settings
for update
  to anon,
  authenticated using (id = 1)
with
  check (id = 1);

drop policy if exists "Demo clients can insert main page title" on public.main_page_settings;

create policy "Demo clients can insert main page title" on public.main_page_settings for insert to anon,
authenticated
with
  check (id = 1);

grant
select
,
  insert,
update on public.main_page_settings to anon,
authenticated;

create table if not exists public.payment_settings (
  id integer primary key check (id = 1),
  uddoktapay_api_key text not null default '',
  uddoktapay_base_url text not null default 'https://smmcaptain.paymently.io/api',
  updated_at timestamptz not null default now()
);

alter table public.payment_settings
add column if not exists uddoktapay_base_url text not null default 'https://smmcaptain.paymently.io/api';

alter table public.payment_settings
alter column uddoktapay_base_url
set default 'https://smmcaptain.paymently.io/api';

update public.payment_settings
set
  uddoktapay_base_url = 'https://smmcaptain.paymently.io/api'
where
  uddoktapay_base_url = 'https://sandbox.uddoktapay.com';

alter table public.payment_settings enable row level security;

drop policy if exists "Authenticated admins manage payment settings" on public.payment_settings;

create policy "Authenticated admins manage payment settings" on public.payment_settings for all to authenticated using (auth.uid () is not null)
with
  check (auth.uid () is not null);

grant
select
,
  insert,
update on public.payment_settings to authenticated;

create table if not exists public.payment_intents (
  token uuid primary key,
  payload jsonb not null,
  status text not null default 'created' check (
    status in ('created', 'paid', 'cancelled', 'failed')
  ),
  invoice_id text unique,
  order_number text,
  created_at timestamptz not null default now()
);

alter table public.payment_intents enable row level security;

revoke all on public.payment_intents
from
  anon,
  authenticated;

create sequence if not exists public.order_number_seq start
with
  21195 increment by 1;

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  order_number text not null unique default nextval('public.order_number_seq'::regclass)::text,
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text not null default '',
  product_title text not null,
  size text not null default '',
  quantity integer not null check (quantity > 0),
  subtotal numeric(12, 2) not null,
  delivery_area text not null,
  delivery_charge numeric(12, 2) not null,
  total numeric(12, 2) not null,
  status text not null default 'Pending' check (
    status in ('Pending', 'Processing', 'Completed', 'Cancelled')
  ),
  created_at timestamptz not null default now()
);

alter table public.orders
add column if not exists status text not null default 'Pending';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_status_check' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_status_check check (status in ('Pending','Processing','Completed','Cancelled'));
  end if;
end $$;

alter table public.orders
alter column order_number
set default nextval('public.order_number_seq'::regclass)::text;

alter sequence public.order_number_seq owned by public.orders.order_number;

grant usage,
select
  on sequence public.order_number_seq to anon,
  authenticated;

alter table public.orders enable row level security;

drop policy if exists "Customers can submit orders" on public.orders;

create policy "Customers can submit orders" on public.orders for insert to anon,
authenticated
with
  check (
    length(customer_name) between 1 and 120
    and length(phone) between 5 and 32
    and length(address) between 1 and 500
    and quantity > 0
    and subtotal >= 0
    and delivery_charge >= 0
    and total >= 0
  );

drop policy if exists "Authenticated admins can view orders" on public.orders;

create policy "Authenticated admins can view orders" on public.orders for
select
  to authenticated using (auth.uid () is not null);

grant insert on public.orders to anon,
authenticated;

grant
select
  on public.orders to authenticated;

drop policy if exists "Authenticated admins can update order status" on public.orders;

create policy "Authenticated admins can update order status" on public.orders
for update
  to authenticated using (auth.uid () is not null)
with
  check (auth.uid () is not null);

grant
update (status) on public.orders to authenticated;

drop policy if exists "Authenticated admins can delete orders" on public.orders;

create policy "Authenticated admins can delete orders" on public.orders for delete to authenticated using (auth.uid () is not null);

grant delete on public.orders to authenticated;

create or replace function public.submit_customer_order (
  p_customer_name text,
  p_phone text,
  p_address text,
  p_notes text,
  p_product_title text,
  p_size text,
  p_quantity integer,
  p_subtotal numeric,
  p_delivery_area text,
  p_delivery_charge numeric,
  p_total numeric
) returns text language plpgsql security definer
set
  search_path = public as $$
declare generated_order_number text;
begin
  if length(trim(p_customer_name)) not between 1 and 120 or length(trim(p_phone)) not between 5 and 32
    or length(trim(p_address)) not between 1 and 500 or p_quantity < 1
    or p_subtotal < 0 or p_delivery_charge < 0 or p_total < 0 then
    raise exception 'Invalid order details';
  end if;
  insert into public.orders (customer_name, phone, address, notes, product_title, size, quantity, subtotal, delivery_area, delivery_charge, total)
  values (trim(p_customer_name), trim(p_phone), trim(p_address), coalesce(trim(p_notes), ''), trim(p_product_title), coalesce(trim(p_size), ''), p_quantity, p_subtotal, trim(p_delivery_area), p_delivery_charge, p_total)
  returning order_number into generated_order_number;
  return generated_order_number;
end;
$$;

revoke all on function public.submit_customer_order (
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  numeric,
  numeric
)
from
  public;

grant
execute on function public.submit_customer_order (
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  numeric,
  text,
  numeric,
  numeric
) to anon,
authenticated;

insert into
  public.main_page_settings (id, main_title, brand_name, logo_url)
values
  (1, 'Your Brand', 'Your Brand', '')
on conflict (id) do nothing;

-- Public logo bucket for the current client-side demo editor.
insert into
  storage.buckets (id, name, public)
values
  ('site-assets', 'site-assets', true)
on conflict (id) do update
set
  public = excluded.public;

drop policy if exists "Public can view site assets" on storage.objects;

create policy "Public can view site assets" on storage.objects for
select
  to anon,
  authenticated using (bucket_id = 'site-assets');

drop policy if exists "Demo clients can upload site logos" on storage.objects;

create policy "Demo clients can upload site logos" on storage.objects for insert to anon,
authenticated
with
  check (
    bucket_id = 'site-assets'
    and name like 'logos/%'
  );
