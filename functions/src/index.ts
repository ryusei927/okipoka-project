// functions/src/index.ts
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({
  region: "asia-northeast1",
  maxInstances: 5,
});

// 個々の関数を集約して公開
export { lineWebhook } from "./line.js"; // ★ここを修正