import { type Component, createSignal, For, Show } from 'solid-js'
import type { Memo } from '../types'

let nextId = 1
const mkMemo = (): Memo => ({
  id: nextId++,
  title: '新しいメモ',
  body: '',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
})

const PageMemo: Component = () => {
  const [memos, setMemos] = createSignal<Memo[]>([mkMemo()])
  const [selectedId, setSelectedId] = createSignal<number>(memos()[0].id!)
  const isMobile = () => window.innerWidth < 768
  const [mobilePanel, setMobilePanel] = createSignal<'list' | 'editor'>('list')

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

  const List = () => (
    <div class="w-64 shrink-0 border-r border-[#e8e8e8] flex flex-col overflow-hidden md:flex flex-col">
      <div class="flex items-center justify-between px-3 py-2 border-b border-[#e8e8e8]">
        <span class="text-sm font-semibold text-[#37352f]">メモ</span>
        <button
          class="text-xs px-2 py-1 rounded bg-[#b38247] text-white font-semibold hover:opacity-80"
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
              <p class="text-sm font-medium text-[#37352f] truncate">{memo.title || '無題'}</p>
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
        <button
          class="mobile-back"
          onClick={() => setMobilePanel('list')}
        >
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
          <div class="flex flex-col h-full overflow-hidden p-4 gap-3">
            <input
              type="text"
              class="text-xl font-bold text-[#37352f] border-none outline-none bg-transparent w-full"
              placeholder="タイトル"
              value={memo().title}
              onInput={(e) => updateMemo({ title: e.currentTarget.value })}
            />
            <textarea
              class="flex-1 text-sm text-[#37352f] border-none outline-none bg-transparent resize-none leading-relaxed"
              placeholder="メモを入力..."
              value={memo().body}
              onInput={(e) => updateMemo({ body: e.currentTarget.value })}
            />
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
    </div>
  )
}

export default PageMemo
