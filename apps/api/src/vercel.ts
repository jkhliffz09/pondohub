import { createApp } from './app.ts';

// Vercel invokes this handler; the local Express entry point still opens a port.
export default createApp({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  origins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  apkUrl: process.env.ANDROID_APK_URL,
  trustProxy: 1,
});
