import { useEffect, useState } from "react";
import { watchUserProfile } from "../lib/roles";
import type { UserProfile } from "../lib/roles";
import TournamentForm from "./TournamentForm";

export default function StoreDashboard(){
  const [p, setP] = useState<UserProfile|null>(null);
  useEffect(()=>watchUserProfile(setP),[]);
  if (!p) return <div className="muted">ログインが必要です。</div>;

  // Admin でもここでは「自分の storeId があればそれ」を使う
  // （Admin が他店を操作するのは /admin 側で）
  const sid = p.storeId;
  if (p.role === "store" && !sid) return <div className="muted">storeId が未設定です。運営に連絡してください。</div>;

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr'}}>
      <div className="card" style={{padding:12}}>
        <h3>トーナメント登録</h3>
        <p className="muted" style={{marginTop:0}}>開始日時は未来のみ。必須項目を入力してください。</p>
        <TournamentForm storeIdOverride={sid} />
      </div>
      {/* ここに「自店の大会一覧（編集/下書き）」などを今後追加 */}
    </div>
  );
}