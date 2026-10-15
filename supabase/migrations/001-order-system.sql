-- Apply AFTER supabase/schema.sql. No existing products or media are deleted.
begin;
alter table public.options add column if not exists complexity_units integer not null default 1 check(complexity_units between 1 and 1000);
alter table public.products add column if not exists complexity_units integer not null default 1 check(complexity_units between 1 and 1000);
create table if not exists public.commerce_settings (
 id text primary key check(id='main'),
 schedule jsonb not null default '{"enabled":false,"daily_capacity":0,"notice_hours":0,"weekdays":[],"slots":[],"category_limits":{},"complexity_capacity":null}',
 pricing_enabled boolean not null default false,
 delivery_fee numeric(10,2) check(delivery_fee>=0),
 pix_key text not null default '',
 deposit_percent numeric(5,2) check(deposit_percent between 0 and 100),
 fillings_incompatible jsonb not null default '[]',
 pending_hold_hours integer not null default 24 check(pending_hold_hours between 1 and 168)
);
insert into public.commerce_settings(id) values('main') on conflict do nothing;
alter table public.commerce_settings enable row level security;
create policy "admins manage commerce" on public.commerce_settings for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.commerce_settings to authenticated;
create table public.schedule_dates (
 id uuid primary key default gen_random_uuid(), date date not null unique,
 blocked boolean not null default false, capacity integer check(capacity between 0 and 1000),
 slots jsonb, category_limits jsonb, complexity_capacity integer check(complexity_capacity between 1 and 10000),
 internal_notes text not null default ''
);
alter table public.schedule_dates enable row level security;
create policy "admins manage dates" on public.schedule_dates for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.schedule_dates to authenticated;
-- Keep legacy records, normalize their old status without deleting them.
alter table public.orders drop constraint if exists orders_status_check;
update public.orders set status='aguardando_aprovacao' where status='em conversa';
alter table public.orders add constraint orders_status_check check(status in ('recebido','aguardando_aprovacao','orcamento_enviado','aguardando_pagamento','confirmado','em_producao','pronto','saiu_entrega','concluido','cancelado'));
alter table public.orders alter column customer_name set default 'Solicitação pelo site';
alter table public.orders add column owner_id uuid references auth.users(id) on delete set null;
alter table public.orders add column request_id uuid;
alter table public.orders add column access_hash text;
alter table public.orders add column scheduled_date date;
alter table public.orders add column scheduled_time time;
alter table public.orders add column method text check(method in ('Retirada','Entrega'));
alter table public.orders add column categories jsonb not null default '{}';
alter table public.orders add column complexity_units integer not null default 1 check(complexity_units>0);
alter table public.orders add column estimated_total numeric(10,2) check(estimated_total>=0);
alter table public.orders add column final_total numeric(10,2) check(final_total>=0);
alter table public.orders add column deposit_due numeric(10,2) check(deposit_due>=0);
alter table public.orders add column paid_amount numeric(10,2) not null default 0 check(paid_amount>=0);
alter table public.orders add column payment_status text not null default 'pendente' check(payment_status in ('pendente','parcial','pago','reembolsado'));
alter table public.orders add column hold_expires_at timestamptz;
create unique index orders_idempotency on public.orders(owner_id,request_id) where request_id is not null;
create unique index orders_access_hash on public.orders(access_hash) where access_hash is not null;
create index orders_date on public.orders(scheduled_date);
create index orders_owner_date on public.orders(owner_id,created_at);
create policy "customer reads own orders" on public.orders for select to authenticated using(owner_id=auth.uid());

create function public.order_uses_capacity(p_status text,p_expiry timestamptz) returns boolean language sql stable set search_path=public as $$
 select p_status<>'cancelado' and (p_status in ('confirmado','em_producao','pronto','saiu_entrega','concluido') or p_expiry>now());
$$;
create function public.day_rules(p_date date) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare cfg jsonb; ex public.schedule_dates; result jsonb;begin
 select schedule into cfg from public.commerce_settings where id='main';
 select * into ex from public.schedule_dates where date=p_date;
 result:=coalesce(cfg,'{}'::jsonb);
 if ex.id is not null then
  result:=result||jsonb_build_object('blocked',ex.blocked);
  if ex.capacity is not null then result:=result||jsonb_build_object('daily_capacity',ex.capacity);end if;
  if ex.slots is not null then result:=result||jsonb_build_object('slots',ex.slots,'exception',true);end if;
  if ex.category_limits is not null then result:=result||jsonb_build_object('category_limits',ex.category_limits);end if;
  if ex.complexity_capacity is not null then result:=result||jsonb_build_object('complexity_capacity',ex.complexity_capacity);end if;
 end if;return result;
