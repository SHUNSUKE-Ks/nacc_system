import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth'
import type { Memo, Blog, Notebook, Product, Nutrient } from '../types'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const firestore = getFirestore(app)
export const auth = getAuth(app)

// ── Googleログイン（Firestore のルールで、登録したメールアドレスだけが読み書きできる） ──
export function watchAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    await signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code
    // ポップアップが使えない環境では、画面ごと移動してログインする
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      return
    }
    throw e
  }
}

export function signOutGoogle(): Promise<void> {
  return signOut(auth)
}

// ── Leaflets（リーフレット）: 形が変わっても困らないよう JSON 文字列で丸ごと保存 ──
export type LeafletDoc = { id: string; productId: string; updatedAt: string; json: string }

export async function fetchLeafletsFs(): Promise<LeafletDoc[]> {
  const snap = await getDocs(collection(firestore, 'leaflets'))
  return snap.docs.map((d) => d.data() as LeafletDoc)
}

export async function saveLeafletFs(data: LeafletDoc): Promise<void> {
  await setDoc(doc(firestore, 'leaflets', data.id), data)
}

export async function deleteLeafletFs(id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'leaflets', id))
}

function fromFs(data: Record<string, unknown>): Record<string, unknown> {
  const out = { ...data }
  for (const key of ['createdAt', 'updatedAt', 'deletedAt']) {
    if (out[key] instanceof Timestamp) out[key] = (out[key] as Timestamp).toDate()
  }
  return out
}

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

// ── Memos ────────────────────────────────────────────────────────────────────

export async function fetchMemos(): Promise<Memo[]> {
  const q = query(collection(firestore, 'memos'), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...fromFs(d.data()) } as Memo))
}

export async function addMemoFs(memo: Omit<Memo, 'id'>): Promise<string> {
  const ref = await addDoc(collection(firestore, 'memos'), stripUndefined(memo as Record<string, unknown>))
  return ref.id
}

export async function updateMemoFs(id: string, patch: Partial<Omit<Memo, 'id'>>): Promise<void> {
  await updateDoc(doc(firestore, 'memos', id), stripUndefined(patch as Record<string, unknown>))
}

export async function deleteMemoFs(id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'memos', id))
}

// ── Blogs ────────────────────────────────────────────────────────────────────

export async function fetchBlogs(): Promise<Blog[]> {
  const q = query(collection(firestore, 'blogs'), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...fromFs(d.data()) } as Blog))
}

export async function addBlogFs(blog: Omit<Blog, 'id'>): Promise<string> {
  const ref = await addDoc(collection(firestore, 'blogs'), stripUndefined(blog as Record<string, unknown>))
  return ref.id
}

export async function updateBlogFs(id: string, patch: Partial<Omit<Blog, 'id'>>): Promise<void> {
  await updateDoc(doc(firestore, 'blogs', id), stripUndefined(patch as Record<string, unknown>))
}

export async function restoreBlogFs(id: string): Promise<void> {
  await updateDoc(doc(firestore, 'blogs', id), { deletedAt: deleteField() })
}

export async function deleteBlogFs(id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'blogs', id))
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function fetchProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(firestore, 'products'))
  return snap.docs.map((d) => ({ id: d.id, ...fromFs(d.data() as Record<string, unknown>) } as unknown as Product))
}

export async function updateProductFs(id: string, patch: Partial<Product>): Promise<void> {
  await updateDoc(doc(firestore, 'products', id), stripUndefined(patch as Record<string, unknown>))
}

export async function seedProductsFs(products: Product[]): Promise<void> {
  await Promise.all(
    products.map(({ id, ...data }) =>
      setDoc(doc(firestore, 'products', id), stripUndefined(data as Record<string, unknown>))
    )
  )
}

// ── Nutrients ─────────────────────────────────────────────────────────────────

export async function fetchNutrients(): Promise<Nutrient[]> {
  const snap = await getDocs(collection(firestore, 'nutrients'))
  return snap.docs.map((d) => ({ id: d.id, ...fromFs(d.data() as Record<string, unknown>) } as unknown as Nutrient))
}

export async function updateNutrientFs(id: string, patch: Partial<Nutrient>): Promise<void> {
  await updateDoc(doc(firestore, 'nutrients', id), stripUndefined(patch as Record<string, unknown>))
}

export async function seedNutrientsFs(nutrients: Nutrient[]): Promise<void> {
  await Promise.all(
    nutrients.map(({ id, ...data }) =>
      setDoc(doc(firestore, 'nutrients', id), stripUndefined(data as Record<string, unknown>))
    )
  )
}

// ── Notebooks ────────────────────────────────────────────────────────────────

export async function fetchNotebooks(): Promise<Notebook[]> {
  const q = query(collection(firestore, 'notebooks'), orderBy('updatedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...fromFs(d.data()) } as Notebook))
}

export async function addNotebookFs(notebook: Omit<Notebook, 'id'>): Promise<string> {
  const ref = await addDoc(collection(firestore, 'notebooks'), stripUndefined(notebook as Record<string, unknown>))
  return ref.id
}

export async function updateNotebookFs(id: string, patch: Partial<Omit<Notebook, 'id'>>): Promise<void> {
  await updateDoc(doc(firestore, 'notebooks', id), stripUndefined(patch as Record<string, unknown>))
}

export async function deleteNotebookFs(id: string): Promise<void> {
  await deleteDoc(doc(firestore, 'notebooks', id))
}
