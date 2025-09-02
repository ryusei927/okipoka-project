import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

export type AppRole = "user" | "store" | "admin" | null;

export type UserProfile = {
  uid: string;
  role: AppRole;
  storeId?: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
};

export async function fetchUserProfile(): Promise<UserProfile | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const snap = await getDoc(doc(db, "users", u.uid));
  const data = snap.exists() ? snap.data() : {};
  return {
    uid: u.uid,
    role: (data.role as AppRole) ?? "user",
    storeId: data.storeId as string | undefined,
    displayName: u.displayName,
    email: u.email,
    photoURL: u.photoURL,
  };
}

export function watchUserProfile(cb: (p: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (u) => {
    if (!u) return cb(null);
    cb(await fetchUserProfile());
  });
}