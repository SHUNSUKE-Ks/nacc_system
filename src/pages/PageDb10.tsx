import { type Component, createMemo, createSignal, For, Show } from 'solid-js'
import { state, setState, addSymptom, updateSymptom, deleteSymptom } from '../store'

const PageDb10: Component = () => {
  const [search, setSearch] = createSignal('')
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [addOpen, setAddOpen] = createSignal(false)
  const [newName, setNewName] = createSignal('')
  const [newDesc, setNewDesc] = createSignal('')
  const [editDescId, setEditDescId] = createSignal<string | null>(null)
  const [editMemoId, setEditMemoId] = createSignal<string | null>(null)

  const visibleCols = () => state.db10Columns.filter((c) => c.visible)

  const selectedSymptom = createMemo(() =>
    state.symptoms.find((s) => s.id === selectedId()) ?? null
  )

  const filtered = createMemo(() => {
    const q = search().trim().toLowerCase()
    if (!q) return state.symptoms
    return state.symptoms.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
  })

  function handleAdd() {
    const name = newName().trim()
    if (!name) return
    addSymptom({ name, description: newDesc().trim(), productIds: [], memo: '' })
    setNewName('')
    setNewDesc('')
    setAddOpen(false)
  }

  function handleDelete(id: string) {
    deleteSymptom(id)
    if (selectedId() === id) setSelectedId(null)
  }

  return (
    <div class="flex flex-col h-full overflow-hidden">
      {/* Page header */}
      <div class="px-6 pt-4 pb-3 bg-nacc-light flex items-start justify-between shrink-0">
        <div>
          <h1 class="text-xl font-bold text-nacc-dark">DB10 — 症状/病名</h1>
          <div class="text-xs text-gray-500 mt-0.5">
            症状・病名データベース ·{' '}
            <span class="font-medium">{state.symptoms.length}件</span>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-nacc-border rounded-lg bg-white hover:bg-gray-50 transition-colors"
            onClick={() => setState({ settingsPanelOpen: true, galleryPanelOpen: false })}
          >
            ⚙ カラム設定
          </button>
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-nacc-dark text-white rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => setAddOpen(true)}
          >
            + 症状を追加
          </button>
        </div>
      </div>

      {/* Search */}
      <div class="px-6 py-2.5 border-b border-nacc-border bg-white shrink-0">
        <input
          type="search"
          placeholder="症状名を検索..."
          class="w-full max-w-sm px-3 py-1.5 text-xs rounded-lg border border-nacc-border bg-nacc-light outline-none focus:border-nacc-gold"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
        />
      </div>

      {/* Content: Table + Side panel */}
      <div class="flex flex-1 overflow-hidden">
        {/* Table */}
        <div class="flex-1 overflow-auto px-6 py-4">
          <div class="bg-white rounded-xl border border-nacc-border overflow-hidden">
            {/* Header */}
            <div class="flex border-b border-nacc-border bg-nacc-light sticky top-0 z-10">
              <For each={visibleCols()}>
                {(col) => (
                  <div class="notion-cell flex-1 px-3 py-2 text-xs font-semibold text-gray-500">
                    {col.label}
                  </div>
                )}
              </For>
              <div class="w-8 shrink-0" />
            </div>

            {/* Rows */}
            <Show
              when={filtered().length > 0}
              fallback={
                <div class="px-6 py-12 text-center text-xs text-gray-300 flex flex-col items-center gap-3">
                  <span class="text-4xl">🏥</span>
                  <span>症状・病名がまだありません</span>
                  <button
                    class="px-4 py-1.5 text-xs bg-nacc-dark text-white rounded-lg hover:opacity-90"
                    onClick={() => setAddOpen(true)}
                  >
                    + 症状を追加
                  </button>
                </div>
              }
            >
              <For each={filtered()}>
                {(symptom) => {
                  const relatedProducts = createMemo(() =>
                    state.products.filter((p) => p.symptoms.includes(symptom.name))
                  )

                  return (
                    <div
                      class="notion-row flex border-b border-nacc-border last:border-none cursor-pointer transition-colors"
                      classList={{
                        'bg-[#f5f0e8]':    selectedId() === symptom.id,
                        'hover:bg-[#fafafa]': selectedId() !== symptom.id,
                      }}
                      onClick={() => setSelectedId(symptom.id === selectedId() ? null : symptom.id)}
                    >
                      <For each={visibleCols()}>
                        {(col) => {
                          switch (col.id) {
                            case 'name':
                              return (
                                <div class="notion-cell flex-1 px-3 py-2.5 text-xs font-semibold text-red-600">
                                  {symptom.name}
                                </div>
                              )
                            case 'description':
                              return (
                                <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">
                                  {symptom.description
                                    ? symptom.description.slice(0, 80) + (symptom.description.length > 80 ? '…' : '')
                                    : <span class="text-gray-300">—</span>
                                  }
                                </div>
                              )
                            case 'products':
                              return (
                                <div class="notion-cell flex-1 px-3 py-2.5">
                                  <div class="flex flex-wrap gap-1">
                                    <For each={relatedProducts().slice(0, 2)}>
                                      {(p) => (
                                        <span class="text-xs bg-red-50 text-red-600 rounded px-1.5 py-0.5">
                                          {p.name}
                                        </span>
                                      )}
                                    </For>
                                    <Show when={relatedProducts().length > 2}>
                                      <span class="text-xs text-gray-400">+{relatedProducts().length - 2}</span>
                                    </Show>
                                    <Show when={relatedProducts().length === 0}>
                                      <span class="text-xs text-gray-300">—</span>
                                    </Show>
                                  </div>
                                </div>
                              )
                            case 'memo':
                              return (
                                <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-500 italic">
                                  {symptom.memo || '—'}
                                </div>
                              )
                            default:
                              return <div class="notion-cell flex-1 px-3 py-2.5 text-xs text-gray-400">—</div>
                          }
                        }}
                      </For>
                      <div class="w-8 shrink-0" />
                    </div>
                  )
                }}
              </For>
            </Show>

            <button
              class="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors border-t border-dashed border-nacc-border"
              onClick={() => setAddOpen(true)}
            >
              <span>+</span> 新しい症状を追加
            </button>
          </div>
        </div>

        {/* Side detail panel */}
        <Show when={selectedSymptom()}>
          {(symptom) => {
            const relatedProducts = createMemo(() =>
              state.products.filter((p) => p.symptoms.includes(symptom().name))
            )

            return (
              <div class="w-80 shrink-0 border-l border-nacc-border bg-nacc-light overflow-y-auto flex flex-col">
                {/* Panel header */}
                <div class="flex items-center justify-between px-4 py-3 border-b border-nacc-border bg-white shrink-0">
                  <h2 class="text-sm font-bold text-red-600 truncate flex-1">{symptom().name}</h2>
                  <div class="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      class="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      onClick={() => handleDelete(symptom().id)}
                    >
                      削除
                    </button>
                    <button
                      class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs"
                      onClick={() => setSelectedId(null)}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {/* Description */}
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">説明</h3>
                      <button
                        class="text-xs text-nacc-gold hover:underline"
                        onClick={() => setEditDescId(editDescId() === symptom().id ? null : symptom().id)}
                      >
                        {editDescId() === symptom().id ? '完了' : '編集'}
                      </button>
                    </div>
                    <Show
                      when={editDescId() === symptom().id}
                      fallback={
                        <p class="text-xs text-nacc-dark leading-relaxed bg-white rounded-lg border border-nacc-border p-3 min-h-12">
                          {symptom().description || <span class="text-gray-300">説明なし</span>}
                        </p>
                      }
                    >
                      <textarea
                        class="w-full text-xs text-nacc-dark border border-nacc-gold rounded-lg p-3 resize-none outline-none leading-relaxed bg-white"
                        rows={4}
                        value={symptom().description}
                        onInput={(e) => updateSymptom(symptom().id, { description: e.currentTarget.value })}
                        ref={(el) => el && setTimeout(() => el.focus(), 0)}
                      />
                    </Show>
                  </div>

                  {/* Related products */}
                  <div>
                    <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      関連商品 <span class="normal-case font-normal text-gray-300">({relatedProducts().length}件)</span>
                    </h3>
                    <Show
                      when={relatedProducts().length > 0}
                      fallback={
                        <p class="text-xs text-gray-300 bg-white rounded-lg border border-nacc-border p-3">
                          関連商品なし（商品DB01の症状欄に「{symptom().name}」を追加してください）
                        </p>
                      }
                    >
                      <div class="flex flex-col gap-1.5">
                        <For each={relatedProducts()}>
                          {(p) => (
                            <div class="flex items-center gap-2 bg-white rounded-lg border border-nacc-border px-3 py-2">
                              <span class="text-xs">{p.category === 'cosmetic' ? '🌸' : '💊'}</span>
                              <span class="text-xs text-nacc-dark font-medium leading-tight flex-1 min-w-0 truncate">
                                {p.name}
                              </span>
                              <span class="text-xs text-gray-400 shrink-0">{p.id}</span>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>

                  {/* Memo */}
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">メモ</h3>
                      <button
                        class="text-xs text-nacc-gold hover:underline"
                        onClick={() => setEditMemoId(editMemoId() === symptom().id ? null : symptom().id)}
                      >
                        {editMemoId() === symptom().id ? '完了' : '編集'}
                      </button>
                    </div>
                    <Show
                      when={editMemoId() === symptom().id}
                      fallback={
                        <p class="text-xs text-gray-600 italic bg-white rounded-lg border border-nacc-border p-3 min-h-10">
                          {symptom().memo || <span class="text-gray-300">—</span>}
                        </p>
                      }
                    >
                      <textarea
                        class="w-full text-xs text-gray-600 border border-nacc-gold rounded-lg p-3 resize-none outline-none leading-relaxed bg-white"
                        rows={3}
                        value={symptom().memo}
                        onInput={(e) => updateSymptom(symptom().id, { memo: e.currentTarget.value })}
                        ref={(el) => el && setTimeout(() => el.focus(), 0)}
                      />
                    </Show>
                  </div>
                </div>
              </div>
            )
          }}
        </Show>
      </div>

      {/* Add symptom modal */}
      <Show when={addOpen()}>
        <div
          class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
          onClick={() => setAddOpen(false)}
        >
          <div
            class="bg-white rounded-2xl shadow-2xl p-6 w-96 slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 class="text-base font-bold text-nacc-dark mb-4">症状・病名を追加</h2>
            <div class="mb-3">
              <label class="text-xs font-semibold text-gray-500 mb-1.5 block">症状/病名 *</label>
              <input
                type="text"
                class="w-full text-sm border border-nacc-border rounded-lg px-3 py-2 outline-none focus:border-nacc-gold"
                placeholder="例: 高血圧、不眠症、肌荒れ..."
                value={newName()}
                onInput={(e) => setNewName(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                ref={(el) => el && setTimeout(() => el.focus(), 0)}
              />
            </div>
            <div class="mb-5">
              <label class="text-xs font-semibold text-gray-500 mb-1.5 block">説明（任意）</label>
              <textarea
                class="w-full text-sm border border-nacc-border rounded-lg px-3 py-2 outline-none focus:border-nacc-gold resize-none"
                placeholder="症状の説明や補足..."
                rows={3}
                value={newDesc()}
                onInput={(e) => setNewDesc(e.currentTarget.value)}
              />
            </div>
            <div class="flex justify-end gap-2">
              <button
                class="px-4 py-2 text-xs text-gray-500 border border-nacc-border rounded-lg hover:bg-gray-50"
                onClick={() => { setAddOpen(false); setNewName(''); setNewDesc('') }}
              >
                キャンセル
              </button>
              <button
                class="px-4 py-2 text-xs bg-nacc-dark text-white rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
                disabled={!newName().trim()}
                onClick={handleAdd}
              >
                追加
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default PageDb10