end $$;

create function public.availability_window(p_start date,p_days integer default 31) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare cfg jsonb; rules jsonb; d date; days jsonb:='[]'; times jsonb; slot jsonb; total integer;used integer;pending integer;confirmed integer;slotused integer; stamp timestamptz;begin
 if p_days<1 or p_days>62 or p_start<(now() at time zone 'America/Sao_Paulo')::date-31 or p_start>(now() at time zone 'America/Sao_Paulo')::date+730 then raise exception 'INVALID_WINDOW';end if;
 select schedule into cfg from public.commerce_settings where id='main';
 if not coalesce((cfg->>'enabled')::boolean,false) then return jsonb_build_object('enabled',false,'days','[]'::jsonb,'notice_hours',0);end if;
 for i in 0..p_days-1 loop
  d:=p_start+i;rules:=public.day_rules(d);total:=coalesce((rules->>'daily_capacity')::integer,0);times:='[]';
  select count(*),count(*) filter(where status not in ('confirmado','em_producao','pronto','saiu_entrega','concluido')),count(*) filter(where status in ('confirmado','em_producao','pronto','saiu_entrega','concluido')) into used,pending,confirmed from public.orders where scheduled_date=d and public.order_uses_capacity(status,hold_expires_at);
  if not coalesce((rules->>'blocked')::boolean,false) and used<total and (coalesce((rules->>'exception')::boolean,false) or rules->'weekdays' @> jsonb_build_array(extract(dow from d)::integer)) then
   for slot in select value from jsonb_array_elements(coalesce(rules->'slots','[]')) loop
    stamp:=(d::text||' '||(slot->>'time'))::timestamp at time zone 'America/Sao_Paulo';
    select count(*) into slotused from public.orders where scheduled_date=d and scheduled_time=(slot->>'time')::time and method=slot->>'method' and public.order_uses_capacity(status,hold_expires_at);
    if stamp>=now()+make_interval(hours=>coalesce((rules->>'notice_hours')::integer,0)) and slotused<coalesce((slot->>'capacity')::integer,0) then times:=times||jsonb_build_array(slot||jsonb_build_object('capacity',least(total-used,(slot->>'capacity')::integer-slotused)));end if;
   end loop;
  end if;
  days:=days||jsonb_build_array(jsonb_build_object('date',d,'available',jsonb_array_length(times)>0,'remaining',case when jsonb_array_length(times)>0 then greatest(total-used,0) else 0 end,'pending',pending,'confirmed',confirmed,'slots',times));
 end loop;return jsonb_build_object('enabled',true,'days',days,'notice_hours',coalesce((cfg->>'notice_hours')::integer,0));
end $$;

