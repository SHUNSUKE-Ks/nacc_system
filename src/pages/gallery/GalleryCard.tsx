import { type Component, Show } from 'solid-js'
import type { GalleryItem } from './types'
import { CATEGORY_LABELS, CATEGORY_BG } from './types'
import { toggleGalleryFavorite, openLightbox, openTagSheet } from './store'

const GalleryCard: Component<{ item: GalleryItem }> = (props) => {
  let timer: number | undefined
  let longPressed = false

  function startPress() {
    longPressed = false
    timer = window.setTimeout(() => {
      longPressed = true
      navigator.vibrate?.(30)
      openTagSheet(props.item.id)
    }, 500)
  }

  function cancelPress() {
    window.clearTimeout(timer)
  }

  function handleClick() {
    if (longPressed) { longPressed = false; return }
    openLightbox(props.item.id)
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault()
    openTagSheet(props.item.id)
  }

  return (
    <div
      class="gallery-card relative rounded-2xl overflow-hidden bg-white cursor-pointer group shadow-sm select-none"
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Square image */}
      <div class="aspect-square overflow-hidden bg-gray-100">
        <img
          src={props.item.dataUrl ?? props.item.url ?? ''}
          alt={props.item.label}
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* Gradient overlay */}
      <div class="absolute inset-0 bg-linear-to-t from-black/65 via-black/5 to-transparent pointer-events-none" />

      {/* Favorite button */}
      <button
        class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90 hover:bg-black/40 z-10"
        onClick={(e) => { e.stopPropagation(); toggleGalleryFavorite(props.item.id) }}
        onMouseDown={(e) => e.stopPropagation()}
        title={props.item.isFavorite ? 'お気に入り解除' : 'お気に入り'}
      >
        <span class="text-base transition-colors" classList={{ 'text-red-400': props.item.isFavorite, 'text-white/60': !props.item.isFavorite }}>
          {props.item.isFavorite ? '♥' : '♡'}
        </span>
      </button>

      {/* Long-press hint (visible on hover, desktop) */}
      <div class="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div class="text-[9px] text-white/50 bg-black/20 backdrop-blur-sm rounded px-1.5 py-0.5">
          長押し: タグ
        </div>
      </div>

      {/* Bottom info */}
      <div class="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-none">
        <span class={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${CATEGORY_BG[props.item.category]}`}>
          {CATEGORY_LABELS[props.item.category]}
        </span>
        <p class="text-white text-xs font-semibold mt-1 truncate leading-tight">{props.item.label}</p>
        <Show when={props.item.tags.length > 0}>
          <div class="flex gap-1.5 mt-0.5 flex-wrap">
            {props.item.tags.slice(0, 2).map((tag) => (
              <span class="text-white/60 text-[10px]">#{tag}</span>
            ))}
          </div>
        </Show>
      </div>
    </div>
  )
}

export default GalleryCard
