export type Tag = { type: 'product' | 'nutrient'; name: string }

export type Product = {
  id: string
  name: string
  image: string
  symptoms: string[]
  effects: string[]
  ingredients: string[]
  nutrientIds: string[]
  memo: string
}

export type Nutrient = {
  id: string
  name: string
  description: string
  productIds: string[]
  memo: string
}

export type Memo = {
  id?: number
  title: string
  body: string
  tags: Tag[]
  createdAt: Date
  updatedAt: Date
}

export type Blog = {
  id?: number
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
  id?: number
  dataUrl: string
  name: string
  createdAt: Date
}

export type Notebook = {
  id?: number
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

export type Page = 'memo' | 'db01' | 'db02' | 'blog' | 'notebook' | 'trash'
export type BlogMode = 'memo' | 'view'
export type FontSize = 's' | 'm' | 'l' | 'xl'
export type FontSizePx = { s: 13; m: 16; l: 19; xl: 22 }
export type DbView = 'table' | 'detail'

export type ColumnDef = {
  id: string
  label: string
  visible: boolean
  locked: boolean
}
