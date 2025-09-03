import type { APIRoute } from 'astro';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** Admin初期化（複数回呼ばれてもOK） */
function ensureAdmin() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID!;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL!;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY!;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing FIREBASE_ADMIN_* env');
    }
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // 必須ENVの存在チェック（ログイン用）
    const LINE_ID = process.env.LINE_LOGIN_CHANNEL_ID;
    const LINE_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const CALLBACK = process.env.LINE_LOGIN_CALLBACK_URL;
    if (!LINE_ID || !LINE_SECRET || !CALLBACK) {
      console.error('[callback] missing LINE env', { LINE_ID: !!LINE_ID, LINE_SECRET: !!LINE_SECRET, CALLBACK: !!CALLBACK });
      return new Response('[callback] missing LINE env', { status: 500 });
    }

    const code = url.searchParams.get('code');
    if (!code) return new Response('[callback] missing code', { status: 400 });

    // 1) 認可コード → アクセストークン/IDトークン
    let tokenRes: any;
    try {
      tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: CALLBACK,
          client_id: LINE_ID,
          client_secret: LINE_SECRET,
        }),
      }).then((r) => r.json());
    } catch (e) {
      console.error('[callback] token fetch error:', e);
      return new Response('[callback] token fetch error', { status: 500 });
    }

    if (!tokenRes || tokenRes.error) {
      console.error('[callback] token error:', tokenRes);
      return new Response(`[callback] token error: ${tokenRes?.error_description || tokenRes?.error || 'unknown'}`, { status: 500 });
    }
    if (!tokenRes.id_token) {
      console.error('[callback] no id_token:', tokenRes);
      return new Response('[callback] token ok but id_token missing', { status: 500 });
    }

    // 2) id_token 検証（sub=LINEのUIDなどが得られる）
    let verify: any;
    try {
      verify = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id_token: tokenRes.id_token,
          client_id: LINE_ID,
        }),
      }).then((r) => r.json());
    } catch (e) {
      console.error('[callback] verify fetch error:', e);
      return new Response('[callback] verify fetch error', { status: 500 });
    }
    if (!verify || verify.error) {
      console.error('[callback] verify error:', verify);
      return new Response(`[callback] verify error: ${verify?.error_description || verify?.error || 'unknown'}`, { status: 500 });
    }

    const lineUid = verify.sub as string; // 固有ID
    const displayName = verify.name as string | undefined;
    const picture = verify.picture as string | undefined;

    // 3) Firebase Admin: カスタムトークン発行
    try {
      ensureAdmin();
    } catch (e: any) {
      console.error('[callback] admin init error:', e);
      return new Response('[callback] admin init error (check FIREBASE_ADMIN_* and \\n in PRIVATE_KEY)', { status: 500 });
    }

    try {
      const auth = getAuth();
      // 既存ユーザー更新→なければ作成
      try {
        await auth.updateUser(lineUid, { displayName, photoURL: picture });
      } catch {
        await auth.createUser({ uid: lineUid, displayName, photoURL: picture });
      }
      const customToken = await auth.createCustomToken(lineUid, { provider: 'line' });

      // 4) フロントへリダイレクト（/line-signed でサインイン → / に戻す）
      const redirectTo = `/line-signed?token=${encodeURIComponent(customToken)}`;
      return new Response(null, { status: 302, headers: { Location: redirectTo } });
    } catch (e: any) {
      console.error('[callback] custom token error:', e);
      return new Response('[callback] custom token error', { status: 500 });
    }
  } catch (e: any) {
    console.error('[callback] unhandled error:', e);
    return new Response('[callback] unhandled error', { status: 500 });
  }
};