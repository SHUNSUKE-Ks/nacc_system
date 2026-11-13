import { type Component, Show, onMount } from 'solid-js'
import { state, setState, setFontSize, initFirestore } from './store'
import { watchAuth } from './db/firebase'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import PageDb01 from './pages/PageDb01'
import PageDb02 from './pages/PageDb02'
import PageDb03 from './pages/PageDb03'
import PageDb10 from './pages/PageDb10'
import PageBlog from './pages/PageBlog'
import PageMemo from './pages/PageMemo'
import PageTrash from './pages/PageTrash'
import PageNotebook from './pages/PageNotebook'
import PagePhotos from './pages/PagePhotos'
import PageSurvey from './pages/survey'
import PageFax from './pages/fax'
import SettingsPanel from './components/SettingsPanel'
import GalleryPanel from './components/GalleryPanel'
import GalleryPage from './pages/gallery'
import LeafletPage from './pages/leaflet'
import CatalogCheckPage from './pages/catalog'

setFontSize(state.fontSize)

const App: Component = () => {
  onMount(() => {
    initFirestore()
    // Googleログインしたら、その権限で Firestore を読み直す
    watchAuth((user) => {
      setState({ cloudUser: user ? { email: user.email ?? '', name: user.displayName ?? '' } : null })
      if (user) initFirestore()
    })
  })
  return (
    <Show when={state.page === 'gallery'} fallback={
      <Show when={state.page === 'leaflet'} fallback={
        <Show when={state.page === 'catalog'} fallback={<MainApp />}>
          <CatalogCheckPage />
        </Show>
      }>
        <LeafletPage />
      </Show>
    }>
      <GalleryPage />
    </Show>
  )
}

const MainApp: Component = () => (
  <div class="flex flex-col h-dvh overflow-hidden">
    <Header />
    <div class="flex flex-1 overflow-hidden relative">
      <div
        id="sidebarBackdrop"
        classList={{ show: state.sidebarOpen }}
        onClick={() => setState({ sidebarOpen: false })}
      />
      <Sidebar />
      <main class="flex-1 overflow-hidden relative">
        <Show when={state.page === 'db01'}>
          <PageDb01 products={state.products} />
        </Show>
        <Show when={state.page === 'db02'}>
          <PageDb02 nutrients={state.nutrients} />
        </Show>
        <Show when={state.page === 'db03'}>
          <PageDb03 />
        </Show>
        <Show when={state.page === 'db10'}>
          <PageDb10 />
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
        {/* 旧ブログ・旧ノートブック画面はメニューから外した（メモへ統合）。直接開いたときのために残す */}
        <Show when={state.page === 'notebook'}>
          <PageNotebook />
        </Show>
        <Show when={state.page === 'photos'}>
          <PagePhotos />
        </Show>
        <Show when={state.page === 'survey'}>
          <PageSurvey />
        </Show>
        <Show when={state.page === 'fax'}>
          <PageFax />
        </Show>
      </main>
      <SettingsPanel />
      <GalleryPanel />
    </div>
  </div>
)

export default App