-- Also runs for admin updates; direct table writes cannot bypass capacity rules.
create function public.enforce_order_capacity() returns trigger language plpgsql security definer set search_path=public as $$
declare rules jsonb;slot jsonb;used integer;cat record;stamp timestamptz; totalunits integer;begin
 if NEW.status in ('orcamento_enviado','aguardando_pagamento') and NEW.final_total is null then raise exception 'INVALID_PAYMENT';end if;
 if NEW.paid_amount>coalesce(NEW.final_total,NEW.estimated_total,NEW.paid_amount) or NEW.deposit_due>coalesce(NEW.final_total,NEW.estimated_total,NEW.deposit_due) then raise exception 'INVALID_PAYMENT';end if;
 if NEW.payment_status='pago' and (NEW.final_total is null or NEW.paid_amount<>NEW.final_total) then raise exception 'INVALID_PAYMENT';end if;
 if NEW.payment_status='parcial' and (NEW.paid_amount<=0 or NEW.final_total is null or NEW.paid_amount>=NEW.final_total) then raise exception 'INVALID_PAYMENT';end if;
 if NEW.scheduled_date is null or not public.order_uses_capacity(NEW.status,NEW.hold_expires_at) then return NEW;end if;
 perform pg_advisory_xact_lock(71000,NEW.scheduled_date-'2000-01-01'::date);
 rules:=public.day_rules(NEW.scheduled_date);
 if not coalesce((rules->>'enabled')::boolean,false) or coalesce((rules->>'blocked')::boolean,false) or not (coalesce((rules->>'exception')::boolean,false) or rules->'weekdays' @> jsonb_build_array(extract(dow from NEW.scheduled_date)::integer)) then raise exception 'DATE_UNAVAILABLE';end if;
 select value into slot from jsonb_array_elements(coalesce(rules->'slots','[]')) where value->>'method'=NEW.method and (value->>'time')::time=NEW.scheduled_time;
 if slot is null then raise exception 'SLOT_UNAVAILABLE';end if;
 stamp:=(NEW.scheduled_date::text||' '||NEW.scheduled_time::text)::timestamp at time zone 'America/Sao_Paulo';
 if TG_OP='INSERT' or (TG_OP='UPDATE' and (NEW.scheduled_date,NEW.scheduled_time,NEW.method) is distinct from (OLD.scheduled_date,OLD.scheduled_time,OLD.method)) then
  if stamp<now()+make_interval(hours=>coalesce((rules->>'notice_hours')::integer,0)) then raise exception 'NOTICE_REQUIRED';end if;
 end if;
 select count(*) into used from public.orders where scheduled_date=NEW.scheduled_date and id<>NEW.id and public.order_uses_capacity(status,hold_expires_at);
 if used>=coalesce((rules->>'daily_capacity')::integer,0) then raise exception 'DATE_FULL';end if;
 select count(*) into used from public.orders where scheduled_date=NEW.scheduled_date and scheduled_time=NEW.scheduled_time and method=NEW.method and id<>NEW.id and public.order_uses_capacity(status,hold_expires_at);
 if used>=coalesce((slot->>'capacity')::integer,0) then raise exception 'SLOT_FULL';end if;
 for cat in select key,value from jsonb_each_text(NEW.categories) loop
  if rules->'category_limits' ? cat.key then
   select coalesce(sum((categories->>cat.key)::integer),0) into used from public.orders where scheduled_date=NEW.scheduled_date and id<>NEW.id and public.order_uses_capacity(status,hold_expires_at);
   if used+cat.value::integer>(rules->'category_limits'->>cat.key)::integer then raise exception 'CATEGORY_FULL';end if;
  end if;
 end loop;
 if rules->>'complexity_capacity' is not null then
  select coalesce(sum(complexity_units),0) into totalunits from public.orders where scheduled_date=NEW.scheduled_date and id<>NEW.id and public.order_uses_capacity(status,hold_expires_at);
  if totalunits+NEW.complexity_units>(rules->>'complexity_capacity')::integer then raise exception 'COMPLEXITY_FULL';end if;
 end if;return NEW;
end $$;
create trigger orders_capacity before insert or update on public.orders for each row execute function public.enforce_order_capacity();

