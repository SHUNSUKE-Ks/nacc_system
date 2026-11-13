import { type Component, For, type JSX, Show, createSignal } from 'solid-js'
import { state, setState, navigate, openNotebook, memoCount, createNotebook, updateNotebook } from '../store'
import { openLeafletGallery } from '../pages/leaflet/store'
import type { Notebook } from '../types'
import QuickMemo from './QuickMemo'
import HelpButton, { HELP_SIDEBAR } from './HelpButton'

// ── アイコン（線画。色は文字色に合わせる） ─────────────────────────────────
const Icon: Component<{ d: string; extra?: JSX.Element }> = (props) => (
  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
    <path d={props.d} />
    {props.extra}
  </svg>
)
const ICONS = {
  products: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9',
  photos: 'M4 5h16v14H4zM4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18',
  catalog: 'M9 5h11M9 12h11M9 19h11M3.5 5.5l1.5 1.5 2.5-3M3.5 12.5l1.5 1.5 2.5-3M4 19h2',
  survey: 'M9 4h6v3H9zM7 5.5H5V21h14V5.5h-2M8.5 12l1.5 1.5 3-3M8.5 17h7',
  leaflet: 'M4 5.5 9 4l6 2 5-1.5v14L15 20l-6-2-5 1.5zM9 4v14M15 6v14',
  docs: 'M6 2h8l4 4v16H6zM14 2v5h5M9 13h6M9 17h4',
  fax: 'M7 9V3h10v6M6 18H4V9h16v9h-2M7 14h10v7H7zM16.5 12h.01',
  notebook: 'M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM6 3v18M9.5 8h6M9.5 12h6',
  allMemos: 'M5 4h10l4 4v12H5zM15 4v4h4M8.5 12.5h7M8.5 16h4.5',
  loose: 'M4 7h16M4 12h16M4 17h10',
  trash: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
}

type NavItem = { id: string; label: string; icon: string; active: () => boolean; onClick: () => void }

// 上から: 商品・写真・カタログ・アンケート・リーフレット・資料PDF（DB02/03/10 は一時非表示）
const MAIN_NAV: NavItem[] = [
  { id: 'db01', label: '商品一覧', icon: ICONS.products, active: () => state.page === 'db01', onClick: () => navigate('db01') },
  { id: 'photos', label: '写真', icon: ICONS.photos, active: () => state.page === 'photos', onClick: () => navigate('photos') },
  { id: 'catalog', label: 'カタログ', icon: ICONS.catalog, active: () => state.page === 'catalog', onClick: () => navigate('catalog') },
  { id: 'survey', label: 'アンケート', icon: ICONS.survey, active: () => state.page === 'survey', onClick: () => navigate('survey') },
  { id: 'leaflet', label: 'リーフレット', icon: ICONS.leaflet, active: () => state.page === 'leaflet', onClick: () => { setState({ sidebarOpen: false }); openLeafletGallery() } },
  { id: 'docs', label: '資料PDF', icon: ICONS.docs, active: () => state.galleryPanelOpen, onClick: () => setState({ galleryPanelOpen: !state.galleryPanelOpen, settingsPanelOpen: false, sidebarOpen: false }) },
  { id: 'fax', label: '本社へ FAX', icon: ICONS.fax, active: () => state.page === 'fax', onClick: () => navigate('fax') },
]

const NavBtn: Component<{ item: NavItem; count?: number; indent?: boolean }> = (props) => (
  <button
    class="nav-btn w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
    classList={{
      'bg-nacc-light font-medium text-nacc-dark': props.item.active(),
      'text-[#555] hover:bg-[#f5f4f1]': !props.item.active(),
      'pl-7': props.indent,
    }}
    data-page={props.item.id}
    aria-current={props.item.active() ? 'page' : undefined}
    onClick={props.item.onClick}
  >
    <Icon d={props.item.icon} />
    <span class="truncate">{props.item.label}</span>
    <Show when={props.count !== undefined}>
      <span class="ml-auto text-xs text-[#aaa] tabular-nums">{props.count}</span>
    </Show>
  </button>
)

const SectionLabel: Component<{ label: string; children?: JSX.Element }> = (props) => (
  <div class="flex items-center text-xs font-semibold text-[#aaa] px-2 py-1 mt-3">
    <span>{props.label}</span>
    {props.children}
  </div>
)

