import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { manilaDate } from '@pondo/shared';

export interface Config {
  supabaseUrl?: string;
  supabaseKey?: string;
  origins?: string[];
  apkUrl?: string;
  trustProxy?: number;
}
const positive = z.number().int().min(1).max(100_000_000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    'Invalid calendar date',
  );
const profile = z.object({
  name: z.string().trim().min(1).max(100),
  role: z.enum(['student', 'parent']),
  school: z.string().trim().max(200).default(''),
});
const preferences = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    school: z.string().trim().max(200).optional(),
    weekly_budget_cents: positive.optional(),
    daily_essential_cents: z.number().int().min(0).max(100_000_000).optional(),
    cycle_start_day: z.number().int().min(0).max(6).optional(),
  })
  .strict();
export const transactionSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(['income', 'expense', 'savings', 'withdrawal']),
    amount_cents: positive,
    category: z.enum(['food', 'transport', 'school', 'load', 'bills', 'personal', 'fun', 'other']),
    channel: z.enum(['Cash', 'GCash', 'Maya', 'Bank', 'Other']),
    description: z.string().trim().min(1).max(240),
    occurred_on: date.refine((v) => v <= manilaDate(), 'Choose today or an earlier date'),
    goal_id: z.uuid().nullable().default(null),
  })
  .strict()
  .refine(
    (v) => ['savings', 'withdrawal'].includes(v.kind) === (v.goal_id !== null),
    'Savings transfers require a goal',
  );
const goalSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    target_cents: positive,
    target_date: date.refine((v) => v >= manilaDate(), 'Choose today or a future date'),
    icon: z
      .enum([
        'laptop-outline',
        'school-outline',
        'airplane-outline',
        'ticket-outline',
        'umbrella-outline',
        'flag-outline',
      ])
      .default('flag-outline'),
  })
  .strict();
const permissions = z
  .object({
    share_goals: z.boolean(),
  })
  .strict();
