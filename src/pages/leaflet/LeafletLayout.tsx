import { Portal } from 'solid-js/web'
import { type Component, createEffect, createMemo, createSignal, For, Match, on, onCleanup, Show, Switch } from 'solid-js'
import type { Product } from '../../types'
import {
  type GalleryLook, type ImageAdjust, type HeaderRule, type HeaderStyle, type PageCorner, type PageMark, type TopicUnderline, type Leaflet, type LeafletCard, type LeafletSection, type LeafletTopic, type SectionType,
  MAX_CIRCLES, imageKeyOf, newSection, openLeafletEditor, setLeafletItems, setLeafletMarks, setLeafletSections, setLeafletView, updateLeaflet,
} from './store'
import { cardDescription, cardTitle, CopyButton, formatDate, LeafletVisual, OriginalSafeNote, PhotoGallery, SaveButton } from './shared'
import { IconPicker, TopicIconSvg } from './icons'
import HelpButton, { HELP_LEAFLET_LAYOUT } from '../../components/HelpButton'
import { applyMark, MarkedText, MarkerPen, type PenAction } from './marks'

const SECTION_LABELS: Record<SectionType, string> = {
  gallery: 'カードGallery',
  circles: '主成分サークル',
  topic: 'Topic',
}
const LOOK_LABELS: Record<GalleryLook, string> = { card: 'カード', main: '主要成分' }
const HEADER_STYLES: { id: HeaderStyle; label: string }[] = [
  { id: 'wide', label: 'ワイド' },
  { id: 'split', label: 'ビジュアル右' },
  { id: 'classic', label: 'クラシック' },
  { id: 'banner', label: 'アーチ' },
]
const HEADER_RULES: { id: HeaderRule; label: string }[] = [
  { id: 'none', label: 'なし' },
  { id: 'title', label: '商品名の下' },
  { id: 'photo', label: '写真の下' },
]
const CARD_MIME = 'application/x-leaflet-card'
const UNDERLINES: { id: TopicUnderline; label: string }[] = [
  { id: 'line', label: '線' },
  { id: 'double', label: '二重線' },
  { id: 'none', label: 'なし' },
]
const CORNERS: { id: PageCorner; label: string }[] = [
  { id: 'br', label: '右下' },
  { id: 'bl', label: '左下' },
  { id: 'tr', label: '右上' },
]
const NO_ADJUST: ImageAdjust = { x: 0, y: 0, scale: 1 }
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const DEFAULT_PAGE_MARK: PageMark = { name: true, number: true, corner: 'br' }

// A4 縦・余白 上下14mm／左右12mm（印刷時の @page と同じ値）
const MM = 96 / 25.4
const PAGE_W_MM = 210 - 12 * 2
const PAGE_H_MM = 297 - 14 * 2
type PageBreak = { y: number; page: number; moved: string }

/** Topic見出しの下線の切り替え（線／二重線／なし） */
const UnderlinePicker: Component<{ value?: TopicUnderline; onChange: (value: TopicUnderline) => void }> = (props) => (
  <div class="lf-ul-picker lf-app-only" role="radiogroup" aria-label="タイトルの下線">
    <For each={UNDERLINES}>
      {(item) => (
        <button
          type="button"
          role="radio"
          aria-checked={(props.value ?? 'line') === item.id}
          classList={{ 'is-active': (props.value ?? 'line') === item.id }}
          onClick={() => props.onChange(item.id)}
        >
          <i class={`lf-ul-thumb is-${item.id}`} aria-hidden="true" />{item.label}
        </button>
      )}
    </For>
  </div>
)

