import { type Component, createMemo } from 'solid-js'
import { galleryState, setGalleryState, getFilteredItems } from './store'

const GalleryHeader: Component<{ onBack: () => void }> = (props) => {
  const count = createMemo(() => getFilteredItems(galleryState).length)
  const total = () => galleryState.items.length

  return (
    <header class="h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3 shrink-0">

      {/* Back button */}
      <button
        class="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 transition-colors shrink-0 group"
        onClick={props.onBack}
        title="メインアプリに戻る"
      >
        <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span class="hidden sm:inline text-xs font-medium">戻る</span>
      </button>

      <div class="w-px h-5 bg-gray-200 shrink-0" />

      {/* Gallery title with icon */}
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-7 h-7 rounded-xl bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-sm">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span class="font-bold text-gray-800 tracking-tight">Gallery</span>
        <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
          {count()}{count() !== total() ? `/${total()}` : ''}枚
        </span>
      </div>

      {/* Search (grows to fill space) */}
      <div class="flex-1 max-w-sm mx-auto">
        <div class="flex items-center gap-2 bg-gray-100 rounded-full px-3.5 py-2 transition-all focus-within:bg-gray-200/60 focus-within:ring-2 focus-within:ring-violet-300">
          <svg class="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="ラベル・タグで検索..."
            class="bg-transparent outline-none text-sm flex-1 text-gray-700 placeholder-gray-400 min-w-0"
            value={galleryState.search}
            onInput={(e) => setGalleryState({ search: e.currentTarget.value })}
          />
          {galleryState.search && (
            <button
              class="text-gray-400 hover:text-gray-600 text-xs transition-colors"
              onClick={() => setGalleryState({ search: '' })}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div class="flex items-center gap-2 ml-auto shrink-0">

        {/* View toggle */}
        <div class="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            classList={{
              'bg-white shadow-sm text-violet-600': galleryState.view === 'grid',
              'text-gray-400 hover:text-gray-600': galleryState.view !== 'grid',
            }}
            onClick={() => setGalleryState({ view: 'grid' })}
            title="グリッド表示"
          >
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
              <rect x="1" y="1" width="6" height="6" rx="1.5" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" />
            </svg>
          </button>
          <button
            class="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            classList={{
              'bg-white shadow-sm text-violet-600': galleryState.view === 'list',
              'text-gray-400 hover:text-gray-600': galleryState.view !== 'list',
            }}
            onClick={() => setGalleryState({ view: 'list' })}
            title="リスト表示"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Add button */}
        <button class="flex items-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-violet-500 to-pink-500 text-white text-xs font-bold rounded-full hover:opacity-90 active:scale-95 transition-all shadow-sm shadow-violet-200">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 4v16m8-8H4" />
          </svg>
          <span class="hidden sm:inline">追加</span>
        </button>
      </div>
    </header>
  )
}

export default GalleryHeader
