import type { APIRoute } from 'astro';
import * as admin from 'firebase-admin';

function adminApp() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin;
}

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  if (!code) return new Response('Missing code', { status: 400 });

  // 1) token exchange
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINE_LOGIN_CALLBACK_URL!,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  }).then(r => r.json() as any);

  // 2) verify id_token
  const verify = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      id_token: tokenRes.id_token,
      client_id: process.env.LINE_LOGIN_CHANNEL_ID!,
    }),
  }).then(r => r.json() as any);

  const lineUid = verify.sub as string;
  const displayName = verify.name as string | undefined;
  const picture = verify.picture as string | undefined;

  // 3) issue Firebase Custom Token
  const app = adminApp();
  try {
    await app.auth().updateUser(lineUid, { displayName, photoURL: picture });
  } catch {
    await app.auth().createUser({ uid: lineUid, displayName, photoURL: picture });
  }
  const customToken = await app.auth().createCustomToken(lineUid, { provider: 'line' });

  // 4) redirect to client to signInWithCustomToken
  const redirectTo = `/line-signed?token=${encodeURIComponent(customToken)}`;
  return new Response(null, { status: 302, headers: { Location: redirectTo } });
};