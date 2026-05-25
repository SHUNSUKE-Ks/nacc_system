import { type Component, createMemo, For, Show } from 'solid-js'
import { galleryState, setGalleryState, toggleGalleryTag, getAllTags } from './store'
import type { GalleryCategory } from './types'
import { CATEGORY_ICON } from './types'

const CATEGORIES: Array<{ value: GalleryCategory | 'all'; label: string; icon: string }> = [
  { value: 'all',       label: 'すべて',   icon: '✨' },
  { value: 'product',   label: '商品',     icon: CATEGORY_ICON['product'] },
  { value: 'nutrient',  label: '栄養素',   icon: CATEGORY_ICON['nutrient'] },
  { value: 'reference', label: '参考資料', icon: CATEGORY_ICON['reference'] },
  { value: 'other',     label: 'その他',   icon: CATEGORY_ICON['other'] },
]

const SORT_OPTIONS: Array<{ value: 'createdAt' | 'updatedAt' | 'label'; label: string }> = [
  { value: 'createdAt', label: '作成日（新しい順）' },
  { value: 'updatedAt', label: '更新日（新しい順）' },
  { value: 'label',     label: 'ラベル（昇順）' },
]

const GallerySidebar: Component = () => {
  const allTags = createMemo(() => getAllTags(galleryState.items))

  return (
    <aside class="w-44 bg-gray-50/80 border-r border-gray-100 flex flex-col overflow-hidden shrink-0">
      <div class="flex-1 overflow-y-auto p-3 space-y-5">

        <Show when={galleryState.showTrash}>
          <div class="px-2 py-3 text-center">
            <p class="text-xs font-semibold text-red-400">ごみ箱</p>
            <p class="text-[10px] text-gray-400 mt-0.5">削除した画像はここに入ります</p>
          </div>
        </Show>

        <Show when={!galleryState.showTrash}>

        {/* Favorites toggle */}
        <div>
          <button
            class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all font-medium"
            classList={{
              'bg-linear-to-r from-red-50 to-pink-50 text-red-500 shadow-sm': galleryState.favoritesOnly,
              'text-gray-500 hover:bg-white hover:shadow-sm': !galleryState.favoritesOnly,
            }}
            onClick={() => setGalleryState({ favoritesOnly: !galleryState.favoritesOnly })}
          >
            <span class="text-base">{galleryState.favoritesOnly ? '♥' : '♡'}</span>
            <span>お気に入り</span>
          </button>
        </div>

        {/* Category filter */}
        <div>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">カテゴリ</p>
          <div class="space-y-0.5">
            <For each={CATEGORIES}>
              {(cat) => (
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all text-left"
                  classList={{
                    'bg-white shadow-sm text-violet-600 font-semibold': galleryState.selectedCategory === cat.value,
                    'text-gray-500 hover:bg-white/80 hover:text-gray-700': galleryState.selectedCategory !== cat.value,
                  }}
                  onClick={() => setGalleryState({ selectedCategory: cat.value })}
                >
                  <span class="text-sm">{cat.icon}</span>
                  <span class="truncate">{cat.label}</span>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Tags */}
        <div>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">タグ</p>
          <div class="flex flex-wrap gap-1.5 px-1">
            <For each={allTags()}>
              {(tag) => (
                <button
                  class="text-[11px] px-2 py-0.5 rounded-full border transition-all font-medium"
                  classList={{
                    'bg-violet-500 border-violet-500 text-white shadow-sm': galleryState.selectedTags.includes(tag),
                    'border-gray-200 bg-white text-gray-500 hover:border-violet-300 hover:text-violet-500': !galleryState.selectedTags.includes(tag),
                  }}
                  onClick={() => toggleGalleryTag(tag)}
                >
                  {tag}
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Sort */}
        <div>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">並び順</p>
          <div class="space-y-0.5">
            <For each={SORT_OPTIONS}>
              {(opt) => (
                <button
                  class="w-full flex items-center px-3 py-1.5 rounded-xl text-[11px] transition-all text-left"
                  classList={{
                    'bg-white shadow-sm text-violet-600 font-semibold': galleryState.sortBy === opt.value,
                    'text-gray-500 hover:bg-white/80': galleryState.sortBy !== opt.value,
                  }}
                  onClick={() => setGalleryState({ sortBy: opt.value })}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </div>
        </div>

        </Show>{/* end !showTrash */}

      </div>

      {/* Reset filters */}
      <Show when={galleryState.favoritesOnly || galleryState.selectedCategory !== 'all' || galleryState.selectedTags.length > 0 || galleryState.search}>
        <div class="px-3 pb-1">
          <button
            class="w-full py-2 rounded-xl text-xs text-gray-400 hover:text-red-400 hover:bg-red-50 transition-colors font-medium"
            onClick={() => setGalleryState({
              favoritesOnly: false,
              selectedCategory: 'all',
              selectedTags: [],
              search: '',
            })}
          >
            フィルターをリセット
          </button>
        </div>
      </Show>

      {/* Trash */}
      <div class="px-3 py-3 border-t border-gray-100 shrink-0">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all font-medium"
          classList={{
            'bg-red-50 text-red-500': galleryState.showTrash,
            'text-gray-400 hover:bg-white hover:text-gray-600': !galleryState.showTrash,
          }}
          onClick={() => setGalleryState({
            showTrash: !galleryState.showTrash,
            selectedId: null,
            detailOpen: false,
            favoritesOnly: false,
            selectedCategory: 'all',
            selectedTags: [],
          })}
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>ごみ箱</span>
          {galleryState.items.filter(i => i.isDeleted).length > 0 && (
            <span class="ml-auto text-xs bg-red-100 text-red-500 rounded-full px-1.5 py-0.5 font-bold min-w-5 text-center">
              {galleryState.items.filter(i => i.isDeleted).length}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}

export default GallerySidebar
