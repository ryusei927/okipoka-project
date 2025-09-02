// functions/src/line.ts
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { getFirestore, QueryDocumentSnapshot } from "firebase-admin/firestore";

/**
 * Secrets
 * CLI で下記を登録して使います：
 *   firebase functions:secrets:set LINE_CHANNEL_SECRET
 *   firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN
 */
const LINE_CHANNEL_SECRET = defineSecret("LINE_CHANNEL_SECRET");
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret("LINE_CHANNEL_ACCESS_TOKEN");

// Firebase Admin (outside the handler to avoid re-init)
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = getFirestore();

// 署名検証（LINEは“生のボディ(rawBody)”でHMACを計算する必要がある）
function verifyLineSignature(body: Buffer, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  return signature === expected;
}

// LINE 返信
async function replyMessage(replyToken: string, text: string, accessToken: string) {
  const resp = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    console.error("LINE reply error:", resp.status, errText);
  }
}

/**
 * Webhook 本体
 * - 署名検証 OK → イベント処理 → 200
 * - 署名不一致 → 403
 * まずは「テキストに対して固定文で返信」する最小構成。
 */
export const lineWebhook = onRequest(
  {
    region: "asia-northeast1",
    secrets: [LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN],
    timeoutSeconds: 15,
    cors: false,
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // 署名検証（rawBodyを必ず使用）
    const signature = req.get("x-line-signature") ?? "";
    const secret = LINE_CHANNEL_SECRET.value();

    // Firebase v2 onRequest は rawBody を保持している（型は any なので明示キャスト）
    const bodyBuffer: Buffer = Buffer.isBuffer((req as any).rawBody)
      ? (req as any).rawBody
      : Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));

    if (!verifyLineSignature(bodyBuffer, signature, secret)) {
      console.warn("Invalid LINE signature");
      res.status(403).send("Invalid signature");
      return;
    }

    // イベント処理
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const events: any[] = Array.isArray(body?.events) ? body.events : [];

      // --- フォロー中の大会情報取得のための関数 ---
      async function getFollowedTournaments(userId: string) {
        const snap = await db.collection("users").doc(userId).collection("follows").get();
        if (snap.empty) return [] as any[];
        return snap.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...(doc.data() as any) }));
      }
      // --- イベントごとに処理 ---
      for (const ev of events) {
        if (ev.type === "message" && ev.message?.type === "text" && ev.replyToken) {
          const text = ev.message.text.trim();
          if (/フォロー|大会/i.test(text)) {
            const tournaments = await getFollowedTournaments(ev.source?.userId ?? "");
            if (tournaments.length > 0) {
              const lines = tournaments.map((t: any) => `🏆 ${t.title ?? t.id}`).join("\n");
              await replyMessage(
                ev.replyToken,
                `あなたがフォローしている大会:\n${lines}`,
                LINE_CHANNEL_ACCESS_TOKEN.value()
              );
            } else {
              await replyMessage(
                ev.replyToken,
                "フォロー中の大会はまだありません。",
                LINE_CHANNEL_ACCESS_TOKEN.value()
              );
            }
          } else {
            await replyMessage(
              ev.replyToken,
              "OKIPOKAへようこそ！🟠\n準備中ですが順次機能を追加していきます。",
              LINE_CHANNEL_ACCESS_TOKEN.value()
            );
          }
        }
      }

      res.status(200).send("OK");
    } catch (e) {
      console.error("webhook handler error:", e);
      // LINE側はすぐ応答が必要なので500でも本文短く
      res.status(200).send("OK");
    }
  }
);