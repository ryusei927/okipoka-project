import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";

type Store = { id: string; name?: string; iconUrl?: string; area?: string };

export default function FollowedStores(){
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=> onAuthStateChanged(auth, u => setUid(u?.uid ?? null)), []);
  useEffect(()=>{
    (async()=>{
      if(!uid){ setLoading(false); return; }
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      const ids: string[] = (snap.exists() ? snap.data()?.followStores : []) || [];
      if (!ids.length) { setItems([]); setLoading(false); return; }

      // stores まとめて取得（in 句）
      const chunks = (arr: string[], size: number): string[][] => arr.length ? [arr.slice(0, size), ...chunks(arr.slice(size), size)] : [];
      const parts = chunks(ids, 10); // Firestore の in は最大10件
      const results: Store[] = [];
      for(const p of parts){
        const qs = await getDocs(query(collection(db,"stores"), where("__name__","in", p)));
        results.push(...qs.docs.map(d=>({id:d.id, ...(d.data() as any)})));
      }
      // ユーザーがフォローした並び順に整列
      const order: Record<string, number> = Object.fromEntries(ids.map((id, i)=>[id, i]));
      results.sort((a,b) => (order[a.id] ?? 999) - (order[b.id] ?? 999));
      setItems(results);
      setLoading(false);
    })();
  },[uid]);

  if(!uid) return <div className="muted">ログインしてください。</div>;
  if(loading) return <div className="muted">読み込み中…</div>;
  if(!items.length) return <div className="muted">フォロー中の店舗はありません。</div>;

  return (
    <div className="grid">
      {items.map(s=>(
        <a key={s.id} href={`/stores/${s.id}`} style={{textDecoration:"none", color:"inherit"}}>
          <article className="card" style={{display:"flex",alignItems:"center",gap:12,padding:12}}>
            {s.iconUrl ? (
              <img src={s.iconUrl} alt={s.name} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover"}}/>
            ) : (
              <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,.12)",display:"grid",placeItems:"center"}}>{(s.name||s.id).slice(0,2)}</div>
            )}
            <div>
              <div style={{fontWeight:700}}>{s.name ?? s.id}</div>
              <div className="muted" style={{fontSize:12}}>{s.area ?? ""}</div>
            </div>
          </article>
        </a>
      ))}
    </div>
  );
}