import { type Component, createMemo, createSignal, For, Show } from 'solid-js'
import type { Product } from '../types'
import { productImageUrl } from '../db/products'
import { state, setState, updateProduct, navigate } from '../store'

type Props = { products: Product[] }
type EditCell = { rowId: string; col: string; x: number; y: number }
type CategoryFilter = 'all' | 'supplement' | 'cosmetic'

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
                'bg-red-50 text-red-600 border-red-100':       isRed(),
                'bg-green-50 text-green-700 border-green-100': !isRed(),
              }}
            >
              {item}
              <button class="opacity-50 hover:opacity-100 leading-none" onClick={() => removeItem(item)}>✕</button>
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
        <For each={state.nutrients}>
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

// ── Memo Side Panel ─────────────────────────────────────────────────────────
const MemoPanelOverlay: Component<{
  product: Product | null
  onClose: () => void
}> = (props) => {
  const linkedMemos = createMemo(() => {
    if (!props.product) return state.memos
    const name = props.product.name
    const shortName = name.split(/[・\s]/)[0]
    return state.memos.filter((m) =>
      m.tags.some((t) => name.includes(t.name) || t.name.includes(shortName))
    )
  })

  return (
    <div class="fixed top-0 right-0 h-full w-full md:w-80 max-w-sm bg-white border-l border-nacc-border shadow-2xl z-50 flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 border-b border-nacc-border shrink-0 bg-nacc-light">
        <div class="min-w-0 flex-1 mr-2">
          <span class="text-xs font-semibold text-gray-600">📝 リンクメモ</span>
          <Show when={props.product}>
            <p class="text-xs text-nacc-gold mt-0.5 truncate font-medium">{props.product!.name}</p>
          </Show>
          <Show when={!props.product}>
            <p class="text-xs text-gray-400 mt-0.5">商品をクリックして選択</p>
          </Show>
        </div>
        <button
          class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors text-xs shrink-0"
          onClick={props.onClose}
        >
          ✕
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <Show
          when={linkedMemos().length > 0}
          fallback={
            <div class="flex flex-col items-center justify-center h-32 text-gray-300 gap-1">
              <span class="text-3xl">📄</span>
              <span class="text-xs">リンクメモなし</span>
            </div>
          }
        >
          <For each={linkedMemos()}>
            {(memo) => (
              <button
                class="w-full text-left bg-white border border-nacc-border rounded-lg px-3 py-2.5 mb-2 hover:border-nacc-gold hover:shadow-sm transition-all"
                onClick={() => {
                  setState({ selectedMemoId: memo.id })
                  navigate('memo')
                }}
              >
                <p class="text-xs font-semibold text-nacc-dark leading-snug mb-1.5">{memo.title}</p>
                <div class="flex flex-wrap gap-1 mb-1.5">
                  <For each={memo.tags}>
                    {(tag) => (
                      <span class="text-xs bg-nacc-gold/10 text-nacc-gold rounded px-1.5 py-0.5">
                        #{tag.name}
                      </span>
                    )}
                  </For>
                </div>
                <p class="text-xs text-gray-400">
                  {new Date(memo.updatedAt).toLocaleDateString('ja-JP')}
                </p>
              </button>
            )}
          </For>
        </Show>
      </div>

      <div class="px-3 py-2.5 border-t border-nacc-border shrink-0 bg-nacc-light">
        <p class="text-xs text-gray-400 text-center">
          {linkedMemos().length}件 · クリックでメモへ移動
        </p>
      </div>
    </div>
  )
}

