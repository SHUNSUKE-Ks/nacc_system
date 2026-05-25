import { type Component, Show, createSignal } from 'solid-js'
import { state, setState, navigate } from '../store'
import type { Page } from '../types'

const PAGE_LABELS: Record<Page, string> = {
  memo:     '📝 メモ',
  db01:     '📦 DB01 商品一覧',
  db02:     '🌿 DB02 栄養素一覧',
  blog:     '📓 ブログ',
  notebook: '📚 ノートブック',
  trash:    '🗑️ ごみ箱',
  gallery:  '🖼 ギャラリー',
}

const Header: Component = () => {
  const [viewMenuOpen, setViewMenuOpen] = createSignal(false)
  const isDbPage = () => state.page === 'db01' || state.page === 'db02'

  function closeViewMenu() { setViewMenuOpen(false) }

  return (
    <header class="h-12 bg-white border-b border-nacc-border flex items-center px-3 gap-2 shrink-0 z-50 relative">

      {/* Hamburger */}
      <button
        class="p-1.5 rounded hover:bg-gray-100 text-gray-500 shrink-0"
        onClick={() => setState({ sidebarOpen: !state.sidebarOpen })}
        aria-label="メニュー"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo + DB View dropdown (DB pages only) */}
      <div class="relative">
        <button
          class="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          onClick={() => isDbPage() ? setViewMenuOpen((v) => !v) : null}
        >
          <span class="font-bold text-sm tracking-tight">
            NACC<span class="text-nacc-gold">sup</span>
          </span>
          <Show when={isDbPage()}>
            <svg
              class="w-3 h-3 text-gray-400 transition-transform"
              classList={{ 'rotate-180': viewMenuOpen() }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </Show>
        </button>

        <Show when={viewMenuOpen() && isDbPage()}>
          <div
            class="absolute left-0 top-10 bg-white border border-nacc-border rounded-xl shadow-lg w-52 overflow-hidden z-50"
            onClick={closeViewMenu}
          >
            <div class="px-3 py-2 text-xs text-gray-400 font-medium border-b border-nacc-border">
              表示形式を選択
            </div>
            <div class="p-1.5 flex flex-col gap-0.5">
              <button
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left w-full transition-colors"
                onClick={() => setState({ dbView: 'table' })}
              >
                <span>≡</span>
                <div>
                  <div class="font-medium">テーブル</div>
                  <div class="text-xs text-gray-400">Notion風・ライン表示</div>
                </div>
                <Show when={state.dbView === 'table'}>
                  <span class="ml-auto text-nacc-gold text-xs">✓</span>
                </Show>
              </button>
              <button
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 text-left w-full transition-colors"
                onClick={() => setState({ dbView: 'detail' })}
              >
                <span>🗂</span>
                <div>
                  <div class="font-medium">詳細View</div>
                  <div class="text-xs text-gray-400">カード・詳細パネル表示</div>
                </div>
                <Show when={state.dbView === 'detail'}>
                  <span class="ml-auto text-nacc-gold text-xs">✓</span>
                </Show>
              </button>
            </div>
          </div>
          <div class="fixed inset-0 z-40" onClick={closeViewMenu} />
        </Show>
      </div>

      {/* Gallery button — ロゴ直後、ブレッドクラム前 */}
      <button
        class="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all shrink-0"
        classList={{
          'bg-violet-50 text-violet-600': state.page === 'gallery',
          'text-gray-400 hover:bg-gray-100 hover:text-gray-600': state.page !== 'gallery',
        }}
        onClick={() => navigate('gallery')}
        title="Gallery"
      >
        <div class="w-5 h-5 rounded-md bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center shrink-0">
          <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <span class="text-xs font-semibold hidden sm:inline">Gallery</span>
      </button>

      {/* Breadcrumb */}
      <div class="flex items-center gap-1 text-xs text-gray-400 ml-1">
        <span>{PAGE_LABELS[state.page]}</span>
      </div>

      {/* Blog mode toggle (center, blog only) */}
      <Show when={state.page === 'blog'}>
        <div class="ml-2">
          <div class="mode-pill">
            <button
              classList={{ active: state.blogMode === 'memo' }}
              onClick={() => setState({ blogMode: 'memo' })}
            >
              📝 メモ
            </button>
            <button
              classList={{ active: state.blogMode === 'view' }}
              onClick={() => setState({ blogMode: 'view' })}
            >
              👁 View
            </button>
          </div>
        </div>
      </Show>

      {/* Right: search (desktop) + gallery + settings */}
      <div class="ml-auto flex items-center gap-1.5">
        <div class="hidden sm:flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 w-36">
          <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="検索..." class="bg-transparent outline-none w-full text-gray-600 text-xs" />
        </div>

        <button
          class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          onClick={() => setState({ galleryPanelOpen: !state.galleryPanelOpen, settingsPanelOpen: false })}
          title="フォトギャラリー"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>

        <button
          class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          onClick={() => setState({ settingsPanelOpen: !state.settingsPanelOpen, galleryPanelOpen: false })}
          title="設定"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default Header
