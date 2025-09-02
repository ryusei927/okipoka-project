import { useEffect, useState } from 'react';
import { auth, db, storage } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

export default function BlogEditor(){
  const [uid,setUid]=useState<string|undefined>();
  const [storeId,setStoreId]=useState('');
  const [title,setTitle]=useState('');
  const [body,setBody]=useState('');
  const [image,setImage]=useState<File|null>(null);
  const [submitting,setSubmitting]=useState(false);

  useEffect(()=> onAuthStateChanged(auth, async u=>{
    setUid(u?.uid);
    if(u){
      const us = await getDoc(doc(db,'users',u.uid));
      setStoreId((us.data()?.storeId as string) || '');
    }
  }),[]);

  const submit = async ()=>{
    if(!uid){ alert('ログインしてください'); return; }
    if(!storeId){ alert('このアカウントに storeId が割り当てられていません'); return; }
    setSubmitting(true);
    let imageUrl = '';
    if(image){
      const r = ref(storage, `posts/${Date.now()}_${image.name}`);
      await uploadBytes(r, image);
      imageUrl = await getDownloadURL(r);
    }
    await addDoc(collection(db,'posts'), {
      storeId, title, body, imageUrl, createdAt: serverTimestamp(), published: true
    });
    setTitle(''); setBody(''); setImage(null); setSubmitting(false);
    alert('投稿しました');
  }

  return (
    <div className="card" style={{padding:12}}>
      <h3>店舗ブログを投稿</h3>
      <label>タイトル<input value={title} onChange={e=>setTitle(e.target.value)} style={{width:'100%'}}/></label>
      <label>本文（Markdown可）<textarea value={body} onChange={e=>setBody(e.target.value)} rows={8} style={{width:'100%'}}/></label>
      <label>サムネ画像<input type="file" accept="image/*" onChange={e=>setImage(e.target.files?.[0]??null)}/></label>
      <button className="btn btn-accent" disabled={submitting} onClick={submit}>投稿する</button>
    </div>
  );
}