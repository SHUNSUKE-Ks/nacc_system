export type Tag = { type: 'product' | 'nutrient'; name: string }

export type Product = {
  id: string
  name: string
  image: string
  category: 'supplement' | 'cosmetic'
  description: string
  price: number
  volume: string
  symptoms: string[]
  effects: string[]
  ingredients: string[]
  nutrientIds: string[]
  memo: string
  createdAt?: Date
}

export type Nutrient = {
  id: string
  name: string
  description: string
  productIds: string[]
  memo: string
  createdAt?: Date
}

export type Symptom = {
  id: string
  name: string
  description: string
  productIds: string[]
  memo: string
  createdAt?: Date
}

/** 写真ギャラリーの1枚を指す（商品の写真・アプリ同梱の画像・端末から追加した画像） */
export type PhotoRef =
  | { kind: 'product'; productId: string }
  | { kind: 'asset'; name: string }
  | { kind: 'upload'; id: number }

export type Memo = {
  id?: string
  title: string
  body: string
  tags: Tag[]
  /** 入れ先のノートブック（未設定は「未分類」） */
  notebookId?: string
  /** 写真ギャラリーから貼った画像 */
  images?: PhotoRef[]
  /** ごみ箱に入れた日時 */
  deletedAt?: Date
  /** 旧ブログ記事・旧ノートブックのページから移したときの元ID（二重に移さないため） */
  fromBlogId?: string
  fromPageId?: string
  createdAt: Date
  updatedAt: Date
}

export type Blog = {
  id?: string
  title: string
  body: string
  cover?: string
  coverType: 'none' | 'product' | 'upload'
  categoryTags: Tag[]
  mode: 'memo' | 'published'
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export type GalleryPhoto = {
  id?: string
  dataUrl: string
  name: string
  createdAt: Date
}

export type Notebook = {
  id?: string
  title: string
  /** 親ノートブック（1段だけ入れ子にできる） */
  parentId?: string
  /** 旧形式のページ。メモへ移したあとも消さずに残す */
  pages: NotebookPage[]
  createdAt: Date
  updatedAt: Date
}

export type NotebookPage = {
  id: string
  title: string
  body: string
  order: number
}

export type Page = 'memo' | 'db01' | 'db02' | 'db03' | 'db10' | 'blog' | 'notebook' | 'trash' | 'gallery' | 'leaflet' | 'catalog' | 'photos'
export type BlogMode = 'memo' | 'view'
export type FontSize = 's' | 'm' | 'l' | 'xl'
export type FontSizePx = { s: 13; m: 16; l: 19; xl: 22 }
export type DbView = 'gallery' | 'table' | 'detail' | 'index'

export type ColumnDef = {
  id: string
  label: string
  visible: boolean
  locked: boolean
}
