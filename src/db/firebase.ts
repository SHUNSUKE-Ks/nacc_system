import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  doc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import type { Memo, Blog, Notebook } from '../types'

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
