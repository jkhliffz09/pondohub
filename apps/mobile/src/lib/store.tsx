import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import {
  type AppData,
  type Goal,
  type Transaction,
  type Profile,
  type Permissions,
  type GuardianSnapshot,
  type Role,
  makeDemo,
  recordDemoTransaction,
  deleteDemoGoal,
  summarize,
  goalSaved,
  categoryTotals,
  defaultPermissions,
  manilaDate,
} from '@pondo/shared';
import { supabase, request } from './supabase';
import * as Crypto from 'expo-crypto';
export const newId = () => Crypto.randomUUID();
const DEMO_KEY = 'pondo-demo-v1';
type NewTransaction = Omit<Transaction, 'user_id' | 'created_at'>;
interface Store {
  data: AppData | null;
  demo: boolean;
  loading: boolean;
  error: string | null;
  guardian: GuardianSnapshot[];
  refresh: () => Promise<void>;
  enterDemo: (reset?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  changeDemoRole: () => void;
  addTransaction: (t: NewTransaction) => Promise<void>;
  addGoal: (g: Omit<Goal, 'id' | 'user_id'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
  updatePermissions: (id: string, p: Permissions) => Promise<void>;
  revokeLink: (id: string) => Promise<void>;
  createInvitation: () => Promise<{ code: string; expires_at: string }>;
  acceptInvitation: (code: string) => Promise<void>;
}
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null),
    [demo, setDemo] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [guardian, setGuardian] = useState<GuardianSnapshot[]>([]);
  const state = useRef(data);
  state.current = data;
  const demoRef = useRef(demo);
  demoRef.current = demo;
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (demoRef.current) return;
    const current = ++generation.current;
    setError(null);
    try {
      if (!supabase) return;
      const {
        data: { session: active },
      } = await supabase.auth.getSession();
      if (!active) return;
      await request('/profile', 'POST', {
        name: active.user.user_metadata.name || active.user.email?.split('@')[0] || 'Pondo member',
        role: active.user.user_metadata.role === 'parent' ? 'parent' : 'student',
        school: '',
      });
      const next = await request<AppData>('/data');
      const parents =
        next.profile.role === 'parent' ? await request<GuardianSnapshot[]>('/guardian') : [];
      if (current === generation.current) {
        setData(next);
        setGuardian(parents);
      }
    } catch (e) {
      if (current === generation.current) setError((e as Error).message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (!session) setLoading(false);
      })
      .catch(() => setLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next && !demoRef.current) {
        generation.current++;
        setData(null);
        setGuardian([]);
        setLoading(false);
      }
    });
    const lifecycle = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        supabase?.auth.startAutoRefresh();
        if (!demoRef.current) void refresh();
      } else supabase?.auth.stopAutoRefresh();
    });
    return () => {
      subscription.unsubscribe();
      lifecycle.remove();
    };
  }, [refresh]);
  useEffect(() => {
    if (session && !demo) void refresh();
  }, [session?.user.id, demo, refresh]);
  useEffect(() => {
    if (!demo || !data) return;
    void AsyncStorage.setItem(DEMO_KEY, JSON.stringify(data)).catch(() => {});
    const summary = summarize(data);
    const link = data.links[0];
    setGuardian(
      link
        ? [
            {
              link_id: link.id,
              student_name: 'Juan Dela Cruz',
              school: data.profile.school,
              permissions: link,
              balance: link.share_balance
                ? {
                    available_cents: summary.available,
                    daily_cents: summary.safeDaily,
                    weekly_budget_cents: data.profile.weekly_budget_cents,
                    days_left: summary.daysLeft,
                  }
                : null,
              categories: link.share_categories
                ? categoryTotals(
                    data.transactions.filter((t) => t.occurred_on >= summary.start),
                  ).map((c) => ({ category: c.id, cents: c.cents }))
                : null,
              goals: link.share_goals
                ? data.goals
                    .filter(
                      (g) =>
                        !g.deleted_at &&
                        (link.shared_goal_ids ?? data.goals.map((goal) => goal.id)).includes(g.id),
                    )
                    .map((g) => ({
                      ...g,
                      saved_cents: goalSaved(g, data.transactions),
                    }))
                : null,
              health: link.share_health ? (summary.health as GuardianSnapshot['health']) : null,
            },
          ]
        : [],
    );
  }, [data, demo]);
  async function enterDemo(reset = false) {
    generation.current++;
    setError(null);
    let next = makeDemo();
    next.links = [
      {
        id: 'demo-link',
        student_id: next.profile.id,
        parent_id: 'demo-parent',
        parent_name: 'Maria Dela Cruz',
        created_at: new Date().toISOString(),
        ...defaultPermissions,
      },
    ];
    try {
      const saved = reset ? null : await AsyncStorage.getItem(DEMO_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed.profile &&
          Array.isArray(parsed.transactions) &&
          Array.isArray(parsed.goals) &&
          Array.isArray(parsed.links)
        )
          next = parsed;
      }
    } catch {}
    next.links = next.links.map((l) => ({
      ...l,
      shared_goal_ids:
        l.shared_goal_ids ??
        (l.share_goals ? next.goals.filter((g) => !g.deleted_at).map((g) => g.id) : []),
      share_balance: true,
      share_categories: true,
      share_health: true,
    }));
    setDemo(true);
    setData(next);
    setLoading(false);
  }
  async function signOut() {
    generation.current++;
    if (!demo && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
    setDemo(false);
    demoRef.current = false;
    setData(null);
    setGuardian([]);
    setSession(null);
    setError(null);
  }
  async function addTransaction(t: NewTransaction) {
    if (demo) {
      const next = recordDemoTransaction(state.current!, t);
      state.current = next;
      setData(next);
    } else {
      await request('/transactions', 'POST', t);
      await refresh();
    }
  }
  async function deleteGoal(id: string) {
    if (demo) {
      const next = deleteDemoGoal(state.current!, id, newId());
      state.current = next;
      setData(next);
    } else {
      await request(`/goals/${id}`, 'DELETE');
      await refresh();
    }
  }
  async function addGoal(g: Omit<Goal, 'id' | 'user_id'>) {
    if (demo)
      setData((d) => ({
        ...d!,
        goals: [...d!.goals, { ...g, id: newId(), user_id: d!.profile.id }],
      }));
    else {
      await request('/goals', 'POST', g);
      await refresh();
    }
  }
  async function updateProfile(p: Partial<Profile>) {
    if (demo) setData((d) => ({ ...d!, profile: { ...d!.profile, ...p } }));
    else {
      await request('/profile', 'PATCH', p);
      await refresh();
    }
  }
  async function updatePermissions(id: string, p: Permissions) {
    if (demo)
      setData((d) => ({
        ...d!,
        links: d!.links.map((l) =>
          l.id === id
            ? {
                ...l,
                ...defaultPermissions,
                share_goals: p.share_goals,
                shared_goal_ids: p.shared_goal_ids,
              }
            : l,
        ),
      }));
    else {
      await request(`/links/${id}`, 'PATCH', {
        share_goals: p.share_goals,
        shared_goal_ids: p.shared_goal_ids,
      });
      await refresh();
    }
  }
  async function revokeLink(id: string) {
    if (demo) setData((d) => ({ ...d!, links: d!.links.filter((l) => l.id !== id) }));
    else {
      await request(`/links/${id}`, 'DELETE');
      await refresh();
    }
  }
  async function createInvitation() {
    if (demo)
      return {
        code: 'PONDO-DEMO-ONLY',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };
    return request<{ code: string; expires_at: string }>('/invitations', 'POST');
  }
  async function acceptInvitation(code: string) {
    if (demo) {
      if (code !== 'PONDO-DEMO-ONLY') throw new Error('Use PONDO-DEMO-ONLY in demo mode.');
      setData((d) => ({
        ...d!,
        links: [
          {
            id: 'demo-link',
            student_id: 'demo-student',
            parent_id: 'demo-parent',
            created_at: new Date().toISOString(),
            ...defaultPermissions,
            shared_goal_ids: [],
          },
        ],
      }));
    } else {
      await request('/invitations/accept', 'POST', { code });
      await refresh();
    }
  }
  function changeDemoRole() {
    setData((d) =>
      d
        ? {
            ...d,
            profile: {
              ...d.profile,
              role: d.profile.role === 'student' ? 'parent' : 'student',
            },
          }
        : d,
    );
  }
  return (
    <Context.Provider
      value={{
        data,
        demo,
        loading,
        error,
        guardian,
        refresh,
        enterDemo,
        signOut,
        changeDemoRole,
        addTransaction,
        addGoal,
        deleteGoal,
        updateProfile,
        updatePermissions,
        revokeLink,
        createInvitation,
        acceptInvitation,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('StoreProvider missing');
  return value;
}
