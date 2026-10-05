import { type Accessor, type Component, createSignal, For, type Setter, Show } from 'solid-js'
import type { PhotoRef } from '../types'
import {
  LOOSE_GROUP, PRODUCT_GROUP, addPhotoFiles, addPhotoGroup, deletePhoto, photoGroups, productGroupPhotos, uploadsIn,
} from '../pages/leaflet/photos'

// 写真ギャラリーの中身（写真ページと、メモの「写真を貼る」で同じものを使う）
// pick を渡すと選ぶ画面になる（押すと選択／解除）。渡さなければ見る・追加・削除の画面。
type Tile = { ref: PhotoRef; src: string; name: string; onDelete?: () => void }

const refKey = (ref: PhotoRef) => (ref.kind === 'product' ? `p:${ref.productId}` : ref.kind === 'asset' ? `a:${ref.name}` : `u:${ref.id}`)

const PhotoBrowser: Component<{
  pick?: { selected: PhotoRef[]; onToggle: (ref: PhotoRef) => void }
  onOpen?: (tile: { src: string; name: string }) => void
  /** 選択中のグループを外（写真ページの見出し）と共有するとき */
  group?: [Accessor<string>, Setter<string>]
  /** 追加ボタンを外に置くとき（写真ページ） */
  hideUpload?: boolean
}> = (props) => {
  const [group, setGroup] = props.group ?? createSignal(PRODUCT_GROUP)
  const [busy, setBusy] = createSignal(false)
  const [naming, setNaming] = createSignal(false)
  const [newName, setNewName] = createSignal('')
  let fileRef!: HTMLInputElement

  const groups = () => [PRODUCT_GROUP, ...photoGroups(), ...(uploadsIn(LOOSE_GROUP).length ? [LOOSE_GROUP] : [])]
  const canUpload = () => group() !== PRODUCT_GROUP && group() !== LOOSE_GROUP

  const tiles = (): Tile[] =>
    group() === PRODUCT_GROUP
      ? productGroupPhotos()
      : uploadsIn(group()).map((photo) => ({
          ref: { kind: 'upload', id: photo.id! } as PhotoRef,
          src: photo.dataUrl,
          name: photo.name,
          onDelete: () => deletePhoto(photo.id!),
        }))

  const isPicked = (ref: PhotoRef) => !!props.pick?.selected.some((item) => refKey(item) === refKey(ref))

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

  function createGroup() {
    const name = newName().trim()
    if (addPhotoGroup(name)) {
      setGroup(name)
      setNewName('')
      setNaming(false)
    } else if (name) {
      alert(`「${name}」は使えません（同じ名前のグループがあります）`)
    }
  }

  return (
    <div class="photo-browser">
      <div class="photo-groups" role="tablist" aria-label="写真のグループ">
        <For each={groups()}>
          {(name) => (
            <button type="button" role="tab" aria-selected={group() === name} classList={{ 'is-active': group() === name }} onClick={() => setGroup(name)}>
              {name}
              <span>{name === PRODUCT_GROUP ? productGroupPhotos().length : uploadsIn(name).length}</span>
            </button>
          )}
        </For>
        <Show when={naming()} fallback={
          <button type="button" class="photo-group-add" onClick={() => setNaming(true)} aria-label="グループを追加">＋ グループ</button>
        }>
          <span class="photo-group-form">
            <input
              ref={(el) => queueMicrotask(() => el.focus())}
              value={newName()}
              placeholder="グループ名"
              onInput={(e) => setNewName(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') setNaming(false) }}
            />
            <button type="button" onClick={createGroup}>作成</button>
            <button type="button" onClick={() => setNaming(false)} aria-label="やめる">×</button>
          </span>
        </Show>
      </div>

      <Show when={!props.hideUpload}>
      <div class="photo-bar">
        <Show when={canUpload()} fallback={
          <span>{group() === PRODUCT_GROUP ? '商品の写真とアプリに入っている画像です（自動で並びます）。' : 'グループを決めずに追加した写真です。'}</span>
        }>
          <button type="button" class="photo-upload" onClick={() => fileRef.click()} disabled={busy()}>
            {busy() ? '読み込み中…' : `＋「${group()}」に写真を追加`}
          </button>
          <span>写真はこの端末に保存されます</span>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.currentTarget.files)} />
        </Show>
      </div>
      </Show>

      <div class="photo-grid">
        <For each={tiles()} fallback={<p class="photo-empty">まだ写真がありません。</p>}>
          {(tile) => (
            <figure class="photo-tile" classList={{ 'is-picked': isPicked(tile.ref) }}>
              <button
                type="button"
                class="photo-tile-img"
                aria-pressed={props.pick ? isPicked(tile.ref) : undefined}
                aria-label={props.pick ? `${tile.name}を${isPicked(tile.ref) ? '外す' : '選ぶ'}` : `${tile.name}を大きく見る`}
                onClick={() => (props.pick ? props.pick.onToggle(tile.ref) : props.onOpen?.(tile))}
              >
                <img src={tile.src} alt="" loading="lazy" />
                <Show when={isPicked(tile.ref)}><span class="photo-check" aria-hidden="true">✓</span></Show>
              </button>
              <figcaption>
                <span>{tile.name}</span>
                <Show when={tile.onDelete && !props.pick}>
                  <button type="button" onClick={() => confirm(`「${tile.name}」を写真から削除しますか？`) && tile.onDelete?.()}>削除</button>
                </Show>
              </figcaption>
            </figure>
          )}
        </For>
      </div>
    </div>
  )
}

export default PhotoBrowser
