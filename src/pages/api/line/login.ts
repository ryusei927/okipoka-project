import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const need = {
    LINE_LOGIN_CHANNEL_ID: process.env.LINE_LOGIN_CHANNEL_ID,
    LINE_LOGIN_CALLBACK_URL: process.env.LINE_LOGIN_CALLBACK_URL,
  };

  // デバッグ表示（値は伏せる）
  if (url.searchParams.get('debug') === '1') {
    return new Response(
      JSON.stringify({
        has: Object.fromEntries(Object.entries(need).map(([k, v]) => [k, !!v])),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 足りないものがあれば 500 を返す（LINE の 400 まで到達させない）
  const missing = Object.entries(need).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error('[line/login] missing env:', missing);
    return new Response(`[line/login] Missing env: ${missing.join(', ')}`, { status: 500 });
  }

  const cid = need.LINE_LOGIN_CHANNEL_ID!;
  const redirect = need.LINE_LOGIN_CALLBACK_URL!;
  const state = crypto.randomUUID();
  const scope = encodeURIComponent('openid profile');
  const authUrl =
    `https://access.line.me/oauth2/v2.1/authorize` +
    `?response_type=code&client_id=${cid}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&state=${state}&scope=${scope}`;

  return new Response(null, { status: 302, headers: { Location: authUrl } });
};