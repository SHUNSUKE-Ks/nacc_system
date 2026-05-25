import { createStore } from 'solid-js/store'
import type { GalleryItem, GalleryView, GallerySortBy, GalleryCategory } from './types'
import { GALLERY_SAMPLE } from './data'

type GalleryLocalState = {
  items: GalleryItem[]
  masterTags: string[]          // 全体タグ（削除しても残る）
  view: GalleryView
  sortBy: GallerySortBy
  search: string
  selectedCategory: GalleryCategory | 'all'
  selectedTags: string[]
  favoritesOnly: boolean
  selectedId: string | null
  detailOpen: boolean
  showTrash: boolean
  lightboxId: string | null
  tagSheetId: string | null
}

function extractTags(items: GalleryItem[]): string[] {
  const set = new Set<string>()
  items.forEach((i) => i.tags.forEach((t) => set.add(t)))
  return Array.from(set).sort()
}

export const [galleryState, setGalleryState] = createStore<GalleryLocalState>({
  items: GALLERY_SAMPLE,
  masterTags: extractTags(GALLERY_SAMPLE),
  view: 'grid',
  sortBy: 'createdAt',
  search: '',
  selectedCategory: 'all',
  selectedTags: [],
  favoritesOnly: false,
  selectedId: null,
  detailOpen: false,
  showTrash: false,
  lightboxId: null,
  tagSheetId: null,
})

// マスタータグに追加（重複・自動ソート）
export function addMasterTag(tag: string) {
  const t = tag.trim()
  if (!t) return
  setGalleryState('masterTags', (prev) =>
    prev.includes(t) ? prev : [...prev, t].sort()
  )
}

export function selectGalleryItem(id: string | null) {
  setGalleryState({ selectedId: id, detailOpen: id !== null })
}

export function openLightbox(id: string) {
  setGalleryState({ lightboxId: id })
}

export function closeLightbox() {
  setGalleryState({ lightboxId: null })
}

export function openTagSheet(id: string) {
  setGalleryState({ tagSheetId: id })
}

export function closeTagSheet() {
  setGalleryState({ tagSheetId: null })
}

export function toggleGalleryFavorite(id: string) {
  setGalleryState('items', (prev) =>
    prev.map((item) => item.id === id ? { ...item, isFavorite: !item.isFavorite } : item)
  )
}

export function toggleGalleryTag(tag: string) {
  setGalleryState('selectedTags', (prev) =>
    prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
  )
}

export function updateGalleryItem(id: string, patch: Partial<GalleryItem>) {
  setGalleryState('items', (prev) =>
    prev.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date() } : item)
  )
}

export function moveToGalleryTrash(id: string) {
  updateGalleryItem(id, { isDeleted: true })
  setGalleryState({ selectedId: null, detailOpen: false })
}

export function restoreFromGalleryTrash(id: string) {
  updateGalleryItem(id, { isDeleted: false })
  setGalleryState({ selectedId: null, detailOpen: false })
}

export function permanentDeleteGalleryItem(id: string) {
  setGalleryState('items', (prev) => prev.filter((item) => item.id !== id))
  setGalleryState({ selectedId: null, detailOpen: false })
}

export function getAllTags(items: GalleryItem[]): string[] {
  const tagSet = new Set<string>()
  items.filter(i => !i.isDeleted).forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)))
  return Array.from(tagSet).sort()
}

export function getFilteredItems(s: typeof galleryState): GalleryItem[] {
  let items = [...s.items]

  if (s.showTrash) return items.filter((i) => i.isDeleted)

  items = items.filter((i) => !i.isDeleted)

  if (s.favoritesOnly) items = items.filter((i) => i.isFavorite)
  if (s.selectedCategory !== 'all') items = items.filter((i) => i.category === s.selectedCategory)
  if (s.selectedTags.length > 0)
    items = items.filter((i) => s.selectedTags.every((t) => i.tags.includes(t)))
  if (s.search.trim()) {
    const q = s.search.toLowerCase()
    items = items.filter((i) =>
      i.label.toLowerCase().includes(q) ||
      i.filename.toLowerCase().includes(q) ||
      (i.description?.toLowerCase().includes(q) ?? false) ||
      i.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  items.sort((a, b) => {
    if (s.sortBy === 'label') return a.label.localeCompare(b.label, 'ja')
    if (s.sortBy === 'updatedAt') return b.updatedAt.getTime() - a.updatedAt.getTime()
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  return items
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(date))
}
