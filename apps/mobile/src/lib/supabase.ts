import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const storage = {
  async getItem(key: string) {
    if (Platform.OS === 'web')
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    const count = Number((await SecureStore.getItemAsync(`${key}.count`)) || 0);
    if (!count) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    return chunks.some((c) => c === null) ? null : chunks.join('');
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === 'web') {
      window.sessionStorage.setItem(key, value);
      return;
    }
    const oldCount = Number((await SecureStore.getItemAsync(`${key}.count`)) || 0);
    const chunks = value.match(/.{1,1800}/gs) || [];
    for (let i = 0; i < chunks.length; i++)
      await SecureStore.setItemAsync(`${key}.${i}`, chunks[i]);
    await SecureStore.setItemAsync(`${key}.count`, String(chunks.length));
    for (let i = chunks.length; i < oldCount; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
  async removeItem(key: string) {
    if (Platform.OS === 'web') {
      window.sessionStorage.removeItem(key);
      return;
    }
    const count = Number((await SecureStore.getItemAsync(`${key}.count`)) || 0);
    await SecureStore.deleteItemAsync(`${key}.count`);
    await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
    );
  },
};
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;
const configuredApi = (
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === 'web' && !__DEV__ ? '' : 'http://localhost:3001')
).replace(/\/$/, '');
const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0];
export const apiUrl =
  __DEV__ && Platform.OS !== 'web' && developmentHost
    ? configuredApi.replace('localhost', developmentHost).replace('127.0.0.1', developmentHost)
    : configuredApi;
export async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  if (!supabase)
    throw new Error(
      'Supabase connection details are still needed. You can explore the demo in the meantime.',
    );
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to continue.');
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error(
      'Could not reach Pondo Hub. Check your connection and API address, then try again.',
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
