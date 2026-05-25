import { type Component, Show, createMemo, createSignal, onMount, onCleanup } from 'solid-js'
import {
  galleryState, setGalleryState, closeLightbox, openTagSheet,
  toggleGalleryFavorite, selectGalleryItem, getFilteredItems,
} from './store'
import { CATEGORY_BG, CATEGORY_LABELS } from './types'
import GalleryEditDialog from './GalleryEditDialog'

const GalleryLightbox: Component = () => {
  const items = createMemo(() => getFilteredItems(galleryState))
  const idx   = createMemo(() => items().findIndex((i) => i.id === galleryState.lightboxId))
  const item  = createMemo(() => items()[idx()])
  const [editOpen, setEditOpen] = createSignal(false)

  function prev() {
    const p = items()[idx() - 1]
    if (p) setGalleryState({ lightboxId: p.id })
  }
  function next() {
    const n = items()[idx() + 1]
    if (n) setGalleryState({ lightboxId: n.id })
  }

  // Keyboard navigation
  function onKeyDown(e: KeyboardEvent) {
    if (!galleryState.lightboxId) return
    if (e.key === 'Escape') {
      e.preventDefault()
      if (editOpen()) { setEditOpen(false) } else { closeLightbox() }
    }
    if (editOpen()) return
    if (e.key === 'ArrowLeft')  { e.preventDefault(); prev() }
    if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  }
  onMount(() => document.addEventListener('keydown', onKeyDown))
  onCleanup(() => document.removeEventListener('keydown', onKeyDown))

  // Touch swipe
  let touchStartX = 0
  let touchStartY = 0
  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }
  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      dx < 0 ? next() : prev()
    }
  }

  return (
    <Show when={galleryState.lightboxId !== null && item()}>
      {(it) => (
        <div
          class="gallery-lightbox fixed inset-0 z-[100] bg-black/92 flex items-center justify-center"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={closeLightbox}
        >
          {/* Counter */}
          <div class="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white/80 text-xs font-medium z-10 pointer-events-none">
            {idx() + 1} / {items().length}
          </div>

          {/* Edit + Close */}
          <div class="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white text-base flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setEditOpen(true) }}
              title="編集"
            >✏️</button>
            <button
              class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white text-xl flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); closeLightbox() }}
              title="閉じる"
            >✕</button>
          </div>

          {/* Prev */}
          <Show when={idx() > 0}>
            <button
              class="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 z-10 transition-colors"
              onClick={(e) => { e.stopPropagation(); prev() }}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </Show>

          {/* Next */}
          <Show when={idx() < items().length - 1}>
            <button
              class="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/25 z-10 transition-colors"
              onClick={(e) => { e.stopPropagation(); next() }}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Show>

          {/* Image */}
          <img
            src={it().dataUrl ?? it().url ?? ''}
            alt={it().label}
            class="max-w-[88vw] object-contain rounded-2xl shadow-2xl"
            style={{ "max-height": "78dvh" }}
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Bottom bar */}
          <div
            class="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/85 via-black/30 to-transparent px-5 pt-14 pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-end justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-white font-bold text-base leading-tight truncate">{it().label}</p>
                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span class={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CATEGORY_BG[it().category]}`}>
                    {CATEGORY_LABELS[it().category]}
                  </span>
                  {it().tags.slice(0, 5).map((t) => (
                    <span class="text-white/55 text-[11px]">#{t}</span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-lg hover:bg-white/20 transition-colors"
                  onClick={() => toggleGalleryFavorite(it().id)}
                  title="お気に入り"
                >
                  <span classList={{ 'text-red-400': it().isFavorite, 'text-white': !it().isFavorite }}>
                    {it().isFavorite ? '♥' : '♡'}
                  </span>
                </button>

                <button
                  class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-base"
                  onClick={() => openTagSheet(it().id)}
                  title="タグ管理（長押しと同じ）"
                >
                  🏷
                </button>

                <button
                  class="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors text-white"
                  onClick={() => { closeLightbox(); selectGalleryItem(it().id) }}
                  title="詳細パネルへ"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Edit dialog (above lightbox) */}
          <Show when={editOpen()}>
            <GalleryEditDialog itemId={it().id} onClose={() => setEditOpen(false)} />
          </Show>
        </div>
      )}
    </Show>
  )
}

export default GalleryLightbox
