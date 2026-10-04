import Dexie, { type Table } from 'dexie'
import { createSignal } from 'solid-js'
import { productImageUrl } from '../../db/products'
import type { Product } from '../../types'
import { setDefaultImageResolver, type LeafletImage } from './store'

// 写真ギャラリー
// - アプリ同梱: src/assets/leaflet-photos/ に置いた画像（背景透過PNGなど）は自動で並ぶ
// - 端末から追加: IndexedDB（NaccLeafletPhotos）に保存。この端末・このブラウザだけで使える

export type UploadedPhoto = { id?: number; name: string; dataUrl: string; createdAt: number }

class LeafletPhotoDB extends Dexie {
  photos!: Table<UploadedPhoto, number>
  constructor() {
    super('NaccLeafletPhotos')
    this.version(1).stores({ photos: '++id, createdAt' })
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

export async function addPhotoFiles(files: FileList | File[]): Promise<number[]> {
  const ids: number[] = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue
    const dataUrl = await toDataUrl(file)
    ids.push(await db.photos.add({ name: file.name, dataUrl, createdAt: Date.now() }))
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
