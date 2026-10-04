import { createStore } from 'solid-js/store'
import type { Page, BlogMode, FontSize, Blog, Memo, Notebook, Product, Nutrient, Symptom, DbView, ColumnDef } from '../types'
import { PRODUCTS } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'
import { SYMPTOMS } from '../db/symptoms'
import {
  fetchMemos, addMemoFs, updateMemoFs, deleteMemoFs,
  fetchBlogs, addBlogFs, updateBlogFs, restoreBlogFs, deleteBlogFs,
  fetchNotebooks, addNotebookFs, updateNotebookFs, deleteNotebookFs,
  fetchProducts, updateProductFs, seedProductsFs,
  fetchNutrients, updateNutrientFs, seedNutrientsFs,
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
  products: Product[]
  nutrients: Nutrient[]
  symptoms: Symptom[]
  memos: Memo[]
  blogs: Blog[]
  trashBlogs: Blog[]
  notebooks: Notebook[]
  db01Columns: ColumnDef[]
  db02Columns: ColumnDef[]
  db03Columns: ColumnDef[]
  db10Columns: ColumnDef[]
  dbStatus: DbStatus
  /** Googleログイン中のユーザー（未ログインは null） */
  cloudUser: { email: string; name: string } | null
  /** Firestore に断られたときの理由（権限なしなど） */
  dbError: string
}

const FONT_SIZE_PX: Record<FontSize, number> = { s: 13, m: 16, l: 19, xl: 22 }

// 画面から新しく作った成分カード。Firestore が使えない状態でも消えないよう端末にも保存する
const CUSTOM_NUTRIENTS_KEY = 'nacc-custom-nutrients'

function loadCustomNutrients(): Nutrient[] {
  try {
    const raw = localStorage.getItem(CUSTOM_NUTRIENTS_KEY)
    if (!raw) return []
    return (JSON.parse(raw) as Nutrient[]).map((n) => ({ ...n, createdAt: n.createdAt ? new Date(n.createdAt) : undefined }))
  } catch {
    return []
  }
}

// 成分カードの修正（名前・説明・商品との結び付け）も端末に保存しておく。
// Firestore に書けない状態でも、再読み込みで修正が消えないようにするため
const NUTRIENT_EDITS_KEY = 'nacc-nutrient-edits'
type NutrientEdit = Partial<Pick<Nutrient, 'name' | 'description' | 'productIds'>>

function loadNutrientEdits(): Record<string, NutrientEdit> {
  try {
    return JSON.parse(localStorage.getItem(NUTRIENT_EDITS_KEY) || '{}') as Record<string, NutrientEdit>
  } catch {
    return {}
  }
}

function saveNutrientEdit(id: string, patch: Partial<Nutrient>) {
  const keep: NutrientEdit = {}
  if (patch.name !== undefined) keep.name = patch.name
  if (patch.description !== undefined) keep.description = patch.description
  if (patch.productIds !== undefined) keep.productIds = patch.productIds
  if (!Object.keys(keep).length) return
  try {
    const edits = loadNutrientEdits()
    edits[id] = { ...edits[id], ...keep }
    localStorage.setItem(NUTRIENT_EDITS_KEY, JSON.stringify(edits))
  } catch (e) {
    console.warn('[nutrient] local edit save failed', e)
  }
}

/** 端末だけにあった自作カード・修正をクラウドへ（つながった時に一度だけ） */
async function pushLocalNutrientsToCloud(remoteIds: Set<string>) {
  try {
    const custom = loadCustomNutrients().filter((n) => !remoteIds.has(n.id))
    if (custom.length) await seedNutrientsFs(custom.map((n) => ({ ...n, ...loadNutrientEdits()[n.id] })))
    const edits = loadNutrientEdits()
    await Promise.all(Object.entries(edits).filter(([id]) => remoteIds.has(id)).map(([id, patch]) => updateNutrientFs(id, patch)))
  } catch (e) {
    console.warn('[Firestore] local push failed', e)
  }
}

/** 一覧に、まだ入っていない自作カードを足し、端末に残した修正を重ねる */
function withCustomNutrients(list: Nutrient[]): Nutrient[] {
  const ids = new Set(list.map((n) => n.id))
  const edits = loadNutrientEdits()
  return [...list, ...loadCustomNutrients().filter((n) => !ids.has(n.id))]
    .map((n) => (edits[n.id] ? { ...n, ...edits[n.id] } : n))
}

function initDarkMode(): boolean {
  const saved = localStorage.getItem('nacc-dark-mode')
  const isDark = saved === 'true'
  if (isDark) document.documentElement.classList.add('dark')
  return isDark
}

