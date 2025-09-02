import { useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, query, where, orderBy, Timestamp, getDocs, doc, getDoc
} from "firebase/firestore";
import dayjs from "dayjs";

type T = {
  id:string; title:string; startAt:any; location?:string; buyIn?:number; img?:string; storeId?:string;
};

export default function FollowedTournaments(){
  const [uid, setUid] = useState<string|null>(null);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=> onAuthStateChanged(auth, u => setUid(u?.uid ?? null)), []);

  useEffect(()=>{
    if(!uid){ setLoading(false); return; }

    // users/{uid}/follows/* のIDを購読して、tournaments をまとめて取得
    const qf = query(collection(db,"users",uid,"follows"));
    const unsub = onSnapshot(qf, async (snap)=>{
      const ids = snap.docs.map(d=>d.id);
      if (!ids.length) { setItems([]); setLoading(false); return; }

      // tournaments where __name__ in [...]
      const chunks = (arr: string[], size: number): string[][] => arr.length ? [arr.slice(0, size), ...chunks(arr.slice(size), size)] : [];
      const parts = chunks(ids, 10);
      const now = Timestamp.fromDate(new Date());
      const rows:T[] = [];
      for(const p of parts){
        // FirestoreはドキュメントIDでの in クエリに orderBy を併用できないため、まとめて取ってから絞る
        const docs = await Promise.all(p.map(id=>getDoc(doc(db,"tournaments", id))));
        docs.forEach(d=>{
          if(d.exists()){
            const data = { id:d.id, ...(d.data() as any) } as T;
            // 未来のみ
            const ts = (data.startAt as any)?.toDate?.() ?? data.startAt;
            if (ts && new Date(ts).getTime() >= new Date().getTime()) rows.push(data);
          }
        });
      }
      rows.sort((a,b)=> {
        const ta = (a.startAt as any)?.toDate?.() ?? a.startAt;
        const tb = (b.startAt as any)?.toDate?.() ?? b.startAt;
        return new Date(ta).getTime() - new Date(tb).getTime();
      });
      setItems(rows);
      setLoading(false);
    });

    return ()=> unsub();
  },[uid]);

  if(!uid) return <div className="muted">ログインしてください。</div>;
  if(loading) return <div className="muted">読み込み中…</div>;
  if(!items.length) return <div className="muted">フォロー中の大会はありません。</div>;

  return (
    <div className="grid">
      {items.map(t=>(
        <a key={t.id} href={`/tournaments/${t.id}`} style={{textDecoration:"none", color:"inherit"}}>
          <article className="card">
            <img
              className="thumb"
              src={t.img || `https://picsum.photos/seed/${t.id}/800/450`}
              alt=""
            />
            <div className="body" style={{padding:"10px 12px"}}>
              <div style={{fontWeight:800}}>{t.title}</div>
              <div className="muted" style={{fontSize:13}}>
                {dayjs(t.startAt?.toDate?.() ?? t.startAt).format("M/D(ddd) HH:mm")} ・ {t.location ?? ""}
              </div>
            </div>
          </article>
        </a>
      ))}
    </div>
  );
}