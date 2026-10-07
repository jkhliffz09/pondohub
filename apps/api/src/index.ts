import 'dotenv/config';
import { createApp } from './app.ts';
const port = Number(process.env.PORT || 3001);
const app = createApp({
  apkUrl: process.env.ANDROID_APK_URL,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  origins: (process.env.CORS_ORIGINS || 'http://localhost:8081,http://localhost:8082').split(','),
});
app.listen(port, '0.0.0.0', () => console.log(`Pondo API listening on http://localhost:${port}`));
