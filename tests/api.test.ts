import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, transactionSchema } from '../apps/api/src/app.ts';
import { manilaDate } from '../packages/shared/src/index.ts';
test('API distinguishes missing configuration from missing authentication', async () => {
  for (const [config, status] of [
    [{}, 503],
    [
      {
        supabaseUrl: 'https://example.supabase.co',
        supabaseKey: 'public-test-key',
      },
      401,
    ],
  ] as const) {
    const server = createApp(config).listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address() as { port: number };
    try {
      const health = await fetch(`http://127.0.0.1:${address.port}/health`);
      assert.equal(health.status, 200);
      const response = await fetch(`http://127.0.0.1:${address.port}/api/data`);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok((await response.json()).error);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    }
  }
});
test('transaction input rejects owner injection, impossible dates, and fractional centavos', () => {
  const valid = {
    id: '11111111-1111-4111-8111-111111111111',
    kind: 'expense',
    amount_cents: 100,
    category: 'food',
    channel: 'Cash',
    description: 'Lunch',
    occurred_on: manilaDate(),
    goal_id: null,
  };
  assert.equal(transactionSchema.safeParse(valid).success, true);
  for (const change of [
    { user_id: 'victim' },
    { amount_cents: 1.5 },
    { amount_cents: -1 },
    { occurred_on: '2026-02-30' },
    { occurred_on: '2099-01-01' },
    { kind: 'savings' },
    { category: 'unknown' },
  ])
    assert.equal(transactionSchema.safeParse({ ...valid, ...change }).success, false);
});
