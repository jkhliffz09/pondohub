-- Pondo Hub: amounts are integer centavos; guardian access exposes only opted-in summaries.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 100),
 role text not null check (role in ('student','parent')),
 school text not null default '' check (char_length(school) <= 200),
 weekly_budget_cents integer not null default 200000 check (weekly_budget_cents between 1 and 100000000),
 daily_essential_cents integer not null default 15000 check (daily_essential_cents between 0 and 100000000),
 cycle_start_day integer not null default 1 check (cycle_start_day between 0 and 6),
 created_at timestamptz not null default now()
);
create table public.goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
 name text not null check (char_length(name) between 1 and 100),
 target_cents integer not null check (target_cents between 1 and 100000000),
 target_date date not null,
 icon text not null default 'flag-outline' check (char_length(icon) <= 60),
 created_at timestamptz not null default now()
);
create index goals_user_id_idx on public.goals(user_id);
create table public.transactions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('income','expense','savings')),
 amount_cents integer not null check (amount_cents between 1 and 100000000),
 category text not null check (category in ('food','transport','school','load','bills','personal','fun','other')),
 channel text not null check (channel in ('Cash','GCash','Maya','Bank','Other')),
 description text not null check (char_length(description) between 1 and 240),
 occurred_on date not null,
 goal_id uuid references public.goals(id) on delete restrict,
 created_at timestamptz not null default now(),
 check ((kind = 'savings') = (goal_id is not null))
);
create index transactions_owner_date_idx on public.transactions(user_id, occurred_on desc);
create index transactions_goal_id_idx on public.transactions(goal_id) where goal_id is not null;
create table public.parent_links (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 parent_id uuid not null references public.profiles(id) on delete cascade,
 share_balance boolean not null default true,
 share_categories boolean not null default true,
 share_goals boolean not null default true,
 share_health boolean not null default true,
 created_at timestamptz not null default now(),
 unique(student_id, parent_id), check(student_id <> parent_id)
);
create index parent_links_parent_idx on public.parent_links(parent_id);
create table public.invitations (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
 code_hash text not null unique check (char_length(code_hash) = 64),
 expires_at timestamptz not null default now() + interval '24 hours',
 used_at timestamptz,
 created_at timestamptz not null default now(),
 check(expires_at <= created_at + interval '24 hours')
);
create index invitations_student_id_idx on public.invitations(student_id);

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.transactions enable row level security;
alter table public.parent_links enable row level security;
alter table public.invitations enable row level security;

create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_profile_insert on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy own_profile_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy own_goals_read on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy own_goals_insert on public.goals for insert to authenticated with check ((select auth.uid()) = user_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student'));
create policy own_transactions_read on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy linked_participants_read on public.parent_links for select to authenticated using ((select auth.uid()) in (student_id, parent_id));
create policy student_permissions_update on public.parent_links for update to authenticated using ((select auth.uid()) = student_id) with check ((select auth.uid()) = student_id);
create policy participants_unlink on public.parent_links for delete to authenticated using ((select auth.uid()) in (student_id, parent_id));
create policy own_invitations_read on public.invitations for select to authenticated using ((select auth.uid()) = student_id);
create policy own_invitations_insert on public.invitations for insert to authenticated with check ((select auth.uid()) = student_id and used_at is null and expires_at > now() and expires_at <= now() + interval '24 hours' and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student'));
create policy own_invitations_delete on public.invitations for delete to authenticated using ((select auth.uid()) = student_id);

-- Supabase projects may grant broad defaults: explicitly narrow every table.
revoke all on public.profiles, public.goals, public.transactions, public.parent_links, public.invitations from anon, authenticated;
grant select, insert on public.profiles to authenticated;
grant update(name, school, weekly_budget_cents, daily_essential_cents, cycle_start_day) on public.profiles to authenticated;
grant select, insert on public.goals to authenticated;
grant select on public.transactions to authenticated;
grant select, delete on public.parent_links to authenticated;
grant update(share_balance, share_categories, share_goals, share_health) on public.parent_links to authenticated;
grant select, insert, delete on public.invitations to authenticated;

-- A narrow privileged function is required to serialize ledger writes and prevent
-- direct inserts from bypassing balance and goal ownership checks.
create function private.record_transaction(p_id uuid, p_kind text, p_amount integer, p_category text, p_channel text, p_description text, p_date date, p_goal uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); available bigint; result public.transactions; existing public.transactions; target integer; saved bigint;
begin
 if me is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id = me and role = 'student' for update;
 if not found then raise exception 'Student account required'; end if;
 select * into existing from public.transactions where id = p_id;
 if found then
   if existing.user_id <> me or existing.kind <> p_kind or existing.amount_cents <> p_amount or existing.category <> p_category or existing.channel <> p_channel or existing.description <> p_description or existing.occurred_on <> p_date or existing.goal_id is distinct from p_goal then raise exception 'Transaction ID already used'; end if;
   return to_jsonb(existing);
 end if;
 if p_amount is null or p_amount < 1 or p_amount > 100000000 then raise exception 'Invalid amount'; end if;
 if p_date is null or p_date > (now() at time zone 'Asia/Manila')::date then raise exception 'Future transactions are not supported'; end if;
 select coalesce(sum(case when kind = 'income' then amount_cents else -amount_cents end),0) into available from public.transactions where user_id = me;
 if p_kind in ('expense','savings') and p_amount > available then raise exception 'Not enough available pondo'; end if;
 if p_kind = 'savings' then
   select target_cents into target from public.goals where id = p_goal and user_id = me;
   if not found then raise exception 'Savings goal not found'; end if;
   select coalesce(sum(amount_cents),0) into saved from public.transactions where goal_id = p_goal and user_id = me;
   if saved + p_amount > target then raise exception 'Contribution exceeds the remaining goal target'; end if;
 end if;
 insert into public.transactions(id,user_id,kind,amount_cents,category,channel,description,occurred_on,goal_id)
 values(p_id,me,p_kind,p_amount,p_category,p_channel,p_description,p_date,p_goal) returning * into result;
 return to_jsonb(result);
end $$;
revoke all on function private.record_transaction(uuid,text,integer,text,text,text,date,uuid) from public, anon;
grant execute on function private.record_transaction(uuid,text,integer,text,text,text,date,uuid) to authenticated;
create function public.record_transaction(p_id uuid, p_kind text, p_amount integer, p_category text, p_channel text, p_description text, p_date date, p_goal uuid default null)
returns jsonb language sql security invoker set search_path = '' as $$ select private.record_transaction(p_id,p_kind,p_amount,p_category,p_channel,p_description,p_date,p_goal) $$;
revoke all on function public.record_transaction(uuid,text,integer,text,text,text,date,uuid) from public, anon;
grant execute on function public.record_transaction(uuid,text,integer,text,text,text,date,uuid) to authenticated;

-- Redeem an expiring, one-time code without exposing invitation rows to guardians.
create function private.accept_invitation(p_code text) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); invite public.invitations; link_id uuid;
begin
 if me is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.profiles where id = me and role = 'parent') then raise exception 'Parent account required'; end if;
 select * into invite from public.invitations where code_hash = encode(sha256(convert_to(upper(trim(p_code)), 'UTF8')), 'hex') and used_at is null and expires_at > now() for update;
 if not found or invite.student_id = me then raise exception 'This code is invalid, expired, or already used'; end if;
 insert into public.parent_links(student_id,parent_id) values(invite.student_id,me)
 on conflict (student_id,parent_id) do update set parent_id = excluded.parent_id returning id into link_id;
 update public.invitations set used_at = now() where id = invite.id;
 return link_id;
