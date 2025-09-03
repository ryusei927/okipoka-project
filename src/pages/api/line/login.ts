import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const cid = process.env.LINE_LOGIN_CHANNEL_ID!;
  const redirect = process.env.LINE_LOGIN_CALLBACK_URL!;
  const state = crypto.randomUUID();
  const scope = encodeURIComponent('openid profile');
  const url =
    `https://access.line.me/oauth2/v2.1/authorize` +
    `?response_type=code&client_id=${cid}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&state=${state}&scope=${scope}`;
  return new Response(null, { status: 302, headers: { Location: url } });
};