// 配布用レイアウト編集（LAYOUT_EDIT）。仕上がりを確認すると編集枠が消え、そのまま印刷できる
const LeafletLayout: Component<{ leaflet: Leaflet; product: Product }> = (props) => {
  const [clean, setClean] = createSignal(false)
  const [penOn, setPenOn] = createSignal(false)
  const [showPages, setShowPages] = createSignal(false)
  const [liveAdjust, setLiveAdjust] = createSignal<ImageAdjust | null>(null)
  let stageRef!: HTMLDivElement
  const [breaks, setBreaks] = createSignal<PageBreak[]>([])
  let sheetRef!: HTMLDivElement
  const [pickerOpen, setPickerOpen] = createSignal(false)
  const [insertAt, setInsertAt] = createSignal<number | null>(null)
  const [dropSectionId, setDropSectionId] = createSignal<string | null>(null)
  /** iPad用: 長押しで持ち上げたカード（主成分サークルへ運ぶ） */
  const [cardDrag, setCardDrag] = createSignal<{ key: string; label: string; x: number; y: number } | null>(null)
  let cardPress: { key: string; label: string; startX: number; startY: number; x: number; y: number; timer: number } | null = null
  let cardTouchEl: HTMLElement | null = null
  let carryFrame = 0

  /** 運んでいる間、画面の上下の端に近づいたらページをスクロール（離れたサークルへ届くように） */
  function carryScroll() {
    carryFrame = 0
    const d = cardDrag()
    if (!d) return
    const scroller = document.querySelector('.lf-page') as HTMLElement | null
    if (!scroller) return
    const top = 90
    const bottom = window.innerHeight - 70
    const speed = d.y < top ? -(top - d.y) / 3 : d.y > bottom ? (d.y - bottom) / 3 : 0
    if (!speed) return
    scroller.scrollTop += speed
    updateCarryTarget(d.x, d.y)
    carryFrame = requestAnimationFrame(carryScroll)
  }

  function updateCarryTarget(x: number, y: number) {
    const zone = document.elementFromPoint(x, y)?.closest('[data-circles-id]') as HTMLElement | null
    setDropSectionId(zone?.dataset.circlesId ?? null)
  }

  function onCardTouchStart(event: TouchEvent, card: LeafletCard) {
    if (asText() || cardDrag() || cardPress || event.touches.length !== 1) return
    if ((event.target as HTMLElement).closest('button, input, textarea, select, label')) return
    const touch = event.touches[0]
    cardTouchEl = event.currentTarget as HTMLElement
    const press = { key: card.key, label: cardTitle(card), startX: touch.clientX, startY: touch.clientY, x: touch.clientX, y: touch.clientY, timer: 0 }
    press.timer = window.setTimeout(() => {
      setCardDrag({ key: press.key, label: press.label, x: press.x, y: press.y })
      cardPress = null
    }, 400)
    cardPress = press
    cardTouchEl.addEventListener('touchmove', onCardTouchMove, { passive: false })
    cardTouchEl.addEventListener('touchend', onCardTouchEnd)
    cardTouchEl.addEventListener('touchcancel', endCardDrag)
  }

  function onCardTouchMove(event: TouchEvent) {
    const touch = event.touches[0]
    if (!touch) return
    if (cardPress) {
      cardPress.x = touch.clientX
      cardPress.y = touch.clientY
      // 長押しの前に動いたらスクロール
      if (Math.hypot(touch.clientX - cardPress.startX, touch.clientY - cardPress.startY) > 8) endCardDrag()
      return
    }
    const d = cardDrag()
    if (!d) return
    if (event.cancelable) event.preventDefault()
    setCardDrag({ ...d, x: touch.clientX, y: touch.clientY })
    updateCarryTarget(touch.clientX, touch.clientY)
    if (!carryFrame) carryFrame = requestAnimationFrame(carryScroll)
  }

  function onCardTouchEnd(event: TouchEvent) {
    const d = cardDrag()
    const sectionId = dropSectionId()
    if (d && event.cancelable) event.preventDefault()
    if (d && sectionId) {
      const section = sections().find((item) => item.id === sectionId)
      if (section) addToCircles(section, d.key)
    }
    endCardDrag()
  }

  function endCardDrag() {
    cancelAnimationFrame(carryFrame)
    carryFrame = 0
    if (cardPress) window.clearTimeout(cardPress.timer)
    cardPress = null
    setCardDrag(null)
    setDropSectionId(null)
    if (cardTouchEl) {
      cardTouchEl.removeEventListener('touchmove', onCardTouchMove)
      cardTouchEl.removeEventListener('touchend', onCardTouchEnd)
      cardTouchEl.removeEventListener('touchcancel', endCardDrag)
      cardTouchEl = null
    }
  }
  onCleanup(endCardDrag)

  const sections = () => props.leaflet.sections
  const visibleItems = () => props.leaflet.items.filter((item) => item.kind === 'topic' || item.visible)
  const cards = () => props.leaflet.items.filter((item): item is LeafletCard => item.kind === 'card')
  const cardByKey = (key: string) => cards().find((card) => card.key === key)
  const hasGallery = () => sections().some((section) => section.type === 'gallery')
  const marksOf = (targetId: string) => props.leaflet.marks?.[targetId]
  /** 文字として表示する状態（仕上がり確認中・マーカーを引いている間） */
  const asText = () => clean() || penOn()
  const cardNumber = createMemo(() => {
    const map = new Map<string, number>()
    let n = 0
    for (const item of visibleItems()) if (item.kind === 'card') map.set(item.key, ++n)
    return map
  })
  const pad = (n?: number) => String(n ?? 0).padStart(2, '0')

  // ── セクション操作 ──────────────────────────────────────────────────────
  const save = (next: LeafletSection[]) => setLeafletSections(props.leaflet.id, next)
  const copySections = () => sections().map((section) => ({
    ...section, cardKeys: [...section.cardKeys], labels: { ...section.labels }, names: { ...section.names }, descs: { ...(section.descs ?? {}) },
  }))

  function patchSection(id: string, patch: Partial<LeafletSection>) {
    save(copySections().map((section) => (section.id === id ? { ...section, ...patch } : section)))
  }

  function addSection(index: number, type: SectionType) {
    const next = copySections()
    next.splice(index, 0, newSection(type))
    save(next)
    setInsertAt(null)
  }

  function moveSection(index: number, dir: -1 | 1) {
    const next = copySections()
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    save(next)
  }

  function removeSection(section: LeafletSection) {
    if (!confirm(`「${SECTION_LABELS[section.type]}」セクションを削除しますか？（カード自体は残ります）`)) return
    save(copySections().filter((item) => item.id !== section.id))
  }

  function addToCircles(section: LeafletSection, key: string) {
    if (!key || section.cardKeys.includes(key) || section.cardKeys.length >= MAX_CIRCLES) return
    patchSection(section.id, { cardKeys: [...section.cardKeys, key] })
  }

  function removeFromCircles(section: LeafletSection, key: string) {
    const labels = { ...section.labels }
    const names = { ...section.names }
    delete labels[key]
    delete names[key]
    patchSection(section.id, { cardKeys: section.cardKeys.filter((item) => item !== key), labels, names })
  }

  function patchTopicItem(key: string, patch: Partial<LeafletTopic>) {
    setLeafletItems(props.leaflet.id, props.leaflet.items.map((item) =>
      item.key === key && item.kind === 'topic' ? { ...item, ...patch } : { ...item }
    ))
  }

  /** 配布表示の並びで1つ前／後ろへ（非表示のカードは飛ばす） */
  function moveItem(key: string, dir: -1 | 1) {
    const list = props.leaflet.items.map((item) => ({ ...item }))
    const visible = list.filter((item) => item.kind === 'topic' || item.visible)
    const at = visible.findIndex((item) => item.key === key)
    const other = visible[at + dir]
    if (at < 0 || !other) return
    const a = list.findIndex((item) => item.key === key)
    const b = list.findIndex((item) => item.key === other.key)
    ;[list[a], list[b]] = [list[b], list[a]]
    setLeafletItems(props.leaflet.id, list)
  }

  const MoveButtons: Component<{ itemKey: string }> = (move) => {
    const position = () => visibleItems().findIndex((item) => item.key === move.itemKey)
    return (
      <span class="lf-move lf-app-only">
        <button type="button" onClick={() => moveItem(move.itemKey, -1)} disabled={position() <= 0} title="前へ" aria-label="前へ移動">‹</button>
        <button type="button" onClick={() => moveItem(move.itemKey, 1)} disabled={position() >= visibleItems().length - 1} title="後ろへ" aria-label="後ろへ移動">›</button>
      </span>
    )
  }

  function applyPen(targetId: string, s: number, e: number, action: PenAction) {
    setLeafletMarks(props.leaflet.id, targetId, applyMark(marksOf(targetId) ?? [], s, e, action))
  }

  // ── 印刷: 編集枠を消してから印刷し、終わったら戻す ─────────────────────
  function print() {
    const before = clean()
    setClean(true)
    const restore = () => { setClean(before); window.removeEventListener('afterprint', restore) }
    window.addEventListener('afterprint', restore)
    requestAnimationFrame(() => window.print())
  }

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { setPickerOpen(false); setInsertAt(null) }
  }
  window.addEventListener('keydown', onKey)
  onCleanup(() => window.removeEventListener('keydown', onKey))

  // ── 部品 ────────────────────────────────────────────────────────────────
  /** 編集中は入力欄、仕上がり確認・マーカー中は文字（markId があればマーカー対象）。空なら何も出さない */
  const EditableText: Component<{
    value: string; placeholder: string; multiline?: boolean; class?: string; markId?: string
    onSave: (value: string) => void
  }> = (field) => (
    <Show when={!asText()} fallback={
      <Show when={field.value}>
        <MarkedText tag="div" text={field.value} marks={field.markId ? marksOf(field.markId) : undefined} targetId={field.markId} class={field.class} />
      </Show>
    }>
      <Show when={field.multiline} fallback={
        <input class={`lf-inline ${field.class ?? ''}`} value={field.value} placeholder={field.placeholder} onChange={(e) => field.onSave(e.currentTarget.value)} />
      }>
        <textarea class={`lf-inline ${field.class ?? ''}`} rows="3" value={field.value} placeholder={field.placeholder} onChange={(e) => field.onSave(e.currentTarget.value)} />
      </Show>
    </Show>
  )

  const InsertBar: Component<{ index: number }> = (bar) => (
    <div class="lf-insert lf-app-only" classList={{ 'is-open': insertAt() === bar.index }}>
      <Show when={insertAt() === bar.index} fallback={
        <button type="button" class="lf-insert-btn" onClick={() => setInsertAt(bar.index)}>＋ セクション</button>
      }>
        <div class="lf-insert-menu">
          <button type="button" onClick={() => addSection(bar.index, 'circles')}>◎ 主成分サークル</button>
          <button type="button" onClick={() => addSection(bar.index, 'topic')}>¶ Topic</button>
          <Show when={!hasGallery()}>
            <button type="button" onClick={() => addSection(bar.index, 'gallery')}>▦ カードGallery</button>
          </Show>
          <button type="button" class="is-cancel" onClick={() => setInsertAt(null)}>閉じる</button>
        </div>
      </Show>
    </div>
  )

  const SectionTools: Component<{ section: LeafletSection; index: number }> = (tools) => (
    <div class="lf-section-tools lf-app-only">
      <span class="lf-section-kind">SECTION</span>
      <select
        value={tools.section.type}
        onChange={(e) => patchSection(tools.section.id, { type: e.currentTarget.value as SectionType })}
        aria-label="セクションの種類"
      >
        <For each={Object.keys(SECTION_LABELS) as SectionType[]}>
          {(type) => (
            <option value={type} disabled={type === 'gallery' && hasGallery() && tools.section.type !== 'gallery'}>
              {SECTION_LABELS[type]}
            </option>
          )}
        </For>
      </select>
      <Show when={tools.section.type === 'gallery'}>
        <div class="lf-look-tabs" role="tablist" aria-label="カードの見た目">
          <For each={Object.keys(LOOK_LABELS) as GalleryLook[]}>
            {(look) => (
              <button
                type="button"
                role="tab"
                aria-selected={tools.section.look === look}
                classList={{ 'is-active': tools.section.look === look }}
                onClick={() => patchSection(tools.section.id, { look })}
              >
                {LOOK_LABELS[look]}
              </button>
            )}
          </For>
        </div>
      </Show>
      <Show when={tools.section.type === 'topic'}>
        <IconPicker value={tools.section.icon} onChange={(icon) => patchSection(tools.section.id, { icon })} />
        <UnderlinePicker value={tools.section.underline} onChange={(underline) => patchSection(tools.section.id, { underline })} />
      </Show>
      <span class="lf-section-move">
        <button type="button" onClick={() => moveSection(tools.index, -1)} disabled={tools.index === 0} title="上へ">↑</button>
        <button type="button" onClick={() => moveSection(tools.index, 1)} disabled={tools.index === sections().length - 1} title="下へ">↓</button>
        <button type="button" onClick={() => removeSection(tools.section)} title="削除">×</button>
      </span>
    </div>
  )

  const TopicItem: Component<{ topic: LeafletTopic }> = (topic) => (
    <aside class="lf-topic is-preview">
      <Show when={!asText()}>
        <div class="lf-topic-controls">
          <MoveButtons itemKey={topic.topic.key} />
          <IconPicker value={topic.topic.icon} onChange={(icon) => patchTopicItem(topic.topic.key, { icon })} />
          <UnderlinePicker value={topic.topic.underline} onChange={(underline) => patchTopicItem(topic.topic.key, { underline })} />
        </div>
      </Show>
      <h4 class={`lf-topic-head is-ul-${topic.topic.underline ?? 'line'}`}><TopicIconSvg icon={topic.topic.icon} /><span>{topic.topic.heading}</span></h4>
      <MarkedText text={topic.topic.body} marks={marksOf(`topic:${topic.topic.key}:body`)} targetId={`topic:${topic.topic.key}:body`} />
    </aside>
  )

  const GallerySection: Component<{ section: LeafletSection }> = (sec) => (
    <>
      <EditableText value={sec.section.title} placeholder="見出し（任意）例: 配合成分" class="lf-section-title" onSave={(title) => patchSection(sec.section.id, { title })} />
      <Show when={visibleItems().length} fallback={<p class="lf-empty lf-app-only">掲載カードがありません。2カラム編集で左から右へ運んでください。</p>}>
        <div class="lf-grid is-preview" classList={{ 'is-main-look': sec.section.look === 'main' }}>
          <For each={visibleItems()}>
            {(item) => (
              <Show when={item.kind === 'card' ? (item as LeafletCard) : null} fallback={<TopicItem topic={item as LeafletTopic} />}>
                {(card) => {
                  return (
                    <article
                      class="lf-card is-preview"
                      draggable={!asText()}
                      onDragStart={(e) => { e.dataTransfer?.setData(CARD_MIME, card().key); e.dataTransfer!.effectAllowed = 'copy' }}
                      onTouchStart={(e) => onCardTouchStart(e, card())}
                      classList={{ 'is-main': sec.section.look === 'main', 'is-carrying': cardDrag()?.key === card().key }}
                    >
                      <div class="lf-card-top">
                        <span class="lf-number">{pad(cardNumber().get(card().key))}</span>
                        <Show when={sec.section.look === 'main'}><span class="lf-main-tag">主要成分</span></Show>
                        <Show when={!asText()}><MoveButtons itemKey={card().key} /></Show>
                      </div>
                      <h3>{cardTitle(card())}<CopyButton text={cardTitle(card())} label="タイトル" /></h3>
                      <MarkedText text={cardDescription(card())} marks={marksOf(`card:${card().key}:desc`)} targetId={`card:${card().key}:desc`} />
                      <Show when={cardDescription(card())}>
                        <div class="lf-copy-row lf-app-only"><CopyButton text={cardDescription(card())} label="説明" /><span>説明をコピー</span></div>
                      </Show>
                    </article>
                  )
                }}
              </Show>
            )}
          </For>
        </div>
      </Show>
    </>
  )

  const CirclesSection: Component<{ section: LeafletSection }> = (sec) => {
    const members = () => sec.section.cardKeys.map(cardByKey).filter((card): card is LeafletCard => !!card)
    const addable = () => cards().filter((card) => !sec.section.cardKeys.includes(card.key))
    const nameOf = (card: LeafletCard) => sec.section.names[card.key] || cardTitle(card)
    /** 丸の中の説明。まだ触っていなければカードの説明を引用。空にすれば何も出さない */
    const descOf = (card: LeafletCard) => {
      const descs = sec.section.descs ?? {}
      return card.key in descs ? descs[card.key] : cardDescription(card)
    }
    // 複数選択: チェックを入れてまとめて追加（空き枠の数まで）
    const [pickOpen, setPickOpen] = createSignal(false)
    const [picked, setPicked] = createSignal<string[]>([])
    const remaining = () => MAX_CIRCLES - members().length
    const togglePick = (key: string) => setPicked((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : prev.length < remaining() ? [...prev, key] : prev)
    const addPicked = () => {
      const keys = picked().filter((key) => !sec.section.cardKeys.includes(key)).slice(0, remaining())
      if (keys.length) patchSection(sec.section.id, { cardKeys: [...sec.section.cardKeys, ...keys] })
      setPicked([])
      setPickOpen(false)
    }
    return (
      <div class="lf-circles-wrap">
        <Show when={!clean() || members().length}>
          <EditableText
            value={sec.section.title}
            placeholder={`${members().length || 3}つの有効成分配合`}
            class="lf-pill-title"
            onSave={(title) => patchSection(sec.section.id, { title })}
          />
          <Show when={asText() && !sec.section.title && members().length}>
            <div class="lf-pill-title">{members().length}つの有効成分配合</div>
          </Show>
        </Show>
        <div
          class="lf-circles"
          data-count={members().length}
          data-circles-id={sec.section.id}
          classList={{ 'is-drop': dropSectionId() === sec.section.id }}
          onDragOver={(e) => {
            if (!e.dataTransfer?.types.includes(CARD_MIME) || members().length >= MAX_CIRCLES) return
            e.preventDefault()
            setDropSectionId(sec.section.id)
          }}
          onDragLeave={() => setDropSectionId(null)}
          onDrop={(e) => {
            e.preventDefault()
            setDropSectionId(null)
            addToCircles(sec.section, e.dataTransfer?.getData(CARD_MIME) ?? '')
          }}
        >
          <div class="lf-circles-row" data-count={members().length}>
          <For each={members()}>
            {(card) => (
              <div class="lf-circle">
                <EditableText
                  value={sec.section.labels[card.key] ?? ''}
                  placeholder="ラベル"
                  class="lf-circle-label"
                  onSave={(label) => patchSection(sec.section.id, { labels: { ...sec.section.labels, [card.key]: label } })}
                />
                {/* 丸の中の文字は改行位置を自由に変えられる（Enterで改行） */}
                <Show when={!asText()} fallback={<strong class="lf-circle-name">{nameOf(card)}</strong>}>
                  <textarea
                    class="lf-circle-name lf-circle-name-input"
                    rows="3"
                    value={nameOf(card)}
                    title="Enterで改行。空にすると成分名に戻ります"
                    onChange={(e) => patchSection(sec.section.id, { names: { ...sec.section.names, [card.key]: e.currentTarget.value.trim() ? e.currentTarget.value : '' } })}
                  />
                </Show>
                {/* 説明（DICT）: 原本とは切り離して、サークル用に短く書き換えられる */}
                <Show when={!asText()} fallback={<Show when={descOf(card)}><span class="lf-circle-desc">{descOf(card)}</span></Show>}>
                  <textarea
                    class="lf-circle-desc-input"
                    rows="3"
                    value={descOf(card)}
                    placeholder="説明（空にすると表示しません）"
                    title="丸に収まるよう短く書き換えられます（原本の説明は変わりません）"
                    onChange={(e) => patchSection(sec.section.id, { descs: { ...(sec.section.descs ?? {}), [card.key]: e.currentTarget.value } })}
                  />
                </Show>
                <span class="lf-circle-tools lf-app-only">
                  <CopyButton text={cardTitle(card)} label="タイトル" />
                  <button type="button" onClick={() => removeFromCircles(sec.section, card.key)} title="サークルから外す">×</button>
                </span>
              </div>
            )}
          </For>
          </div>
          <Show when={members().length < MAX_CIRCLES}>
            <div class="lf-circle-add lf-app-only">
              <span>カードを長押しでここへ運ぶ　または</span>
              <button type="button" class="lf-pick-toggle" onClick={() => { setPicked([]); setPickOpen(!pickOpen()) }} aria-expanded={pickOpen()}>
                ＋ 成分を選ぶ（複数可）
              </button>
              <small>あと{remaining()}つ（最大{MAX_CIRCLES}）</small>
              <Show when={pickOpen()}>
                <div class="lf-pick-panel" role="dialog" aria-label="主成分を選ぶ">
                  <div class="lf-pick-list">
                    <For each={addable()} fallback={<p class="lf-pick-empty">入れられるカードがありません</p>}>
                      {(card) => (
                        <label classList={{ 'is-disabled': !picked().includes(card.key) && picked().length >= remaining() }}>
                          <input
                            type="checkbox"
                            checked={picked().includes(card.key)}
                            disabled={!picked().includes(card.key) && picked().length >= remaining()}
                            onChange={() => togglePick(card.key)}
                          />
                          {cardTitle(card)}
                        </label>
                      )}
                    </For>
                  </div>
                  <div class="lf-pick-actions">
                    <span>{picked().length} / {remaining()} 選択</span>
                    <button type="button" onClick={() => setPickOpen(false)}>閉じる</button>
                    <button type="button" class="is-primary" onClick={addPicked} disabled={!picked().length}>追加する</button>
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </div>
    )
  }

  const TopicSection: Component<{ section: LeafletSection }> = (sec) => (
    <aside class="lf-topic is-preview is-section">
      <div class={`lf-topic-head is-ul-${sec.section.underline ?? 'line'}`}>
        <TopicIconSvg icon={sec.section.icon} />
        <EditableText value={sec.section.title} placeholder="小見出し 例: この資料で見るポイント" class="lf-topic-heading" onSave={(title) => patchSection(sec.section.id, { title })} />
      </div>
      <EditableText
        value={sec.section.body}
        placeholder="本文（原本は書き換えず、この資料だけに保存されます）"
        multiline
        class="lf-topic-body"
        markId={`section:${sec.section.id}:body`}
        onSave={(body) => patchSection(sec.section.id, { body })}
      />
    </aside>
  )

  const titleText = () => props.leaflet.title || props.product.name

  // ── header画像の微調整（ドラッグで移動・四隅で拡大縮小） ─────────────────
  const savedAdjust = () => props.leaflet.imageAdjust?.[imageKeyOf(props.leaflet.image)] ?? NO_ADJUST
  const adjust = () => liveAdjust() ?? savedAdjust()
  const imgTransform = () => {
    const a = adjust()
    return { transform: `translate(${a.x}%, ${a.y}%) scale(${a.scale})` }
  }
  function saveAdjust(next: ImageAdjust) {
    const key = imageKeyOf(props.leaflet.image)
    updateLeaflet(props.leaflet.id, { imageAdjust: { ...(props.leaflet.imageAdjust ?? {}), [key]: next } })
  }
  function nudgeScale(delta: number) {
    const a = savedAdjust()
    saveAdjust({ ...a, scale: Math.round(clamp(a.scale + delta, 0.3, 3) * 100) / 100 })
  }
  function startAdjust(event: PointerEvent, mode: 'move' | 'scale') {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const rect = stageRef.getBoundingClientRect()
    const base = savedAdjust()
    const sx = event.clientX
    const sy = event.clientY
    const cx = rect.left + rect.width / 2 + (base.x / 100) * rect.width
    const cy = rect.top + rect.height / 2 + (base.y / 100) * rect.height
    const d0 = Math.max(Math.hypot(sx - cx, sy - cy), 8)
    const onMove = (e: PointerEvent) => {
      if (mode === 'move') {
        setLiveAdjust({
          ...base,
          x: clamp(base.x + ((e.clientX - sx) / rect.width) * 100, -80, 80),
          y: clamp(base.y + ((e.clientY - sy) / rect.height) * 100, -80, 80),
        })
      } else {
        setLiveAdjust({ ...base, scale: clamp(base.scale * (Math.hypot(e.clientX - cx, e.clientY - cy) / d0), 0.3, 3) })
      }
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      const v = liveAdjust()
      if (v) saveAdjust({ x: Math.round(v.x * 10) / 10, y: Math.round(v.y * 10) / 10, scale: Math.round(v.scale * 100) / 100 })
      setLiveAdjust(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }
  const pageMark = () => props.leaflet.pageMark ?? DEFAULT_PAGE_MARK
  const setPageMark = (patch: Partial<PageMark>) => updateLeaflet(props.leaflet.id, { pageMark: { ...pageMark(), ...patch } })

  /** 片隅に入れる文字（画面の見本用。印刷では @page の余白に入る） */
  const cornerText = (page: number, total: number) =>
    [pageMark().name ? titleText() : '', pageMark().number ? `${page} / ${total}` : ''].filter(Boolean).join('　·　')

  /** 印刷用の @page。Chrome / Edge はページの余白に商品名・ページ番号を入れられる */
  const pageCss = () => {
    const mark = pageMark()
    const parts: string[] = []
    if (mark.name) parts.push(`"${titleText().replace(/["\\]/g, (ch) => `\\${ch}`)}"`)
    if (mark.number) parts.push('counter(page) " / " counter(pages)')
    const box = { br: 'bottom-right', bl: 'bottom-left', tr: 'top-right' }[mark.corner]
    const margin = parts.length
      ? `@${box}{content:${parts.join(' "\\3000·\\3000" ')};font:7pt "Yu Mincho","Hiragino Mincho ProN",serif;color:#9b8a75;letter-spacing:.08em;vertical-align:${mark.corner === 'tr' ? 'bottom' : 'top'}}`
      : ''
    return `@media print{@page{size:A4;margin:14mm 12mm;${margin}}}`
  }

  /** 印刷時と同じ幅（A4の本文幅）で並べ、ページの分かれ目を計算する。
   *  カード・Topic・サークル・header は途中で切れず次のページへ送られる前提 */
  function computeBreaks() {
    if (!showPages() || !sheetRef) return setBreaks([])
    const pageH = PAGE_H_MM * MM
    const top = sheetRef.getBoundingClientRect().top
    const total = sheetRef.scrollHeight
    const blocks = Array.from(sheetRef.querySelectorAll<HTMLElement>('.lf-hero, .lf-card, .lf-topic, .lf-circles-wrap')).map((el) => {
      const r = el.getBoundingClientRect()
      const label = el.querySelector('h3, h4, .lf-topic-heading, .lf-pill-title, .lf-hero-title')?.textContent?.trim() ?? ''
      return { top: r.top - top, bottom: r.bottom - top, label }
    })
    const out: PageBreak[] = []
    let start = 0
    while (start + pageH < total - 2 && out.length < 50) {
      let y = start + pageH
      let moved = ''
      const crossing = blocks.filter((b) => b.top < y && b.bottom > y && b.bottom - b.top < pageH)
      if (crossing.length) {
        const first = Math.min(...crossing.map((b) => b.top))
        if (first > start + 40) {
          y = first
          moved = crossing.map((b) => b.label).find(Boolean) ?? ''
        }
      }
      out.push({ y, page: out.length + 1, moved })
      start = y
    }
    setBreaks(out)
  }

  createEffect(on([showPages, clean], () => {
    if (!showPages()) return setBreaks([])
    requestAnimationFrame(computeBreaks)
    const observer = new ResizeObserver(() => requestAnimationFrame(computeBreaks))
    observer.observe(sheetRef)
    onCleanup(() => observer.disconnect())
  }))

  function togglePages() {
    const next = !showPages()
    setShowPages(next)
    if (next) { setClean(true); setPenOn(false) }
  }
  const headerStyle = () => props.leaflet.headerStyle ?? 'wide'
  const headerRule = () => props.leaflet.headerRule ?? 'none'

  return (
    <div class="lf-preview" classList={{ 'is-clean': clean(), 'is-pen': penOn() && !clean() }} data-state={clean() ? 'PREVIEW' : 'LAYOUT_EDIT'}>
      <div class="lf-topbar lf-no-print">
        <button class="lf-back" onClick={() => setLeafletView({ view: 'gallery' })}>← リーフレットGallery</button>
        <OriginalSafeNote />
        <HelpButton title="配布用レイアウト" items={HELP_LEAFLET_LAYOUT} />
        <button onClick={() => openLeafletEditor(props.leaflet)}>{props.leaflet.version === '2.1' ? 'カード編集（Ver2.1）' : '2カラム編集（掲載カード）'}</button>
        <button
          classList={{ 'is-on': penOn() }}
          onClick={() => setPenOn(!penOn())}
          disabled={clean()}
          title="文字を選択すると、黄色マーカー／下線を引けます（オプション）"
        >
          <span class="lf-pen-dot" aria-hidden="true" />{penOn() ? 'マーカーを終了' : 'マーカー'}
        </button>
        <SaveButton />
        <button classList={{ 'is-on': showPages() }} onClick={togglePages} title="A4で印刷したときのページの分かれ目を表示します">A4ページ区切り</button>
        <button classList={{ 'is-on': clean() }} onClick={() => { if (clean()) setShowPages(false); setClean(!clean()) }}>{clean() ? '編集に戻る' : '仕上がりを確認'}</button>
        <button class="lf-primary" onClick={print}>印刷 / PDF</button>
      </div>

      <Show when={penOn() && !clean()}>
        <p class="lf-pen-hint lf-app-only">マーカーモード：説明文・Topic・コメントの文字をなぞって選択すると、マーカー／下線を引けます。</p>
      </Show>

      <style>{pageCss()}</style>
      <Show when={showPages()}>
        <p class="lf-pages-hint lf-no-print">
          A4縦で印刷したときの見え方です。青い点線がページの分かれ目（目安）です。カードやTopicは途中で切れず、次のページへ送られます。
        </p>
      </Show>
      <div class="lf-sheet" ref={sheetRef} classList={{ 'is-a4': showPages() }} style={showPages() ? { width: `${PAGE_W_MM}mm` } : undefined}>
        <div class="lf-header-styles lf-app-only" role="radiogroup" aria-label="headerのデザイン">
          <span>HEADER</span>
          <Show when={props.leaflet.version === '2.1'}>
            <span class="lf21-fixed">ワイド（Ver2.1は固定）</span>
          </Show>
          <For each={props.leaflet.version === '2.1' ? [] : HEADER_STYLES}>
            {(style) => (
              <button
                type="button"
                role="radio"
                aria-checked={headerStyle() === style.id}
                classList={{ 'is-active': headerStyle() === style.id }}
                onClick={() => updateLeaflet(props.leaflet.id, { headerStyle: style.id })}
              >
                <i class={`lf-hs-thumb is-${style.id}`} aria-hidden="true"><b /><em /><u /></i>
                {style.label}
              </button>
            )}
          </For>
          <span class="lf-header-rule-label">二重線</span>
          <For each={HEADER_RULES}>
            {(rule) => (
              <button
                type="button"
                role="radio"
                aria-checked={headerRule() === rule.id}
                classList={{ 'is-active': headerRule() === rule.id }}
                onClick={() => updateLeaflet(props.leaflet.id, { headerRule: rule.id })}
              >
                <Show when={rule.id !== 'none'}><i class="lf-rule-thumb" aria-hidden="true" /></Show>
                {rule.label}
              </button>
            )}
          </For>
        </div>

        <div class="lf-pdf-options lf-app-only">
          <span>PDF</span>
          <label><input type="checkbox" checked={pageMark().name} onChange={(e) => setPageMark({ name: e.currentTarget.checked })} />商品名</label>
          <label><input type="checkbox" checked={pageMark().number} onChange={(e) => setPageMark({ number: e.currentTarget.checked })} />ページ番号</label>
          <span class="lf-pdf-sep">位置</span>
          <For each={CORNERS}>
            {(corner) => (
              <button type="button" classList={{ 'is-active': pageMark().corner === corner.id }} onClick={() => setPageMark({ corner: corner.id })}>
                <i class={`lf-corner-thumb is-${corner.id}`} aria-hidden="true" />{corner.label}
              </button>
            )}
          </For>
          <small>ページの片隅に小さく入ります（Chrome / Edge で印刷・PDF保存したとき）</small>
        </div>

        <header class={`lf-hero is-${headerStyle()}`}>
          <p class="lf-hero-kicker">{props.leaflet.audience || 'NACC · PRODUCT LEAFLET'}</p>
          <div class="lf-hero-titlebox">
            <Show when={!asText()} fallback={<h1 class="lf-hero-title">{titleText()}</h1>}>
              <input class="lf-inline lf-hero-title" value={titleText()} placeholder={props.product.name} onChange={(e) => updateLeaflet(props.leaflet.id, { title: e.currentTarget.value.trim() === props.product.name ? '' : e.currentTarget.value })} />
            </Show>
            <Show when={headerRule() === 'title'}><span class="lf-double-rule" aria-hidden="true" /></Show>
          </div>
          <div class="lf-hero-photo" classList={{ 'has-rule': headerRule() === 'photo', 'is-adjusting': !!liveAdjust() }}>
            <span class="lf-hero-backdrop" aria-hidden="true" />
            <div class="lf-photo-stage" ref={stageRef}>
              <LeafletVisual image={props.leaflet.image} product={props.product} class="is-hero" imgStyle={imgTransform()} />
              <Show when={!asText()}>
                {/* 画像と同じ位置・大きさの枠。中をドラッグで移動、四隅で拡大縮小 */}
                <div class="lf-photo-frame lf-app-only" style={imgTransform()} onPointerDown={(e) => startAdjust(e, 'move')} title="ドラッグで位置を移動">
                  <For each={['tl', 'tr', 'bl', 'br']}>
                    {(corner) => (
                      <span
                        class={`lf-photo-handle is-${corner}`}
                        style={{ transform: `scale(${1 / adjust().scale})` }}
                        onPointerDown={(e) => startAdjust(e, 'scale')}
                        title="ドラッグで拡大・縮小"
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
            <Show when={!asText()}>
              <div class="lf-photo-tools lf-app-only">
                <button type="button" onClick={() => nudgeScale(-0.05)} title="少し小さく">－</button>
                <span>{Math.round(adjust().scale * 100)}%</span>
                <button type="button" onClick={() => nudgeScale(0.05)} title="少し大きく">＋</button>
                <button type="button" onClick={() => saveAdjust(NO_ADJUST)} title="位置と大きさを元に戻す">リセット</button>
                <button type="button" class="is-change" onClick={() => setPickerOpen(true)}>画像を変更</button>
              </div>
            </Show>
          </div>
          <div class="lf-hero-text">
            <EditableText value={props.leaflet.comment || props.product.description || ''} placeholder="商品に入れるコメント" multiline class="lf-comment" markId="leaflet:comment" onSave={(comment) => updateLeaflet(props.leaflet.id, { comment })} />
            <EditableText value={props.leaflet.contact} placeholder="注意書き・問い合わせ先・担当者" class="lf-contact" onSave={(contact) => updateLeaflet(props.leaflet.id, { contact })} />
          </div>
        </header>

        <InsertBar index={0} />
        <For each={sections()}>
          {(section, index) => (
            <>
              <section class="lf-section" data-type={section.type}>
                <SectionTools section={section} index={index()} />
                <Switch>
                  <Match when={section.type === 'gallery'}><GallerySection section={section} /></Match>
                  <Match when={section.type === 'circles'}><CirclesSection section={section} /></Match>
                  <Match when={section.type === 'topic'}><TopicSection section={section} /></Match>
                </Switch>
              </section>
              <InsertBar index={index() + 1} />
            </>
          )}
        </For>

        <For each={breaks()}>
          {(item) => (
            <div class="lf-page-break lf-no-print" style={{ top: `${item.y}px` }}>
              <span class="lf-page-break-label">
                {item.page}ページ目ここまで
                <Show when={item.moved}>　—「{item.moved}」から次のページ</Show>
              </span>
              <Show when={cornerText(item.page, breaks().length + 1)}>
                <span class={`lf-page-corner is-${pageMark().corner}`}>{cornerText(item.page, breaks().length + 1)}</span>
              </Show>
            </div>
          )}
        </For>
        <Show when={showPages() && cornerText(breaks().length + 1, breaks().length + 1)}>
          <span class={`lf-page-corner lf-no-print is-last is-${pageMark().corner}`}>{cornerText(breaks().length + 1, breaks().length + 1)}</span>
        </Show>
        <footer class="lf-sheet-foot">{props.leaflet.name} · {formatDate(props.leaflet.updatedAt)}</footer>
      </div>

      <MarkerPen enabled={penOn() && !clean()} onApply={applyPen} />

      <Show when={cardDrag()}>
        {(d) => (
          <Portal>
            <div class="lf-carry" classList={{ 'is-over': !!dropSectionId() }} style={{ left: `${d().x}px`, top: `${d().y}px` }}>
              ◎ {d().label}
              <small>{dropSectionId() ? 'ここで離すと主成分に追加' : '主成分サークルの上で離してください'}</small>
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

export default LeafletLayout
