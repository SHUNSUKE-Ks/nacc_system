import { type Component, createSignal, For, Show } from 'solid-js'
import type { Tag } from '../types'
import { PRODUCTS, productImageUrl } from '../db/products'

// ── Local types ─────────────────────────────────────────────────────────────
type ItemRef = {
  id: string
  type: 'memo' | 'blog'
  refId: number
  order: number
  title: string
  body: string
  tags: Tag[]
  date: Date
}

type NbData = {
  id: number
  title: string
  coverUrl?: string
  coverEmoji: string
  coverColor: string
  items: ItemRef[]
  createdAt: Date
}

// ── Cover presets ────────────────────────────────────────────────────────────
const COVER_PRESETS = [
  { color: '#fef9c3', emoji: '📓' },
  { color: '#dbeafe', emoji: '🔬' },
  { color: '#dcfce7', emoji: '📋' },
  { color: '#fce7f3', emoji: '📚' },
  { color: '#ede9fe', emoji: '💡' },
  { color: '#fee2e2', emoji: '🩺' },
  { color: '#f0fdf4', emoji: '🌿' },
  { color: '#fff7ed', emoji: '💊' },
]

// ── Sample content pool ──────────────────────────────────────────────────────
const POOL: ItemRef[] = [
  {
    id: 'p1', type: 'memo', refId: 1, order: 0,
    title: 'レシチンとアレルギーの関係',
    body: 'レシチンはホスファチジルコリンを主成分とするリン脂質。アレルギー反応の抑制に関与するという研究が増えている。\n\n大豆由来のレシチンはγリノレン酸を豊富に含み、炎症性サイトカインのバランスを整える可能性がある。',
    tags: [{ type: 'nutrient', name: 'レシチン (ホスファチジルコリン)' }, { type: 'nutrient', name: 'γリノレン酸 (GLA)' }],
    date: new Date('2026-05-25'),
  },
  {
    id: 'p2', type: 'blog', refId: 1, order: 1,
    title: 'NMNサプリの効果と飲み方',
    body: 'NMNはNAD+の前駆体として注目されています。毎日250mg〜500mgを朝食後に服用するのがおすすめです。\n\n特殊カプセルにより胃での分解を防ぎ、腸での吸収率を高めています。',
    tags: [{ type: 'product', name: 'R-NMN' }, { type: 'nutrient', name: 'NMN (β-ニコチンアミドモノヌクレオチド)' }],
    date: new Date('2026-05-20'),
  },
  {
    id: 'p3', type: 'memo', refId: 2, order: 2,
    title: 'プロポリスの免疫効果まとめ',
    body: 'プロポリスはミツバチが作る天然の抗菌物質。フラボノイドが豊富で免疫機能を高める効果が期待されている。',
    tags: [{ type: 'product', name: 'プロポリス' }],
    date: new Date('2026-05-22'),
  },
  {
    id: 'p4', type: 'blog', refId: 2, order: 3,
    title: 'NMN研究論文まとめ2026年版',
    body: 'Pubmedで検索した最新のNMN研究論文をまとめた。\n\n特に睡眠の質と認知機能への効果について複数の臨床試験で有意な結果が報告されている。\n\n【NACCのR-NMNについて】\n特殊カプセルにより胃での分解を防ぎ、腸での吸収率を高めている。',
    tags: [{ type: 'nutrient', name: 'NMN (β-ニコチンアミドモノヌクレオチド)' }, { type: 'product', name: 'R-NMN' }],
    date: new Date('2026-05-18'),
  },
  {
    id: 'p5', type: 'memo', refId: 3, order: 4,
    title: 'オメガ3の正しい選び方',
    body: 'EPAとDHAの比率に注目して選ぶことが大切です。魚油由来のα-55 premiumは品質が高くおすすめです。',
    tags: [{ type: 'product', name: 'オメガ3 α-55 premium' }],
    date: new Date('2026-05-15'),
  },
]

