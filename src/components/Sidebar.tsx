import { type Component, createSignal, onMount, onCleanup, For } from 'solid-js'
import { state, navigate } from '../store'
import type { Page } from '../types'

type NavItem = { page: Page; label: string; icon: string }

const PAGE_NAV: NavItem[] = [{ page: 'memo', label: 'メモ', icon: '📝' }]
const DB_NAV: NavItem[] = [
  { page: 'db01', label: 'DB01 商品一覧',  icon: '📦' },
  { page: 'db02', label: 'DB02 栄養素一覧', icon: '🌿' },
]
const NOTEBOOK_NAV: NavItem[] = [
  { page: 'blog',     label: 'ブログ記事',   icon: '📓' },
  { page: 'notebook', label: 'ノートブック', icon: '📚' },
]

const NavBtn: Component<{ item: NavItem }> = (props) => (
  <button
    class="nav-btn w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors"
    classList={{
      'bg-nacc-light font-medium text-nacc-dark': state.page === props.item.page,
      'text-[#555] hover:bg-[#f5f4f1]': state.page !== props.item.page,
    }}
    data-page={props.item.page}
    onClick={() => navigate(props.item.page)}
  >
    <span>{props.item.icon}</span>
    <span class="truncate">{props.item.label}</span>
  </button>
)

const SectionLabel: Component<{ label: string }> = (props) => (
  <div class="text-xs font-semibold text-[#aaa] px-2 py-1 mt-3">{props.label}</div>
)

const Sidebar: Component = () => {
  const [isDesktop, setIsDesktop] = createSignal(window.innerWidth >= 768)
  const onResize = () => setIsDesktop(window.innerWidth >= 768)
  onMount(() => window.addEventListener('resize', onResize))
  onCleanup(() => window.removeEventListener('resize', onResize))
  const visible = () => state.sidebarOpen || isDesktop()

  return (
    <aside
      id="sidebar"
      class="w-52 bg-white border-r border-nacc-border flex flex-col shrink-0 overflow-hidden"
      style={{ width: visible() ? undefined : '0px', opacity: visible() ? '1' : '0' }}
    >
      {/* Quick Memo */}
      <div class="p-3 border-b border-nacc-border">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 bg-nacc-gold text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          onClick={() => navigate('memo')}
        >
          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          クイックメモ
        </button>
      </div>

      {/* Nav */}
      <nav class="flex-1 overflow-y-auto p-2">
        <SectionLabel label="ページ" />
        <For each={PAGE_NAV}>{(item) => <NavBtn item={item} />}</For>

        <SectionLabel label="データベース" />
        <For each={DB_NAV}>{(item) => <NavBtn item={item} />}</For>

        <SectionLabel label="ノートブック" />
        <For each={NOTEBOOK_NAV}>{(item) => <NavBtn item={item} />}</For>
      </nav>

      {/* Trash */}
      <div class="px-2 py-2 border-t border-nacc-border">
        <button
          class="nav-btn w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-left transition-colors text-[#999] hover:bg-red-50 hover:text-red-500"
          classList={{ 'bg-red-50 text-red-500': state.page === 'trash' }}
          data-page="trash"
          onClick={() => navigate('trash')}
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>ごみ箱</span>
          {state.trashBlogs.length > 0 && (
            <span class="ml-auto text-xs bg-red-100 text-red-500 rounded-full px-1.5 py-0.5 font-medium min-w-5 text-center">
              {state.trashBlogs.length}
            </span>
          )}
        </button>
      </div>

      {/* User */}
      <div class="p-3 border-t border-nacc-border text-xs text-[#999]">
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-5 rounded-full bg-nacc-gold/20 flex items-center justify-center text-nacc-gold font-bold text-xs">
            N
          </div>
          <span>NACC管理者</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
