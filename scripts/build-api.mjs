import { build } from 'esbuild';
await build({
  entryPoints: ['apps/api/src/vercel.ts'],
  outfile: 'apps/api/dist/vercel.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  logLevel: 'info',
});
