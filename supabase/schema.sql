-- Execute uma vez no SQL Editor do seu projeto Supabase.
create table public.admins(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
create policy "admin reads own membership" on public.admins for select to authenticated using(user_id=auth.uid());
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admins where user_id=auth.uid()); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon,authenticated;
create table public.products(id uuid primary key default gen_random_uuid(),name text not null,description text not null default '',category text not null,price numeric(10,2) check(price>=0),image_url text,sizes text[] not null default '{}',flavors text[] not null default '{}',active boolean not null default true);
create table public.creations(id uuid primary key default gen_random_uuid(),title text not null,description text not null default '',video_url text,image_url text,active boolean not null default true,sort_order integer not null default 0);
create table public.options(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('size','batter','filling','decoration','extra')),label text not null,price numeric(10,2) check(price>=0),portions integer check(portions>0),active boolean not null default true);
create table public.settings(id text primary key check(id='main'),intro text not null default '',about text not null default '',delivery boolean not null default false,max_fillings integer not null default 1 check(max_fillings between 1 and 10),sections jsonb not null default '{}');
create table public.orders(id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),customer_name text not null,details jsonb not null,status text not null default 'recebido' check(status in ('recebido','em conversa','confirmado','concluido','cancelado')));
do $$ declare t text; begin foreach t in array array['products','creations','options','settings','orders'] loop execute format('alter table public.%I enable row level security',t);execute format('create policy "admin manages" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t);if t in ('products','creations','options') then execute format('create policy "public reads active" on public.%I for select to anon, authenticated using (active=true)',t);elsif t='settings' then execute 'create policy "public reads settings" on public.settings for select to anon, authenticated using (true)';end if;end loop;end $$;
grant select on public.products,public.creations,public.options,public.settings to anon;
grant select on public.admins to authenticated;
grant select,insert,update,delete on public.products,public.creations,public.options,public.settings,public.orders to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('media','media',true,104857600,array['image/jpeg','image/png','image/webp','video/mp4']);
create policy "admin uploads media" on storage.objects for insert to authenticated with check(bucket_id='media' and public.is_admin());
create policy "admin manages media" on storage.objects for all to authenticated using(bucket_id='media' and public.is_admin()) with check(bucket_id='media' and public.is_admin());
-- Referências de clientes ficam desativadas por padrão. Habilite apenas com
-- um endpoint protegido por validação, limites de requisições e política de retenção.
-- O site funciona com envio da referência diretamente no WhatsApp.
