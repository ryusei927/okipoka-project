// src/lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Debug helper:
 *  - Logs the key parts of env so we can confirm .env.local is being read.
 *  - If required values are missing, we throw a clear error instead of failing later with "auth/invalid-api-key".
 *  - After確認できたら console.log は削除してOK。
 */
const envCfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 開発時のみ環境変数の読み取りを可視化
if (import.meta.env.DEV) {
  // apiKey は全体は表示しない（先頭/末尾のみ）
  const obfuscate = (v?: string) => (v ? `${v.slice(0,6)}…${v.slice(-6)}` : v);
  console.log('[firebase env check]', {
    apiKey: obfuscate(envCfg.apiKey),
    authDomain: envCfg.authDomain,
    projectId: envCfg.projectId,
    storageBucket: envCfg.storageBucket,
    messagingSenderId: envCfg.messagingSenderId,
    appId: envCfg.appId,
  });
}

// 必須値が欠けていたらわかりやすい警告を出す（UIを壊さない）
const missing = Object.entries(envCfg).filter(([, v]) => !v);
if (missing.length) {
  const names = missing.map(([k]) => k).join(', ');
  console.warn(
    `[firebase.ts] Missing Firebase env values: ${names}
- .env.local に VITE_FIREBASE_* が入っているか
- 変更後に "npm run dev" を再起動したか
- AUTH_DOMAIN は "<project-id>.firebaseapp.com" か
- storageBucket は "<project-id>.appspot.com" か
を確認してください。`
  );
  // NOTE:
  // 例外は投げずに続行します。実環境（Vercel）では値が入っていればこのブロックは通りません。
  // ローカルで不足している場合は、ログインなどの機能は動かない可能性がありますが、UIは壊しません。
}

const app = getApps().length ? getApps()[0] : initializeApp(envCfg);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);