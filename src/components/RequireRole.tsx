import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";

type AppRole = "user" | "store" | "admin" | null;
type UserProfile = { uid: string; role: AppRole; storeId?: string };

async function fetchProfile(): Promise<UserProfile | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDoc(doc(db, "users", u.uid));
  const data = snap.exists() ? snap.data() : {};
  return { uid: u.uid, role: (data.role as AppRole) ?? "user", storeId: data.storeId as string | undefined };
}

export default function RequireRole({
  allow, children, fallback
}: { allow: ("user"|"store"|"admin")[]; children: any; fallback?: any }) {
  const [p, setP] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setP(null); setReady(true); return; }
      setP(await fetchProfile()); setReady(true);
    });
    return () => unsub();
  }, []);

  if (!ready) return <div className="muted">読み込み中…</div>;
  if (!p) return fallback ?? <div className="muted">ログインしてください。</div>;
  if (!allow.includes(p.role ?? "user")) return <div className="muted">権限がありません。</div>;
  return children;
}