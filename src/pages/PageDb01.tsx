import { type Component, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import type { Product } from '../types'
import { productImageUrl } from '../db/products'
import { state, setState, updateProduct, updateNutrient, navigate, addCustomNutrient } from '../store'
import { leaflets, openLeaflet, openLeafletV21 } from './leaflet/store'
import { LeafletVisual } from './leaflet/shared'
import { favoriteIds, isFavorite, toggleFavorite } from '../utils/favorites'
import HelpButton, { HELP_PRODUCT_GALLERY } from '../components/HelpButton'

type Props = { products: Product[] }
type EditCell = { rowId: string; col: string; x: number; y: number }
type CategoryFilter = 'favorite' | 'all' | 'supplement' | 'cosmetic'

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
  const [editingNutrientId, setEditingNutrientId] = createSignal<string | null>(null)
  const [draftName, setDraftName] = createSignal('')
  const [draftDescription, setDraftDescription] = createSignal('')
  const [addNutrientOpen, setAddNutrientOpen] = createSignal(false)
  const [nutrientSearch, setNutrientSearch] = createSignal('')
  const [creating, setCreating] = createSignal(false)
  const [newName, setNewName] = createSignal('')
  const [newDescription, setNewDescription] = createSignal('')

  const closeAddNutrient = () => {
    setAddNutrientOpen(false)
    setCreating(false)
    setNewName('')
    setNewDescription('')
  }

  const createNutrient = () => {
    const product = selected()
    const name = newName().trim()
    if (!product || !name) return
    addCustomNutrient({ name, description: newDescription().trim(), productId: product.id })
    closeAddNutrient()
  }
  const selected = () => props.products.find((product) => product.id === state.selectedProductId) ?? null

  const productNutrients = createMemo(() => {
    const product = selected()
    if (!product) return []
    const q = search().trim().toLowerCase()
    return state.nutrients.filter((nutrient) => {
      const linked = product.nutrientIds.includes(nutrient.id) || nutrient.productIds.includes(product.id)
      if (!linked) return false
      return !q || `${nutrient.name} ${nutrient.description} ${nutrient.memo}`.toLowerCase().includes(q)
    })
  })

  const beginNutrientEdit = (id: string) => {
    const nutrient = state.nutrients.find((item) => item.id === id)
    if (!nutrient) return
    setDraftName(nutrient.name)
    setDraftDescription(nutrient.description)
    setEditingNutrientId(id)
  }

  const saveNutrient = (id: string) => {
    const name = draftName().trim()
    const description = draftDescription().trim()
    if (!name || !description) return
    updateNutrient(id, { name, description })
    setEditingNutrientId(null)
  }

  const availableNutrients = createMemo(() => {
    const linkedIds = new Set(productNutrients().map((nutrient) => nutrient.id))
    const query = nutrientSearch().trim().toLocaleLowerCase('ja')
    return state.nutrients.filter((nutrient) =>
      !linkedIds.has(nutrient.id) &&
      (!query || `${nutrient.name} ${nutrient.description}`.toLocaleLowerCase('ja').includes(query))
    )
  })

  const addNutrientToProduct = (nutrientId: string) => {
    const product = selected()
    const nutrient = state.nutrients.find((item) => item.id === nutrientId)
    if (!product || !nutrient) return
    if (!product.nutrientIds.includes(nutrientId)) {
      updateProduct(product.id, { nutrientIds: [...product.nutrientIds, nutrientId] })
    }
    if (!nutrient.productIds.includes(product.id)) {
      updateNutrient(nutrient.id, { productIds: [...nutrient.productIds, product.id] })
    }
    setAddNutrientOpen(false)
    setNutrientSearch('')
  }

  return (
    <div class="product-note-page flex-1 overflow-y-auto">
        <Show
          when={selected()}
          fallback={
            <div class="product-note-empty">
              <span>商品が選択されていません。</span>
              <button onClick={() => setState({ dbView: 'gallery' })}>Galleryへ戻る</button>
            </div>
          }
        >
          {(product) => (
            <div class="product-note-content slide-in">
              <div class="product-note-nav">
                <button class="product-note-back" onClick={() => setState({ dbView: 'gallery', selectedProductId: null })}>
                  ← 商品Gallery
                </button>
                <span class="product-note-leaflet-actions">
                  <button class="product-note-leaflet" onClick={() => navigate('leaflet')}>
                    リーフレット（配布用）を作る →
                  </button>
                  <button class="product-note-leaflet-v21" onClick={() => openLeafletV21(product().id)} title="この商品ノートの並びのまま、リーフレットの編集画面を開きます">
                    リーフレット Ver2.1
                  </button>
                </span>
              </div>

              <header class="product-note-hero">
                <div class="product-note-heading">
                  <p>NACC · PRODUCT INGREDIENT NOTES</p>
                  <h1>{product().name}</h1>
                  <span>{product().id} · {product().category === 'cosmetic' ? 'COSMETIC' : 'SUPPLEMENT'}</span>
                </div>
                <div class="product-note-visual">
                  <Show when={product().image && productImageUrl(product().image)} fallback={<strong>{product().name.slice(0, 1)}</strong>}>
                    <img src={productImageUrl(product().image)} alt={product().name} />
                  </Show>
                </div>
              </header>

              <section class="product-note-summary">
                <div>
                  <small>PRODUCT STORY</small>
                  <p>{product().description || '商品説明は未登録です。'}</p>
                </div>
                <div class="product-note-stats">
                  <strong>{productNutrients().length}</strong>
                  <span>linked dicts</span>
                </div>
              </section>

              <section class="product-note-toolbar">
                <div>
                  <p>INGREDIENT DICTIONARY</p>
                  <h2>成分を、探せる知識カードへ。</h2>
                </div>
                <label>
                  <span>⌕</span>
                  <input value={search()} onInput={(event) => setSearch(event.currentTarget.value)} placeholder="成分名・説明を検索" />
                </label>
              </section>

              <section class="ingredient-note-grid">
                <For each={productNutrients()} fallback={<div class="ingredient-note-empty">この商品に関連づけられた成分はまだありません。</div>}>
                  {(nutrient, index) => (
                    <article
                      class="ingredient-note-card"
                      classList={{ 'is-editing': editingNutrientId() === nutrient.id }}
                      style={{ '--note-delay': `${Math.min(index() * 35, 350)}ms` }}
                    >
                      <div class="ingredient-note-card-top">
                        <span>{String(index() + 1).padStart(2, '0')}</span>
                        <button onClick={() => beginNutrientEdit(nutrient.id)} disabled={editingNutrientId() === nutrient.id}>編集</button>
                      </div>
                      <Show when={editingNutrientId() === nutrient.id} fallback={
                        <>
                          <h3>{nutrient.name}</h3>
                          <p>{nutrient.description || '説明は未登録です。'}</p>
                        </>
                      }>
                        <div class="ingredient-note-editor">
                          <label>Title<input value={draftName()} onInput={(event) => setDraftName(event.currentTarget.value)} /></label>
                          <label>Card<textarea rows="7" value={draftDescription()} onInput={(event) => setDraftDescription(event.currentTarget.value)} /></label>
                          <div>
                            <button onClick={() => setEditingNutrientId(null)}>キャンセル</button>
                            <button class="primary" onClick={() => saveNutrient(nutrient.id)}>保存</button>
                          </div>
                        </div>
                      </Show>
                      <footer><span># {product().name}</span><small>共有成分DB</small></footer>
                    </article>
                  )}
                </For>
                <button class="ingredient-add-card" onClick={() => setAddNutrientOpen(true)}>
                  <span>＋</span>
                  <strong>成分を追加</strong>
                  <small>共有成分DBから選択</small>
                </button>
              </section>

              <Show when={addNutrientOpen()}>
                <div class="nutrient-picker-backdrop" onClick={closeAddNutrient}>
                  <section class="nutrient-picker" role="dialog" aria-modal="true" aria-label="商品へ成分を追加" onClick={(event) => event.stopPropagation()}>
                    <header>
                      <div><small>SHARED INGREDIENT DATABASE</small><h2>{creating() ? '新しい成分カード' : '成分を追加'}</h2></div>
                      <span class="nutrient-picker-head-actions">
                        <Show when={!creating()}>
                          <button class="nutrient-picker-new" onClick={() => setCreating(true)}>＋ 新規</button>
                        </Show>
                        <button onClick={closeAddNutrient} aria-label="閉じる">×</button>
                      </span>
                    </header>
                    <Show when={creating()}>
                      <div class="nutrient-new-form">
                        <label>成分名
                          <input ref={(el) => queueMicrotask(() => el.focus())} value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} placeholder="例: プラセンタ" />
                        </label>
                        <label>説明
                          <textarea rows="5" value={newDescription()} onInput={(e) => setNewDescription(e.currentTarget.value)} placeholder="カードに載せる説明文" />
                        </label>
                        <div>
                          <button onClick={() => setCreating(false)}>一覧に戻る</button>
                          <button class="primary" onClick={createNutrient} disabled={!newName().trim()}>作成してこの商品に追加</button>
                        </div>
                      </div>
                    </Show>
                    <Show when={!creating()}>
                    <label class="nutrient-picker-search"><span>⌕</span><input autofocus value={nutrientSearch()} onInput={(event) => setNutrientSearch(event.currentTarget.value)} placeholder="成分名・説明を検索" /></label>
                    <div class="nutrient-picker-list">
                      <For each={availableNutrients()} fallback={<p class="nutrient-picker-empty">追加できる成分がありません。</p>}>
                        {(nutrient) => (
                          <button onClick={() => addNutrientToProduct(nutrient.id)}>
                            <span><strong>{nutrient.name}</strong><small>{nutrient.description || '説明未登録'}</small></span>
                            <b>＋</b>
                          </button>
                        )}
                      </For>
                    </div>
                    </Show>
                  </section>
                </div>
              </Show>
            </div>
          )}
        </Show>
    </div>
  )
}

