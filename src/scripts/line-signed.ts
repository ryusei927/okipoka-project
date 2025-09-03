import { auth } from '../lib/firebase';
import { signInWithCustomToken } from 'firebase/auth';

(async () => {
  try {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (!token) throw new Error('token missing');
    console.log('[line-signed] got token', token.slice(0, 10) + '...');

    await signInWithCustomToken(auth, token);
    console.log('[line-signed] signIn success');
    location.replace('/');
  } catch (e) {
    console.error('[line-signed] signIn error:', e);
    alert('LINEサインインに失敗しました。トップに戻ります。');
    location.replace('/');
  }
})();