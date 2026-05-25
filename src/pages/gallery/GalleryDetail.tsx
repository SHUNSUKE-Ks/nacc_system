import { type Component, Show, createMemo, createSignal, createEffect } from 'solid-js'
import {
  galleryState, selectGalleryItem, toggleGalleryFavorite,
  updateGalleryItem, moveToGalleryTrash, restoreFromGalleryTrash,
  permanentDeleteGalleryItem, formatFileSize, formatDate,
} from './store'
import type { GalleryCategory } from './types'
import { CATEGORY_LABELS, CATEGORY_BG, CATEGORY_ICON } from './types'

const ALL_CATEGORIES: GalleryCategory[] = ['product', 'nutrient', 'reference', 'other']

const GalleryDetail: Component = () => {
  const item = createMemo(() =>
    galleryState.items.find((i) => i.id === galleryState.selectedId)
  )

  // ── edit state ──
  const [editMode, setEditMode] = createSignal(false)
  const [editLabel, setEditLabel] = createSignal('')
  const [editFilename, setEditFilename] = createSignal('')
  const [editDescription, setEditDescription] = createSignal('')
  const [editCategory, setEditCategory] = createSignal<GalleryCategory>('product')
  const [editTags, setEditTags] = createSignal<string[]>([])
  const [newTagInput, setNewTagInput] = createSignal('')
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false)
  let tagInputRef!: HTMLInputElement

  // アイテムが変わったら編集モードを抜ける
  createEffect(() => {
    if (galleryState.selectedId) setEditMode(false)
    setShowDeleteConfirm(false)
  })

  function startEdit() {
    const it = item()
    if (!it) return
    setEditLabel(it.label)
    setEditFilename(it.filename)
    setEditDescription(it.description ?? '')
    setEditCategory(it.category)
    setEditTags([...it.tags])
    setNewTagInput('')
    setEditMode(true)
  }

  function saveEdit() {
    const it = item()
    if (!it) return
    updateGalleryItem(it.id, {
      label: editLabel().trim() || it.label,
      filename: editFilename().trim() || it.filename,
      description: editDescription().trim() || undefined,
      category: editCategory(),
      tags: editTags(),
    })
    setEditMode(false)
  }

  function addTag() {
    const tag = newTagInput().trim()
    if (tag && !editTags().includes(tag)) {
      setEditTags((prev) => [...prev, tag])
    }
    setNewTagInput('')
    tagInputRef?.focus()
  }

  function removeTag(tag: string) {
    setEditTags((prev) => prev.filter((t) => t !== tag))
    tagInputRef?.focus()
  }

  function handleTagKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !newTagInput() && editTags().length > 0) {
      removeTag(editTags()[editTags().length - 1])
    }
  }

  return (
    <aside class="gallery-detail w-80 bg-white border-l border-gray-100 flex flex-col overflow-hidden shrink-0">
      {/* Panel header */}
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <span class="text-sm font-semibold text-gray-700">
          {editMode() ? '編集' : galleryState.showTrash ? 'ごみ箱' : '詳細'}
        </span>
        <button
          class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors"
          onClick={() => { setEditMode(false); selectGalleryItem(null) }}
          title="閉じる"
        >✕</button>
      </div>

      <Show when={item()}>
        {(it) => (
          <div class="flex-1 overflow-y-auto">
            {/* Image */}
            <div class="aspect-square overflow-hidden bg-gray-50 relative shrink-0">
              <img
                src={it().dataUrl ?? it().url ?? ''}
                alt={it().label}
                class="w-full h-full object-cover"
              />
              <Show when={!editMode() && !galleryState.showTrash}>
                <button
                  class="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90 hover:bg-black/50"
                  onClick={() => toggleGalleryFavorite(it().id)}
                >
                  <span class="text-xl" classList={{ 'text-red-400': it().isFavorite, 'text-white/70': !it().isFavorite }}>
                    {it().isFavorite ? '♥' : '♡'}
                  </span>
                </button>
              </Show>
              <Show when={it().isDeleted}>
                <div class="absolute inset-0 bg-red-900/20 flex items-end p-3">
                  <span class="text-xs bg-red-500/80 text-white px-2 py-0.5 rounded-full font-medium backdrop-blur-sm">
                    ごみ箱
                  </span>
                </div>
              </Show>
            </div>

            {/* ── VIEW MODE ── */}
            <Show when={!editMode()}>
              <div class="p-4 space-y-4">
                <div>
                  <h2 class="font-bold text-gray-800 text-base leading-snug">{it().label}</h2>
                  <span class={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${CATEGORY_BG[it().category]}`}>
                    <span>{CATEGORY_ICON[it().category]}</span>
                    {CATEGORY_LABELS[it().category]}
                  </span>
                </div>

                <div>
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ファイル名</p>
                  <p class="text-xs text-gray-500 font-mono break-all bg-gray-50 rounded-lg px-2.5 py-2">
                    {it().filename}
                  </p>
                </div>

                <Show when={it().description}>
                  <div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">説明</p>
                    <p class="text-sm text-gray-600 leading-relaxed">{it().description}</p>
                  </div>
                </Show>

                <Show when={it().tags.length > 0}>
                  <div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">タグ</p>
                    <div class="flex flex-wrap gap-1.5">
                      {it().tags.map((tag) => (
                        <span class="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Show>

                <div class="rounded-xl bg-gray-50 p-3.5">
                  <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">ファイル情報</p>
                  <div class="space-y-2">
                    <MetaRow label="サイズ" value={formatFileSize(it().fileSize)} />
                    <Show when={it().width && it().height}>
                      <MetaRow label="解像度" value={`${it().width} × ${it().height} px`} />
                    </Show>
                    <MetaRow label="形式" value={it().mimeType.split('/')[1]?.toUpperCase() ?? '—'} />
                    <MetaRow label="作成日" value={formatDate(it().createdAt)} />
                    <MetaRow label="更新日" value={formatDate(it().updatedAt)} />
                  </div>
                </div>

                {/* ── 通常アクション ── */}
                <Show when={!galleryState.showTrash}>
                  <div class="flex gap-2 pb-2">
                    <button
                      class="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 font-semibold active:scale-98 transition-all"
                      onClick={startEdit}
                    >
                      ✏️ 編集
                    </button>
                    <button
                      class="flex-1 py-2.5 rounded-xl border border-red-100 text-sm text-red-400 font-semibold hover:bg-red-50 active:scale-98 transition-all"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      🗑 削除
                    </button>
                  </div>

                  {/* 削除確認 */}
                  <Show when={showDeleteConfirm()}>
                    <div class="pb-2 p-3 bg-red-50 rounded-xl space-y-2">
                      <p class="text-xs text-red-600 font-medium text-center">ごみ箱に移動しますか？</p>
                      <div class="flex gap-2">
                        <button
                          class="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors"
                          onClick={() => { moveToGalleryTrash(it().id); setShowDeleteConfirm(false) }}
                        >
                          ごみ箱へ
                        </button>
                        <button
                          class="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 font-medium hover:bg-gray-50 transition-colors"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  </Show>
                </Show>

                {/* ── ごみ箱アクション ── */}
                <Show when={galleryState.showTrash}>
                  <div class="space-y-2 pb-2">
                    <button
                      class="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold active:scale-98 transition-all"
                      onClick={() => restoreFromGalleryTrash(it().id)}
                    >
                      ↩ 復元する
                    </button>
                    <button
                      class="w-full py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold active:scale-98 transition-all"
                      onClick={() => permanentDeleteGalleryItem(it().id)}
                    >
                      🗑 完全削除（元に戻せません）
                    </button>
                  </div>
                </Show>
              </div>
            </Show>

            {/* ── EDIT MODE ── */}
            <Show when={editMode()}>
              <div class="p-4 space-y-4">

                {/* Label */}
                <div>
                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    表示名（ラベル）
                  </label>
                  <input
                    type="text"
                    class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    value={editLabel()}
                    onInput={(e) => setEditLabel(e.currentTarget.value)}
                    placeholder="表示名を入力"
                  />
                </div>

                {/* Filename */}
                <div>
                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    ファイル名
                  </label>
                  <input
                    type="text"
                    class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-mono text-gray-600 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                    value={editFilename()}
                    onInput={(e) => setEditFilename(e.currentTarget.value)}
                    placeholder="filename.jpg"
                  />
                </div>

                {/* Category */}
                <div>
                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    カテゴリ
                  </label>
                  <div class="grid grid-cols-2 gap-1.5">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        class="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-medium transition-all"
                        classList={{
                          'border-violet-400 bg-violet-50 text-violet-600': editCategory() === cat,
                          'border-gray-200 bg-white text-gray-500 hover:border-gray-300': editCategory() !== cat,
                        }}
                        onClick={() => setEditCategory(cat)}
                      >
                        <span>{CATEGORY_ICON[cat]}</span>
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    説明（任意）
                  </label>
                  <textarea
                    class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
                    rows="3"
                    value={editDescription()}
                    onInput={(e) => setEditDescription(e.currentTarget.value)}
                    placeholder="説明を入力（任意）"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                    タグ
                  </label>
                  <div class="flex flex-wrap gap-1.5 mb-2">
                    {editTags().map((tag) => (
                      <span class="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 font-medium">
                        #{tag}
                        <button
                          class="text-violet-400 hover:text-violet-700 transition-colors leading-none"
                          onClick={() => removeTag(tag)}
                        >×</button>
                      </span>
                    ))}
                  </div>
                  <div class="flex gap-1.5">
                    <input
                      ref={tagInputRef}
                      type="text"
                      class="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                      placeholder="タグを入力 → Enter / Backspaceで削除"
                      value={newTagInput()}
                      onInput={(e) => setNewTagInput(e.currentTarget.value)}
                      onKeyDown={handleTagKeyDown}
                    />
                    <button
                      class="px-3 py-2 rounded-xl bg-violet-100 text-violet-600 text-xs font-bold hover:bg-violet-200 transition-colors"
                      onClick={addTag}
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* Save / Cancel */}
                <div class="flex gap-2 pb-2">
                  <button
                    class="flex-1 py-2.5 rounded-xl bg-linear-to-r from-violet-500 to-pink-500 text-white text-sm font-bold hover:opacity-90 active:scale-98 transition-all shadow-sm"
                    onClick={saveEdit}
                  >
                    保存
                  </button>
                  <button
                    class="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-500 font-semibold active:scale-98 transition-all"
                    onClick={() => setEditMode(false)}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </aside>
  )
}

const MetaRow: Component<{ label: string; value: string }> = (props) => (
  <div class="flex items-center justify-between text-xs">
    <span class="text-gray-400">{props.label}</span>
    <span class="text-gray-600 font-medium">{props.value}</span>
  </div>
)

export default GalleryDetail
