import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { marked } from 'marked';

export default function StoreBlogList({storeId}:{storeId:string}){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{
    (async()=>{
      const q = query(collection(db,'posts'), where('storeId','==',storeId), where('published','==',true), orderBy('createdAt','desc'), limit(20));
      const snap = await getDocs(q);
      setItems(snap.docs.map(d=>({id:d.id, ...d.data()})));
    })();
  },[storeId]);

  return (
    <div className="grid">
      {items.map(p=>(
        <article key={p.id} className="card">
          {p.imageUrl && <img className="thumb" src={p.imageUrl} alt="" />}
          <div className="body">
            <div style={{fontWeight:700}}>{p.title}</div>
            <div className="muted" dangerouslySetInnerHTML={{__html: marked.parse((p.body || '').slice(0,140)+'…')}} />
          </div>
        </article>
      ))}
    </div>
  );
}