export const DB01_COLUMNS_DEFAULT: ColumnDef[] = [
  { id: 'name',        label: '品目',        visible: true,  locked: true  },
  { id: 'category',    label: 'カテゴリ',    visible: true,  locked: false },
  { id: 'description', label: '商品説明',    visible: true,  locked: false },
  { id: 'symptoms',    label: '病名/症状',   visible: true,  locked: false },
  { id: 'effects',     label: '効果',        visible: true,  locked: false },
  { id: 'ingredients', label: '成分DB',      visible: true,  locked: false },
  { id: 'image',       label: '商品イメージ', visible: false, locked: false },
  { id: 'memo',        label: 'メモ欄',      visible: true,  locked: false },
]

export const DB02_COLUMNS_DEFAULT: ColumnDef[] = [
  { id: 'name',        label: '栄養素',   visible: true,  locked: true  },
  { id: 'description', label: '説明',     visible: true,  locked: false },
  { id: 'products',    label: '関連商品', visible: true,  locked: false },
  { id: 'memo',        label: 'MEMO',     visible: true,  locked: false },
]

export const DB03_COLUMNS_DEFAULT: ColumnDef[] = [
  { id: 'name',     label: '原材料名',   visible: true, locked: true  },
  { id: 'products', label: '含有商品数', visible: true, locked: false },
  { id: 'category', label: 'カテゴリ',  visible: true, locked: false },
]

