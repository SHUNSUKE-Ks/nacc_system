import { type Component, createMemo, createSignal, For, Show } from 'solid-js'
import type { Product } from '../types'
import { productImageUrl } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'
import { state, setState } from '../store'


type Props = { products: Product[] }

type EditCell = { rowId: string; col: string; x: number; y: number }

// ── Tags Popover (symptoms / effects) ──────────────────────────────────────
const TagsPopover: Component<{
  col: 'symptoms' | 'effects'
  x: number; y: number
  product: Product
  onUpdate: (id: string, patch: Partial<Product>) => void
  onClose: () => void
}> = (props) => {
  const [inputVal, setInputVal] = createSignal('')
  const items = () => props.product[props.col]
  const isRed = () => props.col === 'symptoms'

  function addItem() {
    const v = inputVal().trim()
    if (!v || items().includes(v)) { setInputVal(''); return }
    props.onUpdate(props.product.id, { [props.col]: [...items(), v] })
    setInputVal('')
  }

  function removeItem(item: string) {
    props.onUpdate(props.product.id, { [props.col]: items().filter((x) => x !== item) })
  }

  return (
    <div
      class="fixed z-50 bg-white border border-nacc-border rounded-xl shadow-xl p-3 w-72"
      style={{ left: `${props.x}px`, top: `${props.y}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div class="text-xs font-semibold text-gray-500 mb-2">
        {props.col === 'symptoms' ? '🔴 病名/症状' : '🟢 効果・効能'}
      </div>
      <div class="flex flex-wrap gap-1 mb-2 min-h-6">
        <For each={items()}>
          {(item) => (
            <span
              class="flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border font-medium"
              classList={{
                'bg-red-50 text-red-600 border-red-100':    isRed(),
                'bg-green-50 text-green-700 border-green-100': !isRed(),
              }}
            >
              {item}
              <button
                class="opacity-50 hover:opacity-100 leading-none"
                onClick={() => removeItem(item)}
              >
                ✕
              </button>
            </span>
          )}
        </For>
        <Show when={items().length === 0}>
          <span class="text-xs text-gray-300">なし</span>
        </Show>
      </div>
      <div class="flex gap-1">
        <input
          type="text"
          class="flex-1 text-xs border border-nacc-border rounded-lg px-2 py-1.5 outline-none focus:border-nacc-gold"
          placeholder="追加して Enter..."
          value={inputVal()}
          onInput={(e) => setInputVal(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
        />
        <button
          class="text-xs px-2 py-1.5 bg-nacc-dark text-white rounded-lg hover:opacity-90"
          onClick={addItem}
        >
          追加
        </button>
      </div>
    </div>
  )
}

// ── Relation Popover (nutrients) ────────────────────────────────────────────
const RelationPopover: Component<{
  x: number; y: number
  product: Product
  onUpdate: (id: string, patch: Partial<Product>) => void
  onClose: () => void
}> = (props) => {
  const selected = () => props.product.nutrientIds

  function toggle(nid: string) {
    const curr = selected()
    const next = curr.includes(nid) ? curr.filter((x) => x !== nid) : [...curr, nid]
    props.onUpdate(props.product.id, { nutrientIds: next })
  }

  return (
    <div
      class="fixed z-50 bg-white border border-nacc-border rounded-xl shadow-xl flex flex-col w-72"
      style={{ left: `${props.x}px`, top: `${props.y}px`, 'max-height': '320px' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div class="px-3 py-2.5 border-b border-nacc-border text-xs font-semibold text-gray-500 shrink-0">
        🌿 成分DB リンク — {selected().length}件選択中
      </div>
      <div class="overflow-y-auto flex-1 p-2">
        <For each={NUTRIENTS}>
          {(n) => {
            const isSelected = () => selected().includes(n.id)
            return (
              <button
                class="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-xs"
                classList={{
                  'bg-[#f5f0e8]': isSelected(),
                  'hover:bg-gray-50': !isSelected(),
                }}
                onClick={() => toggle(n.id)}
              >
                <span
                  class="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  classList={{
                    'bg-nacc-gold border-nacc-gold text-white': isSelected(),
                    'border-gray-300': !isSelected(),
                  }}
                >
                  <Show when={isSelected()}>✓</Show>
                </span>
                <span class="flex-1 text-nacc-dark leading-tight">{n.name.split(' ')[0]}</span>
                <span class="text-gray-400">{n.id}</span>
              </button>
            )
          }}
        </For>
      </div>
    </div>
  )
}

// ── Table View with inline editing ─────────────────────────────────────────
const TableView: Component<{
  products: Product[]
  onUpdate: (id: string, patch: Partial<Product>) => void
}> = (props) => {
  const visibleCols = () => state.db01Columns.filter((c) => c.visible)
  const [activeEdit, setActiveEdit] = createSignal<EditCell | null>(null)

  const activeProduct = createMemo(() =>
    props.products.find((p) => p.id === activeEdit()?.rowId)
  )

  const symptomsEffectsEdit = createMemo(() => {
    const ae = activeEdit()
    const p = activeProduct()
    if (!ae || !p || (ae.col !== 'symptoms' && ae.col !== 'effects')) return null
    return { edit: ae, product: p }
  })

  const ingredientsEdit = createMemo(() => {
    const ae = activeEdit()
    const p = activeProduct()
    if (!ae || !p || ae.col !== 'ingredients') return null
    return { edit: ae, product: p }
  })

  function openPopover(e: MouseEvent, rowId: string, col: string) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.min(rect.left, window.innerWidth - 295)
    const y = Math.min(rect.bottom + 4, window.innerHeight - 340)
    setActiveEdit({ rowId, col, x, y })
  }

  function openInline(rowId: string, col: string) {
    setActiveEdit({ rowId, col, x: 0, y: 0 })
  }

  const isPopoverOpen = () => {
    const ae = activeEdit()
    return ae && ae.col !== 'name' && ae.col !== 'memo'
  }

  return (
    <div class="flex-1 overflow-hidden flex flex-col">
      <div class="flex-1 overflow-auto px-6 pb-4">
        <div class="bg-white rounded-xl border border-nacc-border overflow-hidden">
          {/* Header */}
          <div class="flex border-b border-nacc-border bg-nacc-light sticky top-0 z-10">
            <div class="w-8 shrink-0 flex items-center justify-center p-2">
              <input type="checkbox" class="rounded" />
            </div>
            <For each={visibleCols()}>
              {(col) => (
                <div class="notion-cell flex-1 px-3 py-2 text-xs font-semibold text-gray-500 flex items-center gap-1">
                  {col.label}
                </div>
              )}
            </For>
            <div class="w-8 shrink-0 px-1 py-2 flex items-center justify-center text-gray-400 text-xs">+</div>
          </div>

          {/* Rows */}
          <For each={props.products}>
            {(product) => (
              <div class="notion-row flex border-b border-nacc-border last:border-none">
                <div
                  class="w-8 shrink-0 flex items-center justify-center p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input type="checkbox" class="rounded" />
                </div>
                <For each={visibleCols()}>
                  {(col) => {
                    const isInline = () =>
                      activeEdit()?.rowId === product.id &&
                      activeEdit()?.col === col.id &&
                      (col.id === 'name' || col.id === 'memo')

                    switch (col.id) {
                      case 'name':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 text-xs font-semibold text-nacc-gold cursor-text hover:bg-[#fffbf5] transition-colors"
                            onClick={() => openInline(product.id, 'name')}
                          >
                            <Show when={isInline()} fallback={<>{product.name}</>}>
                              <input
                                type="text"
                                class="w-full text-xs font-semibold text-nacc-gold border-none outline-none bg-transparent"
                                value={product.name}
                                onInput={(e) => props.onUpdate(product.id, { name: e.currentTarget.value })}
                                onBlur={() => setActiveEdit(null)}
                                ref={(el) => el && setTimeout(() => el.focus(), 0)}
                              />
                            </Show>
                          </div>
                        )

                      case 'symptoms':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 cursor-pointer hover:bg-red-50/30 transition-colors"
                            onClick={(e) => openPopover(e, product.id, 'symptoms')}
                          >
                            <div class="flex flex-wrap gap-1">
                              <For each={product.symptoms.slice(0, 2)}>
                                {(s) => (
                                  <span class="bg-red-50 text-red-600 rounded px-1.5 py-0.5 text-xs">{s}</span>
                                )}
                              </For>
                              <Show when={product.symptoms.length > 2}>
                                <span class="text-xs text-gray-400">+{product.symptoms.length - 2}</span>
                              </Show>
                              <Show when={product.symptoms.length === 0}>
                                <span class="text-xs text-gray-300">+ 追加</span>
                              </Show>
                            </div>
                          </div>
                        )

                      case 'effects':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 cursor-pointer hover:bg-green-50/30 transition-colors"
                            onClick={(e) => openPopover(e, product.id, 'effects')}
                          >
                            <div class="flex flex-wrap gap-1">
                              <For each={product.effects.slice(0, 2)}>
                                {(ef) => (
                                  <span class="bg-green-50 text-green-700 rounded px-1.5 py-0.5 text-xs">{ef}</span>
                                )}
                              </For>
                              <Show when={product.effects.length > 2}>
                                <span class="text-xs text-gray-400">+{product.effects.length - 2}</span>
                              </Show>
                              <Show when={product.effects.length === 0}>
                                <span class="text-xs text-gray-300">+ 追加</span>
                              </Show>
                            </div>
                          </div>
                        )

                      case 'ingredients':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 cursor-pointer hover:bg-blue-50/20 transition-colors"
                            onClick={(e) => openPopover(e, product.id, 'ingredients')}
                          >
                            <div class="flex flex-wrap gap-1">
                              <For each={product.nutrientIds.slice(0, 2)}>
                                {(nid) => {
                                  const n = NUTRIENTS.find((x) => x.id === nid)
                                  return n ? (
                                    <span class="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">
                                      {n.name.split(' ')[0]}
                                    </span>
                                  ) : null
                                }}
                              </For>
                              <Show when={product.nutrientIds.length > 2}>
                                <span class="text-xs text-gray-400">+{product.nutrientIds.length - 2}</span>
                              </Show>
                              <Show when={product.nutrientIds.length === 0}>
                                <span class="text-xs text-gray-300">+ リンク</span>
                              </Show>
                            </div>
                          </div>
                        )

                      case 'image':
                        return (
                          <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-400">
                            {product.image ? '🖼️ あり' : '—'}
                          </div>
                        )

                      case 'memo':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 cursor-text hover:bg-[#fffbf5] transition-colors"
                            onClick={() => openInline(product.id, 'memo')}
                          >
                            <Show
                              when={isInline()}
                              fallback={
                                <span class="text-xs text-gray-500 italic">{product.memo || '—'}</span>
                              }
                            >
                              <input
                                type="text"
                                class="w-full text-xs text-gray-500 italic border-none outline-none bg-transparent"
                                value={product.memo}
                                onInput={(e) => props.onUpdate(product.id, { memo: e.currentTarget.value })}
                                onBlur={() => setActiveEdit(null)}
                                ref={(el) => el && setTimeout(() => el.focus(), 0)}
                              />
                            </Show>
                          </div>
                        )

                      default:
                        return <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-400">—</div>
                    }
                  }}
                </For>
                <div class="w-8 shrink-0" />
              </div>
            )}
          </For>

          <div class="flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors border-t border-dashed border-nacc-border">
            <span>+</span> 新しい行を追加
          </div>
        </div>
      </div>

      {/* Backdrop for popovers */}
      <Show when={isPopoverOpen()}>
        <div class="fixed inset-0 z-40" onClick={() => setActiveEdit(null)} />
      </Show>

      {/* Symptoms / Effects popover */}
      <Show when={symptomsEffectsEdit()}>
        {(data) => (
          <TagsPopover
            col={data().edit.col as 'symptoms' | 'effects'}
            x={data().edit.x}
            y={data().edit.y}
            product={data().product}
            onUpdate={props.onUpdate}
            onClose={() => setActiveEdit(null)}
          />
        )}
      </Show>

      {/* Nutrients relation popover */}
      <Show when={ingredientsEdit()}>
        {(data) => (
          <RelationPopover
            x={data().edit.x}
            y={data().edit.y}
            product={data().product}
            onUpdate={props.onUpdate}
            onClose={() => setActiveEdit(null)}
          />
        )}
      </Show>
    </div>
  )
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
    state.memos.filter((m) =>
      m.tags.some((t) => product.name.includes(t.name) || t.name.includes(product.name.split('・')[0]))
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
                                  #{tag.name}
                                </span>
                              )}
                            </For>
                            <span class="text-xs text-[#bbb] ml-auto">
                              {new Date(memo.updatedAt).toLocaleDateString('ja-JP')}
                            </span>
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
  const [products, setProducts] = createSignal<Product[]>(props.products)

  function updateProduct(id: string, patch: Partial<Product>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div class="px-6 pt-4 pb-3 bg-nacc-light flex items-start justify-between shrink-0">
        <div>
          <h1 class="text-xl font-bold text-nacc-dark">DB01 — 商品一覧</h1>
          <div class="text-xs text-gray-500 mt-0.5">
            NACCサプリメント全商品データベース ·{' '}
            <span class="font-medium">{products().length}件</span>
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
        <TableView products={products()} onUpdate={updateProduct} />
      </Show>
      <Show when={state.dbView === 'detail'}>
        <DetailView products={products()} />
      </Show>
    </div>
  )
}

export default PageDb01