create function public.quote_order(p_input jsonb) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare cfg public.commerce_settings; kind text; item jsonb;opt public.options;prod public.products;required_kind text;allpriced boolean:=true;amount numeric:=0;lines jsonb:='[]';cats jsonb:='{}';units integer:=1;seen text[]:='{}';idtext text;pair jsonb; maxfill integer; selected jsonb;begin
 if pg_column_size(p_input)>20000 then raise exception 'INVALID_INPUT';end if;
 select * into cfg from public.commerce_settings where id='main';kind:=p_input->>'kind';
 if p_input->>'method' is null or p_input->>'method' not in ('Retirada','Entrega') then raise exception 'INVALID_METHOD';end if;
 if p_input->>'method'='Entrega' and not coalesce((select delivery from public.settings where id='main'),false) then raise exception 'DELIVERY_UNAVAILABLE';end if;
 if kind='cake' then
  selected:=coalesce(p_input->'selection','{}');
  select coalesce(max_fillings,1) into maxfill from public.settings where id='main';maxfill:=coalesce(maxfill,1);
  if jsonb_typeof(coalesce(selected->'fillings','[]'))<>'array' or jsonb_typeof(coalesce(selected->'extras','[]'))<>'array' or jsonb_array_length(coalesce(selected->'fillings','[]'))>maxfill or jsonb_array_length(coalesce(selected->'extras','[]'))>30 then raise exception 'INVALID_COMBINATION';end if;
  for pair in select value from jsonb_array_elements(cfg.fillings_incompatible) loop
   if jsonb_array_length(pair)>0 and coalesce(selected->'fillings','[]') @> pair then raise exception 'INVALID_COMBINATION';end if;
  end loop;
  if not cfg.pricing_enabled then allpriced:=false;end if;
  for required_kind,idtext in select * from (values ('size',selected->>'size'),('batter',selected->>'batter'),('decoration',selected->>'decoration')) t(k,id)
    union all select 'filling',value from jsonb_array_elements_text(coalesce(selected->'fillings','[]'))
    union all select 'extra',value from jsonb_array_elements_text(coalesce(selected->'extras','[]')) loop
   if coalesce(idtext,'')='' then allpriced:=false;continue;end if;
   if idtext=any(seen) then raise exception 'INVALID_COMBINATION';end if;seen:=array_append(seen,idtext);
   select * into opt from public.options where id=idtext::uuid and active and kind=required_kind;
   if opt.id is null then raise exception 'OPTION_UNAVAILABLE';end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('label',opt.label,'amount',opt.price));
   if opt.price is null then allpriced:=false;else amount:=amount+opt.price;end if;
   if required_kind='size' then units:=opt.complexity_units;end if;
  end loop;
  if jsonb_array_length(coalesce(selected->'fillings','[]'))=0 then allpriced:=false;end if;
  cats:=jsonb_build_object('Bolos personalizados',1);
 elsif kind='cart' then
  if jsonb_typeof(p_input->'items')<>'array' or jsonb_array_length(p_input->'items') not between 1 and 30 then raise exception 'INVALID_ITEMS';end if;units:=0;
  for item in select value from jsonb_array_elements(p_input->'items') loop
   if (item->>'quantity')::numeric<>trunc((item->>'quantity')::numeric) or (item->>'quantity')::integer not between 1 and 99 then raise exception 'INVALID_QUANTITY';end if;
   idtext:=item->>'id';if idtext=any(seen) then raise exception 'INVALID_ITEMS';end if;seen:=array_append(seen,idtext);
   select * into prod from public.products where id=idtext::uuid and active;
   if prod.id is null then raise exception 'PRODUCT_UNAVAILABLE';end if;
   lines:=lines||jsonb_build_array(jsonb_build_object('label',(item->>'quantity')||' × '||prod.name,'amount',prod.price*(item->>'quantity')::integer));
   if prod.price is null then allpriced:=false;else amount:=amount+prod.price*(item->>'quantity')::integer;end if;
   cats:=jsonb_set(cats,array[prod.category],to_jsonb(coalesce((cats->>prod.category)::integer,0)+(item->>'quantity')::integer));units:=units+prod.complexity_units*(item->>'quantity')::integer;
  end loop;
 else raise exception 'INVALID_KIND';end if;
 if p_input->>'method'='Entrega' then
  lines:=lines||jsonb_build_array(jsonb_build_object('label','Entrega','amount',cfg.delivery_fee));
  if cfg.delivery_fee is null then allpriced:=false;else amount:=amount+cfg.delivery_fee;end if;
 end if;
 return jsonb_build_object('total',case when allpriced then amount else null end,'lines',lines,'reason',case when allpriced then null else 'Preço sob consulta.' end,'categories',cats,'complexity_units',units);
end $$;

