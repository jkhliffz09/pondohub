begin;

-- Keep archived goals and immutable savings movements for a complete activity trail.
alter table public.goals add column deleted_at timestamptz;
-- Clients can create active goals but cannot forge archive state.
revoke insert on public.goals from authenticated;
grant insert(name, target_cents, target_date, icon, user_id) on public.goals to authenticated;
alter table public.transactions drop constraint transactions_kind_check;
alter table public.transactions add constraint transactions_kind_check check (kind in ('income','expense','savings','withdrawal'));
alter table public.transactions drop constraint transactions_check;
alter table public.transactions add constraint transactions_check check ((kind in ('savings','withdrawal')) = (goal_id is not null));

-- Only savings visibility remains configurable for a linked guardian.
update public.parent_links set share_balance=true, share_categories=true, share_health=true;
alter table public.parent_links add constraint required_guardian_summaries check (share_balance and share_categories and share_health);
revoke update(share_balance, share_categories, share_health) on public.parent_links from authenticated;

create or replace function private.record_transaction(p_id uuid, p_kind text, p_amount integer, p_category text, p_channel text, p_description text, p_date date, p_goal uuid default null)
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
 if p_kind not in ('income','expense','savings','withdrawal') or p_kind is null then raise exception 'Invalid transaction type'; end if;
 if (p_kind in ('savings','withdrawal')) <> (p_goal is not null) then raise exception 'Savings transfers require a goal'; end if;
 if p_kind = 'withdrawal' and p_date is distinct from (now() at time zone 'Asia/Manila')::date then raise exception 'Withdrawals must use today'; end if;
 if p_date is null or p_date > (now() at time zone 'Asia/Manila')::date then raise exception 'Future transactions are not supported'; end if;
 select coalesce(sum(case when kind in ('income','withdrawal') then amount_cents else -amount_cents end),0) into available from public.transactions where user_id = me;
 if p_kind in ('expense','savings') and p_amount > available then raise exception 'Not enough available pondo'; end if;
 if p_kind in ('savings','withdrawal') then
   select target_cents into target from public.goals where id = p_goal and user_id = me and deleted_at is null;
   if not found then raise exception 'Savings goal not found'; end if;
   select coalesce(sum(case when kind='savings' then amount_cents else -amount_cents end),0) into saved from public.transactions where goal_id = p_goal and user_id = me;
   if p_kind='withdrawal' and p_amount > saved then raise exception 'Not enough savings in this goal'; end if;
   if p_kind='savings' and saved + p_amount > target then raise exception 'Contribution exceeds the remaining goal target'; end if;
 end if;
 insert into public.transactions(id,user_id,kind,amount_cents,category,channel,description,occurred_on,goal_id)
 values(p_id,me,p_kind,p_amount,p_category,p_channel,p_description,p_date,p_goal) returning * into result;
 return to_jsonb(result);
end $$;

-- Archive and return funds atomically under the same account lock as all ledger writes.
create function private.delete_goal(p_goal uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); g public.goals; saved bigint;
begin
 if me is null then raise exception 'Authentication required'; end if;
 perform 1 from public.profiles where id=me and role='student' for update;
 if not found then raise exception 'Student account required'; end if;
 select * into g from public.goals where id=p_goal and user_id=me;
 if not found then raise exception 'Goal not found'; end if;
 if g.deleted_at is not null then return jsonb_build_object('id',g.id,'deleted_at',g.deleted_at,'already_deleted',true); end if;
 select coalesce(sum(case when kind='savings' then amount_cents else -amount_cents end),0) into saved from public.transactions where user_id=me and goal_id=g.id;
 if saved > 0 then
  insert into public.transactions(user_id,kind,amount_cents,category,channel,description,occurred_on,goal_id)
  values(me,'withdrawal',saved,'other','Cash','Returned savings: ' || g.name || ' (goal deleted)',(now() at time zone 'Asia/Manila')::date,g.id);
 end if;
 update public.goals set deleted_at=now() where id=g.id returning * into g;
 return jsonb_build_object('id',g.id,'deleted_at',g.deleted_at,'returned_cents',saved);
end $$;
revoke all on function private.delete_goal(uuid) from public, anon;
grant execute on function private.delete_goal(uuid) to authenticated;
create function public.delete_goal(p_goal uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.delete_goal(p_goal) $$;
revoke all on function public.delete_goal(uuid) from public, anon;
grant execute on function public.delete_goal(uuid) to authenticated;

create or replace function private.guardian_snapshots() returns jsonb language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); link public.parent_links; p public.profiles; today date := (now() at time zone 'Asia/Manila')::date; start_date date; days_left integer; available bigint; used_week bigint; daily bigint; cats jsonb; gs jsonb; result jsonb := '[]'::jsonb;
begin
 if me is null then raise exception 'Authentication required'; end if;
 for link in select * from public.parent_links where parent_id = me loop
  select * into p from public.profiles where id = link.student_id;
  start_date := today - ((extract(dow from today)::integer - p.cycle_start_day + 7) % 7);
  days_left := 7 - (today - start_date);
  select coalesce(sum(case when kind in ('income','withdrawal') then amount_cents else -amount_cents end),0) into available from public.transactions where user_id = p.id;
  select coalesce(sum(case when kind='expense' then amount_cents else 0 end),0) + greatest(0,coalesce(sum(case when kind='savings' then amount_cents when kind='withdrawal' then -amount_cents else 0 end),0)) into used_week from public.transactions where user_id=p.id and occurred_on >= start_date;
  daily := greatest(0, least(available, p.weekly_budget_cents - used_week)) / days_left;
  cats := null; gs := null;
  if link.share_categories then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into cats from (select category, sum(amount_cents) as cents from public.transactions where user_id=p.id and kind='expense' and occurred_on >= start_date group by category) x;
  end if;
  if link.share_goals then
   select coalesce(jsonb_agg(x),'[]'::jsonb) into gs from (select g.id, g.name, g.target_cents, g.target_date, g.icon, coalesce(sum(case when t.kind='savings' then t.amount_cents when t.kind='withdrawal' then -t.amount_cents else 0 end),0) as saved_cents from public.goals g left join public.transactions t on t.goal_id = g.id and t.user_id = p.id where g.user_id = p.id and g.deleted_at is null group by g.id) x;
  end if;
  result := result || jsonb_build_array(jsonb_build_object('link_id',link.id,'student_name',p.name,'school',p.school,
   'permissions',jsonb_build_object('share_balance',link.share_balance,'share_categories',link.share_categories,'share_goals',link.share_goals,'share_health',link.share_health),
   'balance',case when link.share_balance then jsonb_build_object('available_cents',available,'daily_cents',daily,'weekly_budget_cents',p.weekly_budget_cents,'days_left',days_left) else null end,
   'categories',cats,'goals',gs,'health',case when link.share_health then case when daily >= p.daily_essential_cents then 'comfortable' when daily > 0 then 'watchful' else 'tight' end else null end));
 end loop;
 return result;
end $$;

commit;
