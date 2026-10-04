import { type Component, createMemo, createSignal, For, Show } from 'solid-js'
import { addCustomNutrient, linkNutrientToProduct, state } from '../../store'
import type { Product } from '../../types'
import { type Leaflet, type LeafletCard, acknowledgeNutrients, addCardsToLeaflet, newOriginalNutrients, originalNutrientIds } from './store'
import { nutrientById, showToast } from './shared'

// ── 原本に成分が増えていたら、編集画面に入ったときに知らせる ─────────────────
export const SyncDialog: Component<{ leaflet: Leaflet }> = (props) => {
  // 開いた時点の差分だけを扱う（そろえた後に出し直さない）
  const [ids] = createSignal(newOriginalNutrients(props.leaflet))
  const [open, setOpen] = createSignal(ids().length > 0)

  const align = () => {
    addCardsToLeaflet(props.leaflet.id, ids())
    setOpen(false)
    showToast(`${ids().length}件をリーフレットの最後に追加しました`)
  }
  const skip = () => {
    acknowledgeNutrients(props.leaflet.id, ids())
    setOpen(false)
  }

  return (
    <Show when={open()}>
      <div class="lf-modal-backdrop">
        <section class="lf-modal lf-dialog" role="alertdialog" aria-modal="true" aria-labelledby="lf-sync-title">
          <p class="lf-kicker">UPDATE FROM ORIGINAL</p>
          <h2 id="lf-sync-title">新たな要素が追加されました</h2>
          <p>このリーフレットを作った後に、原本（商品ノート）へ成分が{ids().length}件追加されています。並び順は今のままで、アイテムを原本とそろえますか？</p>
          <ul class="lf-dialog-list">
            <For each={ids()}>{(id) => <li>{nutrientById(id)?.name ?? id}</li>}</For>
          </ul>
          <div class="lf-dialog-actions">
            <button type="button" onClick={skip}>今回は追加しない</button>
            <button type="button" class="lf-primary" onClick={align}>そろえる（最後に追加）</button>
          </div>
        </section>
      </div>
    </Show>
  )
}

// ── リーフレットの編集中に成分を足す（原本にも反映できる） ───────────────────
type Tab = 'original' | 'shared' | 'new'

