import { createStore } from 'solid-js/store'
import type { Page, BlogMode, FontSize, Blog, Memo, Notebook, DbView, ColumnDef } from '../types'
import {
  fetchMemos, addMemoFs, updateMemoFs, deleteMemoFs,
  fetchBlogs, addBlogFs, updateBlogFs, restoreBlogFs, deleteBlogFs,
  fetchNotebooks, addNotebookFs, updateNotebookFs, deleteNotebookFs,
} from '../db/firebase'

export type DbStatus = 'idle' | 'connecting' | 'connected' | 'error'

export type AppState = {
  page: Page
  galleryReturnPage: Page
  blogMode: BlogMode
  fontSize: FontSize
  darkMode: boolean
  dbView: DbView
  selectedProductId: string | null
  selectedNutrientId: string | null
  selectedBlogId: string | null
  selectedMemoId: string | null
  sidebarOpen: boolean
  settingsPanelOpen: boolean
  galleryPanelOpen: boolean
  blogFilterTags: string[]
  memos: Memo[]
  blogs: Blog[]
  trashBlogs: Blog[]
  notebooks: Notebook[]
  db01Columns: ColumnDef[]
  db02Columns: ColumnDef[]
  dbStatus: DbStatus
}

const FONT_SIZE_PX: Record<FontSize, number> = { s: 13, m: 16, l: 19, xl: 22 }

function initDarkMode(): boolean {
  const saved = localStorage.getItem('nacc-dark-mode')
  const isDark = saved === 'true' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (isDark) document.documentElement.classList.add('dark')
  return isDark
}

export const DB01_COLUMNS_DEFAULT: ColumnDef[] = [
  { id: 'name',        label: '品目',        visible: true,  locked: true  },
  { id: 'symptoms',    label: '病名/症状',    visible: true,  locked: false },
  { id: 'effects',     label: '効果',         visible: true,  locked: false },
  { id: 'ingredients', label: '成分',         visible: true,  locked: false },
  { id: 'image',       label: '商品イメージ', visible: false, locked: false },
  { id: 'memo',        label: 'メモ欄',       visible: true,  locked: false },
]

export const DB02_COLUMNS_DEFAULT: ColumnDef[] = [
  { id: 'name',        label: '栄養素',       visible: true,  locked: true  },
  { id: 'description', label: '説明',          visible: true,  locked: false },
  { id: 'products',    label: '関連商品',      visible: true,  locked: false },
  { id: 'memo',        label: 'MEMO',          visible: true,  locked: false },
]

const INITIAL_BLOGS: Blog[] = [
  {
    id: 'sample-blog-1',
    title: 'CoQ10（コエンザイムQ10）について',
    body: 'コエンザイムQ10は心臓や筋肉のエネルギー代謝に関わる栄養素です。',
    coverType: 'none',
    categoryTags: [],
    mode: 'memo',
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
  },
  {
    id: 'sample-blog-2',
    title: 'マルチビタミン — 毎日の健康サポート',
    body: '',
    coverType: 'none',
    categoryTags: [],
    mode: 'memo',
    createdAt: new Date('2026-05-15'),
    updatedAt: new Date('2026-05-15'),
  },
]

const [state, setState] = createStore<AppState>({
  page: 'db01',
  galleryReturnPage: 'db01',
  blogMode: 'memo',
  fontSize: 'l',
  darkMode: initDarkMode(),
  dbView: 'table',
  selectedProductId: null,
  selectedNutrientId: null,
  selectedBlogId: null,
  selectedMemoId: null,
  sidebarOpen: false,
  settingsPanelOpen: false,
  galleryPanelOpen: false,
  blogFilterTags: [],
  memos: [],
  blogs: INITIAL_BLOGS,
  trashBlogs: [],
  notebooks: [],
  db01Columns: DB01_COLUMNS_DEFAULT,
  db02Columns: DB02_COLUMNS_DEFAULT,
  dbStatus: 'idle',
})

export { state, setState }

// ── UI actions ────────────────────────────────────────────────────────────────

export function navigate(page: Page) {
  if (page === 'gallery' && state.page !== 'gallery') {
    setState({ galleryReturnPage: state.page })
  }
  setState({ page, sidebarOpen: false })
}

export function setFontSize(size: FontSize) {
  document.documentElement.style.fontSize = FONT_SIZE_PX[size] + 'px'
  setState({ fontSize: size })
}

export function toggleDarkMode() {
  const next = !state.darkMode
  document.documentElement.classList.toggle('dark', next)
  localStorage.setItem('nacc-dark-mode', String(next))
  setState({ darkMode: next })
}

