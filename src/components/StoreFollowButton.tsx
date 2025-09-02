import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function StoreFollowButton({ storeId }: { storeId: string }) {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u => setUid(u?.uid ?? null)), []);

  useEffect(() => {
    (async () => {
      if (!uid || !storeId) { setLoading(false); return; }
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      const fs: string[] = (snap.exists() ? snap.data()?.followStores : []) || [];
      setFollowing(fs.includes(storeId));
      setLoading(false);
    })();
  }, [uid, storeId]);

  const toggle = async () => {
    if (!uid) { alert("フォローにはログインが必要です"); return; }
    if (!storeId) return;
    setBusy(true);
    try {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) await setDoc(userRef, { followStores: [] }, { merge: true });

      if (following) {
        await updateDoc(userRef, { followStores: arrayRemove(storeId) });
        setFollowing(false);
      } else {
        await updateDoc(userRef, { followStores: arrayUnion(storeId) });
        setFollowing(true);
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <button className="btn" disabled>読み込み中…</button>;
  return (
    <button className={`btn ${following ? "" : "btn-accent"}`} onClick={toggle} disabled={busy}>
      {busy ? "処理中…" : following ? "★ フォロー中" : "☆ フォロー"}
    </button>
  );
}