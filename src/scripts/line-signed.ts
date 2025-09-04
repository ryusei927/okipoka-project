import { auth } from "../lib/firebase";
import { signInWithCustomToken } from "firebase/auth";

export async function handleLineSigned() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) throw new Error("token missing");

    await signInWithCustomToken(auth, token);
    window.location.replace("/"); // 成功
  } catch (err: any) {
    const code = err?.code || "unknown";
    const msg = err?.message || JSON.stringify(err);
    console.error("[line-signed] error:", err);
    alert(`サインインに失敗しました\ncode: ${code}\nmessage: ${msg}`);
    window.location.replace("/"); // 失敗してもトップへ
  }
}