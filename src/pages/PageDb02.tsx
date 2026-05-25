import { type Component, createSignal, For, Show } from 'solid-js'
import type { Nutrient } from '../types'
import { PRODUCTS } from '../db/products'
import { state, setState } from '../store'

// Sample linked memos
const SAMPLE_MEMOS = [
  { id: 1, title: 'レシチンとアレルギーの関係', tags: ['レシチン', 'γリノレン酸'], date: '2026-05-25' },
  { id: 2, title: 'NMN研究まとめ（Pubmed）',   tags: ['NMN', 'サーチュイン'],     date: '2026-05-24' },
  { id: 3, title: 'プロポリスの免疫効果',       tags: ['プロポリス'],               date: '2026-05-22' },
]

type Props = { nutrients: Nutrient[] }

// ── Notion Table View ──────────────────────────────────────────────────────
const TableView: Component<{ nutrients: Nutrient[]; onSelect: (n: Nutrient) => void }> = (props) => {
  const visibleCols = () => state.db02Columns.filter((c) => c.visible)

  return (
    <div class="flex-1 overflow-auto px-6 pb-4">
      <div class="bg-white rounded-xl border border-nacc-border overflow-hidden">
        {/* Header */}
        <div class="flex border-b border-nacc-border bg-nacc-light sticky top-0 z-10">
          <div class="w-8 shrink-0 flex items-center justify-center p-2">
            <input type="checkbox" class="rounded" />
          </div>
          <For each={visibleCols()}>
            {(col) => (
              <div class="notion-cell flex-1 px-3 py-2 text-xs font-semibold text-gray-500">
                {col.label}
              </div>
            )}
          </For>
        </div>

        {/* Rows */}
        <For each={props.nutrients}>
          {(nutrient) => {
            const related = PRODUCTS.filter((p) => p.nutrientIds.includes(nutrient.id)).slice(0, 2)
            return (
              <div
                class="notion-row flex border-b border-nacc-border last:border-none cursor-pointer"
                onClick={() => props.onSelect(nutrient)}
              >
                <div class="w-8 shrink-0 flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" class="rounded" />
                </div>
                <For each={visibleCols()}>
                  {(col) => {
                    switch (col.id) {
                      case 'name':
                        return (
                          <div class="notion-cell flex-1 px-3 py-2.5 text-xs font-semibold text-nacc-gold">
                            {nutrient.name.split(' ')[0]}
                          </div>
                        )
                      case 'description':
                        return (
                          <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
                            {nutrient.description.slice(0, 80)}{nutrient.description.length > 80 ? '…' : ''}
                          </div>
                        )
                      case 'products':
                        return (
                          <div class="notion-cell flex-1 px-3 py-2.5">
                            {related.length ? (
                              <div class="flex flex-col gap-0.5">
                                <For each={related}>
                                  {(p) => (
                                    <div class="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">
                                      {p.name}
                                    </div>
                                  )}
                                </For>
                              </div>
                            ) : (
                              <span class="text-xs text-gray-300">—</span>
                            )}
                          </div>
                        )
                      case 'memo':
                        return (
                          <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-500 italic">
                            {nutrient.memo || '—'}
                          </div>
                        )
                      default:
                        return <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-400">—</div>
                    }
                  }}
                </For>
              </div>
            )
          }}
        </For>

        <div class="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors border-t border-dashed border-nacc-border">
          <span>+</span> 新しい栄養素を追加
        </div>
      </div>
    </div>
  )
}

