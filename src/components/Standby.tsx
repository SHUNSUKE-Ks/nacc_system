import { type Component, For, Show, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { STAFF, sampleEvents, ymd, type ScheduleEvent } from '../pages/schedule/sample'

// 待ち受け（BD のスタンバイを手本にした黒い画面）。左に時計、右に今日の予定
// header のボタンで出す。スマホを横にしたときも出す（切り替えられる）
// 予定は今は見本のデータ（pages/schedule/sample.ts）。予定を本物にしたらここも同じ所から読む

const [open, setOpen] = createSignal(false)
export const openStandby = () => setOpen(true)

const AUTO_KEY = 'nacc-standby-auto'
const readAuto = () => { try { return localStorage.getItem(AUTO_KEY) !== 'off' } catch { return true } }
const WEEK = ['日', '月', '火', '水', '木', '金', '土']
const pad = (n: number) => String(n).padStart(2, '0')
const staffOf = (id: string) => STAFF.find((s) => s.id === id) ?? STAFF[0]
const minutes = (hhmm?: string) => (hhmm ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) : -1)

function onDay(e: ScheduleEvent, date: string) {
  const start = new Date(`${e.date}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + (e.days ?? 1) - 1)
  const d = new Date(`${date}T00:00:00`)
  return d >= start && d <= end
}

const Standby: Component = () => {
  const [now, setNow] = createSignal(new Date())
  const [auto, setAuto] = createSignal(readAuto())
  const [awake, setAwake] = createSignal('')
  const tick = setInterval(() => setNow(new Date()), 1000)
  onCleanup(() => clearInterval(tick))

  const today = () => ymd(now())
  const events = createMemo(() => {
    const d = now()
    const list = sampleEvents(new Date(d.getFullYear(), d.getMonth(), 1), d.getDate())
    return list.filter((e) => onDay(e, ymd(d))).sort((a, b) => minutes(a.start) - minutes(b.start))
  })
  const nowMin = () => now().getHours() * 60 + now().getMinutes()
  /** 終わった・いま・これから。終わりが無い予定は始まって60分で終わった扱い */
  const phase = (e: ScheduleEvent) => {
    if (!e.start) return 'allday'
    const s = minutes(e.start)
    const end = e.end ? minutes(e.end) : s + 60
    return nowMin() >= end ? 'past' : nowMin() >= s ? 'now' : 'later'
  }
  const nextId = () => events().find((e) => phase(e) === 'later')?.id

  // 横にしたら出す・縦に戻したら閉じる（自分で出したときは閉じない）
  let automatic = false
  onMount(() => {
    const landscape = () => matchMedia('(orientation: landscape)').matches
    const rotate = () => {
      const typing = (document.activeElement as HTMLElement | null)?.matches('input, textarea, select, [contenteditable="true"]')
      if (typing || !matchMedia('(pointer: coarse)').matches) return
      if (landscape()) { if (auto() && !open()) { automatic = true; setOpen(true) } }
      else if (automatic) { automatic = false; setOpen(false) }
    }
    screen.orientation?.addEventListener('change', rotate)
    window.addEventListener('resize', rotate)
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape' && open()) setOpen(false) }
    window.addEventListener('keydown', esc)
    onCleanup(() => {
      screen.orientation?.removeEventListener('change', rotate)
      window.removeEventListener('resize', rotate)
      window.removeEventListener('keydown', esc)
    })
  })

  // 出している間は画面が消えないようにする（対応している端末だけ）
  createEffect(() => {
    if (!open()) return
    type Lock = { release: () => Promise<void> }
    const api = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }).wakeLock
    let lock: Lock | undefined
    let disposed = false
    const acquire = async () => {
      if (!api || lock || disposed || document.visibilityState !== 'visible') return
      try { lock = await api.request('screen'); setAwake('画面を消さずに表示中') } catch { setAwake('') }
      if (disposed) void lock?.release()
    }
    const vis = () => { lock = undefined; void acquire() }
    void acquire()
    document.addEventListener('visibilitychange', vis)
    onCleanup(() => { disposed = true; document.removeEventListener('visibilitychange', vis); void lock?.release(); setAwake('') })
  })

  const toggleAuto = () => {
    const v = !auto()
    setAuto(v)
    try { localStorage.setItem(AUTO_KEY, v ? 'on' : 'off') } catch { /* 残せなくても今は切り替わる */ }
  }

  return (
    <Show when={open()}>
      <section class="sby" role="dialog" aria-modal="true" aria-label="待ち受け">
        <div class="sby-clock">
          <time datetime={now().toISOString()}>
            {pad(now().getHours())}<span class="sby-colon">:</span>{pad(now().getMinutes())}
            <small>{pad(now().getSeconds())}</small>
          </time>
          <p>{now().getMonth() + 1}月{now().getDate()}日（{WEEK[now().getDay()]}）</p>
        </div>

        <div class="sby-today">
          <h2>今日の予定 <span>{events().length}件</span></h2>
          <ul>
            <For each={events()} fallback={<li class="sby-empty">今日の予定はありません</li>}>
              {(e) => (
                <li class={`is-${phase(e)}`} classList={{ 'is-next': e.id === nextId() }} style={{ '--c': staffOf(e.staffId).color }}>
                  <span class="sby-time">{e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : '終日'}</span>
                  <span class="sby-title">{e.title}</span>
                  <span class="sby-who">{staffOf(e.staffId).name}</span>
                  <Show when={phase(e) === 'now'}><em>いま</em></Show>
                  <Show when={e.id === nextId()}><em>つぎ</em></Show>
                </li>
              )}
            </For>
          </ul>
          <p class="sby-note">{today()} · 見本の予定です</p>
        </div>

        <nav class="sby-nav" aria-label="待ち受けの操作">
          <button type="button" onClick={() => { automatic = false; setOpen(false) }}>閉じる</button>
          <button type="button" aria-pressed={auto()} onClick={toggleAuto}>横にしたら出す：{auto() ? 'オン' : 'オフ'}</button>
          <small>{awake()}</small>
        </nav>
      </section>
    </Show>
  )
}

export default Standby
