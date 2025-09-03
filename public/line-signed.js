import { auth } from '/src/lib/firebase.ts';
import { signInWithCustomToken } from 'firebase/auth';

(async () => {
  try {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) throw new Error('token missing');
    console.log('[line-signed] got token', token.slice(0, 10) + '...');

    await signInWithCustomToken(auth, token);
    console.log('[line-signed] signIn success');
    window.location.href = '/'; // replace でもOK
  } catch (e) {
    console.error('[line-signed] signIn error:', e);
    alert('LINEサインインに失敗しました。トップに戻ります。');
    window.location.href = '/';
  }
})();