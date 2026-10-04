import { createSignal } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import type { Product } from '../../types'
import { navigate, setState, state } from '../../store'

// リーフレット = 商品原本を参照して作る配布用の表示セット。
// 原本（products / nutrients）には一切書き込まず、差分だけをここに保存する。

/** title / description はこのリーフレットだけの書き換え（原本の成分カードは変わらない） */
export type LeafletCard = { kind: 'card'; key: string; nutrientId: string; visible: boolean; title?: string; description?: string }
export type TopicIcon = 'none' | 'circle' | 'point' | 'check' | 'info' | 'caution' | 'hint' | 'star' | 'arrow'
export type TopicUnderline = 'line' | 'double' | 'none'
export type LeafletTopic = { kind: 'topic'; key: string; heading: string; body: string; icon?: TopicIcon; underline?: TopicUnderline }
export type LeafletItem = LeafletCard | LeafletTopic
export type LeafletStatus = 'draft' | 'ready'

/** レイアウト上のセクション。header の下に好きな順で並ぶ */
export type SectionType = 'gallery' | 'circles' | 'topic'
export type GalleryLook = 'card' | 'main'
export type LeafletSection = {
  id: string
  type: SectionType
  /** gallery: 見出し（任意） / circles: 帯タイトル */
  title: string
  /** gallery の見た目: カード or 主要成分 */
  look: GalleryLook
  /** circles に入れたカード（最大4） */
  cardKeys: string[]
  /** circles の丸の上のラベル（cardKey → 文字） */
  labels: Record<string, string>
  /** topic の本文 */
  body: string
  /** topic の見出しアイコン */
  icon: TopicIcon
  /** circles の丸の中の文字（改行入り）。未設定なら成分名 */
  names: Record<string, string>
  /** circles の丸の中の説明（原本の説明を引用して、ここで自由に書き換える） */
  descs: Record<string, string>
  /** topic の見出しの下線 */
  underline: TopicUnderline
}

/** PDF（印刷）時に、ページの片隅へ小さく入れる表記 */
export type PageCorner = 'br' | 'bl' | 'tr'
export type PageMark = { name: boolean; number: boolean; corner: PageCorner }

export type HeaderStyle = 'classic' | 'wide' | 'split' | 'banner'
/** 二重線: なし／商品名の下／写真の下 */
export type HeaderRule = 'none' | 'title' | 'photo'

/** マーカー／下線。対象テキスト（targetId）の文字位置で持つので原本は書き換えない */
export type MarkStyle = 'marker' | 'underline'
export type TextMark = { s: number; e: number; style: MarkStyle }

/** header画像の微調整（x,y は枠に対する%、scale は倍率） */
export type ImageAdjust = { x: number; y: number; scale: number }
export const imageKeyOf = (image: LeafletImage) =>
  image.kind === 'asset' ? `asset:${image.name}` : image.kind === 'upload' ? `upload:${image.id}` : 'product'

export type LeafletImage =
  | { kind: 'product' }
  | { kind: 'asset'; name: string }
  | { kind: 'upload'; id: number }

export type LeafletVersion = '2' | '2.1'

export type Leaflet = {
  id: string
  /** '2.1' は商品ノートの並びのまま1列で編集する版。未設定は従来の2カラム版 */
  version?: LeafletVersion
  productId: string
  name: string
  /** header の小さめタイトル（空なら商品名） */
  title: string
  image: LeafletImage
  /** 画像ごとの微調整（画像を切り替えても、それぞれの大きさを覚えておく） */
  imageAdjust?: Record<string, ImageAdjust>
  headerStyle: HeaderStyle
  headerRule: HeaderRule
  pageMark: PageMark
  /** targetId（例: card:<key>:desc / section:<id>:body） → マーク一覧 */
  marks: Record<string, TextMark[]>
  audience: string
  comment: string
  contact: string
  status: LeafletStatus
  /** 2カラム編集の右カラム（この資料に掲載する内容）の並び */
  items: LeafletItem[]
  sections: LeafletSection[]
  /** 作成時点の原本。どの原本から作ったかを追跡するための記録 */
  source: { productName: string; nutrientIds: string[]; capturedAt: string }
  createdAt: string
  updatedAt: string
}