/** ノートブック名の入力欄（作成・名前変更で使う）。Enterで確定、Escでやめる */
const NameInput: Component<{ value?: string; placeholder: string; onDone: (name: string | null) => void }> = (props) => {
  // Enterで確定したあと、欄が消えるときの blur でもう一度呼ばれないようにする
  let done = false
  const finish = (name: string | null) => { if (!done) { done = true; props.onDone(name) } }
  return (
    <input
      ref={(el) => queueMicrotask(() => { el.focus(); el.select() })}
      class="w-full text-sm px-2 py-1 rounded-md border border-nacc-gold/60 outline-none bg-white"
      value={props.value ?? ''}
      placeholder={props.placeholder}
      aria-label={props.placeholder}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(e.currentTarget.value.trim() || null)
        if (e.key === 'Escape') finish(null)
      }}
      onBlur={(e) => finish(e.currentTarget.value.trim() || null)}
    />
  )
}

const Sidebar: Component = () => {
  /** 名前を入れている欄: 新規（親ID or 'top'）／名前変更（ノートブックID） */
  const [creatingIn, setCreatingIn] = createSignal<string | null>(null)
  const [renaming, setRenaming] = createSignal<string | null>(null)
  const [collapsed, setCollapsed] = createSignal<Record<string, boolean>>({})

  const tops = () => state.notebooks.filter((n) => !n.parentId).slice().sort((a, b) => a.title.localeCompare(b.title, 'ja'))
  const children = (id: string) => state.notebooks.filter((n) => n.parentId === id).slice().sort((a, b) => a.title.localeCompare(b.title, 'ja'))
  const looseCount = () => state.memos.filter((m) => !m.notebookId || !state.notebooks.some((n) => n.id === m.notebookId)).length
  const isMemoView = (id: string) => state.page === 'memo' && state.memoNotebookId === id
  const trashCount = () => state.trashBlogs.length + state.trashMemos.length

  async function finishCreate(name: string | null) {
    const parent = creatingIn()
    setCreatingIn(null)
    if (!name || !parent) return
    const id = await createNotebook(name, parent === 'top' ? undefined : parent)
    if (parent !== 'top') setCollapsed((prev) => ({ ...prev, [parent]: false }))
    openNotebook(id)
  }

  function finishRename(nb: Notebook, name: string | null) {
    setRenaming(null)
    if (name && name !== nb.title) updateNotebook(nb.id!, { title: name, updatedAt: new Date() })
  }

  const BookRow: Component<{ nb: Notebook; child?: boolean }> = (props) => {
    const id = () => props.nb.id!
    const hasChildren = () => children(id()).length > 0
    const open = () => !collapsed()[id()]
    return (
      <div class="group relative flex items-center" classList={{ 'pl-4': props.child }}>
        <Show when={!props.child}>
          <button
            type="button"
            class="w-5 h-6 grid place-items-center text-[#bbb] hover:text-[#777] shrink-0"
            classList={{ invisible: !hasChildren() }}
            aria-label={open() ? `${props.nb.title}をたたむ` : `${props.nb.title}を開く`}
            aria-expanded={open()}
            onClick={() => setCollapsed((prev) => ({ ...prev, [id()]: open() }))}
          >
            <svg class="w-3 h-3 transition-transform" classList={{ 'rotate-90': open() }} fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.chevron} /></svg>
          </button>
        </Show>
        <Show when={renaming() === id()} fallback={
          <button
            class="nav-btn flex-1 min-w-0 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
            classList={{
              'bg-nacc-light font-medium text-nacc-dark': isMemoView(id()),
              'text-[#555] hover:bg-[#f5f4f1]': !isMemoView(id()),
            }}
            aria-current={isMemoView(id()) ? 'page' : undefined}
            title="押すと開く／ダブルクリックで名前を変える"
            onClick={() => openNotebook(id())}
            onDblClick={() => setRenaming(id())}
          >
            <span class="w-6 h-6 rounded-md grid place-items-center shrink-0 text-white" classList={{ 'bg-nacc-gold': !props.child, 'bg-[#d9a5a5]': props.child }}>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS.notebook} /></svg>
            </span>
            <span class="truncate">{props.nb.title}</span>
            <span class="ml-auto text-xs text-[#aaa] tabular-nums">{memoCount(id())}</span>
          </button>
        }>
          <div class="flex-1 px-1"><NameInput value={props.nb.title} placeholder="ノートブック名" onDone={(name) => finishRename(props.nb, name)} /></div>
        </Show>
        <Show when={!props.child && renaming() !== id()}>
          <button
            type="button"
            class="absolute right-7 w-6 h-6 grid place-items-center rounded text-[#aaa] hover:text-nacc-gold hover:bg-white opacity-0 group-hover:opacity-100 focus:opacity-100"
            aria-label={`${props.nb.title}の中にノートブックを作る`}
            title="この中にノートブックを作る"
            onClick={() => setCreatingIn(id())}
          >
            <Icon d={ICONS.plus} />
          </button>
        </Show>
      </div>
    )
  }

  return (
    <aside
      id="sidebar"
      class="w-52 bg-white border-r border-nacc-border flex flex-col shrink-0 overflow-hidden"
      classList={{ 'sidebar-open': state.sidebarOpen }}
      aria-label="メニュー"
    >
      {/* クイックメモ ＋ 使い方 */}
      <div class="p-3 border-b border-nacc-border flex items-center gap-2">
        <QuickMemo variant="sidebar" />
        <HelpButton title="メニュー" items={HELP_SIDEBAR} viewport />
      </div>

      <nav class="flex-1 overflow-y-auto p-2" aria-label="ページ">
        <For each={MAIN_NAV}>{(item) => <NavBtn item={item} />}</For>

        <SectionLabel label="ノートブック">
          <button
            type="button"
            class="ml-auto w-6 h-6 grid place-items-center rounded text-[#999] hover:text-nacc-gold hover:bg-[#f5f4f1]"
            aria-label="新しいノートブックを作る"
            title="新しいノートブックを作る"
            onClick={() => setCreatingIn('top')}
          >
            <Icon d={ICONS.plus} />
          </button>
        </SectionLabel>
        <NavBtn item={{ id: 'memo-all', label: 'すべてのメモ', icon: ICONS.allMemos, active: () => isMemoView('all'), onClick: () => openNotebook('all') }} count={state.memos.length} />
        <NavBtn item={{ id: 'memo-none', label: '未分類', icon: ICONS.loose, active: () => isMemoView('none'), onClick: () => openNotebook('none') }} count={looseCount()} />
        <Show when={creatingIn() === 'top'}>
          <div class="px-1 py-1"><NameInput placeholder="新しいノートブック名" onDone={finishCreate} /></div>
        </Show>
        <For each={tops()}>
          {(nb) => (
            <>
              <BookRow nb={nb} />
              <Show when={!collapsed()[nb.id!]}>
                <For each={children(nb.id!)}>{(child) => <BookRow nb={child} child />}</For>
              </Show>
              <Show when={creatingIn() === nb.id}>
                <div class="pl-9 pr-1 py-1"><NameInput placeholder={`「${nb.title}」の中に作る`} onDone={finishCreate} /></div>
              </Show>
            </>
          )}
        </For>
      </nav>

      {/* ごみ箱 */}
      <div class="px-2 py-2 border-t border-nacc-border">
        <button
          class="nav-btn w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors text-[#999] hover:bg-red-50 hover:text-red-500"
          classList={{ 'bg-red-50 text-red-500': state.page === 'trash' }}
          data-page="trash"
          aria-current={state.page === 'trash' ? 'page' : undefined}
          onClick={() => navigate('trash')}
        >
          <Icon d={ICONS.trash} />
          <span>ごみ箱</span>
          <Show when={trashCount() > 0}>
            <span class="ml-auto text-xs bg-red-100 text-red-500 rounded-full px-1.5 py-0.5 font-medium min-w-5 text-center">
              {trashCount()}
            </span>
          </Show>
        </button>
      </div>

      {/* User */}
      <div class="p-3 border-t border-nacc-border text-xs text-[#999]">
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-5 rounded-full bg-nacc-gold/20 flex items-center justify-center text-nacc-gold font-bold text-xs" aria-hidden="true">
            N
          </div>
          <span>NACC管理者</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
