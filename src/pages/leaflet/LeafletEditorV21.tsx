import { type Component, batch, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import type { Product } from '../../types'
import { setState } from '../../store'
import HelpButton, { HELP_LEAFLET_V21 } from '../../components/HelpButton'
import {
  type Leaflet, type LeafletCard, type LeafletItem,
  savedAt, setLeafletItems, setLeafletView, updateLeaflet,
} from './store'
import { cardDescription, cardTitle, CopyButton, LeafletVisual, nutrientById, OriginalSafeNote, PhotoGallery, SaveButton } from './shared'

// リーフレット Ver2.1
// 商品ノートと同じ1列のGalleryのまま編集する。左右の受け渡しはなく、
// 「表示」のチェックを外したカードは暗くなって最後に回り、配布用レイアウトには出ない。

const PRESS_KEY = 'nacc-leaflet-press-ms'
const PRESS_OPTIONS = [300, 600] as const
const MOVE_TOLERANCE = 8
const PLACEHOLDER_KEY = '__placeholder'

type DragState = { key: string; x: number; y: number; dx: number; dy: number; w: number; h: number }
type Pending = { key: string; el: HTMLElement; startX: number; startY: number; x: number; y: number; mouse: boolean; timer: number }

function loadPressMs(): number {
  try {
    const value = Number(localStorage.getItem(PRESS_KEY))
    return PRESS_OPTIONS.includes(value as 300 | 600) ? value : 300
  } catch {
    return 300
  }
}

const LeafletEditorV21: Component<{ leaflet: Leaflet; product: Product }> = (props) => {
  let rootRef!: HTMLDivElement
  let gridRef!: HTMLDivElement

  const [pressMs, setPressMsSignal] = createSignal(loadPressMs())
  const [drag, setDrag] = createSignal<DragState | null>(null)
  const [target, setTarget] = createSignal<number | null>(null)
  const [pressingKey, setPressingKey] = createSignal<string | null>(null)
  const [landedKey, setLandedKey] = createSignal<string | null>(null)
  const [editingKey, setEditingKey] = createSignal<string | null>(null)
  const [draftTitle, setDraftTitle] = createSignal('')
  const [draftBody, setDraftBody] = createSignal('')
  const [pickerOpen, setPickerOpen] = createSignal(false)
  let pending: Pending | null = null
  let touchEl: HTMLElement | null = null
  let scrollFrame = 0

  const setPressMs = (ms: number) => {
    setPressMsSignal(ms)
    try { localStorage.setItem(PRESS_KEY, String(ms)) } catch { /* 端末に保存できなくても動作は続ける */ }
  }

  const cards = () => props.leaflet.items.filter((item): item is LeafletCard => item.kind === 'card')
  const others = () => props.leaflet.items.filter((item) => item.kind !== 'card')
  const visibleCards = () => cards().filter((card) => card.visible)
  const hiddenCards = () => cards().filter((card) => !card.visible)

  type Slot = LeafletCard | { kind: 'placeholder'; key: string }
  const PLACEHOLDER = { kind: 'placeholder', key: PLACEHOLDER_KEY } as const
  const slots = createMemo<Slot[]>(() => {
    const d = drag()
    const list: Slot[] = visibleCards().filter((card) => card.key !== d?.key)
    const t = target()
    if (d && t !== null) list.splice(t, 0, PLACEHOLDER)
    return [...list, ...hiddenCards()]
  })

  /** 番号は表示中のカードだけ、左から 01, 02… */
  const numbers = createMemo(() => new Map(visibleCards().map((card, index) => [card.key, index + 1])))
  const pad = (n?: number) => (n ? String(n).padStart(2, '0') : '—')

  const save = (nextCards: LeafletCard[]) =>
    setLeafletItems(props.leaflet.id, [...nextCards.map((card) => ({ ...card })), ...others().map((item) => ({ ...item }))] as LeafletItem[])

  // ── 並び替えのアニメーション（他のカードが滑らかに場所を空ける） ─────────
  function flip(fn: () => void) {
    const before = new Map<Element, DOMRect>()
    rootRef.querySelectorAll('[data-flip]').forEach((el) => before.set(el, el.getBoundingClientRect()))
    fn()
    rootRef.querySelectorAll<HTMLElement>('[data-flip]').forEach((el) => {
      const b = before.get(el)
      if (!b) return
      const a = el.getBoundingClientRect()
      const dx = b.left - a.left
      const dy = b.top - a.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' })
    })
  }

  // ── 表示／非表示 ────────────────────────────────────────────────────────
  /** 外すと暗くなって一番最後へ。戻すと表示中のカードの最後に入る */
  function setVisible(key: string, visible: boolean) {
    const card = cards().find((item) => item.key === key)
    if (!card) return
    const rest = cards().filter((item) => item.key !== key)
    const updated = { ...card, visible }
    flip(() => save(visible
      ? [...rest.filter((item) => item.visible), updated, ...rest.filter((item) => !item.visible)]
      : [...rest, updated]))
  }

  // ── カードの文字の編集（このリーフレットだけ） ─────────────────────────
  function beginEdit(card: LeafletCard) {
    setDraftTitle(cardTitle(card))
    setDraftBody(cardDescription(card))
    setEditingKey(card.key)
  }

  function saveEdit(card: LeafletCard) {
    const original = nutrientById(card.nutrientId)
    const title = draftTitle().trim()
    const description = draftBody().trim()
    save(cards().map((item) => item.key !== card.key ? item : {
      ...item,
      title: title && title !== original?.name ? title : undefined,
      description: description !== (original?.description ?? '') ? description : undefined,
    }))
    setEditingKey(null)
  }

  function resetEdit(card: LeafletCard) {
    save(cards().map((item) => (item.key === card.key ? { ...item, title: undefined, description: undefined } : item)))
    setEditingKey(null)
  }

  // ── 長押しで並び替え（マウス・iPadの指どちらも） ─────────────────────────
  const contains = (el: Element, x: number, y: number) => {
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function computeTarget(x: number, y: number): number | null {
    if (!contains(gridRef, x, y)) return target()
    let index = 0
    const max = visibleCards().length - 1
    for (const child of Array.from(gridRef.children) as HTMLElement[]) {
      const key = child.dataset.key
      if (!key) continue
      if (key === PLACEHOLDER_KEY) {
        if (contains(child, x, y)) return target()
        continue
      }
      if (child.dataset.hidden === 'true') break
      const r = child.getBoundingClientRect()
      if (y < r.top) return Math.min(index, max)
      if (y <= r.bottom && x < r.left + r.width / 2) return Math.min(index, max)
      index++
    }
    return Math.min(index, max)
  }

  function updateTarget(x: number, y: number) {
    const next = computeTarget(x, y)
    if (next === target()) return
    flip(() => setTarget(next))
  }

  function autoScroll() {
    scrollFrame = 0
    const d = drag()
    if (!d) return
    const scroller = rootRef.closest('.lf-page') as HTMLElement | null
    if (!scroller) return
    const edge = 70
    const speed = d.y < edge ? -(edge - d.y) / 4 : d.y > window.innerHeight - edge ? (d.y - (window.innerHeight - edge)) / 4 : 0
    if (!speed) return
    scroller.scrollTop += speed
    updateTarget(d.x, d.y)
    scrollFrame = requestAnimationFrame(autoScroll)
  }

  function startPress(key: string, el: HTMLElement, x: number, y: number, mouse: boolean) {
    pending = { key, el, startX: x, startY: y, x, y, mouse, timer: window.setTimeout(begin, pressMs()) }
    setPressingKey(key)
    window.addEventListener('keydown', onKey)
  }

  function begin() {
    const p = pending
    if (!p) return
    window.clearTimeout(p.timer)
    pending = null
    setPressingKey(null)
    const r = p.el.getBoundingClientRect()
    const index = visibleCards().findIndex((card) => card.key === p.key)
    flip(() => batch(() => {
      setDrag({ key: p.key, x: p.x, y: p.y, dx: p.x - r.left, dy: p.y - r.top, w: r.width, h: r.height })
      setTarget(index)
    }))
  }

  function move(x: number, y: number) {
    if (pending) {
      pending.x = x
      pending.y = y
      if (Math.hypot(x - pending.startX, y - pending.startY) > MOVE_TOLERANCE) {
        // マウスは待たずに掴む。指は長押しの前に動いたら取り消し
        if (pending.mouse) begin()
        else cancel()
      }
      return
    }
    const d = drag()
    if (!d) return
    setDrag({ ...d, x, y })
    updateTarget(x, y)
    if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll)
  }

  function end() {
    if (pending) { cancel(); return }
    const d = drag()
    const t = target()
    if (!d || t === null) { cancel(); return }
    const moving = visibleCards().find((card) => card.key === d.key)
    const visible = visibleCards().filter((card) => card.key !== d.key)
    if (moving) visible.splice(t, 0, moving)
    detach()
    flip(() => batch(() => {
      setDrag(null)
      setTarget(null)
      save([...visible, ...hiddenCards()])
      setLandedKey(d.key)
    }))
    window.setTimeout(() => setLandedKey(null), 420)
  }

  function cancel() {
    if (pending) window.clearTimeout(pending.timer)
    pending = null
    setPressingKey(null)
    detach()
    if (drag()) flip(() => batch(() => { setDrag(null); setTarget(null) }))
  }

  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }

  // マウス
  const onMouseMove = (event: PointerEvent) => move(event.clientX, event.clientY)
  const onMouseUp = () => end()
  function onHandlePointerDown(event: PointerEvent, card: LeafletCard) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || drag() || pending || editingKey()) return
    event.preventDefault()
    startPress(card.key, (event.currentTarget as HTMLElement).closest('[data-key]') as HTMLElement, event.clientX, event.clientY, true)
    window.addEventListener('pointermove', onMouseMove)
    window.addEventListener('pointerup', onMouseUp)
  }

  // 指（iPad）: リスナーは触れた要素に付ける（並び替え中にDOMから外れても届く）
  const onTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    if (drag() && event.cancelable) event.preventDefault()
    move(touch.clientX, touch.clientY)
  }
  const onTouchEnd = (event: TouchEvent) => {
    if (drag() && event.cancelable) event.preventDefault()
    end()
  }
  function onHandleTouchStart(event: TouchEvent, card: LeafletCard) {
    if (drag() || pending || editingKey() || event.touches.length !== 1) return
    const touch = event.touches[0]
    touchEl = event.currentTarget as HTMLElement
    startPress(card.key, touchEl.closest('[data-key]') as HTMLElement, touch.clientX, touch.clientY, false)
    touchEl.addEventListener('touchmove', onTouchMove, { passive: false })
    touchEl.addEventListener('touchend', onTouchEnd)
    touchEl.addEventListener('touchcancel', cancel)
  }

  function detach() {
    cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    window.removeEventListener('pointermove', onMouseMove)
    window.removeEventListener('pointerup', onMouseUp)
    window.removeEventListener('keydown', onKey)
    if (touchEl) {
      touchEl.removeEventListener('touchmove', onTouchMove)
      touchEl.removeEventListener('touchend', onTouchEnd)
      touchEl.removeEventListener('touchcancel', cancel)
      touchEl = null
    }
  }
  onCleanup(cancel)

  const savedLabel = () => {
    const at = savedAt()
    if (!at) return '自動保存'
    const d = new Date(at)
    return `保存しました ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const draggingCard = () => cards().find((card) => card.key === drag()?.key)

  return (
    <div class="lf-editor lf21" ref={rootRef} data-state={drag() ? 'REORDERING' : editingKey() ? 'CARD_EDIT' : 'LEAFLET_EDIT_V21'} style={{ '--press-ms': `${pressMs()}ms` }} classList={{ 'is-dragging': !!drag() }}>
      <div class="lf-topbar">
        <button class="lf-back" onClick={() => { setLeafletView({ view: 'gallery' }); setState({ page: 'db01', dbView: 'detail' }) }}>← 商品ノート</button>
        <span class="lf21-badge">Ver2.1</span>
        <OriginalSafeNote />
        <HelpButton title="リーフレット Ver2.1" items={HELP_LEAFLET_V21} />
        <span class="lf-saved">{savedLabel()}</span>
        <SaveButton />
        <span class="lf21-press" role="radiogroup" aria-label="並び替えの長押し時間">
          長押し
          <For each={[...PRESS_OPTIONS]}>
            {(ms) => (
              <button type="button" role="radio" aria-checked={pressMs() === ms} classList={{ 'is-active': pressMs() === ms }} onClick={() => setPressMs(ms)}>
                {ms / 1000}秒
              </button>
            )}
          </For>
        </span>
        <button class="lf-back" onClick={() => setLeafletView({ view: 'gallery' })}>リーフレット一覧</button>
        <button class="lf-primary" onClick={() => setLeafletView({ view: 'layout', id: props.leaflet.id })}>配布用レイアウト →</button>
      </div>

      {/* header: ワイド固定・その場で編集できる */}
      <header class="lf-hero is-wide lf21-hero">
        <input class="lf-inline lf-hero-kicker lf21-kicker" value={props.leaflet.audience} placeholder="対象者・用途（例: 新人向け）" onChange={(e) => updateLeaflet(props.leaflet.id, { audience: e.currentTarget.value })} />
        <div class="lf-hero-titlebox">
          <input class="lf-inline lf-hero-title" value={props.leaflet.title || props.product.name} placeholder={props.product.name} onChange={(e) => updateLeaflet(props.leaflet.id, { title: e.currentTarget.value.trim() === props.product.name ? '' : e.currentTarget.value })} />
        </div>
        <button type="button" class="lf-hero-photo lf21-photo" onClick={() => setPickerOpen(true)} title="画像を変更">
          <LeafletVisual image={props.leaflet.image} product={props.product} class="is-hero" />
          <span class="lf21-photo-label">画像を変更</span>
        </button>
        <div class="lf-hero-text">
          <textarea class="lf-inline lf-comment" rows="2" value={props.leaflet.comment || props.product.description || ''} placeholder="商品に入れるコメント" onChange={(e) => updateLeaflet(props.leaflet.id, { comment: e.currentTarget.value })} />
          <input class="lf-inline lf-contact" value={props.leaflet.contact} placeholder="注意書き・問い合わせ先・担当者" onChange={(e) => updateLeaflet(props.leaflet.id, { contact: e.currentTarget.value })} />
        </div>
      </header>

      <section class="lf21-toolbar">
        <div>
          <p>INGREDIENT CARDS</p>
          <h2>成分カード <small>表示中 {visibleCards().length}枚 · 非表示 {hiddenCards().length}枚</small></h2>
        </div>
        <span>Numberを{pressMs() / 1000}秒長押しで並び替え／「表示」のチェックを外すと最後に回って配布用に出ません</span>
      </section>

      <div class="lf-grid lf21-grid" ref={gridRef}>
        <For each={slots()}>
          {(slot) => {
            if (slot.kind === 'placeholder') {
              return <div class="lf-placeholder" data-key={PLACEHOLDER_KEY} style={{ height: `${Math.min(drag()?.h ?? 160, 260)}px` }} />
            }
            const card = slot
            return (
              <article
                class="lf-card lf21-card"
                data-key={card.key}
                data-flip=""
                data-hidden={card.visible ? 'false' : 'true'}
                classList={{
                  'is-hidden-card': !card.visible,
                  'is-pressing': pressingKey() === card.key,
                  'is-landed': landedKey() === card.key,
                  'is-editing': editingKey() === card.key,
                  'is-edited': !!(card.title || card.description !== undefined),
                }}
              >
                <div class="lf-card-top">
                  <span
                    class="lf-handle"
                    data-handle
                    classList={{ 'is-disabled': !card.visible }}
                    title={card.visible ? `${pressMs() / 1000}秒長押しで並び替え` : '非表示のカードは並び替えできません'}
                    onPointerDown={(event) => card.visible && onHandlePointerDown(event, card)}
                    onTouchStart={(event) => card.visible && onHandleTouchStart(event, card)}
                  >
                    {pad(numbers().get(card.key))}
                  </span>
                  <span class="lf21-card-actions">
                    <button type="button" class="lf-chip" onClick={() => beginEdit(card)} disabled={editingKey() === card.key}>編集</button>
                    <label class="lf21-visible" title="外すと暗くなって最後に回り、配布用レイアウトに出ません">
                      <input type="checkbox" checked={card.visible} onChange={(e) => setVisible(card.key, e.currentTarget.checked)} />
                      表示
                    </label>
                  </span>
                </div>
                <Show when={editingKey() === card.key} fallback={
                  <>
                    <h3>{cardTitle(card)}<CopyButton text={cardTitle(card)} label="タイトル" /></h3>
                    <p>{cardDescription(card) || '説明は未登録です。'}</p>
                    <Show when={cardDescription(card)}>
                      <div class="lf-copy-row lf-app-only"><CopyButton text={cardDescription(card)} label="説明" /><span>説明をコピー</span></div>
                    </Show>
                    <Show when={card.title || card.description !== undefined}>
                      <small class="lf21-edited">このリーフレット用に編集済み</small>
                    </Show>
                  </>
                }>
                  <div class="lf-topic-editor lf21-editor">
                    <label>タイトル<input value={draftTitle()} onInput={(e) => setDraftTitle(e.currentTarget.value)} /></label>
                    <label>説明<textarea rows="6" value={draftBody()} onInput={(e) => setDraftBody(e.currentTarget.value)} /></label>
                    <p class="lf21-note">原本の成分カードは変わりません（このリーフレットだけ）</p>
                    <div>
                      <Show when={card.title || card.description !== undefined}>
                        <button onClick={() => resetEdit(card)}>原本の文に戻す</button>
                      </Show>
                      <button onClick={() => setEditingKey(null)}>キャンセル</button>
                      <button class="primary" onClick={() => saveEdit(card)}>保存</button>
                    </div>
                  </div>
                </Show>
              </article>
            )
          }}
        </For>
      </div>

      <Show when={drag() && draggingCard()}>
        {(card) => (
          <Portal>
            <div class="lf-floating is-reordering" style={{ left: `${drag()!.x - drag()!.dx}px`, top: `${drag()!.y - drag()!.dy}px`, width: `${drag()!.w}px` }}>
              <div class="lf-floating-inner lf-card">
                <div class="lf-card-top"><span class="lf-handle">↕</span></div>
                <h3>{cardTitle(card())}</h3>
                <p>{cardDescription(card())}</p>
              </div>
            </div>
          </Portal>
        )}
      </Show>

      <Show when={pickerOpen()}>
        <div class="lf-modal-backdrop" onClick={() => setPickerOpen(false)}>
          <section class="lf-modal" role="dialog" aria-modal="true" aria-label="header画像を選ぶ" onClick={(e) => e.stopPropagation()}>
            <header>
              <div><p class="lf-kicker">PHOTO GALLERY</p><h2>header の画像を選ぶ</h2></div>
              <button type="button" onClick={() => setPickerOpen(false)} aria-label="閉じる">×</button>
            </header>
            <PhotoGallery
              product={props.product}
              selected={props.leaflet.image}
              onSelect={(image) => { updateLeaflet(props.leaflet.id, { image }); setPickerOpen(false) }}
            />
          </section>
        </div>
      </Show>
    </div>
  )
}

export default LeafletEditorV21
