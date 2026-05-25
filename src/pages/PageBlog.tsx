import { type Component, createSignal, For, Show } from 'solid-js'
import { state, setState, toggleBlogFilter, addBlog, updateBlog, trashBlog } from '../store'
import type { Blog, Tag } from '../types'
import { PRODUCTS, productImageUrl } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'

let saveTimer: ReturnType<typeof setTimeout>

function scheduleBlogSave(id: string, patch: Parameters<typeof updateBlog>[1]) {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => updateBlog(id, patch), 800)
}

// ── Blog Viewer (View mode) ────────────────────────────────────────────────
const BlogViewer: Component<{
  blog: Blog
  onShowPopover: (e: MouseEvent, tag: Tag) => void
}> = (props) => (
  <div class="flex-1 overflow-y-auto bg-nacc-light">
    <div class="max-w-2xl mx-auto px-6 py-8">
      <Show when={props.blog.cover}>
        <img
          src={props.blog.cover}
          class="w-full h-52 object-cover rounded-2xl mb-8 shadow-md"
          alt="cover"
        />
      </Show>

      <h1 class="text-3xl font-bold text-nacc-dark mb-4 leading-tight">{props.blog.title}</h1>

      <div class="flex flex-wrap gap-2 mb-4">
        <For each={props.blog.categoryTags}>
          {(tag) => (
            <button
              class="flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border font-medium transition-all hover:shadow-md"
              classList={{
                'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100':     tag.type === 'product',
                'bg-green-50 text-green-700 border-green-200 hover:bg-green-100': tag.type === 'nutrient',
              }}
              onClick={(e) => props.onShowPopover(e, tag)}
            >
              {tag.type === 'product' ? '📦' : '🌿'} {tag.name}
              <span class="ml-1.5 text-xs opacity-40">▸</span>
            </button>
          )}
        </For>
      </div>

      <div class="text-xs text-gray-400 mb-8 flex items-center gap-2">
        <span>{new Date(props.blog.createdAt).toLocaleDateString('ja-JP')}</span>
        <span>·</span>
        <span>読み時間</span>
      </div>

      <div class="text-sm text-gray-700 leading-8 bg-white rounded-2xl p-6 border border-nacc-border shadow-sm whitespace-pre-wrap">
        {props.blog.body || <span class="text-gray-300">本文なし</span>}
      </div>
    </div>
  </div>
)

// ── Blog Memo Editor ───────────────────────────────────────────────────────
const BlogMemoEditor: Component<{
  blog: Blog
  onUpdate: (patch: Partial<Blog>) => void
  onDelete: (id: string) => void
  onOpenTagPicker: () => void
  onOpenCoverPicker: () => void
  onRemoveTag: (name: string) => void
  isMobile: boolean
  onBack: () => void
}> = (props) => {
  const b = () => props.blog
  return (
    <div class="flex-1 flex flex-col overflow-hidden">
      <Show when={props.isMobile}>
        <button class="mobile-back" onClick={props.onBack}>← ブログ一覧</button>
      </Show>
      <div class="flex-1 overflow-y-auto">
        <div
          class="w-full h-32 flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0"
          classList={{ 'cover-placeholder': !b().cover }}
          onClick={props.onOpenCoverPicker}
        >
          <Show when={b().cover}>
            <img src={b().cover} class="w-full h-full object-cover" alt="cover" />
          </Show>
          <span class="absolute text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full">
            {b().cover ? '📷 カバー変更' : '📷 カバー画像を追加'}
          </span>
        </div>

        <div class="p-5 flex flex-col gap-3">
          <input
            type="text"
            class="text-xl font-bold text-nacc-dark border-none outline-none bg-transparent w-full"
            placeholder="タイトル"
            value={b().title}
            onInput={(e) => props.onUpdate({ title: e.currentTarget.value })}
          />

          <div class="flex flex-wrap gap-1.5 items-center">
            <For each={b().categoryTags}>
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
                    onClick={() => props.onRemoveTag(tag.name)}
                  >✕</button>
                </span>
              )}
            </For>
            <button
              class="text-xs px-2 py-1 rounded-full border border-dashed border-nacc-gold text-nacc-gold hover:bg-[#f5f0e8]"
              onClick={props.onOpenTagPicker}
            >
              + タグ追加
            </button>
          </div>

          <textarea
            class="flex-1 min-h-52 text-sm text-nacc-dark border border-nacc-border outline-none bg-white rounded-xl p-4 resize-none leading-relaxed shadow-sm focus:ring-1 focus:ring-nacc-gold/30"
            placeholder="本文を入力..."
            value={b().body}
            onInput={(e) => props.onUpdate({ body: e.currentTarget.value })}
          />

          <div class="pt-3 border-t border-[#f0f0f0] flex items-center gap-3 flex-wrap">
            <span class="text-xs text-gray-400 ml-auto">
              自動保存 — {new Date(b().updatedAt).toLocaleDateString('ja-JP')}
            </span>
            <button
              class="text-xs text-red-400 hover:text-red-600"
              onClick={() => props.onDelete(b().id!)}
            >
              🗑️ ごみ箱へ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page Root ──────────────────────────────────────────────────────────────
