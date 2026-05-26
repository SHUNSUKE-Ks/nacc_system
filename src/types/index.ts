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

export type Memo = {
  id?: string
  title: string
  body: string
  tags: Tag[]
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

export type Page = 'memo' | 'db01' | 'db02' | 'db03' | 'db10' | 'blog' | 'notebook' | 'trash' | 'gallery'
export type BlogMode = 'memo' | 'view'
export type FontSize = 's' | 'm' | 'l' | 'xl'
export type FontSizePx = { s: 13; m: 16; l: 19; xl: 22 }
export type DbView = 'table' | 'detail' | 'index'

export type ColumnDef = {
  id: string
  label: string
  visible: boolean
  locked: boolean
}
