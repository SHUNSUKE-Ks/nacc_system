import { type Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js'
import { setState, state } from '../../store'
import type { Product } from '../../types'
import LeafletEditor from './LeafletEditor'
import LeafletLayout from './LeafletLayout'
import { defaultImageFor } from './photos'
import HelpButton, { HELP_LEAFLET_GALLERY } from '../../components/HelpButton'
import {
  type Leaflet,
  createLeaflet, deleteLeaflet, duplicateLeaflet, leaflets, leafletView, setLeafletView,
} from './store'
import { categoryLabel, formatDate, LeafletVisual, OriginalSafeNote, originalNutrients, PhotoGallery, statusLabel, Toast } from './shared'
import './leaflet.css'
import './leaflet-layout.css'
import './leaflet-v3.css'
import './leaflet-v5.css'
import './leaflet-v6.css'
import './leaflet-v7.css'

// NAVIなしの全画面ページ。原本（商品ノート）とは別の書類ステートとして扱う。
const LeafletPage: Component = () => {
  const product = () => state.products.find((item) => item.id === state.selectedProductId) ?? null
  const current = () => {
    const view = leafletView()
    return view.view === 'gallery' ? null : leaflets.find((leaflet) => leaflet.id === view.id) ?? null
  }

  const openOriginal = () => {
    setLeafletView({ view: 'gallery' })
    setState({ page: 'db01', dbView: 'detail' })
  }

  return (
    <div class="lf-page">
      <Show when={product()} fallback={
        <div class="lf-empty-page">
          <p>商品が選択されていません。</p>
          <button onClick={() => setState({ page: 'db01', dbView: 'gallery' })}>商品Galleryへ戻る</button>
        </div>
      }>
        {(p) => (
          <Switch>
            <Match when={leafletView().view === 'edit' && current()}>
              {(leaflet) => <LeafletEditor leaflet={leaflet()} product={p()} />}
            </Match>
            <Match when={leafletView().view === 'layout' && current()}>
              {(leaflet) => <LeafletLayout leaflet={leaflet()} product={p()} />}
            </Match>
            <Match when={true}>
              <LeafletGallery product={p()} onOpenOriginal={openOriginal} />
            </Match>
          </Switch>
        )}
      </Show>
      <Toast />
    </div>
  )
}

// ── LEAFLET_GALLERY ─────────────────────────────────────────────────────────
const LeafletGallery: Component<{ product: Product; onOpenOriginal: () => void }> = (props) => {
  const [tab, setTab] = createSignal<'docs' | 'photos'>('docs')
  const list = createMemo(() =>
    leaflets
      .filter((leaflet) => leaflet.productId === props.product.id)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  )

  const create = () => {
    const id = createLeaflet(props.product, originalNutrients(props.product).map((nutrient) => nutrient.id), defaultImageFor(props.product))
    setLeafletView({ view: 'edit', id })
  }

  const duplicate = (id: string) => {
    const copyId = duplicateLeaflet(id)
    if (copyId) setLeafletView({ view: 'edit', id: copyId })
  }

  const remove = (leaflet: Leaflet) => {
    if (confirm(`「${leaflet.name}」を削除しますか？（原本は残ります）`)) deleteLeaflet(leaflet.id)
  }

  return (
    <div class="lf-gallery" data-state="LEAFLET_GALLERY">
      <div class="lf-topbar">
        <button class="lf-back" onClick={props.onOpenOriginal}>← 商品ノート（原本）</button>
        <OriginalSafeNote />
        <HelpButton title="リーフレットGallery" items={HELP_LEAFLET_GALLERY} />
      </div>

      <header class="lf-gallery-head">
        <p class="lf-kicker">NACC · LEAFLET GALLERY</p>
        <h1>原本を壊さず、渡す資料をつくる。</h1>
        <p>商品ノートを複製して、相手ごとに掲載カード・並び順・コメント・Topic を編集します。</p>
      </header>

      <div class="lf-gallery-tabs" role="tablist">
        <button role="tab" aria-selected={tab() === 'docs'} classList={{ 'is-active': tab() === 'docs' }} onClick={() => setTab('docs')}>資料ギャラリー</button>
        <button role="tab" aria-selected={tab() === 'photos'} classList={{ 'is-active': tab() === 'photos' }} onClick={() => setTab('photos')}>写真ギャラリー</button>
      </div>

      <Show when={tab() === 'photos'}>
        <section class="lf-gallery-section">
          <PhotoGallery product={props.product} />
        </section>
      </Show>

      <Show when={tab() === 'docs'}>
      <section class="lf-gallery-section">
        <h2>商品原本</h2>
        <article class="lf-original-card">
          <LeafletVisual image={{ kind: 'product' }} product={props.product} />
          <div>
            <span class="lf-badge is-original">原本</span>
            <h3>{props.product.name}</h3>
            <p>{props.product.id} · {categoryLabel(props.product)} · 成分カード {originalNutrients(props.product).length}枚</p>
          </div>
          <div class="lf-actions">
            <button onClick={props.onOpenOriginal}>原本を開く</button>
            <button class="lf-primary" onClick={create}>＋ リーフレットを作成</button>
          </div>
        </article>
      </section>

      <section class="lf-gallery-section">
        <h2>リーフレット <small>{list().length}件</small></h2>
        <div class="lf-leaflet-grid">
          <For each={list()} fallback={<p class="lf-empty">まだリーフレットはありません。「＋ リーフレットを作成」から原本を複製します。</p>}>
            {(leaflet) => (
              <article class="lf-leaflet-card">
                <div class="lf-leaflet-card-head">
                  <span class="lf-badge" classList={{ 'is-ready': leaflet.status === 'ready' }}>{statusLabel(leaflet)}</span>
                  <button class="lf-icon-btn" onClick={() => remove(leaflet)} title="削除">×</button>
                </div>
                <h3>{leaflet.name}</h3>
                <dl>
                  <dt>対象者</dt><dd>{leaflet.audience || '未設定'}</dd>
                  <dt>元商品</dt><dd>{leaflet.source.productName}</dd>
                  <dt>最終更新</dt><dd>{formatDate(leaflet.updatedAt)}</dd>
                  <dt>掲載</dt><dd>カード {leaflet.items.filter((item) => item.kind === 'card' && item.visible).length}枚 · Topic {leaflet.items.filter((item) => item.kind === 'topic').length}件</dd>
                </dl>
                <div class="lf-actions">
                  <button class="lf-primary" onClick={() => setLeafletView({ view: 'edit', id: leaflet.id })}>編集</button>
                  <button onClick={() => duplicate(leaflet.id)}>複製</button>
                  <button onClick={() => setLeafletView({ view: 'layout', id: leaflet.id })}>配布用レイアウト</button>
                </div>
              </article>
            )}
          </For>
        </div>
      </section>
      </Show>
    </div>
  )
}

export default LeafletPage
