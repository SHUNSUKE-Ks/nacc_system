import { type Component, createMemo, createSignal, For, Match, Show, Switch } from 'solid-js'
import { setState, state } from '../../store'
import type { Product } from '../../types'
import LeafletEditor from './LeafletEditor'
import LeafletLayout from './LeafletLayout'
import LeafletEditorV21 from './LeafletEditorV21'
import { defaultImageFor } from './photos'
import HelpButton, { HELP_LEAFLET_GALLERY } from '../../components/HelpButton'
import {
  type Leaflet,
  createLeaflet, deleteLeaflet, duplicateLeaflet, leaflets, leafletView, openLeaflet, openLeafletEditor, setLeafletView,
} from './store'
import { categoryLabel, formatDate, LeafletVisual, OriginalSafeNote, originalNutrients, PhotoGallery, statusLabel, Toast } from './shared'
import './leaflet.css'
import './leaflet-layout.css'
import './leaflet-v3.css'
import './leaflet-v5.css'
import './leaflet-v6.css'
import './leaflet-v7.css'
import './leaflet-v8.css'

// タッチ端末（iPadなど）では、ボタン類を指で押しやすい大きさにする
if (typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)) {
  document.documentElement.classList.add('is-touch')
}

// NAVIなしの全画面ページ。原本（商品ノート）とは別の書類ステートとして扱う。
const LeafletPage: Component = () => {
  const product = () => state.products.find((item) => item.id === state.selectedProductId) ?? null
  const current = () => {
    const view = leafletView()
    return 'id' in view ? leaflets.find((leaflet) => leaflet.id === view.id) ?? null : null
  }

  const openOriginal = () => {
    setLeafletView({ view: 'gallery' })
    setState({ page: 'db01', dbView: 'detail' })
  }

  return (
    <div class="lf-page">
      <Show when={leafletView().view !== 'drafts'} fallback={<DraftsView />}>
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
            <Match when={leafletView().view === 'edit21' && current()}>
              {(leaflet) => <LeafletEditorV21 leaflet={leaflet()} product={p()} />}
            </Match>
            <Match when={leafletView().view === 'layout' && current()}>
              {(leaflet) => {
                const view = leafletView()
                return <LeafletLayout leaflet={leaflet()} product={p()} initialClean={view.view === 'layout' && !!view.clean} />
              }}
            </Match>
            <Match when={true}>
              <LeafletGallery product={p()} onOpenOriginal={openOriginal} />
            </Match>
          </Switch>
        )}
      </Show>
      </Show>
      <Toast />
    </div>
  )
}

// ── 全商品の編集中（下書き）リーフレット（アプリの header「リーフレット」） ──
const DraftsView: Component = () => {
  const drafts = createMemo(() =>
    leaflets.filter((leaflet) => leaflet.status !== 'ready').slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  )
  const productOf = (leaflet: Leaflet) => state.products.find((product) => product.id === leaflet.productId)

  return (
    <div class="lf-gallery" data-state="LEAFLET_DRAFTS">
      <div class="lf-topbar">
        <button class="lf-back" onClick={() => setState({ page: 'db01', dbView: 'gallery' })}>← 商品ページ</button>
        <OriginalSafeNote />
      </div>
      <header class="lf-gallery-head">
        <p class="lf-kicker">NACC · LEAFLETS IN PROGRESS</p>
        <h1>編集中のリーフレット</h1>
        <p>全商品の下書きをまとめて表示しています。「配布可」にしたものは、商品ページの「配布用」タブに移ります。</p>
      </header>
      <div class="lf-leaflet-grid">
        <For each={drafts()} fallback={<p class="lf-empty">編集中のリーフレットはありません。商品ノートの「リーフレット Ver2.1」などから作れます。</p>}>
          {(leaflet) => (
            <article class="lf-leaflet-card lf-draft-card">
              <div class="lf-draft-head">
                <Show when={productOf(leaflet)}>
                  {(product) => <LeafletVisual image={leaflet.image} product={product()} class="lf-draft-thumb" />}
                </Show>
                <div>
                  <span class="lf-badge">{statusLabel(leaflet)}</span>
                  <Show when={leaflet.version === '2.1'}><span class="lf21-badge is-small">Ver2.1</span></Show>
                  <h3>{leaflet.name}</h3>
                  <p>{productOf(leaflet)?.name ?? leaflet.source.productName} · {formatDate(leaflet.updatedAt)}</p>
                </div>
              </div>
              <div class="lf-actions">
                <button class="lf-primary" onClick={() => openLeaflet(leaflet, 'edit')}>編集</button>
                <button onClick={() => openLeaflet(leaflet, 'layout')}>配布用レイアウト</button>
                <button onClick={() => { setState({ selectedProductId: leaflet.productId, page: 'db01', dbView: 'detail' }); setLeafletView({ view: 'gallery' }) }}>商品ノート</button>
              </div>
            </article>
          )}
        </For>
      </div>
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
    const copy = leaflets.find((leaflet) => leaflet.id === copyId)
    if (copy) openLeafletEditor(copy)
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
                  <span>
                    <span class="lf-badge" classList={{ 'is-ready': leaflet.status === 'ready' }}>{statusLabel(leaflet)}</span>
                    <Show when={leaflet.version === '2.1'}><span class="lf21-badge is-small">Ver2.1</span></Show>
                  </span>
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
                  <button class="lf-primary" onClick={() => openLeafletEditor(leaflet)}>編集</button>
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