export const DB10_COLUMNS_DEFAULT: ColumnDef[] = [
  { id: 'name',        label: '症状/病名', visible: true, locked: true  },
  { id: 'description', label: '説明',      visible: true, locked: false },
  { id: 'products',    label: '関連商品',  visible: true, locked: false },
  { id: 'memo',        label: 'メモ',      visible: true, locked: false },
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
  fontSize: 'xl',
  darkMode: initDarkMode(),
  dbView: 'gallery',
  selectedProductId: null,
  selectedNutrientId: null,
  selectedBlogId: null,
  selectedMemoId: null,
  sidebarOpen: false,
  settingsPanelOpen: false,
  galleryPanelOpen: false,
  blogFilterTags: [],
  products: PRODUCTS,
  nutrients: withCustomNutrients(NUTRIENTS),
  symptoms: SYMPTOMS,
  memos: [],
  blogs: INITIAL_BLOGS,
  trashBlogs: [],
  notebooks: [],
  db01Columns: DB01_COLUMNS_DEFAULT,
  db02Columns: DB02_COLUMNS_DEFAULT,
  db03Columns: DB03_COLUMNS_DEFAULT,
  db10Columns: DB10_COLUMNS_DEFAULT,
  dbStatus: 'idle',
  cloudUser: null,
  dbError: '',
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

export function toggleDb03Column(id: string) {
  setState('db03Columns', (prev) =>
    prev.map((c) => (c.id === id && !c.locked ? { ...c, visible: !c.visible } : c))
  )
}

export function toggleDb10Column(id: string) {
  setState('db10Columns', (prev) =>
    prev.map((c) => (c.id === id && !c.locked ? { ...c, visible: !c.visible } : c))
  )
}

// ── Firestore init ────────────────────────────────────────────────────────────

export async function initFirestore(): Promise<void> {
  setState({ dbStatus: 'connecting' })
  try {
    const [memos, allBlogs, notebooks, fsProducts, fsNutrients] = await Promise.all([
      fetchMemos(),
      fetchBlogs(),
      fetchNotebooks(),
      fetchProducts(),
      fetchNutrients(),
    ])
    const blogs      = allBlogs.filter((b) => !b.deletedAt)
    const trashBlogs = allBlogs.filter((b) => !!b.deletedAt)

    if (fsProducts.length === 0) {
      await seedProductsFs(PRODUCTS)
      setState({ products: PRODUCTS })
    } else {
      const linkedProducts = fsProducts.map((product) => {
        const bundled = PRODUCTS.find((item) => item.id === product.id)
        if (!bundled) return product
        return { ...product, nutrientIds: Array.from(new Set([...product.nutrientIds, ...bundled.nutrientIds])) }
      })
      const changedProducts = linkedProducts.filter((product) => {
        const original = fsProducts.find((item) => item.id === product.id)
        return original && product.nutrientIds.length !== original.nutrientIds.length
      })
      if (changedProducts.length > 0) {
        await Promise.all(changedProducts.map((product) => updateProductFs(product.id, { nutrientIds: product.nutrientIds })))
      }
      setState({ products: linkedProducts })
    }
    if (fsNutrients.length === 0) {
      await seedNutrientsFs(NUTRIENTS)
      setState({ nutrients: withCustomNutrients(NUTRIENTS) })
    } else {
      const remoteIds = new Set(fsNutrients.map((nutrient) => nutrient.id))
      const missingBundledNutrients = NUTRIENTS.filter((nutrient) => !remoteIds.has(nutrient.id))
      if (missingBundledNutrients.length > 0) await seedNutrientsFs(missingBundledNutrients)
      setState({ nutrients: withCustomNutrients([...fsNutrients, ...missingBundledNutrients]) })
    }

    setState({ memos, blogs, trashBlogs, notebooks, dbStatus: 'connected', dbError: '' })
    // つながらない間に端末へ保存していた成分カードの追加・修正を、クラウドへ送る
    await pushLocalNutrientsToCloud(new Set((await fetchNutrients()).map((n) => n.id)))
  } catch (e) {
    console.error('[Firestore] init failed:', e)
    const code = (e as { code?: string }).code ?? ''
    setState({ dbStatus: 'error', dbError: code === 'permission-denied' ? 'permission-denied' : code || 'unknown' })
  }
}

// ── Product / Nutrient CRUD ───────────────────────────────────────────────────

export function updateProduct(id: string, patch: Partial<Product>): void {
  setState('products', (prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  updateProductFs(id, patch).catch(console.warn)
}

/** 新しい成分カードを作り、商品に結び付ける。作ったカードのIDを返す */
export function addCustomNutrient(data: { name: string; description: string; productId?: string }): string {
  const id = `NX-${Date.now().toString(36)}`
  const nutrient: Nutrient = {
    id,
    name: data.name,
    description: data.description,
    productIds: data.productId ? [data.productId] : [],
    memo: '画面から追加',
    createdAt: new Date(),
  }
  setState('nutrients', (prev) => [...prev, nutrient])
  try {
    const saved = loadCustomNutrients()
    localStorage.setItem(CUSTOM_NUTRIENTS_KEY, JSON.stringify([...saved, nutrient]))
  } catch (e) {
    console.warn('[nutrient] local save failed', e)
  }
  seedNutrientsFs([nutrient]).catch(console.warn)
  return id
}

export function updateNutrient(id: string, patch: Partial<Nutrient>): void {
  setState('nutrients', (prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  saveNutrientEdit(id, patch)
  updateNutrientFs(id, patch).catch(console.warn)
}

/** 共有成分DBのカードを商品（原本）に結び付ける */
export function linkNutrientToProduct(nutrientId: string, productId: string): void {
  const nutrient = state.nutrients.find((n) => n.id === nutrientId)
  if (!nutrient || nutrient.productIds.includes(productId)) return
  updateNutrient(nutrientId, { productIds: [...nutrient.productIds, productId] })
}

// ── Symptom CRUD ──────────────────────────────────────────────────────────────

export function addSymptom(data: Omit<Symptom, 'id'>): string {
  const id = 'SP' + String(state.symptoms.length + 1).padStart(2, '0')
  setState('symptoms', (prev) => [...prev, { ...data, id }])
  return id
}

export function updateSymptom(id: string, patch: Partial<Omit<Symptom, 'id'>>): void {
  setState('symptoms', (prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
}

export function deleteSymptom(id: string): void {
  setState('symptoms', (prev) => prev.filter((s) => s.id !== id))
}

// ── Memo CRUD ─────────────────────────────────────────────────────────────────

export async function addMemo(data: Omit<Memo, 'id'>): Promise<string> {
  const tempId = 'local-' + Date.now()
  setState('memos', (prev) => [{ ...data, id: tempId }, ...prev])
  try {
    const id = await addMemoFs(data)
    setState('memos', (prev) => prev.map((m) => (m.id === tempId ? { ...m, id } : m)))
    return id
  } catch {
    return tempId
  }
}

export function updateMemo(id: string, patch: Partial<Omit<Memo, 'id'>>): void {
  setState('memos', (prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  updateMemoFs(id, patch).catch(console.warn)
}

export function deleteMemo(id: string): void {
  setState('memos', (prev) => prev.filter((m) => m.id !== id))
  deleteMemoFs(id).catch(console.warn)
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
  const tempId = 'local-' + Date.now()
  setState('notebooks', (prev) => [{ ...data, id: tempId }, ...prev])
  try {
    const id = await addNotebookFs(data)
    setState('notebooks', (prev) => prev.map((n) => (n.id === tempId ? { ...n, id } : n)))
    return id
  } catch {
    return tempId
  }
}

export function updateNotebook(id: string, patch: Partial<Omit<Notebook, 'id'>>): void {
  setState('notebooks', (prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  updateNotebookFs(id, patch).catch(console.warn)
}

export async function deleteNotebook(id: string): Promise<void> {
  await deleteNotebookFs(id)
  setState('notebooks', (prev) => prev.filter((n) => n.id !== id))
}
