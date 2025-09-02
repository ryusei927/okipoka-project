import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

export default function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => onAuthStateChanged(auth, u => setUser(u)), []);

  const login = async () => {
    setErr(""); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (e: any) {
        if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/popup-closed-by-user') {
          await signInWithRedirect(auth, provider);
        } else {
          throw e;
        }
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.code ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <button className="btn" onClick={() => signOut(auth)}>
        {user.photoURL && <img src={user.photoURL} style={{width:20,height:20,borderRadius:999}}/>}
        {user.displayName ?? 'ログイン中'} / ログアウト
      </button>
    );
  }

  return (
    <div>
      <button className="btn btn-accent" disabled={loading} onClick={login}>
        {loading ? '処理中…' : 'Googleでログイン'}
      </button>
      {err && <div className="muted" style={{marginTop:6,color:'#f99'}}>エラー: {err}</div>}
    </div>
  );
}