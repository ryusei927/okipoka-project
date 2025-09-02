import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import TournamentForm from "./TournamentForm";

type Store = {
  id: string;
  name?: string;
  area?: string;
  iconUrl?: string;
  mapUrl?: string;
};

export default function AdminConsole() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const qs = await getDocs(query(collection(db, "stores"), orderBy("name", "asc")));
      const items = qs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setStores(items);
      if (items.length > 0) setStoreId(items[0].id);
    })();
  }, []);

  const store = stores.find((s) => s.id === storeId);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "1rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>運営コンソール</h2>

      {/* 店舗選択 */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ fontWeight: 600 }}>店舗を選択:</label>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          style={{ marginLeft: 8, padding: "4px 8px" }}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
            </option>
          ))}
        </select>
      </div>

      {/* 店舗ヘッダー */}
      {store && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: "2rem",
            padding: "12px 16px",
            border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 8,
            background: "rgba(255,255,255,.04)",
          }}
        >
          {store.iconUrl ? (
            <img
              src={store.iconUrl}
              alt={store.name}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(255,255,255,.1)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
              }}
            >
              {store.name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{store.name}</div>
          </div>
        </div>
      )}

      {/* 大会登録フォーム */}
      <TournamentForm storeIdOverride={storeId || undefined} />
    </div>
  );
}