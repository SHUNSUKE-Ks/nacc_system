import { type Component, createSignal, For, Show } from 'solid-js'
import type { NotebookPage } from '../types'
import { state, setState, addNotebook, updateNotebook, deleteNotebook } from '../store'

let saveTimer: ReturnType<typeof setTimeout>

function mkPageId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const PageNotebook: Component = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [selectedPageId, setSelectedPageId] = createSignal<string | null>(null)

  const selectedNotebook = () => state.notebooks.find((n) => n.id === selectedId())
  const selectedPage = () => selectedNotebook()?.pages.find((p) => p.id === selectedPageId())

  function schedulePageSave(notebookId: string, pages: NotebookPage[]) {
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => updateNotebook(notebookId, { pages, updatedAt: new Date() }), 800)
  }

  function patchPagesLocal(notebookId: string, pages: NotebookPage[]) {
    setState('notebooks', (prev) => prev.map((n) => (n.id === notebookId ? { ...n, pages } : n)))
  }

  async function handleAddNotebook() {
    const now = new Date()
    const id = await addNotebook({ title: '新しいノート', pages: [], createdAt: now, updatedAt: now })
    setSelectedId(id)
    setSelectedPageId(null)
  }

  function handleDeleteNotebook(id: string) {
    deleteNotebook(id)
    if (selectedId() === id) {
      setSelectedId(null)
      setSelectedPageId(null)
    }
  }

  function handleAddPage() {
    const nb = selectedNotebook()
    if (!nb) return
    const page: NotebookPage = {
      id: mkPageId(),
      title: '新しいページ',
      body: '',
      order: nb.pages.length,
    }
    const pages = [...nb.pages, page]
    updateNotebook(nb.id!, { pages, updatedAt: new Date() })
    setSelectedPageId(page.id)
  }

  function handleDeletePage(pageId: string) {
    const nb = selectedNotebook()
    if (!nb) return
    const pages = nb.pages.filter((p) => p.id !== pageId).map((p, i) => ({ ...p, order: i }))
    updateNotebook(nb.id!, { pages, updatedAt: new Date() })
    setSelectedPageId(pages[0]?.id ?? null)
  }

  function patchPage(field: 'title' | 'body', value: string) {
    const nb = selectedNotebook()
    if (!nb) return
    const pages = nb.pages.map((p) =>
      p.id === selectedPageId() ? { ...p, [field]: value } : p
    )
    patchPagesLocal(nb.id!, pages)
    schedulePageSave(nb.id!, pages)
  }

  function handleRenameNotebook(title: string) {
    const id = selectedId()
    if (!id) return
    updateNotebook(id, { title, updatedAt: new Date() })
  }

  return (
    <div class="flex h-full overflow-hidden">
      {/* ── ノートブック一覧 ── */}
      <div class="w-52 shrink-0 border-r border-nacc-border bg-white flex flex-col">
        <div class="flex items-center justify-between px-3 py-2.5 border-b border-nacc-border">
          <span class="text-sm font-semibold text-nacc-dark">ノートブック</span>
          <button
            class="text-xs px-2 py-1 rounded bg-nacc-gold text-white font-semibold hover:opacity-80"
            onClick={handleAddNotebook}
          >
            + 新規
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          <Show
            when={state.notebooks.length > 0}
            fallback={
              <div class="flex flex-col items-center justify-center h-32 text-[#ccc] gap-2 text-xs">
                <span class="text-3xl">📓</span>
                <span>ノートがありません</span>
              </div>
            }
          >
            <For each={state.notebooks}>
              {(nb) => (
                <div
                  class="w-full text-left px-4 py-3 border-b border-[#f0f0f0] group relative cursor-pointer"
                  classList={{
                    'bg-[#f5f0e8]': selectedId() === nb.id,
                    'hover:bg-[#f9f8f6]': selectedId() !== nb.id,
                  }}
                  onClick={() => {
                    setSelectedId(nb.id!)
                    setSelectedPageId(nb.pages[0]?.id ?? null)
                  }}
                >
                  <p class="text-sm font-medium text-nacc-dark truncate pr-5">📓 {nb.title}</p>
                  <p class="text-xs text-[#999] mt-0.5">{nb.pages.length}ページ</p>
                  <button
                    class="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                    onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(nb.id!) }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </For>
          </Show>
        </div>
      </div>

      {/* ── ページ一覧 + エディタ ── */}
      <Show
        when={selectedNotebook()}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center text-[#ccc] gap-3">
            <span class="text-5xl">📓</span>
            <span class="text-sm">ノートを選択してください</span>
            <button
              class="mt-1 text-xs px-3 py-1.5 rounded-lg bg-nacc-gold text-white hover:opacity-80"
              onClick={handleAddNotebook}
            >
              + 新規ノートを作成
            </button>
          </div>
        }
      >
        {(nb) => (
          <>
            {/* ページ一覧サイドバー */}
            <div class="w-44 shrink-0 border-r border-nacc-border bg-nacc-light flex flex-col">
              <div class="px-3 py-2.5 border-b border-nacc-border">
                <input
                  type="text"
                  class="w-full text-xs font-semibold text-nacc-dark bg-transparent border-none outline-none truncate"
                  value={nb().title}
                  onInput={(e) => handleRenameNotebook(e.currentTarget.value)}
                />
              </div>
              <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                <For each={nb().pages.slice().sort((a, b) => a.order - b.order)}>
                  {(page) => (
                    <div
                      class="group relative flex items-center px-2 py-2 rounded-lg cursor-pointer text-xs"
                      classList={{
                        'bg-white shadow-sm text-nacc-dark font-medium': selectedPageId() === page.id,
                        'text-gray-500 hover:bg-white/60': selectedPageId() !== page.id,
                      }}
                      onClick={() => setSelectedPageId(page.id)}
                    >
                      <span class="flex-1 truncate">📄 {page.title || '無題'}</span>
                      <button
                        class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 ml-1 transition-all shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id) }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </For>
                <button
                  class="mt-1 flex items-center gap-1 px-2 py-2 text-xs text-gray-400 hover:text-nacc-gold transition-colors"
                  onClick={handleAddPage}
                >
                  + ページを追加
                </button>
              </div>
            </div>

            {/* ページエディタ */}
            <div class="flex-1 flex flex-col overflow-hidden">
              <Show
                when={selectedPage()}
                fallback={
                  <div class="flex-1 flex flex-col items-center justify-center text-[#ccc] gap-2">
                    <span class="text-4xl">📄</span>
                    <span class="text-sm">ページを選択または追加してください</span>
                    <button
                      class="mt-2 text-xs px-3 py-1.5 rounded-lg bg-nacc-gold text-white hover:opacity-80"
                      onClick={handleAddPage}
                    >
                      + 最初のページを追加
                    </button>
                  </div>
                }
              >
                {(page) => (
                  <div class="flex-1 flex flex-col overflow-hidden p-6">
                    <input
                      type="text"
                      class="text-xl font-bold text-nacc-dark border-none outline-none bg-transparent w-full mb-3"
                      placeholder="ページタイトル"
                      value={page().title}
                      onInput={(e) => patchPage('title', e.currentTarget.value)}
                    />
                    <textarea
                      class="flex-1 text-sm text-nacc-dark border border-nacc-border outline-none bg-white rounded-xl p-4 resize-none leading-relaxed shadow-sm focus:ring-1 focus:ring-nacc-gold/30"
                      placeholder="ここに内容を入力..."
                      value={page().body}
                      onInput={(e) => patchPage('body', e.currentTarget.value)}
                    />
                    <div class="text-xs text-gray-400 text-right mt-2">
                      自動保存 — {new Date(nb().updatedAt).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}

export default PageNotebook
