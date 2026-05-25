import { type Component, For, Show } from 'solid-js'
import { state, setState, setFontSize, toggleDarkMode, toggleDb01Column, toggleDb02Column } from '../store'
import type { FontSize } from '../types'

const FONT_OPTIONS: { key: FontSize; label: string; desc: string }[] = [
  { key: 's',  label: '小',   desc: '13px' },
  { key: 'm',  label: '中',   desc: '16px' },
  { key: 'l',  label: '大',   desc: '19px' },
  { key: 'xl', label: '特大', desc: '22px' },
]

const Toggle: Component<{ checked: boolean; disabled?: boolean; onChange: () => void }> = (props) => (
  <button
    class="relative w-9 h-5 rounded-full transition-colors shrink-0"
    classList={{
      'bg-nacc-gold': props.checked,
      'bg-gray-200': !props.checked,
      'opacity-40 cursor-not-allowed': props.disabled,
    }}
    onClick={() => !props.disabled && props.onChange()}
    aria-disabled={props.disabled}
  >
    <span
      class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
      classList={{ 'translate-x-4': props.checked }}
    />
  </button>
)

const SettingsPanel: Component = () => {
  const isDb01 = () => state.page === 'db01'
  const isDb02 = () => state.page === 'db02'
  const showColumnSettings = () => isDb01() || isDb02()
  const dbLabel = () => isDb01() ? 'DB01 商品' : 'DB02 栄養素'
  const columns = () => isDb01() ? state.db01Columns : state.db02Columns
  const toggleCol = (id: string) => isDb01() ? toggleDb01Column(id) : toggleDb02Column(id)

  return (
    <>
      {/* Slide-in panel */}
      <aside
        id="settingsPanel"
        class="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-nacc-border shadow-xl z-40 flex flex-col desktop-right-panel"
        style={{ transform: state.settingsPanelOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div class="p-4 border-b border-nacc-border flex items-center justify-between shrink-0">
          <span class="font-semibold text-sm">⚙️ 設定</span>
          <button
            class="text-gray-400 hover:text-gray-600 text-xs"
            onClick={() => setState({ settingsPanelOpen: false })}
          >
            閉じる ✕
          </button>
        </div>

        <div class="flex-1 overflow-y-auto">
          {/* Font size */}
          <div class="p-4 border-b border-nacc-border">
            <div class="text-xs font-semibold text-gray-500 mb-3">🔤 文字サイズ</div>
            <div class="flex gap-2">
              <For each={FONT_OPTIONS}>
                {(opt) => (
                  <button
                    class="fs-btn"
                    classList={{ active: state.fontSize === opt.key }}
                    style={{ 'font-size': opt.key === 's' ? '11px' : opt.key === 'm' ? '13px' : opt.key === 'l' ? '15px' : '17px' }}
                    onClick={() => setFontSize(opt.key)}
                  >
                    {opt.label}
                    <br />
                    <span class="opacity-60" style={{ 'font-size': '9px' }}>A</span>
                  </button>
                )}
              </For>
            </div>
            <div class="mt-2 text-xs text-gray-400">
              現在のサイズ：{FONT_OPTIONS.find((f) => f.key === state.fontSize)?.desc}
            </div>
          </div>

          {/* Column visibility (DB pages only) */}
          <Show when={showColumnSettings()}>
            <div class="p-4 border-b border-nacc-border">
              <div class="text-xs font-semibold text-gray-500 mb-3">
                📊 表示カラム（{dbLabel()}）
              </div>
              <div class="flex flex-col gap-3">
                <For each={columns()}>
                  {(col) => (
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="text-sm text-nacc-dark">{col.label}</span>
                        {col.locked && (
                          <span class="ml-1.5 text-xs text-gray-400">（固定）</span>
                        )}
                      </div>
                      <Toggle
                        checked={col.visible}
                        disabled={col.locked}
                        onChange={() => toggleCol(col.id)}
                      />
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          {/* Database info */}
          <div class="p-4 border-b border-nacc-border">
            <div class="text-xs font-semibold text-gray-500 mb-3">🗄️ データベース</div>
            <div class="flex flex-col gap-2 text-sm">
              <div class="flex items-center justify-between">
                <span class="text-gray-600 text-xs">ストレージ</span>
                <span class="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  IndexedDB (Dexie.js)
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600 text-xs">オフライン</span>
                <span class="text-xs text-green-600">✓ 対応</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-gray-600 text-xs">クラウド同期</span>
                <span class="text-xs text-gray-400">— 未設定</span>
              </div>
              <button class="mt-1 w-full text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg py-1.5 hover:bg-blue-100 transition-colors">
                Supabase で同期を設定
              </button>
            </div>
          </div>

          {/* Dark mode */}
          <div class="p-4 border-b border-nacc-border">
            <div class="text-xs font-semibold text-gray-500 mb-3">🌙 ダークモード</div>
            <div class="flex items-center justify-between">
              <div>
                <span class="text-sm text-nacc-dark">
                  {state.darkMode ? '🌙 ダーク' : '☀️ ライト'}
                </span>
                <p class="text-xs text-gray-400 mt-0.5">
                  {state.darkMode ? '暗いテーマで表示中' : '明るいテーマで表示中'}
                </p>
              </div>
              <Toggle checked={state.darkMode} onChange={toggleDarkMode} />
            </div>
          </div>

          {/* Theme */}
          <div class="p-4">
            <div class="text-xs font-semibold text-gray-500 mb-3">🎨 テーマカラー</div>
            <div class="flex gap-2">
              <div class="w-8 h-8 rounded-full bg-nacc-gold cursor-pointer ring-2 ring-offset-2 ring-nacc-gold" />
              <div class="w-8 h-8 rounded-full bg-slate-700 cursor-pointer hover:ring-2 ring-offset-2 ring-slate-700" />
              <div class="w-8 h-8 rounded-full bg-emerald-600 cursor-pointer hover:ring-2 ring-offset-2 ring-emerald-600" />
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      <Show when={state.settingsPanelOpen}>
        <div
          class="fixed inset-0 z-30 md:hidden"
          onClick={() => setState({ settingsPanelOpen: false })}
        />
      </Show>
    </>
  )
}

export default SettingsPanel
