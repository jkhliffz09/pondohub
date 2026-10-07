begin;
alter table public.parent_links add column shared_goal_ids uuid[] not null default '{}';
-- Preserve existing visibility, but never automatically share future goals.
update public.parent_links l set shared_goal_ids = array(select g.id from public.goals g where g.user_id=l.student_id and g.deleted_at is null) where l.share_goals;
grant update(shared_goal_ids) on public.parent_links to authenticated;
create function private.validate_shared_goals() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if exists (select 1 from unnest(new.shared_goal_ids) as picked(goal_id) where picked.goal_id is null or not exists (select 1 from public.goals g where g.id=picked.goal_id and g.user_id=new.student_id)) then
  raise exception 'Only your own goals can be shared';
 end if;
 return new;
end $$;
revoke all on function private.validate_shared_goals() from public, anon;
create trigger validate_shared_goals before update of shared_goal_ids on public.parent_links for each row execute function private.validate_shared_goals();
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
   select coalesce(jsonb_agg(x),'[]'::jsonb) into gs from (select g.id, g.name, g.target_cents, g.target_date, g.icon, coalesce(sum(case when t.kind='savings' then t.amount_cents when t.kind='withdrawal' then -t.amount_cents else 0 end),0) as saved_cents from public.goals g left join public.transactions t on t.goal_id = g.id and t.user_id = p.id where g.user_id = p.id and g.deleted_at is null and g.id = any(link.shared_goal_ids) group by g.id) x;
  end if;
  result := result || jsonb_build_array(jsonb_build_object('link_id',link.id,'student_name',p.name,'school',p.school,
   'permissions',jsonb_build_object('share_balance',link.share_balance,'share_categories',link.share_categories,'share_goals',link.share_goals,'share_health',link.share_health),
   'balance',case when link.share_balance then jsonb_build_object('available_cents',available,'daily_cents',daily,'weekly_budget_cents',p.weekly_budget_cents,'days_left',days_left) else null end,
   'categories',cats,'goals',gs,'health',case when link.share_health then case when daily >= p.daily_essential_cents then 'comfortable' when daily > 0 then 'watchful' else 'tight' end else null end));
 end loop;
 return result;
end $$;

commit;
