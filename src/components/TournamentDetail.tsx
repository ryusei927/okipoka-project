import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import dayjs from "dayjs";
import FollowButton from "./FollowButton";

type Props = { id?: string };
type T = {
  title: string;
  img?: string;
  startAt?: any;
  location?: string;
  buyIn?: number | null;
  reentryFee?: number | null;
  addon?: string | null;
  addonFee?: number | null;
  stack?: number | null;
  gameType?: string | null;
  lateReg?: string | null;
  prize?: string | null;
  storeId?: string;
};

export default function TournamentDetail({ id }: Props) {
  const [t, setT] = useState<T | null>(null);
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const snap = await getDoc(doc(db, "tournaments", id));
      if (!snap.exists()) { setT(null); return; }
      const data = { id: snap.id, ...(snap.data() as any) } as any;
      setT(data);

      if (data.storeId) {
        const s = await getDoc(doc(db, "stores", data.storeId));
        if (s.exists()) setStore({ id: s.id, ...(s.data() as any) });
      }
    })();
  }, [id]);

  if (!t) return <div className="muted">大会が見つかりませんでした。</div>;

  const fmt = (ts?: any) => {
    const d = ts?.toDate?.() ?? ts;
    return d ? dayjs(d).format("YYYY/M/D (ddd) HH:mm") : "";
  };

  return (
    <article className="card" style={{ overflow: "hidden" }}>
      {t.img && <img className="thumb" src={t.img} alt={t.title} />}
      <div className="body" style={{ padding: "16px", display: "grid", gap: 8 }}>
        {/* 店舗ヘッダー */}
        {store && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            {store.iconUrl && (
              <img
                src={store.iconUrl}
                alt={store.name}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <span>{store.name ?? t.storeId}</span>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: "6px 0", fontSize: 20, fontWeight: 800 }}>{t.title}</h1>
          {id && <FollowButton tournamentId={id} />}
        </div>

        <div className="muted">{fmt(t.startAt)} ・ {t.location ?? ""}</div>

        <div className="surface" style={{ padding: 12, borderRadius: 10 }}>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {typeof t.buyIn === "number" && <div>参加費：￥{t.buyIn.toLocaleString()}</div>}
            {typeof t.reentryFee === "number" && <div>リエントリー：￥{t.reentryFee.toLocaleString()}</div>}
            {t.addon && <div>アドオン：{t.addon}{typeof t.addonFee === "number" ? `（￥${t.addonFee.toLocaleString()}）` : ""}</div>}
            {typeof t.stack === "number" && <div>スタック：{t.stack.toLocaleString()} 枚</div>}
            {t.gameType && <div>ゲームタイプ：{t.gameType}</div>}
            {t.lateReg && <div>レイトレジスト：{t.lateReg}</div>}
          </div>
        </div>

        {t.prize && (
          <div className="surface" style={{ padding: 12, borderRadius: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>プライズ</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{t.prize}</div>
          </div>
        )}
        {/* 店舗情報 */}
        {store && (
          <div className="surface" style={{ padding: 12, borderRadius: 10 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              {store.area && <div>住所：{store.area}</div>}
              {store.mapUrl && (
                <div>
                  <a href={store.mapUrl} target="_blank" rel="noopener noreferrer">📍 Googleマップを開く</a>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {store.instagramUrl && (
                  <a href={store.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
                )}
                {store.xUrl && (
                  <a href={store.xUrl} target="_blank" rel="noopener noreferrer">X</a>
                )}
                {store.websiteUrl && (
                  <a href={store.websiteUrl} target="_blank" rel="noopener noreferrer">公式サイト</a>
                )}
                {store.phone && (
                  <a href={`tel:${store.phone}`}>電話：{store.phone}</a>
                )}
              </div>
              {store.hours && <div>営業時間：{store.hours}</div>}
              {store.feeHint && <div>料金目安：{store.feeHint}</div>}
            </div>
          </div>
        )}
    </div>
    </article>
  );
}