alter table public.main_page_settings
add column if not exists layout_style text not null default 'classic';
