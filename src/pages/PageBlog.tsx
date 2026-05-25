import { type Component, createSignal, For, Show } from 'solid-js'
import { state, setState, toggleBlogFilter } from '../store'
import type { Blog, Tag } from '../types'
import { PRODUCTS } from '../db/products'
import { NUTRIENTS } from '../db/nutrients'
import { productImageUrl } from '../db/products'

let nextId = 1
const mkBlog = (): Blog => ({
  id: nextId++,
  title: '新しいブログ',
  body: '',
  cover: undefined,
  coverType: 'none',
  categoryTags: [],
  mode: 'memo',
  createdAt: new Date(),
  updatedAt: new Date(),
})

const SAMPLE_BLOGS: Blog[] = [
  {
    id: nextId++,
    title: 'NMNサプリの効果と飲み方',
    body: 'NMNはNAD+の前駆体として注目されています。毎日250mg〜500mgを朝食後に服用するのがおすすめです。',
    cover: undefined,
    coverType: 'none',
    categoryTags: [
      { type: 'product', name: 'R-NMN' },
      { type: 'nutrient', name: 'NMN (β-ニコチンアミドモノヌクレオチド)' },
    ],
    mode: 'memo',
    createdAt: new Date('2026-05-20'),
    updatedAt: new Date('2026-05-20'),
  },
  {
    id: nextId++,
    title: 'オメガ3の正しい選び方',
    body: 'EPAとDHAの比率に注目して選ぶことが大切です。魚油由来のα-55 premiumは品質が高くおすすめです。',
    cover: undefined,
    coverType: 'none',
    categoryTags: [
      { type: 'product', name: 'オメガ3 α-55 premium' },
      { type: 'nutrient', name: 'EPA (エイコサペンタエン酸)' },
      { type: 'nutrient', name: 'DHA (ドコサヘキサエン酸)' },
    ],
    mode: 'memo',
    createdAt: new Date('2026-05-18'),
    updatedAt: new Date('2026-05-18'),
  },
]

