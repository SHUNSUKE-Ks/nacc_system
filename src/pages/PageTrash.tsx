import { type Component, For, Show } from 'solid-js'
import { state, restoreBlog, deleteBlogPermanent, emptyTrash } from '../store'

const PageTrash: Component = () => (
  <div class="flex flex-col h-full overflow-hidden">
    <div class="flex items-center justify-between px-6 py-4 border-b border-nacc-border shrink-0">
      <div>
        <h1 class="text-lg font-bold text-nacc-dark">ごみ箱</h1>
        <p class="text-xs text-[#999]">削除した記事は30日後に完全削除されます</p>
      </div>
      <Show when={state.trashBlogs.length > 0}>
        <button
          class="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          onClick={emptyTrash}
        >
          すべて完全削除
        </button>
      </Show>
    </div>

    <div class="flex-1 overflow-y-auto p-6">
      <Show
        when={state.trashBlogs.length > 0}
        fallback={
          <div class="flex flex-col items-center justify-center h-full text-[#ccc] gap-3">
            <span class="text-5xl">🗑️</span>
            <span class="text-sm">ごみ箱は空です</span>
          </div>
        }
      >
        <div class="max-w-2xl mx-auto flex flex-col gap-3">
          <For each={state.trashBlogs}>
            {(blog) => (
              <div class="bg-white border border-nacc-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-nacc-dark truncate">{blog.title || '無題'}</p>
                  <p class="text-xs text-[#999] mt-1">
                    削除日:{' '}
                    {blog.deletedAt
                      ? new Date(blog.deletedAt).toLocaleDateString('ja-JP')
                      : '不明'}
                  </p>
                  <div class="flex flex-wrap gap-1 mt-2">
                    <For each={blog.categoryTags.slice(0, 3)}>
                      {(t) => (
                        <span class="text-xs px-1.5 py-0.5 rounded bg-[#f5f0e8] text-nacc-gold">
                          {t.name.split(' ')[0]}
                        </span>
                      )}
                    </For>
                  </div>
                </div>
                <div class="flex flex-col gap-1.5 shrink-0">
                  <button
                    class="text-xs px-3 py-1.5 rounded-lg border border-nacc-border text-nacc-dark hover:bg-[#f9f8f6] transition-colors"
                    onClick={() => restoreBlog(blog.id!)}
                  >
                    復元
                  </button>
                  <button
                    class="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 transition-colors"
                    onClick={() => deleteBlogPermanent(blog.id!)}
                  >
                    完全削除
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  </div>
)

export default PageTrash