export type LeafletView =
  | { view: 'gallery' }
  | { view: 'edit'; id: string }
  | { view: 'edit21'; id: string }
  | { view: 'layout'; id: string }

export const MAX_CIRCLES = 4
const STORAGE_KEY = 'nacc-leaflets-v1'

export const newKey = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function newSection(type: SectionType): LeafletSection {
  return { id: newKey('s'), type, title: '', look: 'card', cardKeys: [], labels: {}, body: '', icon: type === 'topic' ? 'point' : 'none', names: {}, descs: {}, underline: 'line' }
}

/** 旧形式（sections / image / title なし）を読み替える */
function normalize(raw: Partial<Leaflet>): Leaflet {
  const leaflet = {
    title: '',
    image: { kind: 'product' },
    headerStyle: 'wide',
    headerRule: 'none',
    pageMark: { name: true, number: true, corner: 'br' },
    marks: {},
    sections: [newSection('gallery')],
    ...raw,
  } as Leaflet
  // 「センター」は廃止 → 横長コンパクト（ワイド）へ
  if ((leaflet.headerStyle as string) === 'center') leaflet.headerStyle = 'wide'
  leaflet.sections = leaflet.sections.map((section) => ({ ...newSection(section.type), ...section }))
  return leaflet
}

function load(): Leaflet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Leaflet>[]).map(normalize) : []
  } catch {
    return []
  }
}

const [leaflets, setLeaflets] = createStore<Leaflet[]>(load())
const [savedAt, setSavedAt] = createSignal<number | null>(null)
const [leafletView, setLeafletView] = createSignal<LeafletView>({ view: 'gallery' })

export { leaflets, savedAt, leafletView, setLeafletView }

/** 明示的な保存（自動保存に加えて、保存ボタンから呼ぶ） */
export function saveLeafletsNow(): boolean {
  persist()
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

/** アプリのheaderから直接リーフレットGalleryへ。商品未選択なら最後に触ったリーフレットの商品 */
export function openLeafletGallery() {
  if (!state.selectedProductId) {
    const recent = [...leaflets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    const productId = recent?.productId ?? state.products[0]?.id ?? null
    setState({ selectedProductId: productId })
  }
  setLeafletView({ view: 'gallery' })
  navigate('leaflet')
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leaflets))
    setSavedAt(Date.now())
  } catch (e) {
    console.warn('[leaflet] save failed', e)
  }
}

/** 掲載内容は空で始め、左（原本）から右へ運んで作る */
export function createLeaflet(product: Product, nutrientIds: string[], image: LeafletImage = { kind: 'product' }): string {
  const now = new Date().toISOString()
  const id = newKey('lf')
  const count = leaflets.filter((leaflet) => leaflet.productId === product.id).length
  setLeaflets((prev) => [
    ...prev,
    {
      id,
      productId: product.id,
      name: `${product.name} リーフレット ${count + 1}`,
      title: '',
      image,
      headerStyle: 'wide',
      headerRule: 'none',
      pageMark: { name: true, number: true, corner: 'br' },
      marks: {},
      audience: '',
      // 原本の商品説明を初期コメントに入れる（ここで書き換えても原本は変わらない）
      comment: product.description ?? '',
      contact: '',
      status: 'draft',
      items: [],
      sections: [newSection('gallery')],
      source: { productName: product.name, nutrientIds: [...nutrientIds], capturedAt: now },
      createdAt: now,
      updatedAt: now,
    },
  ])
  persist()
  return id
}

/** Ver2.1: 原本のカードを全部入れた状態で作る（非表示はチェックで外す）。header はワイド固定 */
export function createLeafletV21(product: Product, nutrientIds: string[], image: LeafletImage = { kind: 'product' }): string {
  const id = createLeaflet(product, nutrientIds, image)
  setLeaflets((leaflet) => leaflet.id === id, {
    version: '2.1',
    headerStyle: 'wide',
    name: `${product.name} リーフレット Ver2.1`,
    items: nutrientIds.map((nutrientId) => ({ kind: 'card', key: newKey('c'), nutrientId, visible: true })),
  })
  persist()
  return id
}

