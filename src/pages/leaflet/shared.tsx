import { type Component, createSignal, For, Show } from 'solid-js'
import { state } from '../../store'
import type { Nutrient, Product } from '../../types'
import { saveLeafletsNow, type Leaflet, type LeafletImage } from './store'
import { addPhotoFiles, bundledPhotos, deletePhoto, imageSrc, uploadedPhotos } from './photos'

/** 原本の商品ノートと同じ並び（DetailView と同じ抽出条件） */
export function originalNutrients(product: Product): Nutrient[] {
  return state.nutrients.filter((nutrient) =>
    product.nutrientIds.includes(nutrient.id) || nutrient.productIds.includes(product.id)
  )
}

export const nutrientById = (id: string) => state.nutrients.find((nutrient) => nutrient.id === id)

/** カードのタイトル・説明。リーフレットで書き換えていればそちらを使う */
export const cardTitle = (card: { nutrientId: string; title?: string }) =>
  card.title || nutrientById(card.nutrientId)?.name || '（削除された成分）'
export const cardDescription = (card: { nutrientId: string; description?: string }) =>
  card.description ?? nutrientById(card.nutrientId)?.description ?? ''

export const categoryLabel = (product: Product) => (product.category === 'cosmetic' ? 'COSMETIC' : 'SUPPLEMENT')

export const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const statusLabel = (leaflet: Leaflet) => (leaflet.status === 'ready' ? '配布可' : '下書き')

export const LeafletVisual: Component<{ image: LeafletImage; product: Product; class?: string; imgStyle?: Record<string, string> }> = (props) => (
  <div class={`lf-visual ${props.class ?? ''}`}>
    <Show when={imageSrc(props.image, props.product)} fallback={<strong>{props.product.name.slice(0, 1)}</strong>}>
      {(src) => <img src={src()} alt={props.product.name} style={props.imgStyle} draggable={false} />}
    </Show>
  </div>
)

export const OriginalSafeNote: Component = () => (
  <p class="lf-safe-note"><span aria-hidden="true">◎</span>原本は変更されません</p>
)

// ── コピー（Canvaへ貼り付け用。アプリ内だけに表示し、印刷には出ない） ─────────
const [toast, setToast] = createSignal<string | null>(null)
const [toastError, setToastError] = createSignal(false)
let toastTimer = 0

export const Toast: Component = () => (
  <Show when={toast()}>
    <div class="lf-toast" classList={{ 'is-error': toastError() }} role={toastError() ? 'alert' : 'status'}>{toast()}</div>
  </Show>
)

/** http（LAN内のiPadなど）では Clipboard API が使えないため、選択してコピーする方式に切り替える */
function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
  document.body.appendChild(area)
  area.select()
  area.setSelectionRange(0, text.length)
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  area.remove()
  return ok
}

export function showToast(message: string, error = false) {
  setToast(message)
  setToastError(error)
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => setToast(null), error ? 2600 : 1400)
}

/** 保存ボタン（自動保存もしているが、押して確かめられるように） */
export const SaveButton: Component = () => (
  <button type="button" class="lf-save" onClick={() => showToast(saveLeafletsNow() ? '保存しました' : '保存できませんでした（ブラウザの保存領域を確認してください）')}>
    保存
  </button>
)

export async function copyText(text: string, label: string) {
  let ok = false
  try {
    await navigator.clipboard.writeText(text)
    ok = true
  } catch {
    ok = legacyCopy(text)
  }
  showToast(ok ? `${label}をコピーしました` : 'コピーできませんでした', !ok)
}

export const CopyButton: Component<{ text: string; label: string }> = (props) => (
  <button
    type="button"
    class="lf-copy lf-app-only"
    title={`${props.label}をコピー`}
    aria-label={`${props.label}をコピー`}
    onPointerDown={(event) => event.stopPropagation()}
    onClick={(event) => { event.stopPropagation(); void copyText(props.text, props.label) }}
  >
    <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="2" /><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" /></svg>
  </button>
)

// ── 写真ギャラリー（一覧・選択・端末から追加） ─────────────────────────────
export const PhotoGallery: Component<{
  product?: Product
  selected?: LeafletImage
  onSelect?: (image: LeafletImage) => void
}> = (props) => {
  let fileRef!: HTMLInputElement
  const [busy, setBusy] = createSignal(false)
  const isSelected = (image: LeafletImage) => JSON.stringify(image) === JSON.stringify(props.selected)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const ids = await addPhotoFiles(files)
      if (ids.length && props.onSelect) props.onSelect({ kind: 'upload', id: ids[0] })
    } finally {
      setBusy(false)
      fileRef.value = ''
    }
  }

  const Tile: Component<{ image: LeafletImage; src: string; name: string; onDelete?: () => void }> = (tile) => (
    <figure class="lf-photo" classList={{ 'is-selected': isSelected(tile.image), 'is-pickable': !!props.onSelect }}>
      <button type="button" class="lf-photo-img" onClick={() => props.onSelect?.(tile.image)} disabled={!props.onSelect}>
        <img src={tile.src} alt={tile.name} loading="lazy" />
      </button>
      <figcaption>
        <span>{tile.name}</span>
        <Show when={tile.onDelete}>
          <button type="button" onClick={() => confirm(`「${tile.name}」を写真ギャラリーから削除しますか？`) && tile.onDelete?.()}>削除</button>
        </Show>
      </figcaption>
    </figure>
  )

  return (
    <div class="lf-photos">
      <div class="lf-photos-bar">
        <button type="button" class="lf-primary" onClick={() => fileRef.click()} disabled={busy()}>
          {busy() ? '読み込み中…' : '＋ 端末から追加'}
        </button>
        <span>背景透過PNGもそのまま使えます</span>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.currentTarget.files)} />
      </div>
      <div class="lf-photo-grid">
        <Show when={props.product?.image}>
          <Tile image={{ kind: 'product' }} src={imageSrc({ kind: 'product' }, props.product!)} name="商品原本の写真" />
        </Show>
        <For each={bundledPhotos}>
          {(photo) => <Tile image={{ kind: 'asset', name: photo.name }} src={photo.src} name={photo.name} />}
        </For>
        <For each={uploadedPhotos()}>
          {(photo) => <Tile image={{ kind: 'upload', id: photo.id! }} src={photo.dataUrl} name={photo.name} onDelete={() => deletePhoto(photo.id!)} />}
        </For>
      </div>
    </div>
  )
}
