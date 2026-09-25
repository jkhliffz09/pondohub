import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents,
  makeDemo,
  summarize,
  affordability,
  cycleDates,
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