/** 編集画面をリーフレットの版に合わせて開く */
export function openLeafletEditor(leaflet: Leaflet) {
  setLeafletView(leaflet.version === '2.1' ? { view: 'edit21', id: leaflet.id } : { view: 'edit', id: leaflet.id })
}

/** 商品ノートの赤いボタン: その商品の Ver2.1 リーフレットを作って、すぐ編集画面へ */
export function openLeafletV21(productId: string) {
  const product = state.products.find((item) => item.id === productId)
  if (!product) return
  const nutrientIds = state.nutrients
    .filter((nutrient) => product.nutrientIds.includes(nutrient.id) || nutrient.productIds.includes(product.id))
    .map((nutrient) => nutrient.id)
  const id = createLeafletV21(product, nutrientIds, defaultImage(product))
  setState({ selectedProductId: productId })
  setLeafletView({ view: 'edit21', id })
  navigate('leaflet')
}

/** photos.ts の defaultImageFor を後から差し込む（循環 import を避ける） */
let defaultImage: (product: Product) => LeafletImage = () => ({ kind: 'product' })
export function setDefaultImageResolver(resolver: (product: Product) => LeafletImage) {
  defaultImage = resolver
}

/** 既存リーフレットの内容を引き継ぐが、基準は同じ商品原本のまま */
export function duplicateLeaflet(id: string): string | null {
  const base = leaflets.find((leaflet) => leaflet.id === id)
  if (!base) return null
  const now = new Date().toISOString()
  const copyId = newKey('lf')
  const copy: Leaflet = {
    ...JSON.parse(JSON.stringify(base)),
    id: copyId,
    name: `${base.name}（複製）`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  }
  setLeaflets((prev) => [...prev, copy])
  persist()
  return copyId
}

export function updateLeaflet(id: string, patch: Partial<Omit<Leaflet, 'id' | 'productId' | 'source' | 'createdAt' | 'items' | 'sections'>>) {
  setLeaflets((leaflet) => leaflet.id === id, { ...patch, updatedAt: new Date().toISOString() })
  persist()
}

/** key単位で差分反映し、既存カードのDOMを使い回す（並び替えアニメーションのため） */
export function setLeafletItems(id: string, items: LeafletItem[]) {
  setLeaflets((leaflet) => leaflet.id === id, 'items', reconcile(items, { key: 'key' }))
  // 掲載から外れたカードはサークルからも外す
  const keys = new Set(items.map((item) => item.key))
  setLeaflets((leaflet) => leaflet.id === id, 'sections', (sections) =>
    sections.map((section) => ({ ...section, cardKeys: section.cardKeys.filter((key) => keys.has(key)) }))
  )
  setLeaflets((leaflet) => leaflet.id === id, 'updatedAt', new Date().toISOString())
  persist()
}

export function setLeafletSections(id: string, sections: LeafletSection[]) {
  setLeaflets((leaflet) => leaflet.id === id, 'sections', reconcile(sections, { key: 'id' }))
  setLeaflets((leaflet) => leaflet.id === id, 'updatedAt', new Date().toISOString())
  persist()
}

export function setLeafletMarks(id: string, targetId: string, marks: TextMark[]) {
  setLeaflets((leaflet) => leaflet.id === id, 'marks', targetId, marks.length ? marks : undefined!)
  setLeaflets((leaflet) => leaflet.id === id, 'updatedAt', new Date().toISOString())
  persist()
}

export function deleteLeaflet(id: string) {
  setLeaflets((prev) => prev.filter((leaflet) => leaflet.id !== id))
  persist()
}

/** 要件定義 6.3 の保存形式（カードのみ）で書き出す */
export function cardLayout(leaflet: Leaflet) {
  return leaflet.items
    .filter((item): item is LeafletCard => item.kind === 'card')
    .map((card, order) => ({ nutrientId: card.nutrientId, order, visible: card.visible }))
}
