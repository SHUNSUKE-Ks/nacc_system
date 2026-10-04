import { type Component, For, Show, createSignal, onMount } from 'solid-js'
import { state, setState } from '../store'

type GalleryAsset = {
  id: string
  name: string
  mimeType: string
  url: string
  builtIn?: boolean
  createdAt: string
}

const STORAGE_KEY = 'nacc_gallery_assets_v2'
const BUILTIN_ASSETS: GalleryAsset[] = [
  { id: 'nacc-cosmetics-2026-09-20', name: 'NACC コスメティック商品・成分資料 2026.09.20', mimeType: 'application/pdf', url: '/documents/nacc-cosmetics-2026-09-20.pdf', builtIn: true, createdAt: '2026-09-20T10:34:51+09:00' },
  { id: 'nacc-supplements-2026-09-20', name: 'NACC サプリメント商品・成分資料 2026.09.20', mimeType: 'application/pdf', url: '/documents/nacc-supplements-2026-09-20.pdf', builtIn: true, createdAt: '2026-09-20T10:35:54+09:00' },
]

function loadAssets(): GalleryAsset[] {
  try {
    const local = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as GalleryAsset[]
    return [...BUILTIN_ASSETS, ...local]
  } catch {
    return BUILTIN_ASSETS
  }
}

function saveLocalAssets(assets: GalleryAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets.filter((asset) => !asset.builtIn)))
}

const GalleryPanel: Component = () => {
  const [assets, setAssets] = createSignal<GalleryAsset[]>(BUILTIN_ASSETS)
  const [activeAsset, setActiveAsset] = createSignal<GalleryAsset | null>(null)
  let fileInput!: HTMLInputElement

  onMount(() => setAssets(loadAssets()))

  function handleUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const files = input.files
    if (!files) return
    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const next: GalleryAsset = { id: crypto.randomUUID(), name: file.name, mimeType: file.type || 'application/octet-stream', url: reader.result as string, createdAt: new Date().toISOString() }
        setAssets((previous) => {
          const updated = [...BUILTIN_ASSETS, next, ...previous.filter((asset) => !asset.builtIn)]
          saveLocalAssets(updated)
          return updated
        })
      }
      reader.readAsDataURL(file)
    })
    input.value = ''
  }

  function deleteAsset(id: string) {
    setAssets((previous) => {
      const updated = previous.filter((asset) => asset.id !== id || asset.builtIn)
      saveLocalAssets(updated)
      return updated
    })
  }

  return (
    <>
      <aside
        id="galleryPanel"
        class="w-80 shrink-0 border-l border-[#e8e8e8] bg-[#f7f6f3] flex flex-col overflow-hidden desktop-right-panel"
        style={{ transform: state.galleryPanelOpen ? 'translateX(0)' : 'translateX(100%)', position: state.galleryPanelOpen ? undefined : 'absolute', right: '0', top: '0', bottom: '0' }}
      >
        <header class="flex items-center justify-between px-4 py-3 border-b border-[#e8e8e8] bg-white">
          <div><span class="font-semibold text-sm text-[#37352f]">資料Gallery</span><small class="block text-[10px] text-[#999] mt-0.5">画像・PDF</small></div>
          <div class="flex items-center gap-1">
            <button class="text-xs px-2 py-1 rounded bg-[#b38247] text-white font-semibold hover:opacity-80" onClick={() => fileInput.click()}>+ 追加</button>
            <button class="p-1 rounded hover:bg-[#e8e8e8] text-[#999]" onClick={() => setState({ galleryPanelOpen: false })}>✕</button>
          </div>
        </header>

        <input ref={fileInput} type="file" accept="image/*,application/pdf" multiple class="hidden" onChange={handleUpload} />

        <div class="flex-1 overflow-y-auto p-3">
          <div class="flex flex-col gap-3">
            <For each={assets()}>
              {(asset) => (
                <article class="group overflow-hidden rounded-xl border border-[#e2ddd4] bg-white shadow-sm">
                  <button class="block w-full text-left" onClick={() => setActiveAsset(asset)}>
                    <div class="grid h-32 place-items-center overflow-hidden bg-linear-to-br from-[#eee4ce] to-[#faf7ef]">
                      <Show when={asset.mimeType === 'application/pdf'} fallback={<img src={asset.url} alt="" class="h-full w-full object-cover" />}>
                        <div class="text-center text-[#8b3343]"><span class="block text-3xl">▤</span><strong class="mt-1 block text-xs tracking-[.18em]">PDF</strong><small class="mt-1 block text-[9px] text-[#9a8264]">5 PAGES</small></div>
                      </Show>
                    </div>
                    <div class="p-3"><strong class="block text-xs leading-relaxed text-[#4b4035]">{asset.name}</strong><span class="mt-2 inline-block rounded-full bg-[#f3ead8] px-2 py-0.5 text-[9px] text-[#8c6a40]">{asset.builtIn ? '標準資料' : '追加資料'}</span></div>
                  </button>
                  <Show when={!asset.builtIn}>
                    <button class="mx-3 mb-3 text-[10px] text-red-400 opacity-0 transition-opacity group-hover:opacity-100" onClick={() => deleteAsset(asset.id)}>削除</button>
                  </Show>
                </article>
              )}
            </For>
          </div>
        </div>
      </aside>

      <Show when={activeAsset()}>
        {(asset) => (
          <div class="fixed inset-0 z-[100] flex flex-col bg-[#1f1d1a]">
            <header class="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-[#2b2824] px-4 text-white">
              <button class="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:bg-white/10" onClick={() => setActiveAsset(null)} aria-label="閉じる">×</button>
              <div class="min-w-0"><strong class="block truncate text-sm">{asset().name}</strong><small class="block text-[10px] text-white/50">全画面資料プレビュー</small></div>
              <a class="ml-auto rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/10" href={asset().url} target="_blank" rel="noreferrer">別画面で開く</a>
            </header>
            <Show when={asset().mimeType === 'application/pdf'} fallback={<div class="grid flex-1 place-items-center overflow-auto p-5"><img src={asset().url} alt={asset().name} class="max-h-full max-w-full object-contain" /></div>}>
              <iframe src={`${asset().url}#view=FitH`} title={asset().name} class="h-full w-full flex-1 border-0 bg-white" />
            </Show>
          </div>
        )}
      </Show>
    </>
  )
}

export default GalleryPanel
