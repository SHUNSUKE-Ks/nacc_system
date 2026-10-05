import { type Component, createSignal, Show } from 'solid-js'
import PhotoBrowser from '../components/PhotoBrowser'

// 写真: 商品の写真と、端末から追加した写真をグループで並べる。メモの「写真を貼る」もここから選ぶ
const PagePhotos: Component = () => {
  const [open, setOpen] = createSignal<{ src: string; name: string } | null>(null)
  return (
    <div class="h-full overflow-y-auto">
      <div class="photo-page">
        <header class="photo-page-head">
          <p>NACC · PHOTOS</p>
          <h1>写真</h1>
          <span>ここにある写真は、メモの「写真を貼る」から選べます。</span>
        </header>
        <PhotoBrowser onOpen={setOpen} />
      </div>
      <Show when={open()}>
        {(photo) => (
          <div class="photo-lightbox" role="dialog" aria-modal="true" aria-label={photo().name} onClick={() => setOpen(null)}>
            <img src={photo().src} alt={photo().name} />
            <p>{photo().name}</p>
            <button type="button" onClick={() => setOpen(null)} aria-label="閉じる">×</button>
          </div>
        )}
      </Show>
    </div>
  )
}

export default PagePhotos