export const AddIngredientDialog: Component<{ leaflet: Leaflet; product: Product; onClose: () => void }> = (props) => {
  const [tab, setTab] = createSignal<Tab>('original')
  const [picked, setPicked] = createSignal<string[]>([])
  const [query, setQuery] = createSignal('')
  const [alsoOriginal, setAlsoOriginal] = createSignal(true)
  const [name, setName] = createSignal('')
  const [description, setDescription] = createSignal('')

  const used = () => new Set(props.leaflet.items.filter((item): item is LeafletCard => item.kind === 'card').map((card) => card.nutrientId))
  const originalIds = createMemo(() => originalNutrientIds(props.product.id))
  const match = (text: string) => !query().trim() || text.toLocaleLowerCase('ja').includes(query().trim().toLocaleLowerCase('ja'))

  /** 原本にあるが、このリーフレットにまだ入っていない成分 */
  const fromOriginal = createMemo(() => originalIds().filter((id) => !used().has(id)).map((id) => nutrientById(id)!).filter(Boolean)
    .filter((n) => match(`${n.name} ${n.description}`)))
  /** 共有成分DBのうち、この商品（原本）に入っていない成分 */
  const fromShared = createMemo(() => {
    const inOriginal = new Set(originalIds())
    return state.nutrients.filter((n) => !inOriginal.has(n.id) && !used().has(n.id) && match(`${n.name} ${n.description}`))
  })

  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const switchTab = (next: Tab) => { setTab(next); setPicked([]) }

  function addPicked() {
    const ids = picked()
    if (!ids.length) return
    if (tab() === 'shared' && alsoOriginal()) ids.forEach((id) => linkNutrientToProduct(id, props.product.id))
    addCardsToLeaflet(props.leaflet.id, ids)
    showToast(`${ids.length}件をリーフレットに追加しました${tab() === 'shared' && alsoOriginal() ? '（原本にも追加）' : ''}`)
    props.onClose()
  }

  function createNew() {
    const n = name().trim()
    if (!n) return
    // 新しいカードは原本（商品ノート）にも入る。ほかのリーフレットでは「新たな要素」として案内される
    const id = addCustomNutrient({ name: n, description: description().trim(), productId: props.product.id })
    addCardsToLeaflet(props.leaflet.id, [id])
    showToast(`「${n}」を作成し、原本とリーフレットに追加しました`)
    props.onClose()
  }

  const List: Component<{ items: { id: string; name: string; description: string }[]; empty: string }> = (list) => (
    <div class="lf-add-list">
      <For each={list.items} fallback={<p class="lf-pick-empty">{list.empty}</p>}>
        {(n) => (
          <label classList={{ 'is-picked': picked().includes(n.id) }}>
            <input type="checkbox" checked={picked().includes(n.id)} onChange={() => toggle(n.id)} />
            <span><strong>{n.name}</strong><small>{n.description || '説明未登録'}</small></span>
          </label>
        )}
      </For>
    </div>
  )

  return (
    <div class="lf-modal-backdrop" onClick={props.onClose}>
      <section class="lf-modal lf-add-dialog" role="dialog" aria-modal="true" aria-label="成分を追加" onClick={(e) => e.stopPropagation()}>
        <header>
          <div><p class="lf-kicker">ADD INGREDIENT</p><h2>成分を追加</h2></div>
          <button type="button" onClick={props.onClose} aria-label="閉じる">×</button>
        </header>
        <div class="lf-add-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab() === 'original'} classList={{ 'is-active': tab() === 'original' }} onClick={() => switchTab('original')}>原本から（{fromOriginal().length}）</button>
          <button type="button" role="tab" aria-selected={tab() === 'shared'} classList={{ 'is-active': tab() === 'shared' }} onClick={() => switchTab('shared')}>共有成分DBから</button>
          <button type="button" role="tab" aria-selected={tab() === 'new'} classList={{ 'is-active': tab() === 'new' }} onClick={() => switchTab('new')}>＋ 新規</button>
        </div>

        <Show when={tab() !== 'new'}>
          <label class="lf-add-search"><span>⌕</span><input value={query()} onInput={(e) => setQuery(e.currentTarget.value)} placeholder="成分名・説明で探す" /></label>
        </Show>

        <Show when={tab() === 'original'}>
          <List items={fromOriginal()} empty="原本の成分はすべてこのリーフレットに入っています。" />
        </Show>
        <Show when={tab() === 'shared'}>
          <List items={fromShared()} empty="追加できる成分がありません。" />
          <label class="lf-add-also"><input type="checkbox" checked={alsoOriginal()} onChange={(e) => setAlsoOriginal(e.currentTarget.checked)} />原本（商品ノート）にも追加する</label>
        </Show>
        <Show when={tab() === 'new'}>
          <div class="nutrient-new-form lf-add-new">
            <label>成分名<input value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="例: プラセンタ" /></label>
            <label>説明<textarea rows="5" value={description()} onInput={(e) => setDescription(e.currentTarget.value)} placeholder="カードに載せる説明文" /></label>
            <p class="lf-add-note">新しいカードは原本（商品ノート）にも追加されます。</p>
          </div>
        </Show>

        <footer class="lf-dialog-actions">
          <button type="button" onClick={props.onClose}>キャンセル</button>
          <Show when={tab() === 'new'} fallback={
            <button type="button" class="lf-primary" onClick={addPicked} disabled={!picked().length}>追加する（{picked().length}）</button>
          }>
            <button type="button" class="lf-primary" onClick={createNew} disabled={!name().trim()}>作成して追加</button>
          </Show>
        </footer>
      </section>
    </div>
  )
}
