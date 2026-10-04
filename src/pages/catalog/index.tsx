import { type Component, createMemo, createSignal, For, onMount, Show } from 'solid-js'
import { navigate, state } from '../../store'
import type { Product } from '../../types'
import HelpButton, { HELP_CATALOG_CHECK } from '../../components/HelpButton'
import {
  type CheckItem, type CheckStatus, STATUS_LABELS,
  addItemDuringCheck, checkDate, cloudOk, formatStamp, itemCheck, itemsOf, productCheck, refreshFromCloud, setCheckDate,
  setItemMemo, setItemStatus, setProductMemo, setProductStatus, toggleItemCheck,
} from './store'
import './catalog.css'

type Filter = 'all' | CheckStatus
type Category = 'all' | 'supplement' | 'cosmetic'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'unchecked', label: '未確認' },
  { id: 'checked', label: '確認済み' },
  { id: 'hold', label: '保留' },
]
/** メモを書くときの候補 */
const MEMO_SUGGESTIONS = ['名前を確認', '成分説明確認']

// 新カタログチェック表（今の作業と混ざらないよう、専用の全画面ページ）
const CatalogCheckPage: Component = () => {
  const [filter, setFilter] = createSignal<Filter>('all')
  const [category, setCategory] = createSignal<Category>('all')
  const [query, setQuery] = createSignal('')
  /** 開閉は手で変えたものだけ覚える（既定: 確認済みの商品はたたむ） */
  const [openState, setOpenState] = createSignal<Record<string, boolean>>({})
  const [memoFocus, setMemoFocus] = createSignal<string | null>(null)
  /** 成分を追加するフォームを開いている商品 */
  const [addingFor, setAddingFor] = createSignal<string | null>(null)
  const nutrientNames = createMemo(() => [...new Set(state.nutrients.map((n) => n.name))].sort((a, b) => a.localeCompare(b, 'ja')))

  onMount(refreshFromCloud)

  const products = createMemo(() =>
    [...state.products].sort((a, b) => (a.category === b.category ? a.id.localeCompare(b.id, 'ja', { numeric: true }) : a.category === 'supplement' ? -1 : 1))
  )
  const itemsByProduct = createMemo(() => new Map(products().map((p) => [p.id, itemsOf(p)])))
  const items = (p: Product) => itemsByProduct().get(p.id) ?? []
  const productStatus = (p: Product): CheckStatus => productCheck(p.id)?.status ?? 'unchecked'
  const checkedCount = (p: Product) => items(p).filter((i) => itemCheck(p.id, i.key).status === 'checked').length
  const allItemsChecked = (p: Product) => items(p).length > 0 && checkedCount(p) === items(p).length

  // 全体の進み具合
  const totals = createMemo(() => {
    let itemTotal = 0, itemChecked = 0, itemHold = 0, productsChecked = 0
    for (const p of products()) {
      for (const i of items(p)) {
        itemTotal++
        const s = itemCheck(p.id, i.key).status
        if (s === 'checked') itemChecked++
        if (s === 'hold') itemHold++
      }
      if (productStatus(p) === 'checked') productsChecked++
    }
    return { itemTotal, itemChecked, itemHold, productsChecked }
  })

  const filterCount = (f: Filter) => {
    if (f === 'all') return totals().itemTotal
    let n = 0
    for (const p of products()) for (const i of items(p)) if (itemCheck(p.id, i.key).status === f) n++
    return n
  }

  const visibleItems = (p: Product) => {
    const f = filter()
    const q = query().trim().toLocaleLowerCase('ja')
    return items(p).filter((i) =>
      (f === 'all' || itemCheck(p.id, i.key).status === f) &&
      (!q || `${i.name} ${i.description}`.toLocaleLowerCase('ja').includes(q) || p.name.toLocaleLowerCase('ja').includes(q))
    )
  }

  const visibleProducts = createMemo(() => products().filter((p) => {
    if (category() !== 'all' && p.category !== category()) return false
    const f = filter()
    const q = query().trim().toLocaleLowerCase('ja')
    const nameHit = !q || p.name.toLocaleLowerCase('ja').includes(q)
    const statusHit = f === 'all' || productStatus(p) === f
    return (statusHit && nameHit) || visibleItems(p).length > 0
  }))

  const isOpen = (p: Product) => openState()[p.id] ?? productStatus(p) !== 'checked'
  const toggleOpen = (p: Product) => setOpenState((prev) => ({ ...prev, [p.id]: !isOpen(p) }))

  function addSuggestion(productId: string, key: string | null, text: string, current: string) {
    const next = current.trim() ? `${current.trim()}・${text}` : text
    if (key) setItemMemo(productId, key, next)
    else setProductMemo(productId, next)
  }

  const StatusPill: Component<{ value: CheckStatus; onChange: (s: CheckStatus) => void; label: string }> = (pill) => (
    <select class={`cc-status is-${pill.value}`} value={pill.value} aria-label={pill.label} onChange={(e) => pill.onChange(e.currentTarget.value as CheckStatus)}>
      <For each={Object.keys(STATUS_LABELS) as CheckStatus[]}>{(s) => <option value={s}>{STATUS_LABELS[s]}</option>}</For>
    </select>
  )

  const MemoField: Component<{ productId: string; itemKey: string | null; value: string; hold: boolean }> = (m) => {
    const focusKey = () => `${m.productId}|${m.itemKey ?? ''}`
    return (
      <div class="cc-memo" classList={{ 'is-hold': m.hold }}>
        <input
          value={m.value}
          placeholder={m.hold ? '保留の理由を書いてください' : 'メモ'}
          onFocus={() => setMemoFocus(focusKey())}
          onBlur={() => window.setTimeout(() => { if (memoFocus() === focusKey()) setMemoFocus(null) }, 150)}
          onChange={(e) => (m.itemKey ? setItemMemo(m.productId, m.itemKey, e.currentTarget.value) : setProductMemo(m.productId, e.currentTarget.value))}
        />
        <Show when={memoFocus() === focusKey() || (m.hold && !m.value)}>
          <div class="cc-suggest" role="list" aria-label="メモの候補">
            <For each={MEMO_SUGGESTIONS}>
              {(text) => (
                <button type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => addSuggestion(m.productId, m.itemKey, text, m.value)}>＋ {text}</button>
              )}
            </For>
          </div>
        </Show>
      </div>
    )
  }

  const ItemRow: Component<{ product: Product; item: CheckItem }> = (row) => {
    const check = () => itemCheck(row.product.id, row.item.key)
    return (
      <div class={`cc-row is-${check().status}`} role="row">
        <button
          type="button"
          class="cc-check"
          classList={{ 'is-on': check().status === 'checked' }}
          onClick={() => toggleItemCheck(row.product.id, row.item.key)}
          aria-pressed={check().status === 'checked'}
          aria-label={`${row.item.name}を${check().status === 'checked' ? '未確認に戻す' : '確認済みにする'}`}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 6.5" /></svg>
        </button>
        <div class="cc-item-name">
          <strong>{row.item.name}</strong>
          <Show when={row.item.source === 'label'}><small>原材料表記</small></Show>
          <Show when={row.item.source === 'sheet'}><small class="is-sheet">チェック表のみ</small></Show>
        </div>
        <p class="cc-item-desc">{row.item.description || '—'}</p>
        <StatusPill value={check().status} label={`${row.item.name}のステータス`} onChange={(s) => setItemStatus(row.product.id, row.item.key, s)} />
        <MemoField productId={row.product.id} itemKey={row.item.key} value={check().memo} hold={check().status === 'hold'} />
        <span class="cc-date">{formatStamp(check().updatedAt)}</span>
      </div>
    )
  }

  /** 確認中に見つけた成分を足すフォーム */
  const AddItemForm: Component<{ product: Product; onDone: () => void }> = (form) => {
    const [name, setName] = createSignal('')
    const [description, setDescription] = createSignal('')
    const [toOriginal, setToOriginal] = createSignal(true)
    const usesCards = () => itemsOf(form.product).some((i) => i.source === 'card') || !form.product.ingredients.length
    const existing = () => state.nutrients.find((n) => n.name.trim() === name().trim())
    const listId = `cc-names-${form.product.id}`
    const add = () => {
      if (addItemDuringCheck(form.product, { name: name(), description: description(), toOriginal: toOriginal() })) form.onDone()
    }
    return (
      <div class="cc-add-form">
        <label>成分名
          <input ref={(el) => queueMicrotask(() => el.focus())} list={listId} value={name()} onInput={(e) => setName(e.currentTarget.value)} placeholder="カタログに載っている成分名" />
          <datalist id={listId}><For each={nutrientNames()}>{(n) => <option value={n} />}</For></datalist>
        </label>
        <Show when={toOriginal() && usesCards() && !existing()}>
          <label>説明（任意）
            <input value={description()} onInput={(e) => setDescription(e.currentTarget.value)} placeholder="成分カードの説明（後から商品ノートで直せます）" />
          </label>
        </Show>
        <label class="cc-add-check">
          <input type="checkbox" checked={toOriginal()} onChange={(e) => setToOriginal(e.currentTarget.checked)} />
          原本（商品ノート）にも追加する
        </label>
        <p class="cc-add-note">
          {!toOriginal() ? 'このチェック表だけに入れます（商品ノートは変わりません）。'
            : usesCards() ? (existing() ? `共有成分DBの「${existing()!.name}」をこの商品に結び付けます。` : '新しい成分カードを作って、この商品に追加します。')
              : 'この商品の原材料表記に追加します。'}
          追加した行は「確認済み」になります。
        </p>
        <div class="cc-add-actions">
          <button type="button" onClick={form.onDone}>キャンセル</button>
          <button type="button" class="is-primary" onClick={add} disabled={!name().trim()}>追加する</button>
        </div>
      </div>
    )
  }

  return (
    <div class="cc-page" data-state="CATALOG_CHECK">
      <header class="cc-top">
        <button type="button" class="cc-back" onClick={() => navigate('db01')}>← 商品ページ</button>
        <div class="cc-title">
          <p>NACC · NEW CATALOG CHECK</p>
          <h1>新カタログチェック表</h1>
        </div>
        <div class="cc-progress">
          <span>商品 <b>{totals().productsChecked}</b> / {products().length} 確認済み</span>
          <span>成分 <b>{totals().itemChecked}</b> / {totals().itemTotal} 確認済み</span>
          <span classList={{ 'is-hold': totals().itemHold > 0 }}>保留 <b>{totals().itemHold}</b></span>
          <span class="cc-cloud" classList={{ 'is-ok': cloudOk() }}>{cloudOk() ? 'クラウドに保存' : 'この端末に保存'}</span>
        </div>
        <label class="cc-check-date" title="確認した日付（変更できます）">
          <span>確認日</span>
          <input type="date" value={checkDate()} onChange={(e) => setCheckDate(e.currentTarget.value)} />
        </label>
        <HelpButton title="新カタログチェック表" items={HELP_CATALOG_CHECK} />
      </header>

      <div class="cc-filters">
        <div class="cc-chips" role="radiogroup" aria-label="ステータスで絞り込み">
          <For each={FILTERS}>
            {(f) => (
              <button type="button" role="radio" aria-checked={filter() === f.id} class={`cc-chip is-${f.id}`} classList={{ 'is-active': filter() === f.id }} onClick={() => setFilter(f.id)}>
                {f.label}<span>{filterCount(f.id)}</span>
              </button>
            )}
          </For>
        </div>
        <div class="cc-chips is-sub" role="radiogroup" aria-label="カテゴリ">
          <For each={[['all', '全商品'], ['supplement', 'サプリ'], ['cosmetic', 'コスメ']] as [Category, string][]}>
            {([id, label]) => (
              <button type="button" role="radio" aria-checked={category() === id} class="cc-chip" classList={{ 'is-active': category() === id }} onClick={() => setCategory(id)}>{label}</button>
            )}
          </For>
        </div>
        <label class="cc-search"><span>⌕</span><input value={query()} onInput={(e) => setQuery(e.currentTarget.value)} placeholder="商品名・成分名で探す" /></label>
      </div>

      <div class="cc-list">
        <For each={visibleProducts()} fallback={<p class="cc-empty">該当する商品・成分はありません。</p>}>
          {(product) => {
            const pc = () => productCheck(product.id)
            const done = () => productStatus(product) === 'checked'
            return (
              <section class={`cc-product is-${productStatus(product)}`}>
                <div class="cc-product-head">
                  <button type="button" class="cc-toggle" onClick={() => toggleOpen(product)} aria-expanded={isOpen(product)} aria-label="成分の一覧を開く／閉じる">
                    {isOpen(product) ? '▾' : '▸'}
                  </button>
                  <div class="cc-product-name">
                    <strong classList={{ 'is-done': done() }}>{product.name}</strong>
                    <small>{product.id} · {product.category === 'cosmetic' ? 'コスメ' : 'サプリ'} · 成分 {checkedCount(product)} / {items(product).length} 確認済み</small>
                    <span class="cc-bar" aria-hidden="true"><i style={{ width: `${items(product).length ? (checkedCount(product) / items(product).length) * 100 : 0}%` }} /></span>
                  </div>
                  <button
                    type="button"
                    class="cc-product-done"
                    classList={{ 'is-ready': allItemsChecked(product) && !done(), 'is-done': done() }}
                    disabled={!done() && !allItemsChecked(product)}
                    onClick={() => setProductStatus(product.id, done() ? 'unchecked' : 'checked')}
                    title={done() ? '押すと未確認に戻します' : allItemsChecked(product) ? '成分がすべて確認済みです。押して商品を確認済みにします' : '成分をすべて確認すると押せます'}
                  >
                    {done() ? '✓ 商品確認済み' : '商品確認済み'}
                  </button>
                  <StatusPill value={productStatus(product)} label={`${product.name}のステータス`} onChange={(s) => setProductStatus(product.id, s)} />
                  <span class="cc-date">{formatStamp(pc()?.updatedAt ?? '')}</span>
                </div>
                <Show when={productStatus(product) === 'hold' || pc()?.memo}>
                  <div class="cc-product-memo">
                    <MemoField productId={product.id} itemKey={null} value={pc()?.memo ?? ''} hold={productStatus(product) === 'hold'} />
                  </div>
                </Show>
                <Show when={isOpen(product)}>
                  <div class="cc-table" role="table" aria-label={`${product.name}の成分`}>
                    <div class="cc-row is-head" role="row">
                      <span>✓</span><span>成分</span><span>説明</span><span>ステータス</span><span>メモ</span><span>最終更新</span>
                    </div>
                    <For each={visibleItems(product)} fallback={<p class="cc-empty is-small">{items(product).length ? 'この絞り込みに当てはまる成分はありません。' : 'この商品には成分が登録されていません。'}</p>}>
                      {(item) => <ItemRow product={product} item={item} />}
                    </For>
                    <Show when={addingFor() === product.id} fallback={
                      <button type="button" class="cc-add-toggle" onClick={() => setAddingFor(product.id)}>＋ 成分を追加（カタログで見つけた成分）</button>
                    }>
                      <AddItemForm product={product} onDone={() => setAddingFor(null)} />
                    </Show>
                  </div>
                </Show>
              </section>
            )
          }}
        </For>
      </div>
    </div>
  )
}

export default CatalogCheckPage
