import { createSignal } from 'solid-js'

// 商品のお気に入り（この端末のブラウザに保存）
const STORAGE_KEY = 'nacc-favorite-products'

function load(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

const [favoriteIds, setFavoriteIds] = createSignal<string[]>(load())
export { favoriteIds }

export const isFavorite = (productId: string) => favoriteIds().includes(productId)

export function toggleFavorite(productId: string): boolean {
  const next = isFavorite(productId)
    ? favoriteIds().filter((id) => id !== productId)
    : [...favoriteIds(), productId]
  setFavoriteIds(next)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (e) {
    console.warn('[favorites] save failed', e)
  }
  return next.includes(productId)
}
