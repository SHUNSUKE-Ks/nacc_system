import { createEffect, createRoot, createSignal, on } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import { addCustomNutrient, linkNutrientToProduct, state, updateProduct } from '../../store'
import type { Product } from '../../types'
import { fetchCatalogChecksFs, saveCatalogCheckFs } from '../../db/firebase'

// 新カタログチェック表
// 商品ごとに「その商品に入っている成分」を1つずつ確認していく。
// 今の作業（商品ノート・リーフレット）とは別に保存し、原本は書き換えない。

export type CheckStatus = 'unchecked' | 'checked' | 'hold'
export const STATUS_LABELS: Record<CheckStatus, string> = { unchecked: '未確認', checked: '確認済み', hold: '保留' }

export type ItemCheck = { status: CheckStatus; memo: string; updatedAt: string }
export type ProductCheck = {
  productId: string
  status: CheckStatus
  memo: string
  updatedAt: string
  /** itemKey（成分カードは n:ID、原材料は i:名前）→ 確認状況 */
  items: Record<string, ItemCheck>
  /** 確認中に、チェック表だけに足した成分（原本には入れていないもの） */
  extraItems?: { key: string; name: string; description: string }[]
}

/** チェック表の1行（その商品に入っている成分） */
export type CheckItem = { key: string; name: string; description: string; source: 'card' | 'label' | 'sheet' }

const STORAGE_KEY = 'nacc-catalog-checks-v1'

function load(): ProductCheck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ProductCheck[]) : []
  } catch {
    return []
  }
}

const [checks, setChecks] = createStore<ProductCheck[]>(load())
export { checks }

const emptyItem = (): ItemCheck => ({ status: 'unchecked', memo: '', updatedAt: '' })

export const productCheck = (productId: string): ProductCheck | undefined => checks.find((c) => c.productId === productId)
export const itemCheck = (productId: string, key: string): ItemCheck => productCheck(productId)?.items[key] ?? emptyItem()

/**
 * 商品に入っている成分。成分カードが結び付いていればカード（説明つき）、
 * 無ければカタログの原材料表記を1つずつ並べる
 */
export function itemsOf(product: Product): CheckItem[] {
  const extras: CheckItem[] = (productCheck(product.id)?.extraItems ?? []).map((x) => ({ ...x, source: 'sheet' }))
  return [...baseItems(product), ...extras]
}

function baseItems(product: Product): CheckItem[] {
  const cards = state.nutrients.filter((n) => product.nutrientIds.includes(n.id) || n.productIds.includes(product.id))
  if (cards.length) return cards.map((n) => ({ key: `n:${n.id}`, name: n.name, description: n.description, source: 'card' }))
  return product.ingredients.map((name) => ({ key: `i:${name}`, name, description: '', source: 'label' }))
}

/**
 * 確認中に見つけた成分を足す。原本にも入れる場合は、
 * 成分カードで管理している商品 → 共有成分DBの同名カードを結び付ける（無ければ新しく作る）
 * 原材料表記で管理している商品 → 原材料の一覧に足す
 * 足した行は「確認済み」にし、メモに「確認中に追加」と残す
 */
export function addItemDuringCheck(product: Product, data: { name: string; description: string; toOriginal: boolean }): string | null {
  const name = data.name.trim()
  if (!name) return null
  let key: string
  if (!data.toOriginal) {
    key = `s:${Date.now().toString(36)}`
    ensure(product.id)
    setChecks((c) => c.productId === product.id, 'extraItems', (prev) => [...(prev ?? []), { key, name, description: data.description.trim() }])
  } else if (baseItems(product).some((i) => i.source === 'card') || !product.ingredients.length) {
    const existing = state.nutrients.find((n) => n.name.trim() === name)
    if (existing) {
      linkNutrientToProduct(existing.id, product.id)
      key = `n:${existing.id}`
    } else {
      key = `n:${addCustomNutrient({ name, description: data.description.trim(), productId: product.id })}`
    }
  } else {
    if (!product.ingredients.includes(name)) updateProduct(product.id, { ingredients: [...product.ingredients, name] })
    key = `i:${name}`
  }
  setItemStatus(product.id, key, 'checked')
  setItemMemo(product.id, key, '確認中に追加')
  return key
}

// ── チェック表全体の情報（確認日） ───────────────────────────────────────
const META_ID = '__meta'
const META_KEY = 'nacc-catalog-meta-v1'
type CatalogMeta = { checkDate: string; updatedAt: string }
/** 確認日の初期値 */
const DEFAULT_CHECK_DATE = '2026-10-04'

function loadMeta(): CatalogMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (raw) return JSON.parse(raw) as CatalogMeta
  } catch { /* 読めなければ初期値 */ }
  return { checkDate: DEFAULT_CHECK_DATE, updatedAt: '' }
}

const [meta, setMetaSignal] = createSignal<CatalogMeta>(loadMeta())
export const checkDate = () => meta().checkDate

