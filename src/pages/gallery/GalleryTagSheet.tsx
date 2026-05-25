import { type Component, Show, createMemo, createSignal } from 'solid-js'
import {
  galleryState, closeTagSheet, updateGalleryItem, addMasterTag,
} from './store'

const GalleryTagSheet: Component = () => {
  const item = createMemo(() =>
    galleryState.items.find((i) => i.id === galleryState.tagSheetId)
  )
  const [query, setQuery] = createSignal('')
  let inputRef!: HTMLInputElement

  const allTags = createMemo(() => galleryState.masterTags)

  // Tags filtered by query (for the "other tags" section)
  const filteredOtherTags = createMemo(() => {
    const q = query().toLowerCase().trim()
    const current = item()?.tags ?? []
    let tags = allTags().filter((t) => !current.includes(t))
    if (q) tags = tags.filter((t) => t.toLowerCase().includes(q))
    return tags
  })

  // Whether to show "create new tag" option
  const showCreate = createMemo(() => {
    const q = query().trim()
    if (!q) return false
    return !allTags().some((t) => t.toLowerCase() === q.toLowerCase())
  })

  function toggleTag(tag: string) {
    const it = item()
    if (!it) return
    const newTags = it.tags.includes(tag)
      ? it.tags.filter((t) => t !== tag)
      : [...it.tags, tag]
    updateGalleryItem(it.id, { tags: newTags })
  }

  function createTag() {
    const tag = query().trim()
    if (!tag) return
    addMasterTag(tag)
    toggleTag(tag)
    setQuery('')
    inputRef?.focus()
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (showCreate()) createTag()
      else if (query().trim()) {
        // add existing matching tag
        const match = allTags().find((t) => t.toLowerCase() === query().toLowerCase().trim())
        if (match) { toggleTag(match); setQuery(''); inputRef?.focus() }
      }
    }
    if (e.key === 'Backspace' && !query()) {
      // remove last tag
      const it = item()
      if (it && it.tags.length > 0) {
        toggleTag(it.tags[it.tags.length - 1])
      }
    }
  }

  // Swipe down to close
  let touchStartY = 0
  function onTouchStart(e: TouchEvent) { touchStartY = e.touches[0].clientY }
  function onTouchEnd(e: TouchEvent) {
    if (e.changedTouches[0].clientY - touchStartY > 80) closeTagSheet()
  }

  return (
    <Show when={galleryState.tagSheetId !== null && item()}>
      {(it) => (
        <>
          {/* Backdrop */}
          <div
            class="fixed inset-0 z-108 bg-black/50 backdrop-blur-sm"
            onClick={closeTagSheet}
          />

          {/* Bottom sheet */}
          <div
            class="gallery-tag-sheet fixed bottom-0 left-0 right-0 z-109 bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{ "max-height": "72dvh" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Drag handle */}
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div class="flex items-center justify-between px-4 py-2 shrink-0">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-800 truncate">{it().label}</p>
                <p class="text-[10px] text-gray-400">タグを管理</p>
              </div>
              <button
                class="text-xs font-bold text-violet-500 hover:text-violet-700 px-2 py-1 rounded-lg hover:bg-violet-50 transition-colors"
                onClick={closeTagSheet}
              >
                完了
              </button>
            </div>

            {/* ── Notion-style tag input ── */}
            <div class="px-4 pb-3 shrink-0">
              <div
                class="flex flex-wrap items-center gap-1.5 min-h-11 px-3 py-2 bg-gray-100 rounded-2xl cursor-text focus-within:ring-2 focus-within:ring-violet-300 focus-within:bg-gray-50 transition-all"
                onClick={() => inputRef?.focus()}
              >
                {/* Current tags as chips */}
                {it().tags.map((tag) => (
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 text-xs rounded-full font-semibold shrink-0">
                    {tag}
                    <button
                      class="text-violet-400 hover:text-violet-800 transition-colors leading-none ml-0.5 text-sm"
                      onClick={(e) => { e.stopPropagation(); toggleTag(tag) }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      ×
                    </button>
                  </span>
                ))}

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  class="bg-transparent outline-none text-sm flex-1 min-w-24 text-gray-700 placeholder-gray-400"
                  placeholder={it().tags.length === 0 ? 'タグを検索 / 新規作成...' : '追加...'}
                  value={query()}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={handleKeyDown}
                  autofocus
                />
              </div>
            </div>

            {/* Tags area (scrollable) */}
            <div class="flex-1 overflow-y-auto px-4 pb-6 space-y-4">

              {/* Create new tag */}
              <Show when={showCreate()}>
                <button
                  class="flex items-center gap-2 w-full px-3 py-3 rounded-2xl bg-violet-50 border border-violet-200 text-violet-600 text-sm font-semibold hover:bg-violet-100 active:scale-98 transition-all"
                  onClick={createTag}
                >
                  <span class="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-bold shrink-0">＋</span>
                  <span>「{query()}」を新規作成して追加</span>
                </button>
              </Show>

              {/* Other available tags */}
              <Show when={filteredOtherTags().length > 0}>
                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    {query() ? '検索結果' : 'その他のタグ'}
                  </p>
                  <div class="flex flex-wrap gap-2">
                    {filteredOtherTags().map((tag) => (
                      <button
                        class="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-600 hover:bg-violet-100 hover:text-violet-600 active:scale-95 transition-all"
                        onClick={() => { toggleTag(tag); inputRef?.focus() }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              </Show>

              {/* Empty state when all tags assigned */}
              <Show when={filteredOtherTags().length === 0 && !showCreate()}>
                <p class="text-xs text-gray-400 text-center py-4">
                  {query() ? '一致するタグがありません' : 'すべてのタグが追加済みです'}
                </p>
              </Show>

            </div>
          </div>
        </>
      )}
    </Show>
  )
}

export default GalleryTagSheet
