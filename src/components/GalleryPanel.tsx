import { type Component, createSignal, onMount } from 'solid-js'
import { state, setState } from '../store'
import type { GalleryPhoto } from '../types'

const STORAGE_KEY = 'nacc_gallery'

function loadPhotos(): GalleryPhoto[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function savePhotos(photos: GalleryPhoto[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(photos))
}

const GalleryPanel: Component = () => {
  const [photos, setPhotos] = createSignal<GalleryPhoto[]>([])
  let fileInput!: HTMLInputElement

  onMount(() => setPhotos(loadPhotos()))

  function handleUpload(e: Event) {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const next: GalleryPhoto = {
          dataUrl: reader.result as string,
          name: file.name,
          createdAt: new Date(),
        }
        setPhotos((prev) => {
          const updated = [next, ...prev]
          savePhotos(updated)
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
  }

  function deletePhoto(idx: number) {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== idx)
      savePhotos(updated)
      return updated
    })
  }

  return (
    <aside
      id="galleryPanel"
      class="w-72 shrink-0 border-l border-[#e8e8e8] bg-[#f7f6f3] flex flex-col overflow-hidden desktop-right-panel"
      style={{
        transform: state.galleryPanelOpen ? 'translateX(0)' : 'translateX(100%)',
        position: state.galleryPanelOpen ? undefined : 'absolute',
        right: '0',
        top: '0',
        bottom: '0',
      }}
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8]">
        <span class="font-semibold text-sm text-[#37352f]">ギャラリー</span>
        <div class="flex items-center gap-1">
          <button
            class="text-xs px-2 py-1 rounded bg-[#b38247] text-white font-semibold hover:opacity-80"
            onClick={() => fileInput.click()}
          >
            + 追加
          </button>
          <button
            class="p-1 rounded hover:bg-[#e8e8e8] text-[#999]"
            onClick={() => setState({ galleryPanelOpen: false })}
          >
            ✕
          </button>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        onChange={handleUpload}
      />

      <div class="flex-1 overflow-y-auto p-3">
        {photos().length === 0 ? (
          <div class="flex flex-col items-center justify-center h-full text-[#ccc] gap-2 text-sm">
            <span class="text-3xl">🖼️</span>
            <span>写真を追加してください</span>
          </div>
        ) : (
          <div class="grid grid-cols-2 gap-2">
            {photos().map((photo, idx) => (
              <div class="relative group aspect-square rounded-lg overflow-hidden bg-[#e8e8e8]">
                <img
                  src={photo.dataUrl}
                  alt={photo.name}
                  class="w-full h-full object-cover"
                />
                <button
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  onClick={() => deletePhoto(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default GalleryPanel