export function setCheckDate(date: string) {
  const next = { checkDate: date || DEFAULT_CHECK_DATE, updatedAt: new Date().toISOString() }
  setMetaSignal(next)
  try { localStorage.setItem(META_KEY, JSON.stringify(next)) } catch { /* 端末に保存できなくても続ける */ }
  if (cloudReady) saveCatalogCheckFs({ productId: META_ID, updatedAt: next.updatedAt, json: JSON.stringify(next) }).catch((e) => console.warn('[catalog] meta save failed', e))
}

// ── 保存（端末＋クラウド） ───────────────────────────────────────────────
let cloudReady = false
const dirty = new Set<string>()
let timer = 0

function persist(productId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks))
  } catch (e) {
    console.warn('[catalog] local save failed', e)
  }
  dirty.add(productId)
  if (!cloudReady) return
  window.clearTimeout(timer)
  timer = window.setTimeout(flush, 800)
}

async function flush() {
  const ids = [...dirty]
  dirty.clear()
  for (const id of ids) {
    const check = productCheck(id)
    if (!check) continue
    try {
      await saveCatalogCheckFs({ productId: id, updatedAt: check.updatedAt, json: JSON.stringify(check) })
    } catch (e) {
      console.warn('[catalog] cloud save failed', e)
      dirty.add(id)
      cloudReady = false
      setCloudOk(false)
    }
  }
}

const [cloudOk, setCloudOk] = createSignal(false)
export { cloudOk }

/** クラウドの記録と端末の記録を、商品ごとに新しい方へそろえる */
async function syncWithCloud() {
  try {
    const remote = await fetchCatalogChecksFs()
    const merged = new Map(checks.map((c) => [c.productId, JSON.parse(JSON.stringify(c)) as ProductCheck]))
    for (const doc of remote) {
      if (doc.productId === META_ID) {
        try {
          const remoteMeta = JSON.parse(doc.json) as CatalogMeta
          if (remoteMeta.updatedAt > meta().updatedAt) {
            setMetaSignal(remoteMeta)
            localStorage.setItem(META_KEY, JSON.stringify(remoteMeta))
          }
        } catch { /* 読み飛ばす */ }
        continue
      }
      try {
        const parsed = JSON.parse(doc.json) as ProductCheck
        const local = merged.get(parsed.productId)
        if (!local || parsed.updatedAt > local.updatedAt) merged.set(parsed.productId, parsed)
        else if (local.updatedAt > parsed.updatedAt) dirty.add(local.productId)
      } catch { /* 壊れた記録は読み飛ばす */ }
    }
    for (const local of merged.values()) if (!remote.some((r) => r.productId === local.productId)) dirty.add(local.productId)
    const remoteMetaDoc = remote.find((r) => r.productId === META_ID)
    const localMeta = meta()
    if (localMeta.updatedAt && (!remoteMetaDoc || localMeta.updatedAt > remoteMetaDoc.updatedAt)) {
      saveCatalogCheckFs({ productId: META_ID, updatedAt: localMeta.updatedAt, json: JSON.stringify(localMeta) }).catch(() => {})
    }
    setChecks(reconcile([...merged.values()], { key: 'productId' }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checks))
    cloudReady = true
    setCloudOk(true)
    await flush()
  } catch (e) {
    console.warn('[catalog] cloud sync failed（クラウドのルールで catalogChecks が許可されていない可能性）', e)
    cloudReady = false
    setCloudOk(false)
  }
}

createRoot(() => {
  createEffect(on(() => state.dbStatus, (status) => { if (status === 'connected') void syncWithCloud() }))
})

/** チェック表の画面を開いたとき、最新の記録を取り直す */
export function refreshFromCloud() {
  if (state.dbStatus === 'connected') void syncWithCloud()
}

// ── 操作 ─────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString()

function ensure(productId: string): void {
  if (productCheck(productId)) return
  setChecks((prev) => [...prev, { productId, status: 'unchecked', memo: '', updatedAt: now(), items: {} }])
}

export function setItemStatus(productId: string, key: string, status: CheckStatus) {
  ensure(productId)
  const at = now()
  setChecks((c) => c.productId === productId, 'items', key, (prev) => ({ ...(prev ?? emptyItem()), status, updatedAt: at }))
  setChecks((c) => c.productId === productId, 'updatedAt', at)
  persist(productId)
}

/** ワンアクション: 未確認・保留 → 確認済み / 確認済み → 未確認 */
export function toggleItemCheck(productId: string, key: string) {
  setItemStatus(productId, key, itemCheck(productId, key).status === 'checked' ? 'unchecked' : 'checked')
}

export function setItemMemo(productId: string, key: string, memo: string) {
  ensure(productId)
  const at = now()
  setChecks((c) => c.productId === productId, 'items', key, (prev) => ({ ...(prev ?? emptyItem()), memo, updatedAt: at }))
  setChecks((c) => c.productId === productId, 'updatedAt', at)
  persist(productId)
}

export function setProductStatus(productId: string, status: CheckStatus) {
  ensure(productId)
  setChecks((c) => c.productId === productId, { status, updatedAt: now() })
  persist(productId)
}

export function setProductMemo(productId: string, memo: string) {
  ensure(productId)
  setChecks((c) => c.productId === productId, { memo, updatedAt: now() })
  persist(productId)
}

export const formatStamp = (iso: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
