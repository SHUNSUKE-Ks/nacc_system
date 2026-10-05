import { type Component, createSignal, Show } from 'solid-js'
import PhotoBrowser from '../components/PhotoBrowser'
import HelpButton, { HELP_PHOTOS } from '../components/HelpButton'
import { LOOSE_GROUP, PRODUCT_GROUP, addPhotoFiles } from './leaflet/photos'

// 写真: 商品の写真と、端末から追加した写真をグループで並べる。メモの「写真を貼る」もここから選ぶ
const PagePhotos: Component = () => {
  const [open, setOpen] = createSignal<{ src: string; name: string } | null>(null)
  const groupSignal = createSignal(PRODUCT_GROUP)
  const [group] = groupSignal
  const [busy, setBusy] = createSignal(false)
  let fileRef!: HTMLInputElement

  // 「商品画像」は商品の写真が自動で並ぶグループなので、追加先にはしない
  const canUpload = () => group() !== PRODUCT_GROUP && group() !== LOOSE_GROUP

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    try {
      await addPhotoFiles(files, group())
    } finally {
      setBusy(false)
      fileRef.value = ''
    }
  }

  return (
    <div class="h-full overflow-y-auto">
      <div class="photo-page">
        <header class="photo-page-head">
          <p>NACC · PHOTOS</p>
          <div class="photo-page-title">
            <h1>写真</h1>
            <HelpButton title="写真" items={HELP_PHOTOS} class="help-left" />
            <button
              type="button"
              class="photo-upload"
              onClick={() => fileRef.click()}
              disabled={!canUpload() || busy()}
              title={canUpload() ? `選んでいるグループ「${group()}」に追加します` : '「商品画像」には追加できません。追加したいグループを下で選んでください'}
            >
              {busy() ? '読み込み中…' : <>＋ 写真を追加<Show when={canUpload()}><span class="photo-upload-group">（{group()}）</span></Show></>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.currentTarget.files)} />
          </div>
          <span>{canUpload() ? '写真はこの端末に保存されます。メモの「写真を貼る」から選べます。' : '追加するときは、下で「2026_写真」などのグループを選んでください。'}</span>
        </header>
        <PhotoBrowser onOpen={setOpen} group={groupSignal} hideUpload />
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
