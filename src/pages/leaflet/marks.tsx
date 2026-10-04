import { type Component, createSignal, For, onCleanup, Show } from 'solid-js'
import type { MarkStyle, TextMark } from './store'

// マーカー機能（オプション）
// 表示中のテキストを選択 → 浮かぶボタンで「黄色マーカー／下線／消す」。
// 文字位置だけを保存するので、原本の説明文は書き換えない。

export type PenAction = MarkStyle | 'erase'

/** [s, e) と重なる既存マークを切り取り、必要なら新しいマークを足す */
export function applyMark(marks: TextMark[], s: number, e: number, action: PenAction): TextMark[] {
  const next: TextMark[] = []
  for (const mark of marks) {
    if (mark.e <= s || mark.s >= e) { next.push(mark); continue }
    if (mark.s < s) next.push({ ...mark, e: s })
    if (mark.e > e) next.push({ ...mark, s: e })
  }
  if (action !== 'erase') next.push({ s, e, style: action })
  return next.sort((a, b) => a.s - b.s)
}

export const MarkedText: Component<{ text: string; marks?: TextMark[]; targetId?: string; class?: string; tag?: 'p' | 'div' | 'span' }> = (props) => {
  const segments = () => {
    const text = props.text ?? ''
    const marks = (props.marks ?? []).filter((mark) => mark.s < text.length && mark.e > mark.s)
    const out: { text: string; style?: MarkStyle }[] = []
    let at = 0
    for (const mark of marks) {
      const s = Math.max(mark.s, at)
      const e = Math.min(mark.e, text.length)
      if (s >= e) continue
      if (s > at) out.push({ text: text.slice(at, s) })
      out.push({ text: text.slice(s, e), style: mark.style })
      at = e
    }
    if (at < text.length) out.push({ text: text.slice(at) })
    return out
  }
  const body = () => (
    <For each={segments()}>
      {(segment) => (segment.style
        ? <mark class={`lf-mark is-${segment.style}`}>{segment.text}</mark>
        : <>{segment.text}</>)}
    </For>
  )
  return (
    <Show when={props.tag === 'div'} fallback={
      <Show when={props.tag === 'span'} fallback={<p class={props.class} data-mark-target={props.targetId}>{body()}</p>}>
        <span class={props.class} data-mark-target={props.targetId}>{body()}</span>
      </Show>
    }>
      <div class={props.class} data-mark-target={props.targetId}>{body()}</div>
    </Show>
  )
}

/** 選択範囲が [data-mark-target] の中にあるとき、上に操作ボタンを浮かべる */
export const MarkerPen: Component<{ enabled: boolean; onApply: (targetId: string, s: number, e: number, action: PenAction) => void }> = (props) => {
  const [pending, setPending] = createSignal<{ targetId: string; s: number; e: number; x: number; y: number } | null>(null)
  let timer = 0

  const read = () => {
    if (!props.enabled) return setPending(null)
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return setPending(null)
    const range = selection.getRangeAt(0)
    const startEl = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement) as Element | null
    const target = startEl?.closest('[data-mark-target]') as HTMLElement | null
    if (!target || !target.contains(range.endContainer)) return setPending(null)
    const before = document.createRange()
    before.selectNodeContents(target)
    before.setEnd(range.startContainer, range.startOffset)
    const s = before.toString().length
    const e = s + range.toString().length
    if (e <= s) return setPending(null)
    const rect = range.getBoundingClientRect()
    setPending({ targetId: target.dataset.markTarget!, s, e, x: rect.left + rect.width / 2, y: rect.top })
  }

  const onChange = () => { window.clearTimeout(timer); timer = window.setTimeout(read, 120) }
  document.addEventListener('selectionchange', onChange)
  onCleanup(() => document.removeEventListener('selectionchange', onChange))

  const apply = (action: PenAction) => {
    const p = pending()
    if (!p) return
    props.onApply(p.targetId, p.s, p.e, action)
    window.getSelection()?.removeAllRanges()
    setPending(null)
  }

  const Btn: Component<{ action: PenAction; label: string }> = (btn) => (
    <button type="button" class={`is-${btn.action}`} onPointerDown={(e) => e.preventDefault()} onClick={() => apply(btn.action)}>{btn.label}</button>
  )

  return (
    <Show when={props.enabled && pending()}>
      {(p) => (
        <div class="lf-pen lf-app-only" style={{ left: `${p().x}px`, top: `${Math.max(p().y - 46, 8)}px` }}>
          <Btn action="marker" label="マーカー" />
          <Btn action="underline" label="下線" />
          <Btn action="erase" label="消す" />
        </div>
      )}
    </Show>
  )
}
