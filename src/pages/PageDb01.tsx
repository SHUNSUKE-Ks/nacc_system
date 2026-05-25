import { type Component, createSignal, For, Show } from 'solid-js'
import type { Product } from '../types'
import { productImageUrl } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'
import { state, setState } from '../store'

// Sample linked memos (will come from Dexie in production)
const SAMPLE_MEMOS = [
  { id: 1, title: 'レシチンとアレルギーの関係', tags: ['レシチン', 'γリノレン酸', 'アレルギー'], date: '2026-05-25' },
  { id: 2, title: 'NMN研究まとめ（Pubmed）', tags: ['NMN', '老化防止', 'サーチュイン'], date: '2026-05-24' },
  { id: 3, title: 'プロポリスの免疫効果', tags: ['プロポリス', '免疫'], date: '2026-05-22' },
]

type Props = { products: Product[] }

// ── Notion Table View ──────────────────────────────────────────────────────
const TableView: Component<{ products: Product[]; onSelect: (p: Product) => void }> = (props) => {
  const visibleCols = () => state.db01Columns.filter((c) => c.visible)

  return (
    <div class="flex-1 overflow-auto px-6 pb-4">
      <div class="bg-white rounded-xl border border-nacc-border overflow-hidden">
        {/* Header row */}
        <div class="flex border-b border-nacc-border bg-nacc-light sticky top-0 z-10">
          <div class="w-8 shrink-0 flex items-center justify-center p-2">
            <input type="checkbox" class="rounded" />
          </div>
          <For each={visibleCols()}>
            {(col) => (
              <div class="notion-cell flex-1 px-3 py-2 text-xs font-semibold text-gray-500 flex items-center gap-1">
                {col.label}
                {!col.visible && (
                  <span class="text-xs bg-orange-100 text-orange-600 rounded px-1 ml-1">非表示中</span>
                )}
              </div>
            )}
          </For>
          <div class="w-8 shrink-0 px-1 py-2 flex items-center justify-center text-gray-400 text-xs">+</div>
        </div>

        {/* Data rows */}
        <For each={props.products}>
          {(product) => (
            <div
              class="notion-row flex border-b border-nacc-border last:border-none hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => props.onSelect(product)}
            >
              <div class="w-8 shrink-0 flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" class="rounded" />
              </div>
              <For each={visibleCols()}>
                {(col) => <TableCell col={col.id} product={product} />}
              </For>
              <div class="w-8 shrink-0" />
            </div>
          )}
        </For>

        {/* Add row */}
        <div class="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors border-t border-dashed border-nacc-border">
          <span>+</span> 新しい行を追加
        </div>
      </div>
    </div>
  )
}

const TableCell: Component<{ col: string; product: Product }> = (props) => {
  const p = props.product
  switch (props.col) {
    case 'name':
      return (
        <div class="notion-cell flex-1 px-3 py-2.5 text-xs font-semibold text-nacc-gold">
          {p.name}
        </div>
      )
    case 'symptoms':
      return (
        <div class="notion-cell flex-1 px-3 py-2.5">
          <div class="flex flex-wrap gap-1">
            <For each={p.symptoms.slice(0, 2)}>
              {(s) => (
                <span class="bg-red-50 text-red-600 rounded px-1.5 py-0.5 text-xs">{s}</span>
              )}
            </For>
          </div>
        </div>
      )
    case 'effects':
      return (
        <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-green-700">
          {p.effects.slice(0, 2).join('・')}
        </div>
      )
    case 'ingredients':
      return (
        <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-blue-700 truncate max-w-xs" title={p.ingredients.join('、')}>
          {p.ingredients.slice(0, 2).join('、')}
        </div>
      )
    case 'image':
      return (
        <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-400">
          {p.image ? '🖼️ あり' : '—'}
        </div>
      )
    case 'memo':
      return (
        <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-500 italic">
          {p.memo || '—'}
        </div>
      )
    default:
      return <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-500">—</div>
  }
}

