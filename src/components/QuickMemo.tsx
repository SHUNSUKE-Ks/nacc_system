import { type Component, createSignal, For, onCleanup, Show } from 'solid-js'
import type { Tag } from '../types'
import { addMemo, navigate, state } from '../store'

// header の「メモ」: どの画面からでもすぐ追記できる。
// 商品ページを開いているときは、その商品をタグに自動で入れる。
const QuickMemo: Component = () => {
  const [open, setOpen] = createSignal(false)
  const [title, setTitle] = createSignal('')
  const [body, setBody] = createSignal('')
  const [tags, setTags] = createSignal<Tag[]>([])
  const [saved, setSaved] = createSignal(false)
  let rootRef!: HTMLDivElement
  let bodyRef!: HTMLTextAreaElement

  const openProduct = () =>
    state.page === 'db01' && state.dbView === 'detail'
      ? state.products.find((product) => product.id === state.selectedProductId) ?? null
      : null

  function show() {
    const product = openProduct()
    setTags(product ? [{ type: 'product', name: product.name }] : [])
    setTitle('')
    setBody('')
    setSaved(false)
    setOpen(true)
    queueMicrotask(() => bodyRef?.focus())
  }

  function save() {
    const text = body().trim()
    const heading = title().trim() || text.split('\n')[0].slice(0, 30) || '新しいメモ'
    if (!text && !title().trim()) return
    const now = new Date()
    // 一覧へはすぐ反映される。サーバー（Firestore）の応答は待たない（オフラインでも止まらない）
    void addMemo({ title: heading, body: text, tags: tags(), createdAt: now, updatedAt: now })
    setSaved(true)
    setTitle('')
    setBody('')
  }

  const onOutside = (event: PointerEvent) => {
    if (open() && !rootRef.contains(event.target as Node)) setOpen(false)
  }
  document.addEventListener('pointerdown', onOutside)
  onCleanup(() => document.removeEventListener('pointerdown', onOutside))

  return (
    <div class="quick-memo" ref={rootRef}>
      <button
        class="app-header-memo flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-nacc-border hover:bg-[#fbf4e4] active:scale-95 text-[#8a5c27] text-xs font-bold transition-all"
        onClick={() => (open() ? setOpen(false) : show())}
        title="新しいメモをすぐ追記"
        aria-expanded={open()}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 4h10l4 4v12H5zM15 4v4h4M8.5 12.5h7M8.5 16h4.5" />
        </svg>
        <span class="hidden sm:inline">メモ</span>
      </button>

      <Show when={open()}>
        <section class="quick-memo-panel" role="dialog" aria-label="メモを追記">
          <header>
            <strong>メモを追記</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="閉じる">×</button>
          </header>
          <input
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
            placeholder="タイトル（省略すると本文の1行目）"
          />
          <textarea
            ref={bodyRef}
            rows="5"
            value={body()}
            onInput={(e) => { setBody(e.currentTarget.value); setSaved(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void save() } }}
            placeholder="思いついたことをそのまま書いてください（Ctrl+Enterで保存）"
          />
          <div class="quick-memo-tags">
            <For each={tags()} fallback={<span class="is-empty">タグなし</span>}>
              {(tag) => (
                <span class="quick-memo-tag">
                  # {tag.name}
                  <button type="button" onClick={() => setTags(tags().filter((item) => item.name !== tag.name))} aria-label={`${tag.name}のタグを外す`}>×</button>
                </span>
              )}
            </For>
          </div>
          <footer>
            <button type="button" class="is-link" onClick={() => { setOpen(false); navigate('memo') }}>メモ一覧を開く</button>
            <Show when={saved()}><span class="quick-memo-saved">保存しました</span></Show>
            <button type="button" class="is-primary" onClick={() => void save()} disabled={!body().trim() && !title().trim()}>保存</button>
          </footer>
        </section>
      </Show>
    </div>
  )
}

export default QuickMemo
