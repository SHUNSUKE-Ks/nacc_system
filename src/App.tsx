import { type Component, Show } from 'solid-js'
import { state, setState, setFontSize } from './store'
import { PRODUCTS } from './db/products'
import { NUTRIENTS } from './db/nutrients'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import PageDb01 from './pages/PageDb01'
import PageDb02 from './pages/PageDb02'
import PageBlog from './pages/PageBlog'
import PageMemo from './pages/PageMemo'
import PageTrash from './pages/PageTrash'
import PageNotebook from './pages/PageNotebook'
import SettingsPanel from './components/SettingsPanel'
import GalleryPanel from './components/GalleryPanel'

// Apply saved font size on boot
setFontSize(state.fontSize)

const App: Component = () => (
  <div class="flex flex-col h-dvh overflow-hidden">
    <Header />

    <div class="flex flex-1 overflow-hidden relative">
      {/* Sidebar backdrop (mobile) */}
      <div
        id="sidebarBackdrop"
        classList={{ show: state.sidebarOpen }}
        onClick={() => setState({ sidebarOpen: false })}
      />

      <Sidebar />

      <main class="flex-1 overflow-hidden relative">
        <Show when={state.page === 'db01'}>
          <PageDb01 products={PRODUCTS} />
        </Show>
        <Show when={state.page === 'db02'}>
          <PageDb02 nutrients={NUTRIENTS} />
        </Show>
        <Show when={state.page === 'blog'}>
          <PageBlog />
        </Show>
        <Show when={state.page === 'memo'}>
          <PageMemo />
        </Show>
        <Show when={state.page === 'trash'}>
          <PageTrash />
        </Show>
        <Show when={state.page === 'notebook'}>
          <PageNotebook />
        </Show>
      </main>

      <SettingsPanel />
      <GalleryPanel />
    </div>
  </div>
)

export default App