let nbNextId = 10
const INITIAL_NBS: NbData[] = [
  {
    id: 1, title: 'クライアントAさん用 健康手帳',
    coverEmoji: '📓', coverColor: '#fef9c3',
    items: [{ ...POOL[0], order: 0 }, { ...POOL[1], order: 1 }],
    createdAt: new Date('2026-05-20'),
  },
  {
    id: 2, title: 'NMN研究ノート',
    coverEmoji: '🔬', coverColor: '#dbeafe',
    items: [{ ...POOL[1], id: 'p2b', order: 0 }, { ...POOL[3], order: 1 }],
    createdAt: new Date('2026-05-18'),
  },
  {
    id: 3, title: '症例まとめ 2026年版',
    coverEmoji: '📋', coverColor: '#dcfce7',
    items: [{ ...POOL[2], order: 0 }, { ...POOL[4], order: 1 }],
    createdAt: new Date('2026-05-15'),
  },
]

// ── Cover Card component ─────────────────────────────────────────────────────
const CoverCard: Component<{
  nb: NbData
  onClick: () => void
  onDelete: (e: MouseEvent) => void
}> = (props) => (
  <div class="cursor-pointer group" onClick={props.onClick}>
    <div
      class="rounded-xl h-40 flex items-center justify-center text-6xl shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:-translate-y-1 relative overflow-hidden"
      style={{ background: props.nb.coverUrl ? undefined : props.nb.coverColor }}
    >
      <Show when={props.nb.coverUrl} fallback={<span>{props.nb.coverEmoji}</span>}>
        <img src={props.nb.coverUrl} alt="" class="w-full h-full object-cover" />
        <div class="absolute inset-0 flex items-center justify-center text-6xl bg-black/10">
          {props.nb.coverEmoji}
        </div>
      </Show>
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          class="w-6 h-6 flex items-center justify-center rounded-full bg-white/80 text-gray-500 hover:text-red-500 text-xs"
          onClick={props.onDelete}
        >
          ✕
        </button>
      </div>
      <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <span class="text-xs bg-white/80 rounded px-1.5 py-0.5 text-gray-600">🖼️ 変更</span>
      </div>
    </div>
    <div class="mt-2.5 px-1">
      <div class="font-medium text-sm text-nacc-dark leading-snug">{props.nb.title}</div>
      <div class="text-xs text-gray-400 mt-0.5">
        {props.nb.items.length}件 · {props.nb.createdAt.toLocaleDateString('ja-JP')}
      </div>
    </div>
  </div>
)

