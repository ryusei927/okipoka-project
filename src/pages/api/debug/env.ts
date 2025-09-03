// /src/pages/api/debug/env.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const keys = [
    'LINE_LOGIN_CHANNEL_ID',
    'LINE_LOGIN_CALLBACK_URL',
    'LINE_LOGIN_CHANNEL_SECRET',
    'LINE_CHANNEL_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET',
  ];
  const has = Object.fromEntries(keys.map(k => [k, !!process.env[k as keyof typeof process.env]]));
  return new Response(JSON.stringify({ has }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};