import { type Component, Show, createSignal, createEffect } from 'solid-js'
import {
  galleryState, updateGalleryItem, addMasterTag,
} from './store'
import type { GalleryCategory } from './types'
import { CATEGORY_LABELS, CATEGORY_ICON } from './types'

const ALL_CATEGORIES: GalleryCategory[] = ['product', 'nutrient', 'reference', 'other']

type Props = {
  itemId: string
  onClose: () => void
}

const GalleryEditDialog: Component<Props> = (props) => {
  const item = () => galleryState.items.find((i) => i.id === props.itemId)

  const [label, setLabel] = createSignal('')
  const [filename, setFilename] = createSignal('')
  const [description, setDescription] = createSignal('')
  const [category, setCategory] = createSignal<GalleryCategory>('product')
  const [tags, setTags] = createSignal<string[]>([])
  const [tagInput, setTagInput] = createSignal('')
  let tagInputRef!: HTMLInputElement

  createEffect(() => {
    const it = item()
    if (!it) return
    setLabel(it.label)
    setFilename(it.filename)
    setDescription(it.description ?? '')
    setCategory(it.category)
    setTags([...it.tags])
    setTagInput('')
  })

  function addTag() {
    const tag = tagInput().trim()
    if (tag && !tags().includes(tag)) {
      addMasterTag(tag)
      setTags((prev) => [...prev, tag])
    }
    setTagInput('')
    tagInputRef?.focus()
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
    tagInputRef?.focus()
  }

  function handleTagKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && !tagInput() && tags().length > 0) {
      removeTag(tags()[tags().length - 1])
    }
  }

  function save() {
    const it = item()
    if (!it) return
    updateGalleryItem(it.id, {
      label: label().trim() || it.label,
      filename: filename().trim() || it.filename,
      description: description().trim() || undefined,
      category: category(),
      tags: tags(),
    })
    props.onClose()
  }

  return (
    <Show when={item()}>
      {/* Backdrop */}
      <div
        class="fixed inset-0 z-110 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={props.onClose}
      >
        {/* Dialog */}
        <div
          class="w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ "max-height": "85dvh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <span class="text-sm font-bold text-gray-800">編集</span>
            <button
              class="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xs transition-colors"
              onClick={props.onClose}
            >✕</button>
          </div>

          {/* Scrollable body */}
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Label */}
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                表示名（ラベル）
              </label>
              <input
                type="text"
                class="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                value={label()}
                onInput={(e) => setLabel(e.currentTarget.value)}
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
                value={filename()}
                onInput={(e) => setFilename(e.currentTarget.value)}
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
                      'border-violet-400 bg-violet-50 text-violet-600': category() === cat,
                      'border-gray-200 bg-white text-gray-500 hover:border-gray-300': category() !== cat,
                    }}
                    onClick={() => setCategory(cat)}
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
                value={description()}
                onInput={(e) => setDescription(e.currentTarget.value)}
                placeholder="説明を入力（任意）"
              />
            </div>

            {/* Tags */}
            <div>
              <label class="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                タグ
              </label>
              <div class="flex flex-wrap gap-1.5 mb-2">
                {tags().map((tag) => (
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
                  placeholder="タグを入力 → Enter"
                  value={tagInput()}
                  onInput={(e) => setTagInput(e.currentTarget.value)}
                  onKeyDown={handleTagKeyDown}
                />
                <button
                  class="px-3 py-2 rounded-xl bg-violet-100 text-violet-600 text-xs font-bold hover:bg-violet-200 transition-colors"
                  onClick={addTag}
                >＋</button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div class="flex gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              class="flex-1 py-2.5 rounded-xl bg-linear-to-r from-violet-500 to-pink-500 text-white text-sm font-bold hover:opacity-90 active:scale-98 transition-all shadow-sm"
              onClick={save}
            >
              保存する
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm text-gray-500 font-semibold active:scale-98 transition-all"
              onClick={props.onClose}
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    </Show>
  )
}

export default GalleryEditDialog