-- Anonymous Supabase Auth supplies a unique owner without collecting name/email/phone.
create function public.submit_order(p_input jsonb,p_request_id uuid,p_access_token text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); existing public.orders; q jsonb; rec public.orders; cfg public.commerce_settings; begin
 if uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_request_id is null or p_access_token is null or p_access_token !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,73000));
 select * into existing from public.orders where owner_id=uid and request_id=p_request_id;
 if existing.id is not null then return jsonb_build_object('id',existing.id,'estimated_total',existing.estimated_total,'status',existing.status,'reused',true);end if;
 if exists(select 1 from public.orders where owner_id=uid and created_at>now()-interval '30 seconds') or (select count(*) from public.orders where owner_id=uid and created_at>now()-interval '1 hour')>=3 then raise exception 'RATE_LIMIT';end if;
 if pg_column_size(p_input)>20000 or coalesce(p_input->>'honeypot','')<>'' or length(coalesce(p_input->'details'->>'notes',''))>1500 then raise exception 'INVALID_INPUT';end if;
 if p_input->'details' ?| array['name','phone','email','cpf'] then raise exception 'PERSONAL_DATA_NOT_ALLOWED';end if;
 if jsonb_typeof(coalesce(p_input->'details','{}'))<>'object' or exists(select 1 from jsonb_each(coalesce(p_input->'details','{}')) where key not in ('occasion','size_preference','batter_preference','style_preference','theme','colors','message','reference','notes','address') or jsonb_typeof(value)<>'string' or length(value#>>'{}')>case when key='notes' then 1500 else 400 end) then raise exception 'INVALID_INPUT';end if;
 if p_input->>'date' is null or p_input->>'time' is null then raise exception 'DATE_REQUIRED';end if;
 if p_input->>'method'='Entrega' and length(trim(coalesce(p_input->'details'->>'address','')))<8 then raise exception 'ADDRESS_REQUIRED';end if;
 q:=public.quote_order(p_input);select * into cfg from public.commerce_settings where id='main';
 insert into public.orders(owner_id,request_id,access_hash,details,scheduled_date,scheduled_time,method,categories,complexity_units,estimated_total,hold_expires_at)
 values(uid,p_request_id,encode(sha256(convert_to(p_access_token,'UTF8')),'hex'),jsonb_build_object('selection',p_input->'selection','items',p_input->'items','preferences',coalesce(p_input->'details','{}'),'quote_lines',q->'lines'),(p_input->>'date')::date,(p_input->>'time')::time,p_input->>'method',q->'categories',(q->>'complexity_units')::integer,(q->>'total')::numeric,now()+make_interval(hours=>cfg.pending_hold_hours)) returning * into rec;
 return jsonb_build_object('id',rec.id,'estimated_total',rec.estimated_total,'status',rec.status,'hold_expires_at',rec.hold_expires_at);
end $$;

create function public.lookup_order(p_token text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare rec public.orders;key text;begin
 if p_token is null or p_token !~ '^[a-f0-9]{64}$' then raise exception 'ORDER_NOT_FOUND';end if;
 select * into rec from public.orders where access_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if rec.id is null then raise exception 'ORDER_NOT_FOUND';end if;
 select pix_key into key from public.commerce_settings where id='main';
 return jsonb_build_object('id',rec.id,'created_at',rec.created_at,'status',rec.status,'details',rec.details,'scheduled_date',rec.scheduled_date,'scheduled_time',rec.scheduled_time,'method',rec.method,'estimated_total',rec.estimated_total,'final_total',rec.final_total,'deposit_due',rec.deposit_due,'paid_amount',rec.paid_amount,'payment_status',rec.payment_status,'hold_expires_at',rec.hold_expires_at,'pix_key',case when rec.status='aguardando_pagamento' and rec.final_total is not null then key else null end);
end $$;

-- Immutable financial/status audit; clients cannot write audit events.
create table public.order_events(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,created_at timestamptz not null default now(),actor_id uuid,changes jsonb not null);
alter table public.order_events enable row level security;
create policy "admins read audit" on public.order_events for select to authenticated using(public.is_admin());
grant select on public.order_events to authenticated;
create function public.audit_order_change() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if (NEW.status,NEW.final_total,NEW.deposit_due,NEW.paid_amount,NEW.payment_status,NEW.scheduled_date,NEW.scheduled_time,NEW.method) is distinct from (OLD.status,OLD.final_total,OLD.deposit_due,OLD.paid_amount,OLD.payment_status,OLD.scheduled_date,OLD.scheduled_time,OLD.method) then
 insert into public.order_events(order_id,actor_id,changes) values(NEW.id,auth.uid(),jsonb_build_object('status_before',OLD.status,'status_after',NEW.status,'paid_before',OLD.paid_amount,'paid_after',NEW.paid_amount,'final_before',OLD.final_total,'final_after',NEW.final_total,'payment_before',OLD.payment_status,'payment_after',NEW.payment_status,'date_before',OLD.scheduled_date,'date_after',NEW.scheduled_date,'time_before',OLD.scheduled_time,'time_after',NEW.scheduled_time,'method_before',OLD.method,'method_after',NEW.method));
 end if;return NEW;end $$;
create trigger order_audit after update on public.orders for each row execute function public.audit_order_change();
revoke all on function public.audit_order_change() from public;

-- Do not leave SECURITY DEFINER functions executable by PUBLIC.
revoke all on function public.order_uses_capacity(text,timestamptz),public.day_rules(date),public.availability_window(date,integer),public.enforce_order_capacity(),public.quote_order(jsonb),public.submit_order(jsonb,uuid,text),public.lookup_order(text) from public;
grant execute on function public.availability_window(date,integer),public.quote_order(jsonb),public.lookup_order(text) to anon,authenticated;
grant execute on function public.submit_order(jsonb,uuid,text) to authenticated;
grant execute on function public.order_uses_capacity(text,timestamptz) to authenticated;
commit;