// ── Table View with inline editing ─────────────────────────────────────────
const TableView: Component<{
  products: Product[]
  onUpdate: (id: string, patch: Partial<Product>) => void
  onRowSelect: (product: Product) => void
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

  function openInline(e: MouseEvent, rowId: string, col: string) {
    e.stopPropagation()
    setActiveEdit({ rowId, col, x: 0, y: 0 })
  }

  const isPopoverOpen = () => {
    const ae = activeEdit()
    return ae && ae.col !== 'name' && ae.col !== 'memo' && ae.col !== 'description'
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
              <div
                class="notion-row flex border-b border-nacc-border last:border-none cursor-pointer hover:bg-[#fafafa] transition-colors"
                onClick={() => props.onRowSelect(product)}
              >
                <div
                  class="w-8 shrink-0 flex items-center justify-center p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input type="checkbox" class="rounded" />
                </div>
                <For each={visibleCols()}>
                  {(col) => {
                    const isInlineName = () =>
                      activeEdit()?.rowId === product.id && activeEdit()?.col === 'name'
                    const isInlineMemo = () =>
                      activeEdit()?.rowId === product.id && activeEdit()?.col === 'memo'
                    const isInlineDesc = () =>
                      activeEdit()?.rowId === product.id && activeEdit()?.col === 'description'

                    switch (col.id) {
                      case 'name':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 text-xs font-semibold text-nacc-gold cursor-text hover:bg-[#fffbf5] transition-colors"
                            onClick={(e) => openInline(e, product.id, 'name')}
                          >
                            <Show when={isInlineName()} fallback={<>{product.name}</>}>
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

                      case 'category':
                        return (
                          <div class="notion-cell flex-1 px-3 py-2.5 flex items-center" onClick={(e) => e.stopPropagation()}>
                            <Show
                              when={product.category === 'supplement'}
                              fallback={
                                <span class="text-xs font-medium bg-pink-50 text-pink-600 border border-pink-100 rounded-full px-2.5 py-0.5">
                                  🌸 コスメ
                                </span>
                              }
                            >
                              <span class="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-0.5">
                                💊 サプリ
                              </span>
                            </Show>
                          </div>
                        )

                      case 'description':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 cursor-text hover:bg-[#fffbf5] transition-colors"
                            onClick={(e) => openInline(e, product.id, 'description')}
                          >
                            <Show
                              when={isInlineDesc()}
                              fallback={
                                <span class="text-sm text-gray-700 leading-relaxed line-clamp-3">
                                  {product.description || <span class="text-gray-300 italic text-xs">説明なし</span>}
                                </span>
                              }
                            >
                              <textarea
                                class="w-full text-xs text-gray-600 border-none outline-none bg-transparent resize-none leading-relaxed"
                                rows={3}
                                value={product.description}
                                onInput={(e) => props.onUpdate(product.id, { description: e.currentTarget.value })}
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
                                  const n = state.nutrients.find((x) => x.id === nid)
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
                          <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-400" onClick={(e) => e.stopPropagation()}>
                            {product.image ? '🖼️ あり' : '—'}
                          </div>
                        )

                      case 'memo':
                        return (
                          <div
                            class="notion-cell flex-1 px-3 py-2.5 cursor-text hover:bg-[#fffbf5] transition-colors"
                            onClick={(e) => openInline(e, product.id, 'memo')}
                          >
                            <Show
                              when={isInlineMemo()}
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
        p.description.toLowerCase().includes(q) ||
        p.symptoms.some((s) => s.includes(q)) ||
        p.effects.some((e) => e.includes(q))
    )
  }

  const linkedMemos = (product: Product) =>
    state.memos.filter((m) =>
      m.tags.some((t) => product.name.includes(t.name) || t.name.includes(product.name.split(/[・\s]/)[0]))
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
                  'bg-[#f5f0e8]':    selected()?.id === product.id,
                  'hover:bg-[#f9f8f6]': selected()?.id !== product.id,
                }}
                onClick={() => setSelected(product)}
              >
                <div class="w-9 h-9 rounded-lg overflow-hidden bg-[#e8dfd0] shrink-0 flex items-center justify-center text-base">
                  <Show when={product.image} fallback={<span>{product.category === 'cosmetic' ? '🌸' : '💊'}</span>}>
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

              <div class="flex items-start justify-between mb-5">
                <div>
                  <h1 class="text-xl font-bold text-nacc-dark mb-0.5">{product().name}</h1>
                  <p class="text-xs text-[#999] mb-2">{product().id}</p>
                  <Show
                    when={product().category === 'supplement'}
                    fallback={
                      <span class="text-xs font-medium bg-pink-50 text-pink-600 border border-pink-100 rounded-full px-2.5 py-1">
                        🌸 コスメ
                      </span>
                    }
                  >
                    <span class="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-1">
                      💊 サプリ
                    </span>
                  </Show>
                </div>
              </div>

              <Show when={product().description}>
                <div class="mb-5 bg-white rounded-xl border border-nacc-border p-4">
                  <h2 class="text-xs font-semibold text-[#999] uppercase tracking-wider mb-2">商品説明</h2>
                  <p class="text-sm text-nacc-dark leading-relaxed">{product().description}</p>
                </div>
              </Show>

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
                      const n = state.nutrients.find((x) => x.id === nid)
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
                        <button
                          class="w-full text-left bg-white border border-nacc-border rounded-lg px-4 py-3 hover:border-nacc-gold transition-colors"
                          onClick={() => {
                            setState({ selectedMemoId: memo.id })
                            navigate('memo')
                          }}
                        >
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
                        </button>
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

// ── Index View (2-column: 品目 | 商品説明) ────────────────────────────────
const IndexView: Component<{ products: Product[] }> = (props) => (
  <div class="flex-1 overflow-auto px-6 pb-6">
    <div class="bg-white rounded-xl border border-nacc-border overflow-hidden">
      {/* Header */}
      <div class="flex border-b-2 border-nacc-border bg-nacc-light sticky top-0 z-10">
        <div class="w-72 shrink-0 px-5 py-3 text-xs font-bold text-gray-500 tracking-wider uppercase border-r border-nacc-border">
          品目
        </div>
        <div class="flex-1 px-5 py-3 text-xs font-bold text-gray-500 tracking-wider uppercase">
          商品説明
        </div>
      </div>

      {/* Rows */}
      <For each={props.products}>
        {(product, i) => (
          <div
            class="flex border-b border-nacc-border last:border-none hover:bg-[#fffbf5] transition-colors"
            classList={{ 'bg-[#fafaf8]': i() % 2 === 1 }}
          >
            {/* 品目 */}
            <div class="w-72 shrink-0 px-5 py-5 border-r border-nacc-border flex flex-col gap-2 justify-start">
              <p class="font-bold text-nacc-gold text-sm leading-snug">{product.name}</p>
              <p class="text-xs text-gray-400 font-mono">{product.id}</p>
              <Show
                when={product.category === 'supplement'}
                fallback={
                  <span class="text-xs font-medium bg-pink-50 text-pink-600 border border-pink-100 rounded-full px-2.5 py-0.5 self-start">
                    🌸 コスメ
                  </span>
                }
              >
                <span class="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2.5 py-0.5 self-start">
                  💊 サプリ
                </span>
              </Show>
            </div>

            {/* 商品説明 */}
            <div class="flex-1 px-6 py-5 flex items-start">
              <p class="text-sm text-nacc-dark leading-relaxed">
                {product.description || (
                  <span class="text-gray-300 italic text-xs">説明なし</span>
                )}
              </p>
            </div>
          </div>
        )}
      </For>

      <Show when={props.products.length === 0}>
        <div class="px-6 py-12 text-center text-xs text-gray-300">該当商品なし</div>
      </Show>
    </div>
  </div>
)

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
  const [categoryFilter, setCategoryFilter] = createSignal<CategoryFilter>('all')
  const [memoPanelOpen, setMemoPanelOpen] = createSignal(false)
  const [memoPanelProduct, setMemoPanelProduct] = createSignal<Product | null>(null)

  const filteredProducts = createMemo(() => {
    const f = categoryFilter()
    if (f === 'all') return props.products
    const cat = f === 'supplement' ? 'supplement' : 'cosmetic'
    return props.products.filter((p) => p.category === cat)
  })

  const supplementCount = () => props.products.filter((p) => p.category === 'supplement').length
  const cosmeticCount  = () => props.products.filter((p) => p.category === 'cosmetic').length

  function handleRowSelect(product: Product) {
    setMemoPanelProduct(product)
    if (!memoPanelOpen()) setMemoPanelOpen(true)
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Memo panel overlay */}
      <Show when={memoPanelOpen()}>
        <MemoPanelOverlay product={memoPanelProduct()} onClose={() => setMemoPanelOpen(false)} />
      </Show>

      {/* Page header */}
      <div class="db-page-header px-6 pt-4 pb-3 bg-nacc-light flex items-start justify-between shrink-0">
        <div class="min-w-0">
          <h1 class="db-page-title text-xl font-bold text-nacc-dark leading-tight">
            <span class="db-page-title-full">DB01 — </span>商品一覧
          </h1>
          <div class="db-page-subtitle text-xs text-gray-500 mt-0.5">
            NACCサプリメント全商品データベース ·{' '}
            <span class="font-medium">{props.products.length}件</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="db-hdr-btn flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg transition-colors"
            classList={{
              'bg-nacc-dark text-white border-nacc-dark': memoPanelOpen(),
              'bg-white text-gray-600 border-nacc-border hover:bg-gray-50': !memoPanelOpen(),
            }}
            onClick={() => setMemoPanelOpen((v) => !v)}
          >
            📝<span class="db-hdr-btn-label ml-1">メモパネル</span>
          </button>
          <button
            class="db-hdr-btn flex items-center gap-1.5 px-3 py-1.5 text-xs border border-nacc-border rounded-lg bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setState({ settingsPanelOpen: true, galleryPanelOpen: false })}
          >
            ⚙<span class="db-hdr-btn-label ml-1">カラム設定</span>
          </button>
          <button class="db-hdr-btn flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nacc-dark text-white rounded-lg hover:opacity-90 transition-opacity">
            +<span class="db-hdr-btn-label ml-1">新規追加</span>
          </button>
        </div>
      </div>

      {/* Category filter tabs */}
      <div class="db-filter-row flex items-center gap-2 px-6 py-2 border-b border-nacc-border bg-white shrink-0 overflow-x-auto">
        <button
          class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap"
          classList={{
            'bg-nacc-dark text-white border-nacc-dark': categoryFilter() === 'all',
            'bg-white text-gray-500 border-nacc-border hover:border-gray-400': categoryFilter() !== 'all',
          }}
          onClick={() => setCategoryFilter('all')}
        >
          全て <span class="opacity-70">({props.products.length})</span>
        </button>
        <button
          class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap"
          classList={{
            'bg-amber-500 text-white border-amber-500': categoryFilter() === 'supplement',
            'bg-white text-amber-700 border-amber-200 hover:border-amber-400': categoryFilter() !== 'supplement',
          }}
          onClick={() => setCategoryFilter('supplement')}
        >
          💊 サプリ <span class="opacity-70">({supplementCount()})</span>
        </button>
        <button
          class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap"
          classList={{
            'bg-pink-500 text-white border-pink-500': categoryFilter() === 'cosmetic',
            'bg-white text-pink-600 border-pink-200 hover:border-pink-400': categoryFilter() !== 'cosmetic',
          }}
          onClick={() => setCategoryFilter('cosmetic')}
        >
          🌸 コスメ <span class="opacity-70">({cosmeticCount()})</span>
        </button>
      </div>

      {/* View tabs */}
      <div class="db-tab-row flex items-center gap-0 px-6 border-b border-nacc-border shrink-0 bg-white">
        <button
          class="db-tab-btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
          classList={{
            'border-nacc-dark text-nacc-dark': state.dbView === 'index',
            'border-transparent text-gray-400 hover:text-gray-600': state.dbView !== 'index',
          }}
          onClick={() => setState({ dbView: 'index' })}
        >
          📋 Index
        </button>
        <button
          class="db-tab-btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
          classList={{
            'border-nacc-dark text-nacc-dark': state.dbView === 'table',
            'border-transparent text-gray-400 hover:text-gray-600': state.dbView !== 'table',
          }}
          onClick={() => setState({ dbView: 'table' })}
        >
          ≡ テーブル
        </button>
        <button
          class="db-tab-btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
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
        <TableView
          products={filteredProducts()}
          onUpdate={updateProduct}
          onRowSelect={handleRowSelect}
        />
      </Show>
      <Show when={state.dbView === 'detail'}>
        <DetailView products={filteredProducts()} />
      </Show>
      <Show when={state.dbView === 'index'}>
        <IndexView products={filteredProducts()} />
      </Show>
    </div>
  )
}

export default PageDb01