function unwrap<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) {
    const e = new Error(result.error.message);
    Object.assign(e, {
      status: ['P0001', '23514', '23505', '42501'].includes(result.error.code || '') ? 400 : 500,
    });
    throw e;
  }
  return result.data;
}
export function createApp(config: Config) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy !== undefined) app.set('trust proxy', config.trustProxy);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        cb(
          null,
          !origin ||
            (config.origins ?? ['http://localhost:8081', 'http://localhost:8082']).includes(origin),
        );
      },
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  );
  // Publish download availability without requiring an account. Never invent a file URL.
  const apkUrl = (() => {
    try {
      const url = new URL(config.apkUrl || '');
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch {
      return null;
    }
  })();
  app.get('/api/downloads/android', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ available: Boolean(apkUrl), url: apkUrl });
  });
  app.get('/api/downloads/android/file', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!apkUrl) {
      res.status(404).json({ error: 'The Android APK has not been published yet.' });
      return;
    }
    res.redirect(302, apkUrl);
  });
  app.get(['/health', '/api/health'], (_req, res) =>
    res.json({
      status: 'ok',
      service: 'pondo-api',
      supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseKey),
    }),
  );
  app.use('/api', async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!config.supabaseUrl || !config.supabaseKey) {
      res.status(503).json({
        error:
          'Supabase is not configured yet. Add the project URL and publishable key to apps/api/.env.',
      });
      return;
    }
    const match = req.headers.authorization?.match(/^Bearer (\S+)$/);
    if (!match) {
      res.status(401).json({ error: 'Sign in to continue.' });
      return;
    }
    const db = createClient(config.supabaseUrl, config.supabaseKey, {
      global: { headers: { Authorization: `Bearer ${match[1]}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await db.auth.getUser(match[1]);
    if (error || !data.user) {
      res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
      return;
    }
    res.locals.db = db;
    res.locals.user = data.user;
    next();
  });
  const ctx = (res: express.Response) => ({
    db: res.locals.db as SupabaseClient,
    user: res.locals.user as User,
  });
  app.post('/api/profile', async (req, res) => {
    const input = profile.parse(req.body);
    const { db, user } = ctx(res);
    const existing = unwrap(await db.from('profiles').select('*').eq('id', user.id).maybeSingle());
    if (existing) {
      res.json(existing);
      return;
    }
    res.status(201).json(
      unwrap(
        await db
          .from('profiles')
          .insert({ ...input, id: user.id })
          .select()
          .single(),
      ),
    );
  });
  app.patch('/api/profile', async (req, res) => {
    const { db, user } = ctx(res);
    res.json(
      unwrap(
        await db
          .from('profiles')
          .update(preferences.parse(req.body))
          .eq('id', user.id)
          .select()
          .single(),
      ),
    );
  });
  app.get('/api/data', async (_req, res) => {
    const { db, user } = ctx(res);
    const profile = unwrap(await db.from('profiles').select('*').eq('id', user.id).single());
    // Explicit pagination avoids silently truncating a financial ledger at the REST row limit.
    const transactions: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const rows =
        unwrap(
          await db
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('occurred_on', { ascending: false })
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(offset, offset + 499),
        ) ?? [];
      transactions.push(...rows);
      if (rows.length < 500) break;
    }
    const goals: unknown[] = [];
    for (let offset = 0; ; offset += 500) {
      const rows =
        unwrap(
          await db
            .from('goals')
            .select('*')
            .eq('user_id', user.id)
            .order('id')
            .range(offset, offset + 499),
        ) ?? [];
      goals.push(...rows);
      if (rows.length < 500) break;
    }
    const links = unwrap(
      await db
        .from('parent_links')
        .select('*')
        .or(`student_id.eq.${user.id},parent_id.eq.${user.id}`)
        .order('created_at'),
    );
    res.json({ profile, transactions, goals, links });
  });
  app.post('/api/transactions', async (req, res) => {
    const t = transactionSchema.parse(req.body);
    const { db } = ctx(res);
    const data = unwrap(
      await db.rpc('record_transaction', {
        p_id: t.id,
        p_kind: t.kind,
        p_amount: t.amount_cents,
        p_category: t.category,
        p_channel: t.channel,
        p_description: t.description,
        p_date: t.occurred_on,
        p_goal: t.goal_id,
      }),
    );
    res.status(201).json(data);
  });
  app.post('/api/goals', async (req, res) => {
    const input = goalSchema.parse(req.body);
    const { db, user } = ctx(res);
    res.status(201).json(
      unwrap(
        await db
          .from('goals')
          .insert({ ...input, user_id: user.id })
          .select()
          .single(),
      ),
    );
  });
  app.delete('/api/goals/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const { db } = ctx(res);
    res.json(unwrap(await db.rpc('delete_goal', { p_goal: id })));
  });
  const inviteLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  });
  app.post('/api/invitations', inviteLimit, async (_req, res) => {
    const { db, user } = ctx(res);
    const code = `PONDO-${randomBytes(8).toString('hex').toUpperCase()}`;
    const code_hash = createHash('sha256').update(code).digest('hex');
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    unwrap(await db.from('invitations').insert({ student_id: user.id, code_hash, expires_at }));
    res.status(201).json({ code, expires_at });
  });
  app.post('/api/invitations/accept', inviteLimit, async (req, res) => {
    const { code } = z
      .object({
        code: z
          .string()
          .trim()
          .toUpperCase()
          .regex(/^PONDO-[A-F0-9]{16}$/),
      })
      .parse(req.body);
    const { db } = ctx(res);
    res.json({
      id: unwrap(await db.rpc('accept_invitation', { p_code: code })),
    });
  });
  app.patch('/api/links/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const input = permissions.parse(req.body);
    const { db, user } = ctx(res);
    res.json(
      unwrap(
        await db
          .from('parent_links')
          .update(input)
          .eq('id', id)
          .eq('student_id', user.id)
          .select()
          .single(),
      ),
    );
  });
  app.delete('/api/links/:id', async (req, res) => {
    const id = z.uuid().parse(req.params.id);
    const { db } = ctx(res);
    unwrap(await db.from('parent_links').delete().eq('id', id));
    res.status(204).send();
  });
  app.get('/api/guardian', async (_req, res) => {
    const { db } = ctx(res);
    res.json(unwrap(await db.rpc('guardian_snapshots')));
  });
  app.use((_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
  app.use(
    (
      error: Error & { status?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.issues.map((i) => i.message).join(' ') });
        return;
      }
      const status = error.status ?? 500;
      if (status >= 500) console.error('[api]', error.message);
      res.status(status).json({
        error:
          status >= 500 ? 'The request could not be completed. Please try again.' : error.message,
      });
    },
  );
  return app;
}