end $$;
revoke all on function private.accept_invitation(text) from public, anon;
grant execute on function private.accept_invitation(text) to authenticated;
create function public.accept_invitation(p_code text) returns uuid language sql security invoker set search_path = '' as $$ select private.accept_invitation(p_code) $$;
revoke all on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- Raw student rows are never readable by parents. This function builds only the
-- currently authorized aggregates, so revocation takes effect on the next request.
create function private.guardian_snapshots() returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); link public.parent_links; p public.profiles; today date := (now() at time zone 'Asia/Manila')::date; start_date date; days_left integer; available bigint; used_week bigint; daily bigint; cats jsonb; gs jsonb; result jsonb := '[]'::jsonb;
begin
 if me is null then raise exception 'Authentication required'; end if;
 for link in select * from public.parent_links where parent_id = me loop
  select * into p from public.profiles where id = link.student_id;
  start_date := today - ((extract(dow from today)::integer - p.cycle_start_day + 7) % 7);
  days_left := 7 - (today - start_date);
  select coalesce(sum(case when kind = 'income' then amount_cents else -amount_cents end),0) into available from public.transactions where user_id = p.id;
  select coalesce(sum(amount_cents),0) into used_week from public.transactions where user_id = p.id and kind <> 'income' and occurred_on >= start_date;
  daily := greatest(0, least(available, p.weekly_budget_cents - used_week)) / days_left;
  cats := null; gs := null;
  if link.share_categories then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into cats from (select category, sum(amount_cents) as cents from public.transactions where user_id=p.id and kind='expense' and occurred_on >= start_date group by category) x;
  end if;
  if link.share_goals then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into gs from (select g.id, g.name, g.target_cents, g.target_date, g.icon, coalesce(sum(t.amount_cents),0) as saved_cents from public.goals g left join public.transactions t on t.goal_id = g.id and t.user_id = p.id where g.user_id = p.id group by g.id) x;
  end if;
  result := result || jsonb_build_array(jsonb_build_object('link_id',link.id,'student_name',p.name,'school',p.school,
   'permissions',jsonb_build_object('share_balance',link.share_balance,'share_categories',link.share_categories,'share_goals',link.share_goals,'share_health',link.share_health),
   'balance',case when link.share_balance then jsonb_build_object('available_cents',available,'daily_cents',daily,'weekly_budget_cents',p.weekly_budget_cents,'days_left',days_left) else null end,
   'categories',cats,'goals',gs,'health',case when link.share_health then case when daily >= p.daily_essential_cents then 'comfortable' when daily > 0 then 'watchful' else 'tight' end else null end));
 end loop;
 return result;
end $$;
revoke all on function private.guardian_snapshots() from public, anon;
grant execute on function private.guardian_snapshots() to authenticated;
create function public.guardian_snapshots() returns jsonb language sql security invoker set search_path = '' as $$ select private.guardian_snapshots() $$;
revoke all on function public.guardian_snapshots() from public, anon;
grant execute on function public.guardian_snapshots() to authenticated;
