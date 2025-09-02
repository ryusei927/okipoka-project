import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';

// 管理者が店舗を選択したときに、既定の開催場所を渡せる
export type TournamentFormProps = { storeIdOverride?: string; defaultLocation?: string };

export default function TournamentForm({ storeIdOverride, defaultLocation }: TournamentFormProps){
  const [uid, setUid] = useState<string|undefined>();
  const [storeId, setStoreId] = useState(storeIdOverride ?? '');

  // 基本
  const [title, setTitle] = useState('');
  const [start, setStart] = useState<string>(''); // "2025-09-01T19:00"
  const [location, setLocation] = useState(defaultLocation ?? '');
  const [img, setImg] = useState<string>('');
  const [status, setStatus] = useState<'published'|'draft'>('published');

  // 追加（任意）
  const [buyIn, setBuyIn] = useState<string>('');            // 参加費（円）
  const [reentryFee, setReentryFee] = useState<string>('');  // リエントリー料金（円）
  const [addon, setAddon] = useState<'なし'|'あり'>('なし');    // アドオン
  const [addonFee, setAddonFee] = useState<string>('');
  const [stack, setStack] = useState<string>('');            // スタック（枚）
  const [gameType, setGameType] = useState<'NLH'|'PLO'|'Mixed'|''>('');
  const [lateReg, setLateReg] = useState<string>('');        // レイトレジスト（例：Level 8 / 21:00 まで）
  const [prize, setPrize] = useState<string>('');            // プライズ自由入力

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string>('');

  // override が来ていれば優先（admin 代理登録）
  useEffect(() => { setStoreId(storeIdOverride ?? storeId); }, [storeIdOverride]);

  // ログインユーザーの users/{uid}.storeId を取得（店舗ログイン時）
  useEffect(()=> {
    const unsub = onAuthStateChanged(auth, async (u)=>{
      setUid(u?.uid);
      if (!storeIdOverride && u) {
        const us = await getDoc(doc(db,'users',u.uid));
        const sid = (us.data()?.storeId as string) || '';
        setStoreId(sid);
      }
    });
    return () => unsub();
  }, [storeIdOverride]);

  // 店舗切替や defaultLocation 変更時に、開催場所を自動更新（defaultLocation を優先）
  useEffect(() => {
    if (defaultLocation) {
      setLocation(defaultLocation);
    } else if (storeId) {
      setLocation(storeId);
    }
  }, [defaultLocation, storeId]);

  const startAtDate = useMemo(() => start ? new Date(start) : null, [start]);

  // 数値に変換（空や不正は null）
  const toNumberOrNull = (v: string) => {
    const n = Number((v || '').replace(/[,\s]/g, ''));
    return isFinite(n) && n > 0 ? n : null;
  };

  const submit = async ()=>{
    setErr('');
    if (submitting) return;
    if(!uid){ setErr('ログインしてください'); return; }
    if(!storeId){ setErr('storeId が必要です（店舗アカウントに割当）'); return; }
    if(!title.trim()){ setErr('タイトルは必須です'); return; }
    if(!start){ setErr('開始日時は必須です'); return; }

    const startAt = new Date(start);
    if (isNaN(startAt.getTime())) { setErr('開始日時の形式が不正です'); return; }
    if (startAt.getTime() < Date.now()) { setErr('開始日時は未来を指定してください'); return; }

    setSubmitting(true);
    try {
      await addDoc(collection(db,'tournaments'), {
        // 必須/基本
        title,
        storeId,
        location: location || null,
        img: img || null,
        startAt,
        status,
        // 任意フィールド
        buyIn: toNumberOrNull(buyIn),
        reentryFee: toNumberOrNull(reentryFee),
        addon: addon || null,
        addonFee: toNumberOrNull(addon === 'あり' ? addonFee : ''),
        stack: toNumberOrNull(stack),
        gameType: gameType || null,
        lateReg: lateReg || null,
        prize: prize || null,
        // メタ
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid
      });

      // 初期化
      setTitle('');
      setStart('');
      setLocation(defaultLocation ?? '');
      setImg('');
      setStatus('published');
      setBuyIn(''); setReentryFee(''); setAddon('なし'); setAddonFee(''); setStack('');
      setGameType(''); setLateReg(''); setPrize('');
      alert('登録しました');
    } catch (e:any) {
      console.error(e);
      setErr(e?.message ?? '登録に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="grid" style={{gridTemplateColumns:'1fr', rowGap: 10}}>
        <label>店舗ID（自動）
          <input value={storeId} readOnly title={storeIdOverride ? 'adminによる代理登録（変更不可）' : 'users/{uid}.storeId から自動取得'} style={{width:'100%', opacity:.7}}/>
        </label>

        <label>タイトル
          <input value={title} onChange={e=>setTitle(e.target.value)} style={{width:'100%'}} />
        </label>

        <label>開始日時
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} style={{width:'100%'}} />
          </div>
        </label>


        {/* 参加情報 */}
        <div className="surface" style={{padding:12, borderRadius:10}}>
          <div style={{fontWeight:700, marginBottom:8}}>参加情報</div>
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:8}}>
            <label>参加費（円）
              <input inputMode="numeric" value={buyIn} onChange={e=>setBuyIn(e.target.value)} placeholder="例：3000" />
            </label>
            <label>リエントリー料金（円）
              <input inputMode="numeric" value={reentryFee} onChange={e=>setReentryFee(e.target.value)} placeholder="例：3000" />
            </label>
            <label>アドオン
              <select value={addon} onChange={e=>setAddon(e.target.value as any)}>
                <option value="なし">なし</option>
                <option value="あり">あり</option>
              </select>
            </label>
            {addon === 'あり' && (
              <label>アドオン料金（円）
                <input inputMode="numeric" value={addonFee} onChange={e=>setAddonFee(e.target.value)} placeholder="例：2000" />
              </label>
            )}
            <label>スタック数（枚）
              <input inputMode="numeric" value={stack} onChange={e=>setStack(e.target.value)} placeholder="例：20000" />
            </label>
            <label>ゲームタイプ
              <select value={gameType} onChange={e=>setGameType(e.target.value as any)}>
                <option value="">選択してください</option>
                <option value="NLH">NLH</option>
                <option value="PLO">PLO</option>
                <option value="Mixed">Mixed</option>
              </select>
            </label>
            <label>レイトレジスト（時刻）
              <input type="time" value={lateReg} onChange={e=>setLateReg(e.target.value)} />
            </label>
          </div>
          <label style={{marginTop:8, display:'block'}}>プライズ（任意）
            <textarea value={prize} onChange={e=>setPrize(e.target.value)} rows={2} placeholder="例：上位3名に賞与、バウチャーなど" style={{width:'100%'}} />
          </label>
        </div>


        {err && <div className="muted" style={{color:'#f99'}}>{err}</div>}
      </div>

      <div style={{marginTop:12}}>
        <button className="btn btn-accent" onClick={submit} disabled={submitting}>
          {submitting ? '登録中…' : '登録する'}
        </button>
      </div>

      {/* 簡易プレビュー */}
      <div className="card" style={{marginTop:12}}>
        <img
          className="thumb"
          src={img || `https://picsum.photos/seed/preview-${encodeURIComponent(title)}/800/450`}
          alt=""
        />
        <div className="body" style={{padding:"10px 12px", display:'grid', gap:6}}>
          <div style={{fontWeight:800, lineHeight:1.25}}>{title || 'タイトル（プレビュー）'}</div>
          <div className="muted" style={{fontSize:13}}>
            {(startAtDate ? `${startAtDate.getMonth()+1}/${startAtDate.getDate()} ${String(startAtDate.getHours()).padStart(2,'0')}:${String(startAtDate.getMinutes()).padStart(2,'0')}` : '日付未設定')}
            {' ・ '}{location || '場所未設定'}
          </div>
          <div className="muted" style={{fontSize:12}}>
            {toNumberOrNull(buyIn) ? `参加費: ￥${toNumberOrNull(buyIn)?.toLocaleString()}` : ''}
            {gameType ? `　/　${gameType}` : ''}
            {lateReg ? `　/　LateReg: ${lateReg}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}