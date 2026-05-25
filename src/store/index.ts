import { createStore } from 'solid-js/store'
import type { Page, BlogMode, FontSize, Blog, Memo, DbView, ColumnDef } from '../types'

export type AppState = {
  page: Page
  blogMode: BlogMode
  fontSize: FontSize
  darkMode: boolean
  dbView: DbView
  selectedProductId: string | null
  selectedNutrientId: string | null
  selectedBlogId: number | null
  selectedMemoId: number | null
  sidebarOpen: boolean
  settingsPanelOpen: boolean
  galleryPanelOpen: boolean
  blogFilterTags: string[]
  memos: Memo[]
  blogs: Blog[]
  trashBlogs: Blog[]
  db01Columns: ColumnDef[]
  db02Columns: ColumnDef[]
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

const [state, setState] = createStore<AppState>({
  page: 'db01',
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
  blogs: [],
  trashBlogs: [],
  db01Columns: DB01_COLUMNS_DEFAULT,
  db02Columns: DB02_COLUMNS_DEFAULT,
})

export { state, setState }

export function navigate(page: Page) {
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