const PageBlog: Component = () => {
  const [blogs, setBlogs] = createSignal<Blog[]>(SAMPLE_BLOGS)
  const [selectedId, setSelectedId] = createSignal<number | null>(SAMPLE_BLOGS[0].id!)
  const [mobilePanel, setMobilePanel] = createSignal<'list' | 'editor'>('list')
  const [tagPickerOpen, setTagPickerOpen] = createSignal(false)
  const [tagPickerTab, setTagPickerTab] = createSignal<'product' | 'nutrient'>('product')
  const [tagPickerSelected, setTagPickerSelected] = createSignal<Tag[]>([])
  const [coverPickerOpen, setCoverPickerOpen] = createSignal(false)
  const [popover, setPopover] = createSignal<{ tag: Tag; x: number; y: number } | null>(null)

  const isMobile = () => window.innerWidth < 768
  const selected = () => blogs().find((b) => b.id === selectedId())

  const allTags = () => {
    const tags = new Set<string>()
    blogs().forEach((b) => b.categoryTags.forEach((t) => tags.add(t.name)))
    return [...tags]
  }

  const filteredBlogs = () => {
    if (state.blogFilterTags.length === 0) return blogs()
    return blogs().filter((b) =>
      state.blogFilterTags.every((ft) => b.categoryTags.some((t) => t.name === ft))
    )
  }

  function addBlog() {
    const b = mkBlog()
    setBlogs((prev) => [b, ...prev])
    setSelectedId(b.id!)
    if (isMobile()) setMobilePanel('editor')
  }

  function selectBlog(id: number) {
    setSelectedId(id)
    if (isMobile()) setMobilePanel('editor')
  }

  function updateBlog(patch: Partial<Blog>) {
    setBlogs((prev) =>
      prev.map((b) =>
        b.id === selectedId() ? { ...b, ...patch, updatedAt: new Date() } : b
      )
    )
  }

  function deleteBlog(id: number) {
    const blog = blogs().find((b) => b.id === id)
    if (!blog) return
    setState('trashBlogs', (prev) => [{ ...blog, deletedAt: new Date() }, ...prev])
    setBlogs((prev) => prev.filter((b) => b.id !== id))
    if (selectedId() === id) setSelectedId(blogs()[0]?.id ?? null)
  }

  function confirmTagPicker() {
    const curr = selected()
    if (!curr) return
    const existing = curr.categoryTags.map((t) => t.name)
    const toAdd = tagPickerSelected().filter((t) => !existing.includes(t.name))
    updateBlog({ categoryTags: [...curr.categoryTags, ...toAdd] })
    setTagPickerOpen(false)
    setTagPickerSelected([])
  }

  function removeTag(tagName: string) {
    const curr = selected()
    if (!curr) return
    updateBlog({ categoryTags: curr.categoryTags.filter((t) => t.name !== tagName) })
  }

  function showPopover(e: MouseEvent, tag: Tag) {
    e.stopPropagation()
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPopover({ tag, x: rect.left, y: rect.bottom + 4 })
  }

  function getTagDetail(tag: Tag): string {
    if (tag.type === 'product') {
      return PRODUCTS.find((p) => p.name === tag.name)?.effects.join('、') ?? ''
    }
    return NUTRIENTS.find((n) => n.name === tag.name)?.description ?? ''
  }

  // ── Sub-components ──────────────────────────────────────────────────────

  const FilterBar = () => (
    <Show when={state.blogMode === 'view' && allTags().length > 0}>
      <div
        class="flex flex-wrap gap-1.5 px-4 py-2 border-b border-[#e8e8e8] bg-[#f9f8f6]"
        style={{ 'max-height': '64px', 'overflow': 'hidden' }}
      >
        <button
          class="pill-filter text-xs px-3 py-1 rounded-full border border-[#e8e8e8] bg-white font-medium transition-colors"
          classList={{ 'pill-active': state.blogFilterTags.length === 0 }}
          onClick={() => setState({ blogFilterTags: [] })}
        >
          すべて
        </button>
        <For each={allTags()}>
          {(tag) => (
            <button
              class="pill-filter text-xs px-3 py-1 rounded-full border border-[#e8e8e8] bg-white font-medium transition-colors"
              classList={{ 'pill-active': state.blogFilterTags.includes(tag) }}
              onClick={() => toggleBlogFilter(tag)}
            >
              {tag.split(' ')[0]}
            </button>
          )}
        </For>
      </div>
    </Show>
  )

  const BlogList = () => (
    <div class="w-64 shrink-0 border-r border-[#e8e8e8] flex flex-col overflow-hidden">
      <div class="flex items-center justify-between px-3 py-2 border-b border-[#e8e8e8]">
        <span class="text-sm font-semibold text-[#37352f]">ブログ</span>
        <button
          class="text-xs px-2 py-1 rounded bg-[#b38247] text-white font-semibold hover:opacity-80"
          onClick={addBlog}
        >
          + 新規
        </button>
      </div>
      <FilterBar />
      <div class="flex-1 overflow-y-auto">
        <For each={filteredBlogs()}>
          {(blog) => (
            <button
              class="blog-list-item w-full text-left px-4 py-3 border-b border-[#f0f0f0]"
              classList={{ active: selectedId() === blog.id }}
              onClick={() => selectBlog(blog.id!)}
            >
              <p class="text-sm font-medium text-[#37352f] truncate">{blog.title || '無題'}</p>
              <div class="flex items-center gap-1 mt-1 flex-wrap">
                <For each={blog.categoryTags.slice(0, 2)}>
                  {(t) => (
                    <span class="text-xs px-1.5 py-0.5 rounded bg-[#f5f0e8] text-[#b38247]">
                      {t.name.split(' ')[0]}
                    </span>
                  )}
                </For>
              </div>
              <p class="text-xs text-[#999] mt-1">
                {blog.updatedAt.toLocaleDateString('ja-JP')}
              </p>
            </button>
          )}
        </For>
      </div>
    </div>
  )

  const BlogEditor = () => (
    <div class="flex-1 flex flex-col overflow-hidden">
      <Show when={isMobile()}>
        <button class="mobile-back" onClick={() => setMobilePanel('list')}>
          ← ブログ一覧
        </button>
      </Show>
      <Show
        when={selected()}
        fallback={
          <div class="flex items-center justify-center h-full text-[#ccc] text-sm">
            記事を選択してください
          </div>
        }
      >
        {(blog) => (
          <div class="flex flex-col h-full overflow-y-auto">
            {/* Cover */}
            <div
              class="w-full h-36 flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0"
              classList={{ 'cover-placeholder': !blog().cover }}
              style={{ background: blog().cover ? 'none' : undefined }}
              onClick={() => setCoverPickerOpen(true)}
            >
              <Show when={blog().cover}>
                <img src={blog().cover} class="w-full h-full object-cover" alt="cover" />
              </Show>
              <span class="absolute text-xs text-white/80 bg-black/30 px-3 py-1 rounded-full">
                {blog().cover ? '📷 カバー変更' : '📷 カバー画像を追加'}
              </span>
            </div>

            <div class="p-5 flex flex-col gap-3">
              {/* Title */}
              <input
                type="text"
                class="text-xl font-bold text-[#37352f] border-none outline-none bg-transparent w-full"
                placeholder="タイトル"
                value={blog().title}
                onInput={(e) => updateBlog({ title: e.currentTarget.value })}
              />

              {/* Category tags */}
              <div class="flex flex-wrap gap-1.5 items-center">
                <For each={blog().categoryTags}>
                  {(tag) => (
                    <span class="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#f5f0e8] text-[#b38247] border border-[#e8dfd0]">
                      {tag.name.split(' ')[0]}
                      <Show when={state.blogMode === 'memo'}>
                        <button
                          class="text-[#b38247]/60 hover:text-[#b38247] ml-0.5"
                          onClick={() => removeTag(tag.name)}
                        >
                          ×
                        </button>
                      </Show>
                    </span>
                  )}
                </For>
                <Show when={state.blogMode === 'memo'}>
                  <button
                    class="text-xs px-2 py-1 rounded-full border border-dashed border-[#b38247] text-[#b38247] hover:bg-[#f5f0e8]"
                    onClick={() => setTagPickerOpen(true)}
                  >
                    + タグ追加
                  </button>
                </Show>
              </div>

              {/* Body */}
              <Show when={state.blogMode === 'memo'}>
                <textarea
                  class="flex-1 min-h-48 text-sm text-[#37352f] border-none outline-none bg-transparent resize-none leading-relaxed"
                  placeholder="本文を入力..."
                  value={blog().body}
                  onInput={(e) => updateBlog({ body: e.currentTarget.value })}
                />
              </Show>
              <Show when={state.blogMode === 'view'}>
                <div class="text-sm text-[#37352f] leading-relaxed whitespace-pre-wrap">
                  {blog().body || <span class="text-[#ccc]">本文なし</span>}
                </div>
                {/* Clickable tags in view mode */}
                <Show when={blog().categoryTags.length > 0}>
                  <div class="mt-4 pt-4 border-t border-[#e8e8e8]">
                    <p class="text-xs text-[#999] mb-2">タグをクリックで詳細表示</p>
                    <div class="flex flex-wrap gap-2">
                      <For each={blog().categoryTags}>
                        {(tag) => (
                          <button
                            class="text-xs px-3 py-1.5 rounded-full bg-[#f5f0e8] text-[#b38247] border border-[#e8dfd0] hover:bg-[#ede5d8] transition-colors"
                            onClick={(e) => showPopover(e, tag)}
                          >
                            {tag.name.split(' ')[0]}
                          </button>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </Show>

              {/* Delete button */}
              <div class="pt-4 border-t border-[#f0f0f0] mt-auto">
                <button
                  class="text-xs text-red-400 hover:text-red-600 transition-colors"
                  onClick={() => deleteBlog(blog().id!)}
                >
                  🗑️ ごみ箱へ移動
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  )

  return (
    <div class="flex h-full overflow-hidden relative" onClick={() => setPopover(null)}>
      <Show when={!isMobile() || mobilePanel() === 'list'}>
        <BlogList />
      </Show>
      <Show when={!isMobile() || mobilePanel() === 'editor'}>
        <BlogEditor />
      </Show>

      {/* Tag picker bottom sheet */}
      <Show when={tagPickerOpen()}>
        <div
          class="fixed inset-0 z-60 bg-black/30"
          onClick={() => { setTagPickerOpen(false); setTagPickerSelected([]) }}
        />
        <div
          id="tagPickerPopup"
          class="fixed bottom-0 left-0 right-0 z-70 bg-white rounded-t-2xl shadow-2xl"
          style={{ 'max-height': '70vh', display: 'flex', 'flex-direction': 'column' }}
        >
          {/* Tabs */}
          <div class="flex border-b border-[#e8e8e8] shrink-0">
            {(['product', 'nutrient'] as const).map((tab) => (
              <button
                class="flex-1 py-3 text-sm font-semibold transition-colors"
                classList={{
                  'text-[#b38247] border-b-2 border-[#b38247]': tagPickerTab() === tab,
                  'text-[#999]': tagPickerTab() !== tab,
                }}
                onClick={() => setTagPickerTab(tab)}
              >
                {tab === 'product' ? '商品' : '成分'}
              </button>
            ))}
          </div>

          {/* Items */}
          <div class="flex-1 overflow-y-auto p-3">
            <For each={tagPickerTab() === 'product' ? PRODUCTS : NUTRIENTS}>
              {(item) => {
                const tag: Tag = { type: tagPickerTab(), name: item.name }
                const isSelected = () => tagPickerSelected().some((t) => t.name === item.name)
                const alreadyAdded = () =>
                  selected()?.categoryTags.some((t) => t.name === item.name) ?? false
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
                    <span class="text-lg">{tagPickerTab() === 'product' ? '💊' : '🧬'}</span>
                    <span class="text-sm text-[#37352f] leading-tight">{item.name}</span>
                    <Show when={isSelected()}>
                      <span class="ml-auto text-[#b38247] font-bold">✓</span>
                    </Show>
                    <Show when={alreadyAdded()}>
                      <span class="ml-auto text-xs text-[#999]">追加済み</span>
                    </Show>
                  </button>
                )
              }}
            </For>
          </div>

          {/* Confirm */}
          <div class="p-4 border-t border-[#e8e8e8] shrink-0">
            <button
              class="w-full py-3 rounded-xl bg-[#37352f] text-white font-semibold text-sm hover:opacity-80 transition-opacity"
              onClick={confirmTagPicker}
            >
              {tagPickerSelected().length > 0
                ? `${tagPickerSelected().length}件を追加`
                : '閉じる'}
            </button>
          </div>
        </div>
      </Show>

      {/* Cover picker modal */}
      <Show when={coverPickerOpen()}>
        <div
          class="fixed inset-0 z-60 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setCoverPickerOpen(false)}
        >
          <div
            class="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between px-5 py-4 border-b border-[#e8e8e8]">
              <span class="font-semibold text-[#37352f]">カバー画像を選択</span>
              <button onClick={() => setCoverPickerOpen(false)} class="text-[#999]">✕</button>
            </div>
            <div class="flex-1 overflow-y-auto p-4">
              <p class="text-xs text-[#999] mb-3 font-semibold uppercase tracking-wider">商品画像</p>
              <div class="grid grid-cols-3 gap-2 mb-4">
                <For each={PRODUCTS.filter((p) => p.image)}>
                  {(product) => (
                    <button
                      class="aspect-square rounded-lg overflow-hidden bg-[#e8dfd0] hover:ring-2 hover:ring-[#b38247]"
                      onClick={() => {
                        updateBlog({ cover: productImageUrl(product.image), coverType: 'product' })
                        setCoverPickerOpen(false)
                      }}
                    >
                      <img
                        src={productImageUrl(product.image)}
                        alt={product.name}
                        class="w-full h-full object-cover"
                      />
                    </button>
                  )}
                </For>
              </div>
              <p class="text-xs text-[#999] mb-3 font-semibold uppercase tracking-wider">端末から追加</p>
              <label class="flex items-center justify-center gap-2 border-2 border-dashed border-[#e8e8e8] rounded-xl py-6 cursor-pointer hover:border-[#b38247] transition-colors text-[#999] text-sm">
                📷 写真を選択
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      updateBlog({ cover: reader.result as string, coverType: 'upload' })
                      setCoverPickerOpen(false)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
              <Show when={selected()?.cover}>
                <button
                  class="w-full mt-3 py-2 text-sm text-red-400 hover:text-red-600"
                  onClick={() => { updateBlog({ cover: undefined, coverType: 'none' }); setCoverPickerOpen(false) }}
                >
                  カバー画像を削除
                </button>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* Detail popover */}
      <Show when={popover()}>
        {(p) => (
          <div
            class="fixed z-80 bg-white border border-[#e8e8e8] rounded-xl shadow-lg p-4 max-w-xs"
            style={{ left: `${Math.min(p().x, window.innerWidth - 320)}px`, top: `${p().y}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            <p class="text-xs font-semibold text-[#b38247] mb-1">{p().tag.name.split(' ')[0]}</p>
            <p class="text-xs text-[#555] leading-relaxed">{getTagDetail(p().tag)}</p>
          </div>
        )}
      </Show>
    </div>
  )
}

export default PageBlog
