// src/scripts/line-signed.ts
import { auth } from '../lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) throw new Error('token missing');

    await signInWithCustomToken(auth, token);
    window.location.replace('/');
  } catch (err: any) {
    const code = err?.code || 'unknown';
    const msg  = err?.message || JSON.stringify(err);
    console.error('[line-signed] error:', err);
    alert(`サインインに失敗しました\ncode: ${code}\nmessage: ${msg}`);
    window.location.replace('/');
  }
})();