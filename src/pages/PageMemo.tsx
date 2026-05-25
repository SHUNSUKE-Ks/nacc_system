import { type Component, createSignal, For, Show } from 'solid-js'
import type { Tag } from '../types'
import { PRODUCTS } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'
import { state, setState, addMemo, updateMemo, deleteMemo } from '../store'

let saveTimer: ReturnType<typeof setTimeout>

function scheduleFirestoreSave(id: string, patch: Parameters<typeof updateMemo>[1]) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => updateMemo(id, patch), 800)
}

const PageMemo: Component = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const isMobile = () => window.innerWidth < 768
  const [mobilePanel, setMobilePanel] = createSignal<'list' | 'editor'>('list')

  const [tagPickerOpen, setTagPickerOpen] = createSignal(false)
  const [tagPickerTab, setTagPickerTab] = createSignal<'product' | 'nutrient'>('product')
  const [tagPickerSelected, setTagPickerSelected] = createSignal<Tag[]>([])
  const [tagPickerSearch, setTagPickerSearch] = createSignal('')

  const selected = () => state.memos.find((m) => m.id === selectedId())

  function patchLocal(id: string, patch: Parameters<typeof updateMemo>[1]) {
    setState('memos', (prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  function handleTextInput(field: 'title' | 'body', value: string) {
    const id = selectedId()
    if (!id) return
    const now = new Date()
    const patch = { [field]: value, updatedAt: now }
    patchLocal(id, patch)
    scheduleFirestoreSave(id, patch)
  }

  async function addNewMemo() {
    const now = new Date()
    const data = { title: '新しいメモ', body: '', tags: [], createdAt: now, updatedAt: now }
    const id = await addMemo(data)
    setSelectedId(id)
    if (isMobile()) setMobilePanel('editor')
  }

  function selectMemo(id: string) {
    setSelectedId(id)
    if (isMobile()) setMobilePanel('editor')
  }

  function removeTag(tagName: string) {
    const id = selectedId()
    if (!id) return
    const tags = selected()?.tags.filter((t) => t.name !== tagName) ?? []
    patchLocal(id, { tags })
    updateMemo(id, { tags })
  }

  function confirmTagPicker() {
    const id = selectedId()
    const curr = selected()
    if (!id || !curr) return
    const existing = curr.tags.map((t) => t.name)
    const toAdd = tagPickerSelected().filter((t) => !existing.includes(t.name))
    const tags = [...curr.tags, ...toAdd]
    patchLocal(id, { tags })
    updateMemo(id, { tags })
    setTagPickerOpen(false)
    setTagPickerSelected([])
    setTagPickerSearch('')
  }

  function closeTagPicker() {
    setTagPickerOpen(false)
    setTagPickerSelected([])
    setTagPickerSearch('')
  }

  const List = () => (
    <div class="w-64 shrink-0 border-r border-nacc-border bg-white flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-nacc-border">
        <span class="text-sm font-semibold text-nacc-dark">メモ</span>
        <button
          class="text-xs px-2 py-1 rounded bg-nacc-gold text-white font-semibold hover:opacity-80"
          onClick={addNewMemo}
        >
          + 新規
        </button>
      </div>
      <Show
        when={state.memos.length > 0}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center text-[#ccc] gap-2 text-xs">
            <span class="text-3xl">📝</span>
            <span>メモがありません</span>
          </div>
        }
      >
        <div class="flex-1 overflow-y-auto">
          <For each={state.memos}>
            {(memo) => (
              <button
                class="blog-list-item w-full text-left px-4 py-3 border-b border-[#f0f0f0]"
                classList={{ active: selectedId() === memo.id }}
                onClick={() => selectMemo(memo.id!)}
              >
                <p class="text-sm font-medium text-nacc-dark truncate">{memo.title || '無題'}</p>
                <Show when={memo.tags.length > 0}>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <For each={memo.tags.slice(0, 2)}>
                      {(t) => (
                        <span
                          class="text-xs rounded-full px-1.5 py-0.5"
                          classList={{
                            'bg-blue-50 text-blue-600':   t.type === 'product',
                            'bg-green-50 text-green-700': t.type === 'nutrient',
                          }}
                        >
                          {t.type === 'product' ? '📦' : '🌿'} {t.name.length > 8 ? t.name.slice(0, 8) + '…' : t.name}
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
                <p class="text-xs text-[#999] mt-0.5">
                  {new Date(memo.updatedAt).toLocaleDateString('ja-JP')}
                </p>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )

  const Editor = () => (
    <div class="flex-1 flex flex-col overflow-hidden">
      <Show when={isMobile()}>
        <button class="mobile-back" onClick={() => setMobilePanel('list')}>
          ← メモ一覧
        </button>
      </Show>
      <Show
        when={selected()}
        fallback={
          <div class="flex items-center justify-center h-full text-[#ccc] text-sm">
            メモを選択してください
          </div>
        }
      >
        {(memo) => (
          <div class="flex flex-col h-full overflow-hidden">
            <div class="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <input
                type="text"
                class="text-xl font-bold text-nacc-dark border-none outline-none bg-transparent w-full"
                placeholder="タイトル"
                value={memo().title}
                onInput={(e) => handleTextInput('title', e.currentTarget.value)}
              />

              <div class="flex flex-wrap gap-1.5 items-center">
                <For each={memo().tags}>
                  {(tag) => (
                    <span
                      class="flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border font-medium"
                      classList={{
                        'bg-blue-50 text-blue-700 border-blue-200':   tag.type === 'product',
                        'bg-green-50 text-green-700 border-green-200': tag.type === 'nutrient',
                      }}
                    >
                      {tag.type === 'product' ? '📦' : '🌿'} {tag.name}
                      <button
                        class="ml-1 opacity-50 hover:opacity-100 text-xs leading-none"
                        onClick={() => removeTag(tag.name)}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </For>
                <button
                  class="text-xs px-2 py-1 rounded-full border border-dashed border-nacc-gold text-nacc-gold hover:bg-[#f5f0e8]"
                  onClick={() => setTagPickerOpen(true)}
                >
                  + タグ追加
                </button>
              </div>

              <textarea
                class="flex-1 min-h-64 text-sm text-nacc-dark border border-nacc-border outline-none bg-white rounded-xl p-4 resize-none leading-relaxed shadow-sm focus:ring-1 focus:ring-nacc-gold/30"
                placeholder="メモを入力..."
                value={memo().body}
                onInput={(e) => handleTextInput('body', e.currentTarget.value)}
              />

              <div class="flex items-center justify-between text-xs text-gray-400">
                <button
                  class="text-red-400 hover:text-red-600"
                  onClick={() => { deleteMemo(memo().id!); setSelectedId(null) }}
                >
                  🗑️ 削除
                </button>
                <span>自動保存 — {new Date(memo().updatedAt).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  )

  return (
    <div class="flex h-full overflow-hidden">
      <Show when={!isMobile() || mobilePanel() === 'list'}>
        <List />
      </Show>
      <Show when={!isMobile() || mobilePanel() === 'editor'}>
        <Editor />
      </Show>

      {/* ── Tag picker bottom sheet ── */}
      <Show when={tagPickerOpen()}>
        <div class="fixed inset-0 z-60 bg-black/30" onClick={closeTagPicker} />
        <div
          class="fixed bottom-0 left-0 right-0 z-70 bg-white rounded-t-2xl shadow-2xl flex flex-col"
          style={{ 'max-height': '70vh' }}
        >
          <div class="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
            <span class="font-semibold text-sm">カテゴリータグを追加</span>
            <button
              class="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
              onClick={closeTagPicker}
            >
              ✕
            </button>
          </div>

          {/* Search */}
          <div class="px-5 pt-3 pb-0 shrink-0">
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-nacc-border">
              <span class="text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                class="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
                placeholder="検索..."
                value={tagPickerSearch()}
                onInput={(e) => setTagPickerSearch(e.currentTarget.value)}
              />
              <Show when={tagPickerSearch()}>
                <button
                  class="text-gray-300 hover:text-gray-500 leading-none"
                  onClick={() => setTagPickerSearch('')}
                >
                  ✕
                </button>
              </Show>
            </div>
          </div>

          <div class="flex px-5 mt-2 shrink-0 border-b border-nacc-border">
            {(['product', 'nutrient'] as const).map((tab) => (
              <button
                class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px"
                classList={{
                  'border-nacc-gold text-nacc-gold': tagPickerTab() === tab,
                  'border-transparent text-gray-500 hover:text-gray-700': tagPickerTab() !== tab,
                }}
                onClick={() => setTagPickerTab(tab)}
              >
                {tab === 'product' ? '📦 商品' : '🌿 成分'}
              </button>
            ))}
          </div>

          <div class="overflow-y-auto flex-1 p-3">
            <For each={(tagPickerTab() === 'product' ? PRODUCTS : NUTRIENTS).filter((item) =>
              tagPickerSearch() === '' || item.name.includes(tagPickerSearch())
            )}>
              {(item) => {
                const tag: Tag = { type: tagPickerTab(), name: item.name }
                const isSelected = () => tagPickerSelected().some((t) => t.name === item.name)
                const alreadyAdded = () => selected()?.tags.some((t) => t.name === item.name) ?? false
                return (
                  <button
                    class="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                    classList={{
                      'bg-[#f5f0e8]': isSelected(),
                      'opacity-40 pointer-events-none': alreadyAdded(),
                      'hover:bg-[#f9f8f6]': !isSelected() && !alreadyAdded(),
                    }}
                    onClick={() => {
                      if (alreadyAdded()) return
                      setTagPickerSelected((prev) =>
                        isSelected() ? prev.filter((t) => t.name !== item.name) : [...prev, tag]
                      )
                    }}
                  >
                    <span>{tagPickerTab() === 'product' ? '📦' : '🌿'}</span>
                    <span class="text-sm text-nacc-dark leading-tight flex-1">{item.name}</span>
                    <Show when={isSelected()}>
                      <span class="text-nacc-gold font-bold">✓</span>
                    </Show>
                    <Show when={alreadyAdded()}>
                      <span class="text-xs text-[#999]">追加済み</span>
                    </Show>
                  </button>
                )
              }}
            </For>
            <Show when={(tagPickerTab() === 'product' ? PRODUCTS : NUTRIENTS).filter((item) =>
              tagPickerSearch() !== '' && item.name.includes(tagPickerSearch())
            ).length === 0 && tagPickerSearch() !== ''}>
              <div class="flex flex-col items-center justify-center py-8 text-gray-300 text-sm gap-1">
                <span>「{tagPickerSearch()}」は見つかりません</span>
              </div>
            </Show>
          </div>

          <div class="px-5 py-3 border-t border-nacc-border flex items-center justify-between bg-gray-50 shrink-0">
            <span class="text-xs text-gray-500 font-medium">{tagPickerSelected().length}件選択中</span>
            <div class="flex gap-2">
              <button
                class="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={closeTagPicker}
              >
                キャンセル
              </button>
              <button
                class="px-4 py-1.5 text-sm bg-nacc-dark text-white rounded-lg hover:opacity-90 font-medium"
                onClick={confirmTagPicker}
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default PageMemo
