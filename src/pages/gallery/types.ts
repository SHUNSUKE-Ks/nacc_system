export type GalleryCategory = 'product' | 'nutrient' | 'reference' | 'other'

export const CATEGORY_LABELS: Record<GalleryCategory, string> = {
  product:   '商品',
  nutrient:  '栄養素',
  reference: '参考資料',
  other:     'その他',
}

export const CATEGORY_BG: Record<GalleryCategory, string> = {
  product:   'bg-amber-100 text-amber-700',
  nutrient:  'bg-emerald-100 text-emerald-700',
  reference: 'bg-blue-100 text-blue-700',
  other:     'bg-gray-100 text-gray-600',
}

export const CATEGORY_ICON: Record<GalleryCategory, string> = {
  product:   '📦',
  nutrient:  '🌿',
  reference: '📋',
  other:     '📁',
}

/**
 * Gallery item — JSONに紐付くデータ構造
 *
 * filename  : 実ファイル名 (e.g. "vitamin_c_001.jpg")
 * label     : 表示名（日本語）
 * description : 説明文（任意）
 * tags      : タグ一覧
 * category  : カテゴリ区分
 * mimeType  : 画像形式 ("image/jpeg" etc.)
 * fileSize  : バイト数（任意）
 * width/height : 画像解像度 px（任意）
 * url       : 外部URL or public パス
 * dataUrl   : Base64（アップロード済み画像）
 * isFavorite : お気に入りフラグ
 * createdAt / updatedAt : 日時
 */
export type GalleryItem = {
  id: string
  filename: string
  label: string
  description?: string
  tags: string[]
  category: GalleryCategory
  mimeType: string
  fileSize?: number
  width?: number
  height?: number
  url?: string
  dataUrl?: string
  isFavorite: boolean
  isDeleted?: boolean
  createdAt: Date
  updatedAt: Date
}

export type GalleryView = 'grid' | 'list'
export type GallerySortBy = 'createdAt' | 'updatedAt' | 'label'