// ── Index View (2-column: 品目 | 商品説明) ────────────────────────────────
const IndexView: Component<{ products: Product[] }> = (props) => (
  <div class="flex-1 overflow-auto px-1 md:px-6 pb-6">
    <div class="bg-white rounded-xl border border-nacc-border overflow-hidden">
      {/* Header — 品目 col: 40% on mobile, fixed 288px on md+ */}
      <div class="flex border-b-2 border-nacc-border bg-nacc-light sticky top-0 z-10">
        <div class="w-[40%] md:w-72 shrink-0 px-3 md:px-5 py-2 md:py-3 text-[11px] md:text-xs font-bold text-gray-500 tracking-wider uppercase border-r border-nacc-border">
          品目
        </div>
        <div class="flex-1 px-3 md:px-5 py-2 md:py-3 text-[11px] md:text-xs font-bold text-gray-500 tracking-wider uppercase">
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
            {/* 品目 — ID (S01 etc.) は非表示 */}
            <div class="w-[40%] md:w-72 shrink-0 px-2 py-3 md:px-5 md:py-5 border-r border-nacc-border flex flex-col gap-1.5 md:gap-2 justify-start">
              <p class="font-bold text-nacc-gold text-[12px] md:text-sm leading-snug">{product.name}</p>
              <Show
                when={product.category === 'supplement'}
                fallback={
                  <span class="text-[10px] md:text-xs font-medium bg-pink-50 text-pink-600 border border-pink-100 rounded-full px-1.5 md:px-2.5 py-0.5 self-start leading-tight">
                    🌸 コスメ
                  </span>
                }
              >
                <span class="text-[10px] md:text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-1.5 md:px-2.5 py-0.5 self-start leading-tight">
                  💊 サプリ
                </span>
              </Show>
            </div>

            {/* 商品説明 */}
            <div class="flex-1 px-2 py-3 md:px-6 md:py-5 flex items-start min-w-0">
              <p class="text-[12px] md:text-sm text-nacc-dark leading-relaxed">
                {product.description || (
                  <span class="text-gray-300 italic text-[10px] md:text-xs">説明なし</span>
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

// ── お気に入りの星（☆を押すと★に。もう一度押すと解除） ──────────────────
const FavoriteStar: Component<{ productId: string }> = (props) => {
  const toggle = (event: Event) => {
    event.stopPropagation()
    event.preventDefault()
    toggleFavorite(props.productId)
  }

  return (
    <span
      class="product-favorite-star"
      classList={{ 'is-on': isFavorite(props.productId) }}
      role="button"
      tabindex="0"
      aria-pressed={isFavorite(props.productId)}
      aria-label={isFavorite(props.productId) ? 'お気に入りを解除' : 'お気に入りに登録'}
      title={isFavorite(props.productId) ? 'お気に入りを解除' : 'お気に入りに登録'}
      onClick={toggle}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') toggle(event) }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" /></svg>
    </span>
  )
}

// ── Product Gallery (default entry) ──────────────────────────────────────
const ProductGalleryView: Component<{ products: Product[] }> = (props) => {
  const [search, setSearch] = createSignal('')
  const filtered = createMemo(() => {
    const q = search().trim().toLocaleLowerCase('ja')
    if (!q) return props.products
    return props.products.filter((product) =>
      [product.name, product.description, product.volume, ...product.ingredients]
        .join(' ')
        .toLocaleLowerCase('ja')
        .includes(q)
    )
  })

  const openProduct = (product: Product) => {
    setState({ selectedProductId: product.id, dbView: 'detail' })
  }

  return (
    <div class="product-gallery-shell flex-1 overflow-y-auto">
      <div class="product-gallery-hero">
        <div>
          <p class="product-gallery-kicker">NACC PRODUCT NOTE</p>
          <h2>商品から、ノートを開く。</h2>
          <p>商品を選ぶと、説明・関連成分・メモをひとつの作業画面で確認できます。</p>
        </div>
        <label class="product-gallery-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search()}
            onInput={(event) => setSearch(event.currentTarget.value)}
            placeholder="商品名・説明・成分を検索"
            aria-label="商品を検索"
          />
        </label>
      </div>

      <div class="product-gallery-count"><strong>{filtered().length}</strong> products</div>
      <div class="product-gallery-grid">
        <For each={filtered()} fallback={<div class="product-gallery-empty">{props.products.length === 0 ? 'お気に入りはまだありません。上の「全て」から、カード右上の☆を押すと登録できます。' : '一致する商品がありません。'}</div>}>
          {(product) => (
            <button class="product-gallery-card" onClick={() => openProduct(product)}>
              <div class="product-gallery-thumb">
                <Show
                  when={product.image && productImageUrl(product.image)}
                  fallback={<span>{product.name.trim().slice(0, 1) || 'N'}</span>}
                >
                  <img src={productImageUrl(product.image)} alt="" />
                </Show>
                <small>{product.category === 'cosmetic' ? 'COSMETIC' : 'SUPPLEMENT'}</small>
              </div>
              <div class="product-gallery-body">
                <p class="product-gallery-id">{product.id}</p>
                <h3>{product.name}</h3>
                <p>{product.description || '商品説明は未登録です。'}</p>
                <div class="product-gallery-meta">
                  <span>{product.volume || '容量未登録'}</span>
                  <span>{product.nutrientIds.length} 成分</span>
                </div>
              </div>
              <FavoriteStar productId={product.id} />
            </button>
          )}
        </For>
      </div>
    </div>
  )
}

// ── 表示形式（基本は Gallery。目次・テーブルは機能として残し、アイコンから切り替える） ──
const VIEW_FORMATS: { id: 'gallery' | 'index' | 'table'; label: string; icon: string }[] = [
  { id: 'gallery', label: 'Gallery', icon: '◇' },
  { id: 'index', label: '目次', icon: '☰' },
  { id: 'table', label: 'テーブル', icon: '▦' },
]

const ViewFormatMenu: Component = () => {
  const [open, setOpen] = createSignal(false)
  let rootRef!: HTMLDivElement
  const current = () => VIEW_FORMATS.find((format) => format.id === state.dbView) ?? VIEW_FORMATS[0]
  const onOutside = (event: PointerEvent) => { if (open() && !rootRef.contains(event.target as Node)) setOpen(false) }
  document.addEventListener('pointerdown', onOutside)
  onCleanup(() => document.removeEventListener('pointerdown', onOutside))
  return (
    <div class="view-format" ref={rootRef}>
      <button type="button" class="view-format-trigger" onClick={() => setOpen(!open())} aria-expanded={open()} title="表示形式を変える">
        <span aria-hidden="true">{current().icon}</span>
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" /></svg>
      </button>
      <Show when={open()}>
        <div class="view-format-menu" role="menu">
          <p>表示形式</p>
          <For each={VIEW_FORMATS}>
            {(format) => (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={state.dbView === format.id}
                classList={{ 'is-active': state.dbView === format.id }}
                onClick={() => { setState({ dbView: format.id, selectedProductId: null }); setOpen(false) }}
              >
                <span aria-hidden="true">{format.icon}</span>{format.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

// ── 配布用（配布可にしたリーフレットだけ。編集中は含めない） ─────────────────
const DistributionGallery: Component<{ productIds: string[] }> = (props) => {
  const list = createMemo(() =>
    leaflets
      .filter((leaflet) => leaflet.status === 'ready' && props.productIds.includes(leaflet.productId))
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  )
  const productOf = (id: string) => state.products.find((product) => product.id === id)
  return (
    <div class="product-gallery-shell flex-1 overflow-y-auto">
      <div class="product-gallery-hero">
        <div>
          <p class="product-gallery-kicker">NACC LEAFLETS · READY TO SHARE</p>
          <h2>配布用の資料</h2>
          <p>「配布可」にしたリーフレットだけを並べています。編集中のものは、上の「リーフレット」から開けます。</p>
        </div>
      </div>
      <div class="product-gallery-count"><strong>{list().length}</strong> leaflets</div>
      <div class="product-gallery-grid">
        <For each={list()} fallback={<div class="product-gallery-empty">配布用のリーフレットはまだありません。リーフレットの編集画面で「配布可にする」を押すとここに並びます。</div>}>
          {(leaflet) => (
            <article class="product-gallery-card distribution-card" onClick={() => openLeaflet(leaflet, 'preview')} role="button" tabindex="0">
              <div class="product-gallery-thumb">
                <Show when={productOf(leaflet.productId)} fallback={<span>{leaflet.name.slice(0, 1)}</span>}>
                  {(product) => <LeafletVisual image={leaflet.image} product={product()} class="distribution-thumb" />}
                </Show>
                <small>{leaflet.version === '2.1' ? 'LEAFLET · Ver2.1' : 'LEAFLET'}</small>
              </div>
              <div class="product-gallery-body">
                <p class="product-gallery-id">{productOf(leaflet.productId)?.name ?? leaflet.source.productName}</p>
                <h3>{leaflet.name}</h3>
                <p>{leaflet.audience || '対象者未設定'}</p>
                <div class="product-gallery-meta">
                  <span>更新 {leaflet.updatedAt.slice(0, 10).replace(/-/g, '/')}</span>
                  <span class="distribution-actions">
                    <button type="button" onClick={(e) => { e.stopPropagation(); openLeaflet(leaflet, 'preview') }}>表示</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); openLeaflet(leaflet, 'edit') }}>編集</button>
                  </span>
                </div>
              </div>
            </article>
          )}
        </For>
      </div>
    </div>
  )
}

// ── Page Root ──────────────────────────────────────────────────────────────
const PageDb01: Component<Props> = (props) => {
  // アプリを開いたときの初期画面はお気に入り
  const [categoryFilter, setCategoryFilter] = createSignal<CategoryFilter>('favorite')
  const [docTab, setDocTab] = createSignal<'original' | 'distribution'>('original')
  const readyCount = () => leaflets.filter((leaflet) => leaflet.status === 'ready').length
  const [memoPanelOpen, setMemoPanelOpen] = createSignal(false)
  const [memoPanelProduct, setMemoPanelProduct] = createSignal<Product | null>(null)

  const filteredProducts = createMemo(() => {
    const f = categoryFilter()
    if (f === 'all') return props.products
    if (f === 'favorite') return props.products.filter((p) => isFavorite(p.id))
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

      {/* Category filter tabs */}
      <div class="db-filter-row flex items-center gap-2 px-6 py-2 border-b border-nacc-border bg-white shrink-0 overflow-x-auto">
        <button
          class="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap"
          classList={{
            'bg-[#b38247] text-white border-[#b38247]': categoryFilter() === 'favorite',
            'bg-white text-[#8a5c27] border-[#e5d3b3] hover:border-[#b38247]': categoryFilter() !== 'favorite',
          }}
          onClick={() => setCategoryFilter('favorite')}
        >
          ★ お気に入り <span class="opacity-70">({favoriteIds().length})</span>
        </button>
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

      {/* タブ: 原本／配布用。表示形式（Gallery・目次・テーブル）は右端のアイコンから */}
      <div class="db-tab-row flex items-center gap-0 px-6 border-b border-nacc-border shrink-0 bg-white">
        <Show when={state.dbView === 'detail'}>
          <button
            class="gallery-return-orbit"
            onClick={() => setState({ dbView: 'gallery', selectedProductId: null })}
            aria-label="商品Galleryへ戻る"
            title="商品Galleryへ戻る"
          >
            ↶
          </button>
        </Show>
        <button
          class="db-tab-btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
          classList={{
            'border-nacc-dark text-nacc-dark': docTab() === 'original',
            'border-transparent text-gray-400 hover:text-gray-600': docTab() !== 'original',
          }}
          onClick={() => setDocTab('original')}
        >
          原本
        </button>
        <button
          class="db-tab-btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors"
          classList={{
            'border-nacc-dark text-nacc-dark': docTab() === 'distribution',
            'border-transparent text-gray-400 hover:text-gray-600': docTab() !== 'distribution',
          }}
          onClick={() => setDocTab('distribution')}
        >
          配布用 <span class="opacity-60">({readyCount()})</span>
        </button>
        <span class="ml-auto flex items-center gap-1.5">
          <Show when={docTab() === 'original'}>
            <ViewFormatMenu />
          </Show>
          <HelpButton title="商品Gallery" items={HELP_PRODUCT_GALLERY} />
        </span>
      </div>

      {/* Content */}
      <Show when={docTab() === 'distribution'}>
        {/* お気に入りは商品の印なので、配布用ではサプリ／コスメの絞り込みだけを使う */}
        <DistributionGallery productIds={(categoryFilter() === 'supplement' || categoryFilter() === 'cosmetic' ? filteredProducts() : props.products).map((p) => p.id)} />
      </Show>
      <Show when={docTab() === 'original' && state.dbView === 'gallery'}>
        <ProductGalleryView products={filteredProducts()} />
      </Show>
      <Show when={docTab() === 'original' && state.dbView === 'table'}>
        <TableView
          products={filteredProducts()}
          onUpdate={updateProduct}
          onRowSelect={handleRowSelect}
        />
      </Show>
      <Show when={docTab() === 'original' && state.dbView === 'detail'}>
        <DetailView products={props.products} />
      </Show>
      <Show when={docTab() === 'original' && state.dbView === 'index'}>
        <IndexView products={filteredProducts()} />
      </Show>
    </div>
  )
}

export default PageDb01