// ── Detail View ────────────────────────────────────────────────────────────
const DetailView: Component<{ nutrients: Nutrient[] }> = (props) => {
  const [search, setSearch] = createSignal('')
  const [selected, setSelected] = createSignal<Nutrient | null>(null)

  const filtered = () => {
    const q = search().trim()
    if (!q) return props.nutrients
    return props.nutrients.filter((n) => n.name.includes(q) || n.description.includes(q))
  }

  const linkedMemos = (nutrient: Nutrient) =>
    SAMPLE_MEMOS.filter((m) =>
      m.tags.some((t) => nutrient.name.includes(t) || t.includes(nutrient.name.split(' ')[0].slice(0, 4)))
    )

  return (
    <div class="flex flex-1 overflow-hidden">
      {/* List */}
      <div class="w-60 shrink-0 border-r border-nacc-border flex flex-col overflow-hidden">
        <div class="p-3 border-b border-nacc-border">
          <input
            type="search"
            placeholder="成分を検索..."
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-nacc-border bg-white outline-none focus:border-nacc-gold"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        <div class="flex-1 overflow-y-auto">
          <For each={filtered()}>
            {(nutrient) => (
              <button
                class="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-[#f0f0f0] transition-colors"
                classList={{
                  'bg-[#f5f0e8]': selected()?.id === nutrient.id,
                  'hover:bg-[#f9f8f6]': selected()?.id !== nutrient.id,
                }}
                onClick={() => setSelected(nutrient)}
              >
                <div class="w-8 h-8 rounded-full bg-[#e8dfd0] flex items-center justify-center text-sm shrink-0">
                  🧬
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-nacc-gold truncate leading-tight">
                    {nutrient.name.split(' ')[0]}
                  </p>
                  <p class="text-xs text-[#999]">{nutrient.id}</p>
                </div>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Detail panel */}
      <div class="flex-1 overflow-y-auto bg-nacc-light p-6">
        <Show
          when={selected()}
          fallback={
            <div class="flex flex-col items-center justify-center h-full text-[#ccc] gap-2">
              <span class="text-5xl">🧬</span>
              <span class="text-sm">成分を選択してください</span>
            </div>
          }
        >
          {(nutrient) => (
            <div class="max-w-2xl mx-auto slide-in">
              <div class="w-14 h-14 rounded-2xl bg-[#f5f0e8] flex items-center justify-center text-3xl mb-4">
                🧬
              </div>
              <h1 class="text-xl font-bold text-nacc-dark mb-0.5">{nutrient().name}</h1>
              <p class="text-xs text-[#999] mb-5">{nutrient().id}</p>

              <div class="mb-5">
                <h2 class="text-xs font-semibold text-[#999] uppercase tracking-wider mb-2">説明</h2>
                <p class="text-sm text-nacc-dark leading-relaxed bg-white rounded-xl p-4 border border-nacc-border">
                  {nutrient().description}
                </p>
              </div>

              <div class="mb-5">
                <h2 class="text-xs font-semibold text-[#999] uppercase tracking-wider mb-2">含まれる商品</h2>
                <div class="flex flex-wrap gap-2">
                  <For each={PRODUCTS.filter((p) => p.nutrientIds.includes(nutrient().id))}>
                    {(p) => (
                      <span class="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-medium">
                        {p.name}
                      </span>
                    )}
                  </For>
                </div>
              </div>

              {/* Linked memos */}
              <Show when={linkedMemos(nutrient()).length > 0}>
                <div class="mt-6 pt-5 border-t border-nacc-border">
                  <h2 class="text-xs font-semibold text-[#999] uppercase tracking-wider mb-3">
                    🔗 リンクされたメモ・記事
                  </h2>
                  <div class="flex flex-col gap-2">
                    <For each={linkedMemos(nutrient())}>
                      {(memo) => (
                        <div class="bg-white border border-nacc-border rounded-lg px-4 py-3 hover:border-nacc-gold transition-colors cursor-pointer">
                          <p class="text-sm font-medium text-nacc-dark">{memo.title}</p>
                          <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                            <For each={memo.tags}>
                              {(tag) => (
                                <span class="text-xs bg-nacc-gold/10 text-nacc-gold rounded px-1.5 py-0.5">
                                  #{tag}
                                </span>
                              )}
                            </For>
                            <span class="text-xs text-[#bbb] ml-auto">{memo.date}</span>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>
          )}
        </Show>
      </div>
    </div>
  )
}

// ── Page Root ──────────────────────────────────────────────────────────────
const PageDb02: Component<Props> = (props) => {
  function selectFromTable(_n: Nutrient) {
    setState({ dbView: 'detail' })
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div class="px-6 pt-4 pb-3 bg-nacc-light flex items-start justify-between shrink-0">
        <div>
          <h1 class="text-xl font-bold text-nacc-dark">DB02 — 栄養素一覧</h1>
          <div class="text-xs text-gray-500 mt-0.5">
            有効成分・栄養素データベース ·{' '}
            <span class="font-medium">{props.nutrients.length}件</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-nacc-border rounded-lg bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setState({ settingsPanelOpen: true, galleryPanelOpen: false })}
          >
            ⚙ カラム設定
          </button>
          <button class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nacc-dark text-white rounded-lg hover:opacity-90 transition-opacity">
            + 新規追加
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div class="flex items-center gap-0 px-6 border-b border-nacc-border shrink-0 bg-white">
        <button
          class="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
          classList={{
            'border-nacc-dark text-nacc-dark': state.dbView === 'table',
            'border-transparent text-gray-400 hover:text-gray-600': state.dbView !== 'table',
          }}
          onClick={() => setState({ dbView: 'table' })}
        >
          ≡ テーブル
        </button>
        <button
          class="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
          classList={{
            'border-nacc-dark text-nacc-dark': state.dbView === 'detail',
            'border-transparent text-gray-400 hover:text-gray-600': state.dbView !== 'detail',
          }}
          onClick={() => setState({ dbView: 'detail' })}
        >
          🗂 詳細View
        </button>
      </div>

      {/* Content */}
      <Show when={state.dbView === 'table'}>
        <TableView nutrients={props.nutrients} onSelect={selectFromTable} />
      </Show>
      <Show when={state.dbView === 'detail'}>
        <DetailView nutrients={props.nutrients} />
      </Show>
    </div>
  )
}

export default PageDb02