// ── Memo item viewer (editable) ──────────────────────────────────────────────
const MemoItemViewer: Component<{
  item: ItemRef
  onUpdate: (patch: Partial<ItemRef>) => void
  onRemove: () => void
}> = (props) => (
  <div class="flex-1 overflow-y-auto bg-nacc-light">
    <div class="max-w-2xl mx-auto px-6 py-8">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs bg-[#f5f0e8] text-nacc-gold px-2.5 py-1 rounded-full font-medium border border-[#e8dfd0]">📝 メモ</span>
        <span class="text-xs text-gray-400">{props.item.date.toLocaleDateString('ja-JP')}</span>
        <button
          class="ml-auto text-xs text-red-400 hover:text-red-600"
          onClick={props.onRemove}
        >
          ノートから削除
        </button>
      </div>

      <input
        type="text"
        class="w-full text-xl font-bold text-nacc-dark border-none outline-none bg-transparent mb-3"
        placeholder="タイトル"
        value={props.item.title}
        onInput={(e) => props.onUpdate({ title: e.currentTarget.value })}
      />

      <Show when={props.item.tags.length > 0}>
        <div class="flex flex-wrap gap-1.5 mb-5">
          <For each={props.item.tags}>
            {(tag) => (
              <span
                class="flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border font-medium"
                classList={{
                  'bg-blue-50 text-blue-700 border-blue-200':    tag.type === 'product',
                  'bg-green-50 text-green-700 border-green-200': tag.type === 'nutrient',
                }}
              >
                {tag.type === 'product' ? '📦' : '🌿'} {tag.name}
              </span>
            )}
          </For>
        </div>
      </Show>

      <textarea
        class="w-full min-h-72 text-sm text-nacc-dark border border-nacc-border outline-none bg-white rounded-2xl p-5 resize-none leading-relaxed shadow-sm focus:ring-1 focus:ring-nacc-gold/30"
        placeholder="メモを入力..."
        value={props.item.body}
        onInput={(e) => props.onUpdate({ body: e.currentTarget.value })}
      />
    </div>
  </div>
)

// ── Blog item viewer (read-only) ─────────────────────────────────────────────
const BlogItemViewer: Component<{ item: ItemRef; onRemove: () => void }> = (props) => (
  <div class="flex-1 overflow-y-auto bg-nacc-light">
    <div class="max-w-2xl mx-auto px-6 py-8">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium border border-blue-200">📓 ブログ</span>
        <button class="ml-auto text-xs text-red-400 hover:text-red-600" onClick={props.onRemove}>
          ノートから削除
        </button>
      </div>

      <h1 class="text-3xl font-bold text-nacc-dark mb-4 leading-tight">{props.item.title}</h1>

      <div class="flex flex-wrap gap-2 mb-4">
        <For each={props.item.tags}>
          {(tag) => (
            <span
              class="flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border font-medium"
              classList={{
                'bg-blue-50 text-blue-700 border-blue-200':    tag.type === 'product',
                'bg-green-50 text-green-700 border-green-200': tag.type === 'nutrient',
              }}
            >
              {tag.type === 'product' ? '📦' : '🌿'} {tag.name}
            </span>
          )}
        </For>
      </div>

      <div class="text-xs text-gray-400 mb-8 flex items-center gap-2">
        <span>{props.item.date.toLocaleDateString('ja-JP')}</span>
        <span>·</span>
        <span>読み時間</span>
      </div>

      <div class="text-sm text-gray-700 leading-8 bg-white rounded-2xl p-6 border border-nacc-border shadow-sm whitespace-pre-wrap">
        {props.item.body || <span class="text-gray-300">本文なし</span>}
      </div>
    </div>
  </div>
)

// ── Cover Picker Modal ───────────────────────────────────────────────────────
const CoverPickerModal: Component<{
  emoji: string
  color: string
  onSelect: (preset: { color: string; emoji: string }) => void
  onProductCover: (url: string) => void
  onUploadCover: (url: string) => void
  onClose: () => void
}> = (props) => (
  <div class="fixed inset-0 z-60 bg-black/50 flex items-end sm:items-center justify-center" onClick={props.onClose}>
    <div
      class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between px-5 py-4 border-b border-nacc-border shrink-0">
        <span class="font-semibold text-nacc-dark">表紙を選択</span>
        <button onClick={props.onClose} class="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div class="flex-1 overflow-y-auto p-4">
        <p class="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">プリセット</p>
        <div class="grid grid-cols-4 gap-2 mb-5">
          <For each={COVER_PRESETS}>
            {(preset) => (
              <button
                class="h-16 rounded-xl flex items-center justify-center text-3xl transition-all hover:scale-105"
                style={{ background: preset.color }}
                classList={{
                  'ring-2 ring-nacc-gold ring-offset-2': props.color === preset.color && props.emoji === preset.emoji,
                }}
                onClick={() => props.onSelect(preset)}
              >
                {preset.emoji}
              </button>
            )}
          </For>
        </div>

        <p class="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">商品画像</p>
        <div class="grid grid-cols-4 gap-2 mb-5">
          <For each={PRODUCTS.filter((p) => p.image).slice(0, 8)}>
            {(product) => (
              <button
                class="aspect-square rounded-lg overflow-hidden bg-[#e8dfd0] hover:ring-2 hover:ring-nacc-gold"
                onClick={() => { props.onProductCover(productImageUrl(product.image)); props.onClose() }}
              >
                <img src={productImageUrl(product.image)} alt={product.name} class="w-full h-full object-cover" />
              </button>
            )}
          </For>
        </div>

        <p class="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wider">端末から追加</p>
        <label class="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-5 cursor-pointer hover:border-nacc-gold text-gray-400 text-sm">
          📷 写真を選択
          <input
            type="file" accept="image/*" class="hidden"
            onChange={(e) => {
              const file = e.currentTarget.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => {
                props.onUploadCover(reader.result as string)
                props.onClose()
              }
              reader.readAsDataURL(file)
            }}
          />
        </label>
      </div>
    </div>
  </div>
)

// ── Page Root ────────────────────────────────────────────────────────────────
const PageNotebook: Component = () => {
  const [notebooks, setNotebooks] = createSignal<NbData[]>(INITIAL_NBS)
  const [openNb, setOpenNb] = createSignal<NbData | null>(null)
  const [selectedItemId, setSelectedItemId] = createSignal<string | null>(null)
  const [sortMode, setSortMode] = createSignal(false)

  // New notebook modal
  const [newNbOpen, setNewNbOpen] = createSignal(false)
  const [newNbTitle, setNewNbTitle] = createSignal('新しいノートブック')
  const [newNbPreset, setNewNbPreset] = createSignal(COVER_PRESETS[0])
  const [newNbCoverUrl, setNewNbCoverUrl] = createSignal<string | undefined>(undefined)

  // Cover picker (for existing notebook)
  const [coverPickerOpen, setCoverPickerOpen] = createSignal(false)

  // Add item picker
  const [addItemOpen, setAddItemOpen] = createSignal(false)
  const [addItemTab, setAddItemTab] = createSignal<'memo' | 'blog'>('memo')

  // Drag state
  let dragFromIdx = -1
  const [dragFromIdxSig, setDragFromIdxSig] = createSignal(-1)
  const [dragOverIdx, setDragOverIdx] = createSignal(-1)

  const nb = () => openNb()
  const sortedItems = () => (nb()?.items ?? []).slice().sort((a, b) => a.order - b.order)
  const selectedItem = () => sortedItems().find((i) => i.id === selectedItemId()) ?? null

  function updateNb(patch: Partial<NbData>) {
    const cur = nb()
    if (!cur) return
    const updated = { ...cur, ...patch }
    setNotebooks((prev) => prev.map((n) => (n.id === cur.id ? updated : n)))
    setOpenNb(updated)
  }

  function updateItem(itemId: string, patch: Partial<ItemRef>) {
    const cur = nb()
    if (!cur) return
    updateNb({ items: cur.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) })
  }

  function openNotebook(nb: NbData) {
    setOpenNb(nb)
    setSelectedItemId(nb.items.length > 0 ? nb.items[0].id : null)
    setSortMode(false)
  }

  function goBack() {
    setOpenNb(null)
    setSelectedItemId(null)
    setSortMode(false)
  }

  function createNotebook() {
    const newNb: NbData = {
      id: nbNextId++,
      title: newNbTitle().trim() || '無題のノートブック',
      coverEmoji: newNbPreset().emoji,
      coverColor: newNbPreset().color,
      coverUrl: newNbCoverUrl(),
      items: [],
      createdAt: new Date(),
    }
    setNotebooks((prev) => [newNb, ...prev])
    setNewNbOpen(false)
    setNewNbTitle('新しいノートブック')
    setNewNbPreset(COVER_PRESETS[0])
    setNewNbCoverUrl(undefined)
    openNotebook(newNb)
  }

  function deleteNotebook(e: MouseEvent, id: number) {
    e.stopPropagation()
    setNotebooks((prev) => prev.filter((n) => n.id !== id))
    if (openNb()?.id === id) goBack()
  }

  function removeItemFromNb(itemId: string) {
    const cur = nb()
    if (!cur) return
    const updated = cur.items
      .filter((i) => i.id !== itemId)
      .map((i, idx) => ({ ...i, order: idx }))
    updateNb({ items: updated })
    if (selectedItemId() === itemId) {
      setSelectedItemId(updated[0]?.id ?? null)
    }
  }

  function addItem(poolItem: ItemRef) {
    const cur = nb()
    if (!cur) return
    const exists = cur.items.some((i) => i.refId === poolItem.refId && i.type === poolItem.type)
    if (exists) return
    const newItem: ItemRef = { ...poolItem, id: poolItem.id + '_' + Date.now(), order: cur.items.length }
    updateNb({ items: [...cur.items, newItem] })
  }

  // Drag & drop reorder
  function handleDragStart(e: DragEvent, idx: number) {
    dragFromIdx = idx
    setDragFromIdxSig(idx)
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
    ;(e.currentTarget as HTMLElement).style.opacity = '0.45'
  }
  function handleDragEnd(e: DragEvent) {
    ;(e.currentTarget as HTMLElement).style.opacity = '1'
    dragFromIdx = -1
    setDragFromIdxSig(-1)
    setDragOverIdx(-1)
  }
  function handleDragOver(e: DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    // Top half → line before idx, bottom half → line before idx+1
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setDragOverIdx(e.clientY < rect.top + rect.height / 2 ? idx : idx + 1)
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    const toIdx = dragOverIdx()
    setDragOverIdx(-1)
    setDragFromIdxSig(-1)
    if (dragFromIdx < 0 || toIdx < 0) { dragFromIdx = -1; return }
    const from = dragFromIdx
    dragFromIdx = -1
    if (from === toIdx || from === toIdx - 1) return
    const items = sortedItems().slice()
    const [moved] = items.splice(from, 1)
    items.splice(from < toIdx ? toIdx - 1 : toIdx, 0, moved)
    updateNb({ items: items.map((it, i) => ({ ...it, order: i })) })
  }

  const availableItems = () => {
    const cur = nb()
    if (!cur) return POOL
    const inNb = new Set(cur.items.map((i) => i.type + '_' + i.refId))
    return POOL.filter((p) => !inNb.has(p.type + '_' + p.refId))
  }

  const filteredPool = () => availableItems().filter((p) => p.type === addItemTab())

  // ── Grid view ──────────────────────────────────────────────────────────────
  const GridView = () => (
    <div class="flex-1 overflow-y-auto">
      <div class="max-w-4xl mx-auto px-6 py-8">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h1 class="text-2xl font-bold text-nacc-dark">ノートブック</h1>
            <div class="text-sm text-gray-500 mt-1">表紙付きノート。クライアント別・テーマ別に管理</div>
          </div>
          <button
            class="flex items-center gap-1.5 px-4 py-2 bg-nacc-dark text-white text-sm rounded-xl hover:opacity-90 transition-opacity"
            onClick={() => setNewNbOpen(true)}
          >
            + 新規ノート
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <For each={notebooks()}>
            {(nb) => (
              <CoverCard
                nb={nb}
                onClick={() => openNotebook(nb)}
                onDelete={(e) => deleteNotebook(e, nb.id)}
              />
            )}
          </For>

          {/* Add new card */}
          <div class="cursor-pointer group" onClick={() => setNewNbOpen(true)}>
            <div class="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl h-40 flex flex-col items-center justify-center gap-2 group-hover:border-nacc-gold group-hover:bg-nacc-gold/5 transition-all duration-200">
              <span class="text-3xl text-gray-300 group-hover:text-nacc-gold transition-colors">+</span>
              <span class="text-xs text-gray-400 group-hover:text-nacc-gold transition-colors">新しいノート</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Detail view ─────────────────────────────────────────────────────────────
  const DetailView = () => {
    const cur = nb()!
    return (
      <div class="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div class="h-12 bg-white border-b border-nacc-border flex items-center gap-2 px-3 shrink-0">
          {/* Cover thumbnail */}
          <button
            class="w-7 h-7 rounded-lg flex items-center justify-center text-lg overflow-hidden shrink-0 hover:opacity-80"
            style={{ background: cur.coverUrl ? undefined : cur.coverColor }}
            onClick={() => setCoverPickerOpen(true)}
          >
            <Show when={cur.coverUrl} fallback={<span style={{ 'font-size': '18px' }}>{cur.coverEmoji}</span>}>
              <img src={cur.coverUrl} class="w-full h-full object-cover" alt="" />
            </Show>
          </button>

          <span class="text-sm font-semibold text-nacc-dark truncate min-w-0">{cur.title}</span>

          {/* Sort toggle — directly next to title */}
          <button
            class="p-1.5 rounded-lg transition-colors shrink-0"
            classList={{
              'bg-nacc-gold text-white':         sortMode(),
              'hover:bg-gray-100 text-gray-500': !sortMode(),
            }}
            onClick={() => setSortMode((v) => !v)}
            title="並べ替え"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>

          <div class="flex-1" />

          {/* Add item */}
          <button
            class="flex items-center gap-1 text-xs px-3 py-1.5 bg-nacc-dark text-white rounded-lg hover:opacity-90"
            onClick={() => setAddItemOpen(true)}
          >
            + 追加
          </button>
        </div>

        <div class="flex flex-1 overflow-hidden">
          {/* Left: item list */}
          <div class="w-56 shrink-0 border-r border-nacc-border bg-white flex flex-col overflow-hidden">
            <Show when={sortMode()}>
              <div class="px-3 py-1.5 bg-nacc-gold/10 border-b border-nacc-border text-xs text-nacc-gold font-medium">
                ≡ ドラッグで並べ替え
              </div>
            </Show>
            <div class="flex-1 overflow-y-auto">
              <Show
                when={sortedItems().length > 0}
                fallback={
                  <div class="flex flex-col items-center justify-center h-full gap-2 text-gray-300 text-xs">
                    <span class="text-3xl">📭</span>
                    <span>まだ追加されていません</span>
                  </div>
                }
              >
                <For each={sortedItems()}>
                  {(item, idx) => (
                    <>
                      {/* Drop indicator line above this item */}
                      <Show when={sortMode() && dragOverIdx() === idx() && dragFromIdxSig() !== idx()}>
                        <div class="h-0.5 bg-blue-500 mx-3 rounded-full pointer-events-none" />
                      </Show>

                    <div
                      class="flex items-start gap-2 px-3 py-3 border-b border-[#f0f0f0] cursor-pointer transition-colors group"
                      classList={{
                        'bg-[#f5f0e8] border-l-2 border-l-nacc-gold': selectedItemId() === item.id && !sortMode(),
                        'hover:bg-[#f9f8f6]': selectedItemId() !== item.id,
                        'opacity-40': sortMode() && dragFromIdxSig() === idx(),
                      }}
                      draggable={sortMode()}
                      onDragStart={(e) => sortMode() && handleDragStart(e, idx())}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => { if (sortMode()) handleDragOver(e, idx()) }}
                      onDragLeave={(e) => { e.stopPropagation() }}
                      onDrop={(e) => { if (sortMode()) handleDrop(e) }}
                      onClick={() => !sortMode() && setSelectedItemId(item.id)}
                    >
                      {/* Drag handle */}
                      <Show when={sortMode()}>
                        <span class="text-gray-400 text-sm mt-0.5 cursor-grab select-none">≡</span>
                      </Show>

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1 mb-0.5">
                          <span class="text-xs">{item.type === 'memo' ? '📝' : '📓'}</span>
                          <span
                            class="text-xs font-medium leading-snug truncate"
                            classList={{
                              'text-nacc-gold': selectedItemId() === item.id,
                              'text-nacc-dark': selectedItemId() !== item.id,
                            }}
                          >
                            {item.title}
                          </span>
                        </div>
                        <div class="text-xs text-gray-400">{item.date.toLocaleDateString('ja-JP')}</div>
                      </div>
                    </div>
                    </>
                  )}
                </For>

                {/* Drop indicator at end of list */}
                <Show when={sortMode() && dragOverIdx() === sortedItems().length}>
                  <div class="h-0.5 bg-blue-500 mx-3 rounded-full pointer-events-none" />
                </Show>
              </Show>
            </div>
          </div>

          {/* Right: content viewer */}
          <Show
            when={selectedItem()}
            fallback={
              <div class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300">
                <span class="text-5xl">📖</span>
                <span class="text-sm">アイテムを選択してください</span>
                <button
                  class="mt-2 text-xs px-4 py-2 border border-dashed border-gray-300 rounded-xl hover:border-nacc-gold hover:text-nacc-gold transition-colors"
                  onClick={() => setAddItemOpen(true)}
                >
                  + メモ・ブログを追加
                </button>
              </div>
            }
          >
            {(item) => (
              <Show
                when={item().type === 'memo'}
                fallback={
                  <BlogItemViewer
                    item={item()}
                    onRemove={() => removeItemFromNb(item().id)}
                  />
                }
              >
                <MemoItemViewer
                  item={item()}
                  onUpdate={(patch) => updateItem(item().id, patch)}
                  onRemove={() => removeItemFromNb(item().id)}
                />
              </Show>
            )}
          </Show>
        </div>
      </div>
    )
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      <Show when={openNb()} fallback={<GridView />}>
        <DetailView />
      </Show>

      {/* ── New notebook modal ── */}
      <Show when={newNbOpen()}>
        <div class="fixed inset-0 z-60 bg-black/40 flex items-center justify-center px-4" onClick={() => setNewNbOpen(false)}>
          <div
            class="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview */}
            <div
              class="h-36 flex items-center justify-center text-7xl relative overflow-hidden"
              style={{ background: newNbCoverUrl() ? undefined : newNbPreset().color }}
            >
              <Show when={newNbCoverUrl()} fallback={<span>{newNbPreset().emoji}</span>}>
                <img src={newNbCoverUrl()} class="w-full h-full object-cover absolute inset-0" alt="" />
                <span class="relative text-7xl">{newNbPreset().emoji}</span>
              </Show>
            </div>

            <div class="p-5">
              <input
                type="text"
                class="w-full text-base font-semibold text-nacc-dark border-b border-nacc-border outline-none bg-transparent pb-2 mb-4"
                placeholder="ノートブック名"
                value={newNbTitle()}
                onInput={(e) => setNewNbTitle(e.currentTarget.value)}
                ref={(el) => el && setTimeout(() => el.focus(), 50)}
              />

              <p class="text-xs text-gray-400 mb-2 font-medium">表紙プリセット</p>
              <div class="grid grid-cols-8 gap-1.5 mb-4">
                <For each={COVER_PRESETS}>
                  {(preset) => (
                    <button
                      class="aspect-square rounded-lg flex items-center justify-center text-xl transition-all hover:scale-105"
                      style={{ background: preset.color }}
                      classList={{
                        'ring-2 ring-nacc-gold ring-offset-1': newNbPreset().emoji === preset.emoji && newNbPreset().color === preset.color,
                      }}
                      onClick={() => { setNewNbPreset(preset); setNewNbCoverUrl(undefined) }}
                    >
                      {preset.emoji}
                    </button>
                  )}
                </For>
              </div>

              <div class="flex gap-2 mb-5">
                <label class="flex-1 flex items-center justify-center gap-1 text-xs border border-dashed border-gray-300 rounded-lg py-2 cursor-pointer hover:border-nacc-gold text-gray-500">
                  📷 端末から
                  <input type="file" accept="image/*" class="hidden" onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    if (!file) return
                    const r = new FileReader()
                    r.onload = () => setNewNbCoverUrl(r.result as string)
                    r.readAsDataURL(file)
                  }} />
                </label>
                <Show when={newNbCoverUrl()}>
                  <button
                    class="text-xs text-red-400 hover:text-red-600 px-2"
                    onClick={() => setNewNbCoverUrl(undefined)}
                  >
                    画像削除
                  </button>
                </Show>
              </div>

              <div class="flex gap-2">
                <button
                  class="flex-1 py-2.5 text-sm text-gray-500 border border-nacc-border rounded-xl hover:bg-gray-50"
                  onClick={() => setNewNbOpen(false)}
                >
                  キャンセル
                </button>
                <button
                  class="flex-1 py-2.5 text-sm bg-nacc-dark text-white rounded-xl hover:opacity-90 font-medium"
                  onClick={createNotebook}
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Cover picker (change existing) ── */}
      <Show when={coverPickerOpen() && openNb()}>
        <CoverPickerModal
          emoji={openNb()!.coverEmoji}
          color={openNb()!.coverColor}
          onSelect={(preset) => {
            updateNb({ coverEmoji: preset.emoji, coverColor: preset.color, coverUrl: undefined })
          }}
          onProductCover={(url) => updateNb({ coverUrl: url })}
          onUploadCover={(url) => updateNb({ coverUrl: url })}
          onClose={() => setCoverPickerOpen(false)}
        />
      </Show>

      {/* ── Add item bottom sheet ── */}
      <Show when={addItemOpen()}>
        <div class="fixed inset-0 z-60 bg-black/30" onClick={() => setAddItemOpen(false)} />
        <div
          class="fixed bottom-0 left-0 right-0 z-70 bg-white rounded-t-2xl shadow-2xl flex flex-col"
          style={{ 'max-height': '65vh' }}
        >
          <div class="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
            <span class="font-semibold text-sm">メモ・ブログを追加</span>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              onClick={() => setAddItemOpen(false)}
            >
              ✕
            </button>
          </div>
          <div class="flex px-5 mt-2 shrink-0 border-b border-nacc-border">
            {(['memo', 'blog'] as const).map((tab) => (
              <button
                class="px-5 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px"
                classList={{
                  'border-nacc-gold text-nacc-gold': addItemTab() === tab,
                  'border-transparent text-gray-500 hover:text-gray-700': addItemTab() !== tab,
                }}
                onClick={() => setAddItemTab(tab)}
              >
                {tab === 'memo' ? '📝 メモ' : '📓 ブログ'}
              </button>
            ))}
          </div>
          <div class="overflow-y-auto flex-1 p-3">
            <Show
              when={filteredPool().length > 0}
              fallback={
                <div class="text-center text-gray-400 text-sm py-8">
                  追加できる{addItemTab() === 'memo' ? 'メモ' : 'ブログ'}がありません
                </div>
              }
            >
              <For each={filteredPool()}>
                {(item) => (
                  <button
                    class="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[#f9f8f6] transition-colors"
                    onClick={() => { addItem(item); setAddItemOpen(false) }}
                  >
                    <span class="text-lg mt-0.5">{item.type === 'memo' ? '📝' : '📓'}</span>
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-medium text-nacc-dark truncate">{item.title}</p>
                      <p class="text-xs text-gray-400 mt-0.5">
                        {item.date.toLocaleDateString('ja-JP')}
                        {item.tags.length > 0 && ` · ${item.tags[0].name.split(' ')[0]}`}
                      </p>
                    </div>
                    <span class="text-nacc-gold text-sm mt-1">+</span>
                  </button>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default PageNotebook
