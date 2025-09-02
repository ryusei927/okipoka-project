import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function FollowButton({ tournamentId }:{tournamentId:string}) {
  const [uid,setUid]=useState<string|undefined>();
  const [loading,setLoading]=useState(true);
  const [following,setFollowing]=useState(false);

  useEffect(()=> onAuthStateChanged(auth, u=> setUid(u?.uid)),[]);
  useEffect(()=>{
    (async()=>{
      if(!uid) { setLoading(false); return; }
      const ref = doc(db,'users',uid,'follows',tournamentId);
      const snap = await getDoc(ref);
      setFollowing(snap.exists());
      setLoading(false);
    })();
  },[uid,tournamentId]);

  const toggle = async ()=>{
    if(!uid){ alert('フォローにはログインが必要です'); return; }
    const ref = doc(db,'users',uid,'follows',tournamentId);
    if(following){ await deleteDoc(ref); setFollowing(false); }
    else { await setDoc(ref,{createdAt: new Date()}); setFollowing(true); }
  };

  return (
    <button className="btn" onClick={toggle} disabled={loading}>
      {following ? '★ フォロー中' : '☆ フォロー'}
    </button>
  );
}