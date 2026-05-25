import { type Component, createMemo, For, Show } from 'solid-js'
import { galleryState, getFilteredItems } from './store'
import GalleryCard from './GalleryCard'
import { CATEGORY_LABELS, CATEGORY_BG } from './types'
import { selectGalleryItem, toggleGalleryFavorite } from './store'
import { formatDate } from './store'

const GalleryGrid: Component = () => {
  const filtered = createMemo(() => getFilteredItems(galleryState))

  return (
    <div class="flex-1 overflow-y-auto">
      {/* Empty state */}
      <Show when={filtered().length === 0}>
        <div class="flex flex-col items-center justify-center h-full text-gray-300 gap-4 py-24">
          <svg class="w-20 h-20 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div class="text-center">
            <p class="text-sm font-medium text-gray-400">画像が見つかりません</p>
            <p class="text-xs text-gray-300 mt-1">フィルターを変更してみてください</p>
          </div>
        </div>
      </Show>

      {/* Grid view */}
      <Show when={galleryState.view === 'grid' && filtered().length > 0}>
        <div
          class="p-4 grid gap-3"
          style={{ "grid-template-columns": "repeat(auto-fill, minmax(155px, 1fr))" }}
        >
          <For each={filtered()}>
            {(item) => <GalleryCard item={item} />}
          </For>
        </div>
      </Show>

      {/* List view */}
      <Show when={galleryState.view === 'list' && filtered().length > 0}>
        <div class="p-4 space-y-2">
          <For each={filtered()}>
            {(item) => (
              <div
                class="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all group"
                classList={{ 'ring-2 ring-violet-500 ring-offset-1': galleryState.selectedId === item.id }}
                onClick={() => selectGalleryItem(item.id === galleryState.selectedId ? null : item.id)}
              >
                {/* Thumbnail */}
                <div class="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img
                    src={item.dataUrl ?? item.url ?? ''}
                    alt={item.label}
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <p class="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                  </div>
                  <p class="text-xs text-gray-400 truncate font-mono">{item.filename}</p>
                  <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span class={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_BG[item.category]}`}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    {item.tags.slice(0, 3).map((t) => (
                      <span class="text-[10px] text-gray-400">#{t}</span>
                    ))}
                  </div>
                </div>

                {/* Right meta */}
                <div class="flex flex-col items-end gap-1.5 shrink-0 text-xs text-gray-300">
                  <button
                    class="text-base"
                    classList={{ 'text-red-400': item.isFavorite }}
                    onClick={(e) => { e.stopPropagation(); toggleGalleryFavorite(item.id) }}
                  >
                    {item.isFavorite ? '♥' : '♡'}
                  </button>
                  <span class="text-[10px] text-gray-300">{formatDate(item.createdAt)}</span>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default GalleryGrid
