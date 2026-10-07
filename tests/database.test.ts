import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const student = '11111111-1111-4111-8111-111111111111',
  other = '22222222-2222-4222-8222-222222222222',
  parent = '33333333-3333-4333-8333-333333333333';
test('migration enforces ledger integrity, isolation, invitation ownership and permission revocation', async (t) => {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  const migrations = new URL('../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(migrations)).filter((n) => n.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(name, migrations), 'utf8'));
  }
  await db.query('insert into auth.users(id) values ($1),($2),($3)', [student, other, parent]);
  async function asUser(id: string) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('set role authenticated');
  }
  async function record(id: string, kind: string, cents: number, goal: string | null = null) {
    return db.query(
      `select public.record_transaction($1,$2,$3,'food','Cash','Test entry',(now() at time zone 'Asia/Manila')::date,$4) as result`,
      [id, kind, cents, goal],
    );
  }
  for (const [id, name, role] of [
    [student, 'Student', 'student'],
    [other, 'Other student', 'student'],
    [parent, 'Guardian', 'parent'],
  ]) {
    await asUser(id);
    await db.query('insert into public.profiles(id,name,role) values($1,$2,$3)', [id, name, role]);
  }
  await asUser(student);
  const goal = (
    await db.query<{ id: string }>(
      "insert into public.goals(name,target_cents,target_date) values('Laptop',50000,current_date+90) returning id",
    )
  ).rows[0].id;
  const income = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  await t.test(
    'only ledger function can insert money; idempotent retries cannot duplicate it',
    async () => {
      await record(income, 'income', 100000);
      await record(income, 'income', 100000);
      assert.equal((await db.query('select * from public.transactions')).rows.length, 1);
      await assert.rejects(record(income, 'income', 100001), /already used/);
      await assert.rejects(
        db.exec(
          `insert into public.transactions(user_id,kind,amount_cents,category,channel,description,occurred_on) values('${student}','income',99,'food','Cash','Bypass',current_date)`,
        ),
        /permission denied/,
      );
    },
  );
  await t.test('savings reserve balance and enforce target and ownership', async () => {
    await record('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'savings', 30000, goal);
    await assert.rejects(
      record('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'savings', 30000, goal),
      /remaining goal target/,
    );
    await assert.rejects(
      record('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'expense', 70001),
      /Not enough/,
    );
    await asUser(other);
    assert.equal((await db.query('select * from public.transactions')).rows.length, 0);
    assert.equal((await db.query('select * from public.goals')).rows.length, 0);
    await record('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'income', 100000);
    await assert.rejects(
      record('ffffffff-ffff-4fff-8fff-ffffffffffff', 'savings', 100, goal),
      /not found/,
    );
  });
  let link: string;
  await t.test('invitation can only be accepted by a parent, once', async () => {
    await asUser(student);
    await db.exec(
      "insert into public.invitations(code_hash) values(encode(sha256(convert_to('PONDO-0123456789ABCDEF','UTF8')),'hex'))",
    );
    await assert.rejects(
      db.exec("select public.accept_invitation('PONDO-0123456789ABCDEF')"),
      /Parent account/,
    );
    await asUser(parent);
    assert.equal((await db.query('select * from public.invitations')).rows.length, 0);
    await assert.rejects(db.exec("select public.accept_invitation('PONDO-WRONG')"), /invalid/);
    link = (
      await db.query<{ id: string }>(
        "select public.accept_invitation('PONDO-0123456789ABCDEF') as id",
      )
    ).rows[0].id;
    await assert.rejects(
      db.exec("select public.accept_invitation('PONDO-0123456789ABCDEF')"),
      /invalid/,
    );
  });
  await t.test('guardians see authorized aggregates but never raw private rows', async () => {
    const snapshot = (
      await db.query<{ result: any }>('select public.guardian_snapshots() as result')
    ).rows[0].result[0];
    assert.equal(snapshot.balance.available_cents, 70000);
    assert.equal(snapshot.goals[0].saved_cents, 30000);
    assert.equal('transactions' in snapshot, false);
    assert.equal((await db.query('select * from public.transactions')).rows.length, 0);
    assert.equal((await db.query('select * from public.goals')).rows.length, 0);
    await assert.rejects(
      record('abababab-abab-4bab-8bab-abababababab', 'income', 999),
      /Student account/,
    );
    // Parents have column grants but the student-only RLS policy prevents any row update.
    assert.equal(
      (await db.query('update public.parent_links set share_goals=false returning id')).rows.length,
      0,
    );
  });
  await t.test(
    'withdrawals and deletion return only saved funds and preserve activities',
    async () => {
      await asUser(other);
      await assert.rejects(
        record('12121212-1212-4212-8212-121212121212', 'withdrawal', 1, goal),
        /not found/,
      );
      await assert.rejects(db.query('select public.delete_goal($1)', [goal]), /not found/);
      await asUser(parent);
      await assert.rejects(db.query('select public.delete_goal($1)', [goal]), /Student account/);
      await asUser(student);
      const withdrawal = '13131313-1313-4313-8313-131313131313';
      await assert.rejects(record(withdrawal, 'withdrawal', 30001, goal), /Not enough savings/);
      await record(withdrawal, 'withdrawal', 20000, goal);
      await record(withdrawal, 'withdrawal', 20000, goal);
      await assert.rejects(record(withdrawal, 'withdrawal', 19999, goal), /already used/);
      await asUser(parent);
      let snap = (await db.query<{ result: any }>('select public.guardian_snapshots() as result'))
        .rows[0].result[0];
      assert.equal(snap.balance.available_cents, 90000);
      assert.equal(snap.goals[0].saved_cents, 10000);
      await asUser(student);
      // Refill to the target: the cap uses the net saved balance after withdrawal.
      await record('14141414-1414-4414-8414-141414141414', 'savings', 40000, goal);
      await assert.rejects(
        db.exec('update public.goals set deleted_at=now()'),
        /permission denied/,
      );
      await assert.rejects(
        db.exec('update public.parent_links set share_balance=false'),
        /permission denied/,
      );
      const result = (
        await db.query<{ result: any }>('select public.delete_goal($1) as result', [goal])
      ).rows[0].result;
      assert.equal(result.returned_cents, 50000);
      const before = (await db.query('select * from public.transactions')).rows.length;
      await db.query('select public.delete_goal($1)', [goal]);
      assert.equal((await db.query('select * from public.transactions')).rows.length, before);
      assert.equal(
        (await db.query('select * from public.goals where deleted_at is not null')).rows.length,
        1,
      );
      await assert.rejects(
        record('15151515-1515-4515-8515-151515151515', 'savings', 1, goal),
        /not found/,
      );
      await assert.rejects(
        record('16161616-1616-4616-8616-161616161616', 'withdrawal', 1, goal),
        /not found/,
      );
      // A late network retry of an earlier transfer cannot restore deleted savings.
      await record(withdrawal, 'withdrawal', 20000, goal);
      assert.equal((await db.query('select * from public.transactions')).rows.length, before);
      await asUser(parent);
      snap = (await db.query<{ result: any }>('select public.guardian_snapshots() as result'))
        .rows[0].result[0];
      assert.equal(snap.balance.available_cents, 100000);
      assert.deepEqual(snap.goals, []);
      await asUser(student);
      const empty = (
        await db.query<{ id: string }>(
          "insert into public.goals(name,target_cents,target_date) values('Empty',100,current_date) returning id",
        )
      ).rows[0].id;
      await db.query('select public.delete_goal($1)', [empty]);
      assert.equal((await db.query('select * from public.transactions')).rows.length, before);
    },
  );
  await t.test('privacy changes and unlinking revoke summary access', async () => {
    await asUser(student);
    await db.query('update public.parent_links set share_goals=false where id=$1', [link]);
    await assert.rejects(db.exec("update public.profiles set role='parent'"), /permission denied/);
    await asUser(parent);
    const snap = (await db.query<{ result: any }>('select public.guardian_snapshots() as result'))
      .rows[0].result[0];
    assert.equal(snap.goals, null);
    assert.ok(snap.balance);
    assert.ok(snap.categories);
    assert.ok(snap.health);
    await asUser(student);
    await db.query('delete from public.parent_links where id=$1', [link]);
    await asUser(parent);
    assert.deepEqual(
      (await db.query<{ result: any }>('select public.guardian_snapshots() as result')).rows[0]
        .result,
      [],
    );
  });
  await t.test('anonymous callers cannot access privileged functions', async () => {
    await db.exec('reset role;set role anon');
    await assert.rejects(db.exec('select public.guardian_snapshots()'), /permission denied/);
    await assert.rejects(db.exec('select * from public.transactions'), /permission denied/);
  });
  await db.close();
});
