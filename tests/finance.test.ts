import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents,
  makeDemo,
  summarize,
  affordability,
  cycleDates,
  goalSaved,
  recordDemoTransaction,
  deleteDemoGoal,
  newestFirst,
  manilaDate,
} from '../packages/shared/src/index.ts';
test('money parsing is exact, positive, and limited to centavos', () => {
  assert.equal(toCents('1.01'), 101);
  assert.equal(toCents('0.29'), 29);
  for (const value of ['0', '-1', '1.001', 'NaN', '1e3', '1000001'])
    assert.throws(() => toCents(value));
});
test('reserved savings cannot be spent twice', () => {
  const d = makeDemo();
  const s = summarize(d);
  assert.equal(s.income, 200000);
  assert.equal(s.spent, 45000);
  assert.equal(s.reserved, 30000);
  assert.equal(s.available, 125000);
  assert.equal(s.safeDaily, Math.floor(125000 / s.daysLeft));
  assert.equal(affordability(d, 125001).status, 'over');
});
test('weekly plan caps daily spend even with a large cash balance', () => {
  const d = makeDemo();
  d.profile.weekly_budget_cents = 100000;
  const s = summarize(d);
  assert.equal(s.safePool, 25000);
  assert.equal(s.safeDaily, Math.floor(25000 / s.daysLeft));
});
test('a weekly reset never invents a new cash-in', () => {
  const d = makeDemo();
  d.transactions = d.transactions.map((t) => ({
    ...t,
    occurred_on: '2020-01-01',
  }));
  const s = summarize(d, '2026-09-28');
  assert.equal(s.available, 125000);
  assert.equal(s.weekSpent, 0);
  assert.equal(s.daysLeft, 7);
});
test('cycle dates are based on Philippine calendar days', () => {
  assert.deepEqual(cycleDates(1, '2026-09-27'), {
    start: '2026-09-21',
    daysLeft: 1,
  });
  assert.deepEqual(cycleDates(1, '2026-09-28'), {
    start: '2026-09-28',
    daysLeft: 7,
  });
});

test('demo withdrawal returns pondo without creating income; deletion returns the remainder once', () => {
  const initial = makeDemo();
  const goal = initial.goals[0];
  const d = recordDemoTransaction(initial, {
    id: 'withdrawal',
    kind: 'withdrawal',
    amount_cents: 20000,
    goal_id: goal.id,
    category: 'other',
    channel: 'Cash',
    description: 'Taken out',
    occurred_on: manilaDate(),
  });
  assert.equal(goalSaved(goal, d.transactions), 10000);
  assert.equal(summarize(d).available, 145000);
  assert.equal(summarize(d).income, 200000);
  assert.throws(
    () => recordDemoTransaction(d, { ...d.transactions[0], id: 'too-much', amount_cents: 10001 }),
    /Not enough savings/,
  );
  const deleted = deleteDemoGoal(d, goal.id, 'refund');
  assert.equal(summarize(deleted).available, 155000);
  assert.equal(summarize(deleted).reserved, 0);
  assert.ok(deleted.goals[0].deleted_at);
  assert.equal(deleted.transactions.length, initial.transactions.length + 2);
  assert.deepEqual(deleteDemoGoal(deleted, goal.id, 'retry'), deleted);
  assert.throws(
    () =>
      recordDemoTransaction(deleted, { ...d.transactions[0], id: 'after-delete', amount_cents: 1 }),
    /deleted/,
  );
});
test('withdrawals of old savings do not inflate the current weekly budget', () => {
  const d = makeDemo();
  d.transactions.forEach((t) => {
    t.occurred_on = '2020-01-01';
  });
  const next = recordDemoTransaction(d, {
    id: 'old-withdrawal',
    kind: 'withdrawal',
    amount_cents: 30000,
    goal_id: d.goals[0].id,
    category: 'other',
    channel: 'Cash',
    description: 'Returned',
    occurred_on: manilaDate(),
  });
  assert.equal(summarize(next).budgetRemaining, d.profile.weekly_budget_cents);
});
test('history orders by transaction date, then actual timestamp across timezones', () => {
  const base = makeDemo().transactions[0];
  const rows = [
    { ...base, id: 'older', occurred_on: '2026-10-07', created_at: '2026-10-08T20:00:00Z' },
    { ...base, id: 'early', occurred_on: '2026-10-08', created_at: '2026-10-08T10:00:00+08:00' },
    { ...base, id: 'late', occurred_on: '2026-10-08', created_at: '2026-10-08T03:00:00Z' },
  ];
  assert.deepEqual(
    rows.sort(newestFirst).map((t) => t.id),
    ['late', 'early', 'older'],
  );
});
