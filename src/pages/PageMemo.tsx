import { type Component, createSignal, For, Show } from 'solid-js'
import type { Memo, Tag } from '../types'
import { PRODUCTS } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'

let nextId = 1
const mkMemo = (): Memo => ({
  id: nextId++,
  title: '新しいメモ',
  body: '',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const INITIAL_MEMOS: Memo[] = [
  {
    id: nextId++,
    title: 'レシチンとアレルギーの関係',
    body: 'レシチンはホスファチジルコリンを主成分とするリン脂質。アレルギー反応の抑制に関与するという研究が増えている。\n\n大豆由来のレシチンはγリノレン酸を豊富に含み、炎症性サイトカインのバランスを整える可能性がある。',
    tags: [
      { type: 'nutrient', name: 'レシチン (ホスファチジルコリン)' },
      { type: 'nutrient', name: 'γリノレン酸 (GLA)' },
    ],
    createdAt: new Date('2026-05-25'),
    updatedAt: new Date('2026-05-25'),
  },
  {
    id: nextId++,
    title: 'プロポリスの免疫効果まとめ',
    body: 'プロポリスはミツバチが作る天然の抗菌物質。フラボノイドが豊富で免疫機能を高める効果が期待されている。',
    tags: [
      { type: 'product', name: 'プロポリス' },
    ],
    createdAt: new Date('2026-05-22'),
    updatedAt: new Date('2026-05-22'),
  },
]

const PageMemo: Component = () => {
  const [memos, setMemos] = createSignal<Memo[]>(INITIAL_MEMOS)
  const [selectedId, setSelectedId] = createSignal<number | null>(INITIAL_MEMOS[0].id!)
  const isMobile = () => window.innerWidth < 768
  const [mobilePanel, setMobilePanel] = createSignal<'list' | 'editor'>('list')

  // Tag picker
  const [tagPickerOpen, setTagPickerOpen] = createSignal(false)
  const [tagPickerTab, setTagPickerTab] = createSignal<'product' | 'nutrient'>('product')
  const [tagPickerSelected, setTagPickerSelected] = createSignal<Tag[]>([])

  const selected = () => memos().find((m) => m.id === selectedId())

  function updateMemo(patch: Partial<Memo>) {
    setMemos((prev) =>
      prev.map((m) =>
        m.id === selectedId() ? { ...m, ...patch, updatedAt: new Date() } : m
      )
    )
  }

  function addMemo() {
    const m = mkMemo()
    setMemos((prev) => [m, ...prev])
    setSelectedId(m.id!)
    if (isMobile()) setMobilePanel('editor')
  }

  function selectMemo(id: number) {
    setSelectedId(id)
    if (isMobile()) setMobilePanel('editor')
  }

  function removeTag(tagName: string) {
    updateMemo({ tags: selected()?.tags.filter((t) => t.name !== tagName) ?? [] })
  }

  function confirmTagPicker() {
    const curr = selected()
    if (!curr) return
    const existing = curr.tags.map((t) => t.name)
    const toAdd = tagPickerSelected().filter((t) => !existing.includes(t.name))
    updateMemo({ tags: [...curr.tags, ...toAdd] })
    setTagPickerOpen(false)
    setTagPickerSelected([])
  }

  const List = () => (
    <div class="w-64 shrink-0 border-r border-nacc-border bg-white flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-nacc-border">
        <span class="text-sm font-semibold text-nacc-dark">メモ</span>
        <button
          class="text-xs px-2 py-1 rounded bg-nacc-gold text-white font-semibold hover:opacity-80"
          onClick={addMemo}
        >
          + 新規
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <For each={memos()}>
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
                {memo.updatedAt.toLocaleDateString('ja-JP')}
              </p>
            </button>
          )}
        </For>
      </div>
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
              {/* Title */}
              <input
                type="text"
                class="text-xl font-bold text-nacc-dark border-none outline-none bg-transparent w-full"
                placeholder="タイトル"
                value={memo().title}
                onInput={(e) => updateMemo({ title: e.currentTarget.value })}
              />

              {/* Tags */}
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

              {/* Body */}
              <textarea
                class="flex-1 min-h-64 text-sm text-nacc-dark border border-nacc-border outline-none bg-white rounded-xl p-4 resize-none leading-relaxed shadow-sm focus:ring-1 focus:ring-nacc-gold/30"
                placeholder="メモを入力..."
                value={memo().body}
                onInput={(e) => updateMemo({ body: e.currentTarget.value })}
              />

              <div class="text-xs text-gray-400 text-right">
                自動保存 — {new Date(memo().updatedAt).toLocaleDateString('ja-JP')}
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
        <div
          class="fixed inset-0 z-60 bg-black/30"
          onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }}
        />
        <div
          class="fixed bottom-0 left-0 right-0 z-70 bg-white rounded-t-2xl shadow-2xl flex flex-col"
          style={{ 'max-height': '70vh' }}
        >
          <div class="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
            <span class="font-semibold text-sm">カテゴリータグを追加</span>
            <button
              class="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100"
              onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }}
            >
              ✕
            </button>
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
            <For each={tagPickerTab() === 'product' ? PRODUCTS : NUTRIENTS}>
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
          </div>
          <div class="px-5 py-3 border-t border-nacc-border flex items-center justify-between bg-gray-50 shrink-0">
            <span class="text-xs text-gray-500 font-medium">{tagPickerSelected().length}件選択中</span>
            <div class="flex gap-2">
              <button
                class="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }}
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
