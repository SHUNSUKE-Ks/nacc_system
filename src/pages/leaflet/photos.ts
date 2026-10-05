import Dexie, { type Table } from 'dexie'
import { createSignal } from 'solid-js'
import { productImageUrl } from '../../db/products'
import type { PhotoRef, Product } from '../../types'
import { state } from '../../store'
import { setDefaultImageResolver, type LeafletImage } from './store'

// 写真ギャラリー
// - アプリ同梱: src/assets/leaflet-photos/ に置いた画像（背景透過PNGなど）は自動で並ぶ
// - 端末から追加: IndexedDB（NaccLeafletPhotos）に保存。この端末・このブラウザだけで使える

export type UploadedPhoto = { id?: number; name: string; dataUrl: string; createdAt: number; group?: string }

class LeafletPhotoDB extends Dexie {
  photos!: Table<UploadedPhoto, number>
  constructor() {
    super('NaccLeafletPhotos')
    this.version(1).stores({ photos: '++id, createdAt' })
    this.version(2).stores({ photos: '++id, createdAt, group' })
  }
}

const db = new LeafletPhotoDB()

const bundledModules = import.meta.glob('/src/assets/leaflet-photos/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const bundledPhotos = Object.entries(bundledModules)
  .map(([path, src]) => ({ name: path.split('/').pop() ?? path, src }))
  .sort((a, b) => a.name.localeCompare(b.name))

const [uploadedPhotos, setUploadedPhotos] = createSignal<UploadedPhoto[]>([])
export { uploadedPhotos }

export async function loadPhotos() {
  try {
    setUploadedPhotos(await db.photos.orderBy('createdAt').reverse().toArray())
  } catch (e) {
    console.warn('[leaflet] photo load failed', e)
  }
}
void loadPhotos()

const MAX_EDGE = 1800

/** 大きすぎる写真は縮小して保存（PNG/WebPは透過を保つ） */
async function toDataUrl(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  if (file.type === 'image/svg+xml') return original
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1) return original
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return file.type === 'image/jpeg' ? canvas.toDataURL('image/jpeg', 0.9) : canvas.toDataURL('image/png')
}

export async function addPhotoFiles(files: FileList | File[], group?: string): Promise<number[]> {
  const ids: number[] = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    const dataUrl = await toDataUrl(file)
    ids.push(await db.photos.add({ name: file.name, dataUrl, createdAt: Date.now(), ...(group ? { group } : {}) }))
  }
  await loadPhotos()
  return ids
}

export async function deletePhoto(id: number) {
  await db.photos.delete(id)
  await loadPhotos()
}

/** ファイル名の頭が「商品ID_」の画像（例: C03_bb-richcream-transparent.png）を、その商品の初期画像にする */
export function defaultImageFor(product: Product): LeafletImage {
  const prefix = `${product.id}_`.toLowerCase()
  const photo = bundledPhotos.find((item) => item.name.toLowerCase().startsWith(prefix))
  return photo ? { kind: 'asset', name: photo.name } : { kind: 'product' }
}

export function imageSrc(image: LeafletImage, product: Product): string {
  if (image.kind === 'asset') {
    // ファイル名の頭に商品IDを付けて改名しても、前の名前で選んだ画像を見失わない
    const photo = bundledPhotos.find((item) => item.name === image.name) ?? bundledPhotos.find((item) => item.name.endsWith(`_${image.name}`))
    return photo?.src ?? ''
  }
  if (image.kind === 'upload') return uploadedPhotos().find((photo) => photo.id === image.id)?.dataUrl ?? ''
  return product.image ? productImageUrl(product.image) : ''
}

setDefaultImageResolver(defaultImageFor)

// ── 写真ページのグループ ─────────────────────────────────────────────────
// 「商品画像」は商品の写真とアプリ同梱の画像を自動で並べる（固定）。
// それ以外のグループは端末から追加した写真の入れ先。名前は端末に保存する。
export const PRODUCT_GROUP = '商品画像'
/** グループを決めずに追加された写真（以前リーフレットから追加したものなど） */
export const LOOSE_GROUP = 'その他'
const GROUPS_KEY = 'nacc-photo-groups-v1'
const DEFAULT_GROUPS = ['2026_写真']

function loadGroups(): string[] {
  try {
    const raw = localStorage.getItem(GROUPS_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch { /* 読めなければ初期値 */ }
  return DEFAULT_GROUPS
}

const [photoGroups, setPhotoGroups] = createSignal<string[]>(loadGroups())
export { photoGroups }

export function addPhotoGroup(name: string): boolean {
  const n = name.trim()
  if (!n || n === PRODUCT_GROUP || n === LOOSE_GROUP || photoGroups().includes(n)) return false
  const next = [...photoGroups(), n]
  setPhotoGroups(next)
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)) } catch { /* 端末に保存できなくても続ける */ }
  return true
}

export const uploadsIn = (group: string) =>
  uploadedPhotos().filter((photo) => (group === LOOSE_GROUP ? !photo.group || !photoGroups().includes(photo.group) : photo.group === group))

/** 「商品画像」グループの中身: 商品の写真＋アプリ同梱の画像 */
export function productGroupPhotos(): { ref: PhotoRef; src: string; name: string }[] {
  const fromProducts = state.products
    .filter((product) => product.image)
    .map((product) => ({ ref: { kind: 'product', productId: product.id } as PhotoRef, src: productImageUrl(product.image), name: product.name }))
  const fromAssets = bundledPhotos.map((photo) => ({ ref: { kind: 'asset', name: photo.name } as PhotoRef, src: photo.src, name: photo.name }))
  return [...fromProducts, ...fromAssets]
}

/** メモなどに貼った写真の表示先URL（端末から追加した写真は、追加した端末でだけ見える） */
export function photoSrc(ref: PhotoRef): string {
  if (ref.kind === 'product') {
    const product = state.products.find((item) => item.id === ref.productId)
    return product?.image ? productImageUrl(product.image) : ''
  }
  if (ref.kind === 'asset') return bundledPhotos.find((item) => item.name === ref.name)?.src ?? ''
  return uploadedPhotos().find((photo) => photo.id === ref.id)?.dataUrl ?? ''
}

export function photoName(ref: PhotoRef): string {
  if (ref.kind === 'product') return state.products.find((item) => item.id === ref.productId)?.name ?? ref.productId
  if (ref.kind === 'asset') return ref.name
  return uploadedPhotos().find((photo) => photo.id === ref.id)?.name ?? '端末の写真'
}
