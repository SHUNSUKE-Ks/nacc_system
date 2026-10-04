import { type Component, batch, createMemo, createSignal, For, onCleanup, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import type { Product } from '../../types'
import {
  type Leaflet, type LeafletCard, type LeafletItem, type LeafletTopic,
  newKey, savedAt, setLeafletItems, setLeafletView, updateLeaflet,
} from './store'
import HelpButton, { HELP_LEAFLET_EDITOR } from '../../components/HelpButton'
import { categoryLabel, CopyButton, LeafletVisual, nutrientById, OriginalSafeNote, originalNutrients, SaveButton, showToast } from './shared'

type Col = 'left' | 'right'
type DragSource = { col: Col; key: string; item: LeafletItem }
type DragState = {
  mode: 'dragging' | 'reordering'
  src: DragSource
  x: number; y: number
  dx: number; dy: number
  w: number; h: number
  copy: boolean
}
type DropTarget = { col: Col; index: number }
type Pending = {
  src: DragSource
  el: HTMLElement
  startX: number; startY: number
  x: number; y: number
  viaHandle: boolean
  pointerType: string
  timer?: number
}

const LONG_PRESS_MS = 600
const MOVE_TOLERANCE = 8
const PLACEHOLDER = { kind: 'placeholder', key: '__placeholder' } as const
type Slot = LeafletItem | typeof PLACEHOLDER

const LeafletEditor: Component<{ leaflet: Leaflet; product: Product }> = (props) => {
  let rootRef!: HTMLDivElement
  let leftColRef!: HTMLElement
  let rightColRef!: HTMLElement
  let leftGridRef!: HTMLDivElement
  let rightGridRef!: HTMLDivElement

  const [drag, setDrag] = createSignal<DragState | null>(null)
  const [target, setTarget] = createSignal<DropTarget | null>(null)
  /** 同じ成分を右カラムへもう1枚置こうとしている（置けない） */
  const [duplicateName, setDuplicateName] = createSignal<string | null>(null)
  const [pressingKey, setPressingKey] = createSignal<string | null>(null)
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null)
  const [landedKey, setLandedKey] = createSignal<string | null>(null)
  const [copyMode, setCopyMode] = createSignal(false)
  /** 商品・コメント欄は普段たたんでおき、2カラムを広く使う */
  const [headerOpen, setHeaderOpen] = createSignal(false)
  const [editingTopicKey, setEditingTopicKey] = createSignal<string | null>(null)
  const [draftHeading, setDraftHeading] = createSignal('')
  const [draftBody, setDraftBody] = createSignal('')
  let pending: Pending | null = null
  let lastPointerType = 'mouse'
  let scrollFrame = 0

  // 画面の上下端に近づいたら自動スクロール（離れたカラムへも運べるように）
  function autoScroll() {
    scrollFrame = 0
    const d = drag()
    if (!d) return
    // 列が独立してスクロールする画面（横幅が広いとき）は列を、そうでなければページを動かす
    const col = [leftColRef, rightColRef].find((c) => contains(c, d.x, d.y) && c.scrollHeight > c.clientHeight + 4)
    const scroller = col ?? (rootRef.closest('.lf-page') as HTMLElement | null)
    if (!scroller) return
    const box = col ? col.getBoundingClientRect() : { top: 0, bottom: window.innerHeight }
    const edge = 64
    const speed = d.y < box.top + edge ? -(box.top + edge - d.y) / 4 : d.y > box.bottom - edge ? (d.y - (box.bottom - edge)) / 4 : 0
    if (speed === 0) return
    scroller.scrollTop += speed
    updateTarget(d.x, d.y)
    scrollFrame = requestAnimationFrame(autoScroll)
  }

  const items = () => props.leaflet.items
  const original = createMemo(() => originalNutrients(props.product))
  const originalIndex = createMemo(() => new Map(original().map((nutrient, index) => [nutrient.id, index])))

  // 左カラム = 原本の成分のうち、まだ掲載していないもの（原本の順番のまま）
  const candidateCache = new Map<string, LeafletCard>()
  const candidates = createMemo(() => {
    const used = new Set(items().filter((item): item is LeafletCard => item.kind === 'card').map((card) => card.nutrientId))
    return original()
      .filter((nutrient) => !used.has(nutrient.id))
      .map((nutrient) => {
        let card = candidateCache.get(nutrient.id)
        if (!card) {
          card = { kind: 'card', key: `src-${nutrient.id}`, nutrientId: nutrient.id, visible: true }
          candidateCache.set(nutrient.id, card)
        }
        return card
      })
  })

  const isHiddenSource = (key: string) => {
    const d = drag()
    return !!d && d.src.col === 'right' && d.src.key === key && !d.copy
  }

  const rightSlots = createMemo<Slot[]>(() => {
    const list: Slot[] = items().filter((item) => !isHiddenSource(item.key))
    const t = target()
    if (t?.col === 'right') list.splice(t.index, 0, PLACEHOLDER)
    return list
  })

  const leftSlots = createMemo<Slot[]>(() => {
    const list: Slot[] = [...candidates()]
    const t = target()
    if (t?.col === 'left') list.splice(t.index, 0, PLACEHOLDER)
    return list
  })

  // 右カラムのカード番号（配布順）
  const cardNumbers = createMemo(() => {
    const map = new Map<string, number>()
    let n = 0
    for (const item of items()) if (item.kind === 'card') map.set(item.key, ++n)
    return map
  })

  const pad = (n: number | undefined) => String(n ?? 0).padStart(2, '0')

  // ── FLIP: 挿入位置が変わったとき、他カードを滑らかに移動させる ─────────────
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
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' },
      )
    })
  }

  // ── ドロップ位置の計算 ────────────────────────────────────────────────────
  const contains = (el: Element, x: number, y: number) => {
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  function indexInGrid(grid: HTMLElement, col: Col, x: number, y: number): number {
    let index = 0
    for (const child of Array.from(grid.children) as HTMLElement[]) {
      const key = child.dataset.key
      if (!key) continue
      const r = child.getBoundingClientRect()
      if (key === PLACEHOLDER.key) {
        // 青いラインの上にいる間は位置を固定して、ちらつきを防ぐ
        const current = target()
        if (contains(child, x, y) && current?.col === col) return current.index
        continue
      }
      if (y < r.top) return index
      if (y <= r.bottom && x < r.left + r.width / 2) return index
      index++
    }
    return index
  }

  function computeTarget(x: number, y: number): DropTarget | null {
    const d = drag()
    if (!d) return null
    setDuplicateName(null)
    if (contains(rightColRef, x, y)) {
      // 同じ成分の重複は受け付けない（複製して置く場合も）
      const item = d.src.item
      if (item.kind === 'card') {
        const exists = items().some((other) => other.kind === 'card' && other.nutrientId === item.nutrientId && (d.copy || other.key !== d.src.key))
        if (exists) {
          setDuplicateName(nutrientById(item.nutrientId)?.name ?? 'この成分')
          return null
        }
      }
      return { col: 'right', index: indexInGrid(rightGridRef, 'right', x, y) }
    }
    if (contains(leftColRef, x, y)) {
      // 左へ戻せるのは右カラムの成分カードだけ。Topic と左→左は受け付けない
      if (d.src.col !== 'right' || d.src.item.kind !== 'card') return null
      const nutrientId = d.src.item.nutrientId
      const stillUsed = items().some((item) => item.kind === 'card' && item.key !== d.src.key && item.nutrientId === nutrientId)
      if (stillUsed) return null
      const at = originalIndex().get(nutrientId) ?? Number.MAX_SAFE_INTEGER
      return { col: 'left', index: candidates().filter((card) => (originalIndex().get(card.nutrientId) ?? 0) < at).length }
    }
    return null
  }

  function updateTarget(x: number, y: number) {
    const next = computeTarget(x, y)
    const current = target()
    if (next?.col === current?.col && next?.index === current?.index) return
    flip(() => setTarget(next))
  }

  // ── ポインター操作 ────────────────────────────────────────────────────────
  function onPointerDown(event: PointerEvent, src: DragSource, viaHandle: boolean) {
    // iPad（指・Apple Pencil）は下の touch イベントで扱う。Safari はポインターだとスクロールに取られるため
    if (event.pointerType !== 'mouse') return
    if (event.button !== 0 || drag() || pending) return
    if (!viaHandle && (event.target as HTMLElement).closest('button, input, textarea, select, [data-handle]')) return
    const el = (event.currentTarget as HTMLElement).closest('[data-key]') as HTMLElement
    lastPointerType = event.pointerType
    pending = {
      src, el,
      startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY,
      viaHandle, pointerType: event.pointerType,
    }
    event.preventDefault()
    if (viaHandle) {
      setPressingKey(src.key)
      pending.timer = window.setTimeout(() => begin('reordering'), LONG_PRESS_MS)
    }
    attach()
  }

  // ── タッチ（iPad）: カードのどこでも0.6秒長押しで持ち上げる ─────────────
  // 長押しの前に指が動いたらスクロールとして扱う。持ち上げた後は touchmove を止めてスクロールさせない。
  // リスナーは触れた要素に付ける（並び替え中に要素がDOMから外れても、iOSは元の要素へイベントを送り続ける）
  let touchEl: HTMLElement | null = null

  function onTouchStart(event: TouchEvent, src: DragSource, viaHandle: boolean) {
    if (drag() || pending || event.touches.length !== 1) return
    if ((event.target as HTMLElement).closest('button, input, textarea, select')) return
    const touch = event.touches[0]
    const el = (event.currentTarget as HTMLElement).closest('[data-key]') as HTMLElement
    lastPointerType = 'touch'
    pending = {
      src, el,
      startX: touch.clientX, startY: touch.clientY,
      x: touch.clientX, y: touch.clientY,
      viaHandle, pointerType: 'touch',
    }
    setPressingKey(src.key)
    pending.timer = window.setTimeout(() => begin('reordering'), LONG_PRESS_MS)
    touchEl = event.currentTarget as HTMLElement
    touchEl.addEventListener('touchmove', onTouchMove, { passive: false })
    touchEl.addEventListener('touchend', onTouchEnd)
    touchEl.addEventListener('touchcancel', onTouchCancel)
    window.addEventListener('keydown', onKey)
    window.addEventListener('contextmenu', onContextMenu)
  }

  function onTouchMove(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    if (pending) {
      pending.x = touch.clientX
      pending.y = touch.clientY
      if (Math.hypot(touch.clientX - pending.startX, touch.clientY - pending.startY) > MOVE_TOLERANCE) cancel()
      return
    }
    const d = drag()
    if (!d) return
    if (event.cancelable) event.preventDefault()
    setDrag({ ...d, x: touch.clientX, y: touch.clientY, copy: copyMode() })
    updateTarget(touch.clientX, touch.clientY)
    if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll)
  }

  function onTouchEnd(event: TouchEvent) {
    if (drag() && event.cancelable) event.preventDefault()
    onUp()
  }

  function onTouchCancel() {
    cancel()
  }

  function detachTouch() {
    if (!touchEl) return
    touchEl.removeEventListener('touchmove', onTouchMove)
    touchEl.removeEventListener('touchend', onTouchEnd)
    touchEl.removeEventListener('touchcancel', onTouchCancel)
    touchEl = null
  }

  function begin(mode: DragState['mode']) {
    const p = pending
    if (!p) return
    window.clearTimeout(p.timer)
    pending = null
    setPressingKey(null)
    const r = p.el.getBoundingClientRect()
    const index = items().findIndex((item) => item.key === p.src.key)
    if (mode === 'reordering') navigator.vibrate?.(15)
    flip(() => batch(() => {
      setDrag({ mode, src: p.src, x: p.x, y: p.y, dx: p.x - r.left, dy: p.y - r.top, w: r.width, h: r.height, copy: copyMode() })
      setTarget(p.src.col === 'right' ? { col: 'right', index } : null)
    }))
  }

  function onMove(event: PointerEvent) {
    if (pending) {
      pending.x = event.clientX
      pending.y = event.clientY
      if (Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY) > MOVE_TOLERANCE) {
        // マウスは0.6秒待たずにドラッグ開始。タッチで長押し前に動いたら取り消し
        if (pending.pointerType === 'mouse') begin('dragging')
        else cancel()
      }
      return
    }
    const d = drag()
    if (!d) return
    event.preventDefault()
    setDrag({ ...d, x: event.clientX, y: event.clientY, copy: event.altKey || copyMode() })
    updateTarget(event.clientX, event.clientY)
    if (!scrollFrame) scrollFrame = requestAnimationFrame(autoScroll)
  }

  function onUp() {
    if (pending) {
      // 0.6秒未満で離した → 通常のカード選択
      const key = pending.src.key
      const viaHandle = pending.viaHandle
      cancel()
      if (viaHandle) setSelectedKey((prev) => (prev === key ? null : key))
      return
    }
    const d = drag()
    const t = target()
    const duplicate = duplicateName()
    if (d && t) drop(d, t)
    else {
      cancel()
      if (d && duplicate) showToast(`「${duplicate}」はすでに掲載されています。同じ成分は2枚入れられません。`, true)
    }
    setDuplicateName(null)
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === 'Escape') cancel()
    else if (event.key === 'Alt') {
      const d = drag()
      if (d) setDrag({ ...d, copy: event.type === 'keydown' || copyMode() })
    }
  }

  function onContextMenu(event: MouseEvent) {
    event.preventDefault()
    // 右クリックはキャンセル。タッチの長押しで出るメニューは抑止だけ
    if (lastPointerType === 'mouse') cancel()
  }

  function attach() {
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    window.addEventListener('contextmenu', onContextMenu)
  }

  function detach() {
    cancelAnimationFrame(scrollFrame)
    scrollFrame = 0
    detachTouch()
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', cancel)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('keyup', onKey)
    window.removeEventListener('contextmenu', onContextMenu)
  }

  function cancel() {
    if (pending) window.clearTimeout(pending.timer)
    pending = null
    setPressingKey(null)
    detach()
    if (drag()) flip(() => batch(() => { setDrag(null); setTarget(null) }))
  }

  function drop(d: DragState, t: DropTarget) {
    detach()
    const next: LeafletItem[] = items().map((item) => ({ ...item }))
    let landed: string | null = null
    if (t.col === 'right') {
      let moving: LeafletItem
      if (d.src.col === 'left' && d.src.item.kind === 'card') {
        moving = { kind: 'card', key: newKey('c'), nutrientId: d.src.item.nutrientId, visible: true }
      } else if (d.copy) {
        moving = { ...d.src.item, key: newKey(d.src.item.kind === 'card' ? 'c' : 't') }
      } else {
        const from = next.findIndex((item) => item.key === d.src.key)
        moving = next.splice(from, 1)[0]
      }
      next.splice(t.index, 0, moving)
      landed = moving.key
    } else {
      const from = next.findIndex((item) => item.key === d.src.key)
      if (from >= 0) next.splice(from, 1)
      if (d.src.item.kind === 'card') landed = `src-${d.src.item.nutrientId}`
    }
    flip(() => batch(() => {
      setDrag(null)
      setTarget(null)
      setLeafletItems(props.leaflet.id, next)
      setLandedKey(landed)
    }))
    window.setTimeout(() => setLandedKey(null), 420)
  }

  onCleanup(cancel)

  // ── カード・Topic の操作 ──────────────────────────────────────────────────
  function toggleVisible(key: string) {
    setLeafletItems(props.leaflet.id, items().map((item) =>
      item.key === key && item.kind === 'card' ? { ...item, visible: !item.visible } : { ...item }
    ))
  }

  function addTopic() {
    const topic: LeafletTopic = { kind: 'topic', key: newKey('t'), heading: '', body: '' }
    setLeafletItems(props.leaflet.id, [...items().map((item) => ({ ...item })), topic])
    beginTopicEdit(topic)
  }

  function beginTopicEdit(topic: LeafletTopic) {
    setDraftHeading(topic.heading)
    setDraftBody(topic.body)
    setEditingTopicKey(topic.key)
  }

  function saveTopic(key: string) {
    setLeafletItems(props.leaflet.id, items().map((item) =>
      item.key === key && item.kind === 'topic'
        ? { ...item, heading: draftHeading().trim() || '小見出し', body: draftBody().trim() }
        : { ...item }
    ))
    setEditingTopicKey(null)
  }

  function cancelTopicEdit(topic: LeafletTopic) {
    // 何も書かずに閉じた新規Topicは残さない
    if (!topic.heading && !topic.body) removeItem(topic.key)
    setEditingTopicKey(null)
  }

  function removeItem(key: string) {
    setLeafletItems(props.leaflet.id, items().filter((item) => item.key !== key).map((item) => ({ ...item })))
  }

  const savedLabel = () => {
    const at = savedAt()
    if (!at) return '自動保存'
    const d = new Date(at)
    return `保存しました ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
  }

  const editorState = () => {
    const d = drag()
    if (d) return d.mode === 'reordering' ? 'REORDERING' : 'DRAGGING_CARD'
    if (editingTopicKey()) return 'TOPIC_EDIT'
    return 'LEAFLET_EDIT'
  }

  // ── 描画 ──────────────────────────────────────────────────────────────────
  const CardBody: Component<{ card: LeafletCard; number: string; col: Col }> = (cardProps) => {
    const nutrient = () => nutrientById(cardProps.card.nutrientId)
    return (
      <>
        <div class="lf-card-top">
          <span
            class="lf-handle"
            data-handle
            title="長押し（0.6秒）で並び替え"
            onPointerDown={(event) => onPointerDown(event, { col: cardProps.col, key: cardProps.card.key, item: cardProps.card }, true)}
            onTouchStart={(event) => onTouchStart(event, { col: cardProps.col, key: cardProps.card.key, item: cardProps.card }, true)}
          >
            {cardProps.number}
          </span>
          <Show when={cardProps.col === 'right'}>
            <button
              class="lf-chip"
              classList={{ 'is-off': !cardProps.card.visible }}
              onClick={() => toggleVisible(cardProps.card.key)}
            >
              {cardProps.card.visible ? '表示中' : '非表示'}
            </button>
          </Show>
        </div>
        <h3>{nutrient()?.name ?? '（削除された成分）'}<CopyButton text={nutrient()?.name ?? ''} label="タイトル" /></h3>
        <p>{nutrient()?.description || '説明は未登録です。'}</p>
        <Show when={nutrient()?.description}>
          <div class="lf-copy-row lf-app-only"><CopyButton text={nutrient()?.description ?? ''} label="説明" /><span>説明をコピー</span></div>
        </Show>
      </>
    )
  }

  const TopicBody: Component<{ topic: LeafletTopic }> = (topicProps) => (
    <Show
      when={editingTopicKey() === topicProps.topic.key}
      fallback={
        <>
          <div class="lf-card-top">
            <span
              class="lf-handle is-topic"
              data-handle
              title="長押し（0.6秒）で並び替え"
              onPointerDown={(event) => onPointerDown(event, { col: 'right', key: topicProps.topic.key, item: topicProps.topic }, true)}
              onTouchStart={(event) => onTouchStart(event, { col: 'right', key: topicProps.topic.key, item: topicProps.topic }, true)}
            >
              TOPIC
            </span>
            <span class="lf-topic-actions">
              <button class="lf-chip" onClick={() => beginTopicEdit(topicProps.topic)}>編集</button>
              <button class="lf-chip" onClick={() => removeItem(topicProps.topic.key)}>削除</button>
            </span>
          </div>
          <h4>{topicProps.topic.heading || '小見出し'}</h4>
          <p>{topicProps.topic.body || '本文は未入力です。'}</p>
        </>
      }
    >
      <div class="lf-topic-editor">
        <label>小見出し<input ref={(el) => queueMicrotask(() => el.focus())} value={draftHeading()} onInput={(e) => setDraftHeading(e.currentTarget.value)} placeholder="例: この資料で見るポイント" /></label>
        <label>本文<textarea rows="4" value={draftBody()} onInput={(e) => setDraftBody(e.currentTarget.value)} placeholder="原本は書き換えず、この資料だけのメモとして保存されます" /></label>
        <div>
          <button onClick={() => cancelTopicEdit(topicProps.topic)}>キャンセル</button>
          <button class="primary" onClick={() => saveTopic(topicProps.topic.key)}>保存</button>
        </div>
      </div>
    </Show>
  )

  const renderSlot = (slot: Slot, col: Col) => {
    if (slot.kind === 'placeholder') {
      const d = drag()
      const wide = d?.src.item.kind === 'topic'
      return <div class="lf-placeholder" classList={{ 'is-wide': wide }} data-key={PLACEHOLDER.key} style={{ height: `${Math.min(d?.h ?? 120, 220)}px` }} />
    }
    const item = slot
    const common = {
      'data-key': item.key,
      'data-flip': '',
      onPointerDown: (event: PointerEvent) => onPointerDown(event, { col, key: item.key, item }, false),
      onTouchStart: (event: TouchEvent) => onTouchStart(event, { col, key: item.key, item }, false),
    }
    if (item.kind === 'topic') {
      return (
        <article {...common} class="lf-topic" classList={{ 'is-landed': landedKey() === item.key, 'is-pressing': pressingKey() === item.key }}>
          <TopicBody topic={item} />
        </article>
      )
    }
    return (
      <article
        {...common}
        class="lf-card"
        classList={{
          'is-hidden-card': !item.visible,
          'is-selected': selectedKey() === item.key,
          'is-pressing': pressingKey() === item.key,
          'is-landed': landedKey() === item.key,
          'is-ghost': col === 'left' && drag()?.src.key === item.key,
        }}
      >
        <CardBody card={item} number={col === 'right' ? pad(cardNumbers().get(item.key)) : pad((originalIndex().get(item.nutrientId) ?? 0) + 1)} col={col} />
      </article>
    )
  }

  const floatingItem = () => drag()?.src.item

  return (
    <div class="lf-editor" ref={rootRef} data-state={editorState()} classList={{ 'is-dragging': !!drag() }}>
      <div class="lf-topbar">
        <button class="lf-back" onClick={() => setLeafletView({ view: 'gallery' })}>← リーフレットGallery</button>
        <OriginalSafeNote />
        <HelpButton title="2カラム編集" items={HELP_LEAFLET_EDITOR} />
        <span class="lf-saved">{savedLabel()}</span>
        <SaveButton />
        <span class="lf-state-badge">{editorState()}</span>
        <label class="lf-copy-toggle" title="Altキーを押しながらドロップしても複製になります">
          <input type="checkbox" checked={copyMode()} onChange={(e) => setCopyMode(e.currentTarget.checked)} />
          複製して置く
        </label>
        <button class="lf-primary" onClick={() => setLeafletView({ view: 'layout', id: props.leaflet.id })}>配布用レイアウトを編集 →</button>
      </div>

      {/* Header: 左=商品 / 右=この資料のコメント */}
      <Show when={!headerOpen()}>
        <div class="lf-header-compact">
          <LeafletVisual image={props.leaflet.image} product={props.product} />
          <div class="lf-header-compact-text">
            <strong>{props.leaflet.title || props.product.name}</strong>
            <span>{props.leaflet.audience || '対象者未設定'}　·　{props.leaflet.comment ? props.leaflet.comment.split('\n')[0] : 'コメント未入力'}</span>
          </div>
          <span class="lf-badge" classList={{ 'is-ready': props.leaflet.status === 'ready' }}>{props.leaflet.status === 'ready' ? '配布可' : '下書き'}</span>
          <button type="button" class="lf-header-toggle" onClick={() => setHeaderOpen(true)}>商品・コメントを編集 ▾</button>
        </div>
      </Show>
      <Show when={headerOpen()}>
      <header class="lf-header">
        <div class="lf-header-product">
          <LeafletVisual image={props.leaflet.image} product={props.product} />
          <div>
            <p class="lf-kicker">NACC · LEAFLET</p>
            <h1>{props.product.name}</h1>
            <span class="lf-meta">{props.product.id} · {categoryLabel(props.product)}</span>
            <div class="lf-badges">
              <span class="lf-badge is-leaflet">リーフレット</span>
              <button
                class="lf-badge"
                classList={{ 'is-ready': props.leaflet.status === 'ready' }}
                onClick={() => updateLeaflet(props.leaflet.id, { status: props.leaflet.status === 'ready' ? 'draft' : 'ready' })}
                title="クリックで下書き／配布可を切り替え"
              >
                {props.leaflet.status === 'ready' ? '配布可' : '下書き'}
              </button>
            </div>
          </div>
        </div>
        <div class="lf-header-comment">
          <label>リーフレット名
            <input value={props.leaflet.name} onInput={(e) => updateLeaflet(props.leaflet.id, { name: e.currentTarget.value })} />
          </label>
          <label>対象者・用途
            <input value={props.leaflet.audience} onInput={(e) => updateLeaflet(props.leaflet.id, { audience: e.currentTarget.value })} placeholder="例: 新人向け／販売店向け／お客様配布用" />
          </label>
          <label>商品に入れるコメント
            <textarea rows="4" value={props.leaflet.comment} onInput={(e) => updateLeaflet(props.leaflet.id, { comment: e.currentTarget.value })} placeholder="この資料だけのコメント。原本の商品説明は書き換えません" />
          </label>
          <label>注意書き・問い合わせ先・担当者
            <input value={props.leaflet.contact} onInput={(e) => updateLeaflet(props.leaflet.id, { contact: e.currentTarget.value })} placeholder="例: 担当 山田／お問い合わせ 03-0000-0000" />
          </label>
        </div>
      </header>

      <button type="button" class="lf-header-toggle is-close" onClick={() => setHeaderOpen(false)}>たたむ ▴</button>
      </Show>

      {/* Main: 2カラム */}
      <div class="lf-columns">
        <section class="lf-col" ref={leftColRef} classList={{ 'is-drop': target()?.col === 'left' }}>
          <header class="lf-col-head">
            <p>CANDIDATES</p>
            <h2>掲載候補 <small>原本から選ぶ · {candidates().length}件</small></h2>
          </header>
          <div class="lf-grid" ref={leftGridRef}>
            <For each={leftSlots()} fallback={<p class="lf-empty">原本の成分はすべて掲載中です。</p>}>
              {(slot) => renderSlot(slot, 'left')}
            </For>
          </div>
        </section>

        <section class="lf-col is-right" ref={rightColRef} classList={{ 'is-drop': target()?.col === 'right' }}>
          <header class="lf-col-head">
            <p>IN THIS LEAFLET</p>
            <h2>この資料に掲載する内容 <small>配布順に並ぶ</small></h2>
          </header>
          <div class="lf-grid" ref={rightGridRef}>
            <For each={rightSlots()} fallback={<p class="lf-empty">左の掲載候補から、載せたいカードをここへドラッグしてください。<br />入れた順に 01 から番号が付きます。</p>}>
              {(slot) => renderSlot(slot, 'right')}
            </For>
          </div>
          <div class="lf-divider"><span>補足 Topic</span></div>
          <button class="lf-add-topic" onClick={addTopic}>＋ Topic</button>
        </section>
      </div>

      <p class="lf-help">
        iPad：カードを0.6秒長押し → 持ち上がったら指を動かして左右へ移動・並び替え／マウス：そのままドラッグ（Number長押しでも可）／カラムの外で離すと取り消し
      </p>

      <Show when={drag()}>
        {(d) => (
          <Portal>
            <div
              class="lf-floating"
              classList={{ 'is-reordering': d().mode === 'reordering', 'is-blocked': !target(), 'is-duplicate': !!duplicateName() }}
              style={{ left: `${d().x - d().dx}px`, top: `${d().y - d().dy}px`, width: `${d().w}px` }}
            >
              <div class="lf-floating-inner" classList={{ 'lf-topic': floatingItem()?.kind === 'topic', 'lf-card': floatingItem()?.kind === 'card' }}>
                <Show when={floatingItem()?.kind === 'card' ? (floatingItem() as LeafletCard) : null} fallback={
                  <>
                    <div class="lf-card-top"><span class="lf-handle is-topic">TOPIC</span></div>
                    <h4>{(floatingItem() as LeafletTopic).heading || '小見出し'}</h4>
                    <p>{(floatingItem() as LeafletTopic).body}</p>
                  </>
                }>
                  {(card) => (
                    <>
                      <div class="lf-card-top"><span class="lf-handle">↕</span></div>
                      <h3>{nutrientById(card().nutrientId)?.name}</h3>
                      <p>{nutrientById(card().nutrientId)?.description}</p>
                    </>
                  )}
                </Show>
                <Show when={d().copy && d().src.col === 'right' && !duplicateName()}><span class="lf-copy-badge">＋複製</span></Show>
                <Show when={duplicateName()}><span class="lf-dup-badge">同じ成分は入れられません</span></Show>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </div>
  )
}

export default LeafletEditor