const PageBlog: Component = () => {
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [mobilePanel, setMobilePanel] = createSignal<'list' | 'editor'>('list')

  const [tagPickerOpen, setTagPickerOpen] = createSignal(false)
  const [tagPickerTab, setTagPickerTab] = createSignal<'product' | 'nutrient'>('product')
  const [tagPickerSelected, setTagPickerSelected] = createSignal<Tag[]>([])

  const [coverPickerOpen, setCoverPickerOpen] = createSignal(false)
  const [popover, setPopover] = createSignal<{ tag: Tag; x: number; y: number } | null>(null)

  const isMobile = () => window.innerWidth < 768
  const selected = () => {
    const id = selectedId()
    if (id) {
      const found = state.blogs.find((b) => b.id === id)
      if (found) return found
    }
    return state.blogs[0]
  }

  const allTags = () => {
    const seen = new Set<string>()
    const result: Tag[] = []
    state.blogs.forEach((b) =>
      b.categoryTags.forEach((t) => {
        if (!seen.has(t.name)) { seen.add(t.name); result.push(t) }
      })
    )
    return result
  }

  const filteredBlogs = () => {
    if (state.blogFilterTags.length === 0) return state.blogs
    return state.blogs.filter((b) =>
      state.blogFilterTags.some((ft) => b.categoryTags.some((t) => t.name === ft))
    )
  }

  function patchLocal(id: string, patch: Partial<Blog>) {
    setState('blogs', (prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function handleUpdate(patch: Partial<Blog>) {
    const id = selectedId()
    if (!id) return
    const now = new Date()
    const full = { ...patch, updatedAt: now }
    patchLocal(id, full)
    scheduleBlogSave(id, full)
  }

  async function handleAddBlog() {
    const now = new Date()
    const data: Omit<Blog, 'id'> = {
      title: '新しいブログ', body: '', coverType: 'none',
      categoryTags: [], mode: 'memo', createdAt: now, updatedAt: now,
    }
    const id = await addBlog(data)
    setSelectedId(id)
    setState({ blogMode: 'memo' })
    if (isMobile()) setMobilePanel('editor')
  }

  function selectBlog(id: string) {
    setSelectedId(id)
    if (isMobile()) setMobilePanel('editor')
  }

  function handleDeleteBlog(id: string) {
    trashBlog(id) // synchronous: state is updated immediately
    setSelectedId(state.blogs[0]?.id ?? null)
  }

  function removeTag(tagName: string) {
    const id = selectedId()
    if (!id) return
    const categoryTags = selected()?.categoryTags.filter((t) => t.name !== tagName) ?? []
    patchLocal(id, { categoryTags })
    updateBlog(id, { categoryTags })
  }

  function confirmTagPicker() {
    const id = selectedId()
    const curr = selected()
    if (!id || !curr) return
    const existing = curr.categoryTags.map((t) => t.name)
    const toAdd = tagPickerSelected().filter((t) => !existing.includes(t.name))
    const categoryTags = [...curr.categoryTags, ...toAdd]
    patchLocal(id, { categoryTags })
    updateBlog(id, { categoryTags })
    setTagPickerOpen(false)
    setTagPickerSelected([])
  }

  function showPopover(e: MouseEvent, tag: Tag) {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopover({ tag, x: Math.min(rect.left, window.innerWidth - 300), y: rect.bottom + 6 })
  }

  function getTagDetail(tag: Tag): string {
    if (tag.type === 'product') {
      const p = PRODUCTS.find((x) => x.name === tag.name)
      return p ? p.effects.join('、') : ''
    }
    return NUTRIENTS.find((n) => n.name === tag.name)?.description ?? ''
  }

  const FilterBar = () => (
    <Show when={state.blogMode === 'view' && allTags().length > 0}>
      <div class="shrink-0 px-4 py-2 bg-white border-b border-nacc-border">
        <div class="flex flex-wrap gap-1.5" style={{ 'max-height': '64px', overflow: 'hidden' }}>
          <button
            class="px-3 py-1 rounded-full text-xs border transition-all font-medium"
            classList={{
              'bg-nacc-dark text-white border-nacc-dark': state.blogFilterTags.length === 0,
              'border-gray-300 bg-white text-gray-600 hover:border-gray-400': state.blogFilterTags.length > 0,
            }}
            onClick={() => setState({ blogFilterTags: [] })}
          >
            すべて
          </button>
          <For each={allTags()}>
            {(tag) => {
              const isSelected = () => state.blogFilterTags.includes(tag.name)
              return (
                <button
                  class="flex items-center gap-1 px-3 py-1 rounded-full text-xs border transition-all font-medium"
                  classList={{
                    'bg-blue-600 text-white border-blue-600':   tag.type === 'product' && isSelected(),
                    'bg-green-600 text-white border-green-600': tag.type === 'nutrient' && isSelected(),
                    'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100':    tag.type === 'product' && !isSelected(),
                    'bg-green-50 text-green-700 border-green-200 hover:bg-green-100': tag.type === 'nutrient' && !isSelected(),
                  }}
                  onClick={() => toggleBlogFilter(tag.name)}
                >
                  {tag.type === 'product' ? '📦' : '🌿'} {tag.name}
                </button>
              )
            }}
          </For>
        </div>
      </div>
    </Show>
  )

  const ListPanel = () => (
    <div class="w-56 shrink-0 border-r border-nacc-border bg-white flex flex-col">
      <div class="p-3 border-b border-nacc-border">
        <button
          class="w-full flex items-center gap-1.5 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          onClick={handleAddBlog}
        >
          <span class="text-lg leading-none">+</span> 新規ブログ
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <For each={filteredBlogs()}>
          {(blog) => (
            <div
              class="blog-list-item relative px-3 py-3 rounded-xl cursor-pointer group"
              classList={{ active: selectedId() === blog.id }}
              onClick={() => selectBlog(blog.id!)}
            >
              <Show when={blog.cover}>
                <img src={blog.cover} class="w-full h-14 object-cover rounded-lg mb-2" alt="" />
              </Show>
              <div class="text-sm font-semibold text-nacc-dark leading-snug mb-1.5 pr-5"
                style={{ display: '-webkit-box', '-webkit-line-clamp': '2', '-webkit-box-orient': 'vertical', overflow: 'hidden' }}>
                {blog.title}
              </div>
              <div class="flex flex-wrap gap-1 mb-1">
                <For each={blog.categoryTags.slice(0, 2)}>
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
              <div class="text-xs text-gray-400">
                {new Date(blog.updatedAt).toLocaleDateString('ja-JP')}
              </div>
              <button
                class="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-all"
                onClick={(e) => { e.stopPropagation(); handleDeleteBlog(blog.id!) }}
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </For>
      </div>
    </div>
  )

  return (
    <div class="flex flex-col h-full overflow-hidden" onClick={() => setPopover(null)}>
      <FilterBar />

      <div class="flex flex-1 overflow-hidden">
        <Show when={!isMobile() || mobilePanel() === 'list'}>
          <ListPanel />
        </Show>

        <Show when={!isMobile() || mobilePanel() === 'editor'}>
          <Show
            when={selected()}
            fallback={
              <div class="flex-1 flex items-center justify-center text-gray-400 text-sm">
                ブログを選択してください
              </div>
            }
          >
            {(blog) => (
              <Show
                when={state.blogMode === 'memo'}
                fallback={<BlogViewer blog={blog()} onShowPopover={showPopover} />}
              >
                <BlogMemoEditor
                  blog={blog()}
                  onUpdate={handleUpdate}
                  onDelete={handleDeleteBlog}
                  onOpenTagPicker={() => setTagPickerOpen(true)}
                  onOpenCoverPicker={() => setCoverPickerOpen(true)}
                  onRemoveTag={removeTag}
                  isMobile={isMobile()}
                  onBack={() => setMobilePanel('list')}
                />
              </Show>
            )}
          </Show>
        </Show>
      </div>

      {/* ── Tag picker bottom sheet ── */}
      <Show when={tagPickerOpen()}>
        <div class="fixed inset-0 z-60 bg-black/30" onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }} />
        <div class="fixed bottom-0 left-0 right-0 z-70 bg-white rounded-t-2xl shadow-2xl flex flex-col" style={{ 'max-height': '70vh' }}>
          <div class="flex items-center justify-between px-5 pt-4 pb-0 shrink-0">
            <span class="font-semibold text-sm">カテゴリータグを追加</span>
            <button class="text-gray-400 hover:text-gray-600 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100" onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }}>✕</button>
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
                const alreadyAdded = () => selected()?.categoryTags.some((t) => t.name === item.name) ?? false
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
                    <Show when={isSelected()}><span class="text-nacc-gold font-bold">✓</span></Show>
                    <Show when={alreadyAdded()}><span class="text-xs text-[#999]">追加済み</span></Show>
                  </button>
                )
              }}
            </For>
          </div>
          <div class="px-5 py-3 border-t border-nacc-border flex items-center justify-between bg-gray-50 shrink-0">
            <span class="text-xs text-gray-500 font-medium">{tagPickerSelected().length}件選択中</span>
            <div class="flex gap-2">
              <button class="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg" onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }}>キャンセル</button>
              <button class="px-4 py-1.5 text-sm bg-nacc-dark text-white rounded-lg hover:opacity-90 font-medium" onClick={confirmTagPicker}>追加する</button>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Cover picker ── */}
      <Show when={coverPickerOpen()}>
        <div class="fixed inset-0 z-60 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setCoverPickerOpen(false)}>
          <div class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div class="flex items-center justify-between px-5 py-4 border-b border-nacc-border">
              <span class="font-semibold text-nacc-dark">カバー画像を選択</span>
              <button onClick={() => setCoverPickerOpen(false)} class="text-[#999]">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <p class="text-xs text-[#999] mb-3 font-semibold uppercase tracking-wider">商品画像</p>
              <div class="grid grid-cols-3 gap-2 mb-4">
                <For each={PRODUCTS.filter((p) => p.image)}>
                  {(product) => (
                    <button
                      class="aspect-square rounded-lg overflow-hidden bg-[#e8dfd0] hover:ring-2 hover:ring-nacc-gold"
                      onClick={() => { handleUpdate({ cover: productImageUrl(product.image), coverType: 'product' }); setCoverPickerOpen(false) }}
                    >
                      <img src={productImageUrl(product.image)} alt={product.name} class="w-full h-full object-cover" />
                    </button>
                  )}
                </For>
              </div>
              <p class="text-xs text-[#999] mb-3 font-semibold uppercase tracking-wider">端末から追加</p>
              <label class="flex items-center justify-center gap-2 border-2 border-dashed border-[#e8e8e8] rounded-xl py-5 cursor-pointer hover:border-nacc-gold text-[#999] text-sm">
                📷 写真を選択
                <input type="file" accept="image/*" class="hidden" onChange={(e) => {
                  const file = e.currentTarget.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => { handleUpdate({ cover: reader.result as string, coverType: 'upload' }); setCoverPickerOpen(false) }
                  reader.readAsDataURL(file)
                }} />
              </label>
              <Show when={selected()?.cover}>
                <button class="w-full mt-3 py-2 text-sm text-red-400 hover:text-red-600" onClick={() => { handleUpdate({ cover: undefined, coverType: 'none' }); setCoverPickerOpen(false) }}>
                  カバー画像を削除
                </button>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* ── Detail popover (view mode) ── */}
      <Show when={popover()}>
        {(p) => (
          <div
            class="fixed z-80 bg-white border border-nacc-border rounded-xl shadow-xl p-4 w-72 max-h-72 overflow-y-auto"
            style={{ left: `${p().x}px`, top: `${p().y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between mb-3">
              <span class="font-semibold text-sm text-nacc-dark">{p().tag.name}</span>
              <button class="text-gray-400 hover:text-gray-600 text-xs w-5 h-5 flex items-center justify-center" onClick={() => setPopover(null)}>✕</button>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed">{getTagDetail(p().tag)}</p>
            <div class="mt-3 pt-2 border-t border-nacc-border">
              <button class="text-xs text-nacc-gold hover:underline" onClick={() => { setState({ page: p().tag.type === 'product' ? 'db01' : 'db02' }); setPopover(null) }}>
                詳細をDBで見る →
              </button>
            </div>
          </div>
        )}
      </Show>
    </div>
  )
}

export default PageBlog
