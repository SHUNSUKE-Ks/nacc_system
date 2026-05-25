import { type Component, Show } from 'solid-js'
import { navigate, state } from '../../store'
import GalleryHeader from './GalleryHeader'
import GallerySidebar from './GallerySidebar'
import GalleryGrid from './GalleryGrid'
import GalleryDetail from './GalleryDetail'
import GalleryLightbox from './GalleryLightbox'
import GalleryTagSheet from './GalleryTagSheet'
import { galleryState } from './store'

const GalleryPage: Component = () => {
  function handleBack() {
    navigate(state.galleryReturnPage)
  }

  return (
    <div class="h-dvh flex flex-col bg-gray-50">
      <GalleryHeader onBack={handleBack} />

      <div class="flex flex-1 overflow-hidden">
        <GallerySidebar />

        <div class="flex flex-1 overflow-hidden">
          <GalleryGrid />

          <Show when={galleryState.detailOpen && galleryState.selectedId !== null}>
            <GalleryDetail />
          </Show>
        </div>
      </div>

      {/* Overlays (portal-style, rendered at page root) */}
      <GalleryLightbox />
      <GalleryTagSheet />
    </div>
  )
}

export default GalleryPage
