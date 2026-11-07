alter table public.main_page_settings
add column if not exists meta_pixel_id text not null default '';