export function toggleBlogFilter(tagName: string) {
  setState('blogFilterTags', (prev) =>
    prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
  )
}

export function toggleDb01Column(id: string) {
  setState('db01Columns', (prev) =>
    prev.map((c) => (c.id === id && !c.locked ? { ...c, visible: !c.visible } : c))
  )
}

export function toggleDb02Column(id: string) {
  setState('db02Columns', (prev) =>
    prev.map((c) => (c.id === id && !c.locked ? { ...c, visible: !c.visible } : c))
  )
}

// ── Firestore init ────────────────────────────────────────────────────────────

export async function initFirestore(): Promise<void> {
  setState({ dbStatus: 'connecting' })
  try {
    const [memos, allBlogs, notebooks] = await Promise.all([
      fetchMemos(),
      fetchBlogs(),
      fetchNotebooks(),
    ])
    const blogs      = allBlogs.filter((b) => !b.deletedAt)
    const trashBlogs = allBlogs.filter((b) => !!b.deletedAt)
    setState({ memos, blogs, trashBlogs, notebooks, dbStatus: 'connected' })
  } catch (e) {
    console.error('[Firestore] init failed:', e)
    setState({ dbStatus: 'error' })
  }
}

// ── Memo CRUD ─────────────────────────────────────────────────────────────────

export async function addMemo(data: Omit<Memo, 'id'>): Promise<string> {
  const id = await addMemoFs(data)
  setState('memos', (prev) => [{ ...data, id }, ...prev])
  return id
}

export async function updateMemo(id: string, patch: Partial<Omit<Memo, 'id'>>): Promise<void> {
  await updateMemoFs(id, patch)
  setState('memos', (prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
}

export async function deleteMemo(id: string): Promise<void> {
  await deleteMemoFs(id)
  setState('memos', (prev) => prev.filter((m) => m.id !== id))
}

// ── Blog CRUD ─────────────────────────────────────────────────────────────────

export async function addBlog(data: Omit<Blog, 'id'>): Promise<string> {
  const tempId = 'local-' + Date.now()
  setState('blogs', (prev) => [{ ...data, id: tempId }, ...prev])
  try {
    const id = await addBlogFs(data)
    setState('blogs', (prev) => prev.map((b) => (b.id === tempId ? { ...b, id } : b)))
    return id
  } catch {
    return tempId
  }
}

export function updateBlog(id: string, patch: Partial<Omit<Blog, 'id'>>): void {
  setState('blogs', (prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  updateBlogFs(id, patch).catch(console.warn)
}

export function trashBlog(id: string): void {
  const blog = state.blogs.find((b) => b.id === id)
  if (!blog) return
  const deletedAt = new Date()
  setState('blogs', (prev) => prev.filter((b) => b.id !== id))
  setState('trashBlogs', (prev) => [{ ...blog, deletedAt }, ...prev])
  updateBlogFs(id, { deletedAt }).catch(console.warn)
}

export function restoreBlog(id: string): void {
  const blog = state.trashBlogs.find((b) => b.id === id)
  if (!blog) return
  const { deletedAt: _d, ...restored } = blog
  setState('trashBlogs', (prev) => prev.filter((b) => b.id !== id))
  setState('blogs', (prev) => [{ ...restored }, ...prev])
  restoreBlogFs(id).catch(console.warn)
}

export function deleteBlogPermanent(id: string): void {
  setState('trashBlogs', (prev) => prev.filter((b) => b.id !== id))
  deleteBlogFs(id).catch(console.warn)
}

export function emptyTrash(): void {
  const ids = state.trashBlogs.map((b) => b.id!)
  setState({ trashBlogs: [] })
  Promise.all(ids.map(deleteBlogFs)).catch(console.warn)
}

// ── Notebook CRUD ─────────────────────────────────────────────────────────────

export async function addNotebook(data: Omit<Notebook, 'id'>): Promise<string> {
  const id = await addNotebookFs(data)
  setState('notebooks', (prev) => [{ ...data, id }, ...prev])
  return id
}

export async function updateNotebook(id: string, patch: Partial<Omit<Notebook, 'id'>>): Promise<void> {
  await updateNotebookFs(id, patch)
  setState('notebooks', (prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
}

export async function deleteNotebook(id: string): Promise<void> {
  await deleteNotebookFs(id)
  setState('notebooks', (prev) => prev.filter((n) => n.id !== id))
}