// ── Detail View ────────────────────────────────────────────────────────────
const DetailView: Component<{ products: Product[] }> = (props) => {
  const [search, setSearch] = createSignal('')
  const [selected, setSelected] = createSignal<Product | null>(null)

  const filtered = () => {
    const q = search().trim().toLowerCase()
    if (!q) return props.products
    return props.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.symptoms.some((s) => s.includes(q)) ||
        p.effects.some((e) => e.includes(q))
    )
  }

  const linkedMemos = (product: Product) =>
    SAMPLE_MEMOS.filter((m) =>
      m.tags.some((t) => product.name.includes(t) || t.includes(product.name.split('・')[0]))
    )

  return (
    <div class="flex flex-1 overflow-hidden">
      {/* List */}
      <div class="w-60 shrink-0 border-r border-nacc-border flex flex-col overflow-hidden">
        <div class="p-3 border-b border-nacc-border">
          <input
            type="search"
            placeholder="商品を検索..."
            class="w-full px-3 py-1.5 text-xs rounded-lg border border-nacc-border bg-white outline-none focus:border-nacc-gold"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        <div class="flex-1 overflow-y-auto">
          <For each={filtered()}>
            {(product) => (
              <button
                class="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-[#f0f0f0] transition-colors"
                classList={{
                  'bg-[#f5f0e8]': selected()?.id === product.id,
                  'hover:bg-[#f9f8f6]': selected()?.id !== product.id,
                }}
                onClick={() => setSelected(product)}
              >
                <div class="w-9 h-9 rounded-lg overflow-hidden bg-[#e8dfd0] shrink-0 flex items-center justify-center text-base">
                  <Show when={product.image} fallback={<span>💊</span>}>
                    <img
                      src={productImageUrl(product.image)}
                      alt={product.name}
                      class="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </Show>
                </div>
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-nacc-gold truncate">{product.name}</p>
                  <p class="text-xs text-[#999]">{product.id}</p>
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
              <span class="text-5xl">💊</span>
              <span class="text-sm">商品を選択してください</span>
            </div>
          }
        >
          {(product) => (
            <div class="max-w-2xl mx-auto slide-in">
              {/* Cover */}
              <Show when={product().image}>
                <div class="w-full h-44 rounded-xl overflow-hidden mb-5 bg-[#e8dfd0]">
                  <img
                    src={productImageUrl(product().image)}
                    alt={product().name}
                    class="w-full h-full object-cover"
                  />
                </div>
              </Show>

              <h1 class="text-xl font-bold text-nacc-dark mb-0.5">{product().name}</h1>
              <p class="text-xs text-[#999] mb-5">{product().id}</p>

              <DetailSection title="症状">
                <TagList items={product().symptoms} color="red" />
              </DetailSection>
              <DetailSection title="効果・効能">
                <TagList items={product().effects} color="green" />
              </DetailSection>
              <DetailSection title="主な成分">
                <TagList items={product().ingredients} color="blue" />
              </DetailSection>
              <DetailSection title="関連成分DB">
                <div class="flex flex-wrap gap-2">
                  <For each={product().nutrientIds}>
                    {(nid) => {
                      const n = NUTRIENTS.find((x) => x.id === nid)
                      return n ? (
                        <span class="text-xs px-2 py-1 rounded-full bg-[#f5f0e8] text-nacc-gold border border-[#e8dfd0] font-medium">
                          {n.name.split(' ')[0]}
                        </span>
                      ) : null
                    }}
                  </For>
                </div>
              </DetailSection>

              {/* Linked memos */}
              <Show when={linkedMemos(product()).length > 0}>
                <div class="mt-6 pt-5 border-t border-nacc-border">
                  <h2 class="text-xs font-semibold text-[#999] uppercase tracking-wider mb-3">
                    🔗 リンクされたメモ・記事
                  </h2>
                  <div class="flex flex-col gap-2">
                    <For each={linkedMemos(product())}>
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

// ── Shared sub-components ──────────────────────────────────────────────────
const DetailSection: Component<{ title: string; children: any }> = (props) => (
  <div class="mb-4">
    <h2 class="text-xs font-semibold text-[#999] uppercase tracking-wider mb-2">{props.title}</h2>
    {props.children}
  </div>
)

const COLOR_MAP = {
  red:   'bg-red-50 text-red-600 border-red-100',
  green: 'bg-green-50 text-green-700 border-green-100',
  blue:  'bg-blue-50 text-blue-700 border-blue-100',
}

const TagList: Component<{ items: string[]; color: keyof typeof COLOR_MAP }> = (props) => (
  <div class="flex flex-wrap gap-1.5">
    <For each={props.items}>
      {(item) => (
        <span class={`text-xs px-2.5 py-1 rounded-full border font-medium ${COLOR_MAP[props.color]}`}>
          {item}
        </span>
      )}
    </For>
  </div>
)

// ── Page Root ──────────────────────────────────────────────────────────────
const PageDb01: Component<Props> = (props) => {
  function selectFromTable(_p: Product) {
    setState({ dbView: 'detail' })
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div class="px-6 pt-4 pb-3 bg-nacc-light flex items-start justify-between shrink-0">
        <div>
          <h1 class="text-xl font-bold text-nacc-dark">DB01 — 商品一覧</h1>
          <div class="text-xs text-gray-500 mt-0.5">
            NACCサプリメント全商品データベース ·{' '}
            <span class="font-medium">{props.products.length}件</span>
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
        <TableView products={props.products} onSelect={selectFromTable} />
      </Show>
      <Show when={state.dbView === 'detail'}>
        <DetailView products={props.products} />
      </Show>
    </div>
  )
}

export default PageDb01
