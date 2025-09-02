import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import type { Unsubscribe } from "firebase/firestore";
import dayjs from "dayjs";
import FollowButton from "./FollowButton";

type Tournament = {
  id: string;
  title: string;
  img?: string;
  startAt: any;
  location?: string;
  buyIn?: number;
  storeId?: string;
  // status?: "published" | "draft"; // 使うなら型に足す
};

export default function UpcomingTournaments() {
  const [items, setItems] = useState<Tournament[]>([]);
  const [storeMap, setStoreMap] = useState<Record<string, { name?: string; iconUrl?: string }>>({});

  useEffect(() => {
    let unsub: Unsubscribe | null = null;
    let stopped = false;

    // 現在時刻のしきい値でクエリを作り直す関数
    const resubscribe = () => {
      if (unsub) unsub();

      const now = Timestamp.fromDate(new Date());

      // 未来の大会を開始時刻昇順に購読
      // ※ "status == published" を使いたければ以下の行を1つ追加し、
      //   その場合 Firestore が複合インデックスを要求することがあります。
      //   where("status","==","published"),
      const q = query(
        collection(db, "tournaments"),
        where("startAt", ">=", now),
        orderBy("startAt", "asc"),
        limit(50)
      );

      unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map(
            (d) => ({ id: d.id, ...d.data() } as Tournament)
          );
          // update items
          setItems(list);

          // fetch missing stores for logo/name
          const ids = Array.from(new Set(list.map((x: any) => x.storeId).filter(Boolean)));
          const missing = ids.filter((id) => !storeMap[id]);
          if (missing.length) {
            Promise.all(missing.map((id) => getDoc(doc(db, "stores", id))))
              .then((docs) => {
                const add: Record<string, { name?: string; iconUrl?: string }> = {};
                docs.forEach((d) => {
                  if (d.exists()) {
                    const data: any = d.data();
                    add[d.id] = { name: data.name, iconUrl: data.iconUrl };
                  } else {
                    add[d.id] = {};
                  }
                });
                setStoreMap((prev) => ({ ...prev, ...add }));
              })
              .catch((e) => console.error("storeMap fetch error", e));
          }
        },
        (err) => {
          console.error("tournaments onSnapshot error:", err);
        }
      );
    };

    // 初回購読
    resubscribe();
    // 「今日 → 明日」と日付境界をまたぐとき等のために、1分ごとにクエリを張り直し
    const timer = setInterval(() => {
      if (!stopped) resubscribe();
    }, 60_000);

    return () => {
      stopped = true;
      if (unsub) unsub();
      clearInterval(timer);
    };
  }, []);

  const StoreChip = ({ t }: { t: Tournament }) => {
    const s = t.storeId ? storeMap[t.storeId] : undefined;
    const label = s?.name || t.storeId || "";
    const initials = (label || "?").slice(0, 2).toUpperCase();
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {s?.iconUrl ? (
          <img src={s.iconUrl} alt={label} style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.12)", display: "grid", placeItems: "center", fontSize: 11 }}>
            {initials}
          </div>
        )}
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
      </div>
    );
  };

  return (
    <div className="grid">
      {items.map((t) => (
        <a
          key={t.id}
          href={`/tournaments/${t.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <article className="card">
            {t.img ? (
              // トーナメントが画像を持っている場合は従来の横長サムネイル（16:9）
              <img className="thumb" src={t.img} alt={t.title} />
            ) : (
              // 画像が無い場合は店舗ロゴを正方形で表示（なければプレースホルダー）
              <div style={{ width: "100%", aspectRatio: "4/3", overflow: "hidden", maxHeight: "200px" }}>
                <img
                  src={(t.storeId ? storeMap[t.storeId]?.iconUrl : undefined) || `https://picsum.photos/seed/${t.id}/800/800`}
                  alt={t.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
            )}
            <div className="body" style={{ padding: "10px 12px", display: "grid", gap: 6 }}>
              {/* 店舗ロゴ＋店名 */}
              <StoreChip t={t} />
              <div style={{ fontWeight: 800, lineHeight: 1.25 }}>{t.title}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                {dayjs(t.startAt?.toDate?.() ?? t.startAt).format("M/D(ddd) HH:mm")} {" ・ "}
                {t.location ?? ""}
                {typeof t.buyIn === "number" ? ` ・ 参加費: ￥${t.buyIn.toLocaleString()}` : ""}
              </div>
              <div style={{ marginTop: 2 }}>
                <FollowButton tournamentId={t.id} />
              </div>
            </div>
          </article>
        </a>
      ))}
    </div>
  );
}