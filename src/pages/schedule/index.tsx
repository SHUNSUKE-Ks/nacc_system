import { type Component, For, Show, createMemo, createSignal } from 'solid-js'
import HelpButton, { HELP_SCHEDULE } from '../../components/HelpButton'
import { STAFF, type ScheduleEvent, sampleEvents, ymd } from './sample'

// 予定（月のカレンダー）。見た目だけの見本で、保存はしない
// スタッフごとに色を分け、上のチップで見る人を絞る。見るのはクライアント1人の想定

const WEEK = ['日', '月', '火', '水', '木', '金', '土']
const staffOf = (id: string) => STAFF.find((s) => s.id === id) ?? STAFF[0]

/** その日にかかる予定か（何日も続く予定を含む） */
function onDay(e: ScheduleEvent, date: string) {
  const start = new Date(`${e.date}T00:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + (e.days ?? 1) - 1)
  const d = new Date(`${date}T00:00:00`)
  return d >= start && d <= end
}
const timeOf = (e: ScheduleEvent) => (e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : '終日')

const PageSchedule: Component = () => {
  const now = new Date()
  const [month, setMonth] = createSignal(new Date(now.getFullYear(), now.getMonth(), 1))
  const [selected, setSelected] = createSignal(ymd(now))
  const [hidden, setHidden] = createSignal<Record<string, boolean>>({})
  const [sheet, setSheet] = createSignal<ScheduleEvent | 'new' | null>(null)
  const events = createMemo(() => {
    const m = month()
    const thisMonth = m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth()
    return sampleEvents(m, thisMonth ? now.getDate() : 13)
  })

  const visible = createMemo(() => events().filter((e) => !hidden()[e.staffId]))
  const allOn = () => STAFF.every((s) => !hidden()[s.id])

  /** 月の表：日曜はじまりで6週ぶん */
  const cells = createMemo(() => {
    const first = month()
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return { date: ymd(d), day: d.getDate(), inMonth: d.getMonth() === first.getMonth(), dow: d.getDay() }
    })
  })
  const dayEvents = (date: string) =>
    visible().filter((e) => onDay(e, date)).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''))

  const moveMonth = (n: number) => {
    const m = month()
    const next = new Date(m.getFullYear(), m.getMonth() + n, 1)
    setMonth(next)
    setSelected(ymd(next))
  }
  const goToday = () => {
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelected(ymd(now))
  }

  // 横にはらって月を変える
  let touchX = 0
  let touchY = 0

  const selectedLabel = () => {
    const d = new Date(`${selected()}T00:00:00`)
    return `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}）`
  }

  return (
    <div class="h-full overflow-y-auto">
      <div class="sch-page">
        <header class="sch-head">
          <div class="sch-month">
            <button type="button" class="sch-nav" aria-label="前の月" onClick={() => moveMonth(-1)}>‹</button>
            <h1>{month().getFullYear()}年 {month().getMonth() + 1}月</h1>
            <button type="button" class="sch-nav" aria-label="次の月" onClick={() => moveMonth(1)}>›</button>
            <button type="button" class="sch-today" onClick={goToday}>今日</button>
            <HelpButton title="予定" items={HELP_SCHEDULE} class="help-left" />
          </div>
          <span class="sch-sample">見本の画面です。予定は保存されません。</span>
        </header>

        {/* スタッフで絞る */}
        <div class="sch-staff" role="group" aria-label="見る人">
          <button type="button" class="sch-chip is-all" aria-pressed={allOn()} onClick={() => setHidden({})}>全員</button>
          <For each={STAFF}>
            {(s) => (
              <button
                type="button"
                class="sch-chip"
                aria-pressed={!hidden()[s.id]}
                style={{ '--c': s.color }}
                onClick={() => setHidden((h) => ({ ...h, [s.id]: !h[s.id] }))}
                onDblClick={() => setHidden(Object.fromEntries(STAFF.filter((o) => o.id !== s.id).map((o) => [o.id, true])))}
                title="押すと表示を切り替え／2回押すとこの人だけ"
              >
                <i aria-hidden="true" />{s.name}
              </button>
            )}
          </For>
        </div>

        {/* 月の表 */}
        <div
          class="sch-grid"
          onTouchStart={(e) => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX
            const dy = e.changedTouches[0].clientY - touchY
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) moveMonth(dx < 0 ? 1 : -1)
          }}
        >
          <For each={WEEK}>{(w, i) => <div class="sch-dow" classList={{ 'is-sun': i() === 0, 'is-sat': i() === 6 }}>{w}</div>}</For>
          <For each={cells()}>
            {(c) => {
              const list = () => dayEvents(c.date)
              return (
                <button
                  type="button"
                  class="sch-cell"
                  classList={{ 'is-out': !c.inMonth, 'is-today': c.date === ymd(now), 'is-selected': c.date === selected(), 'is-sun': c.dow === 0, 'is-sat': c.dow === 6 }}
                  aria-label={`${c.date} 予定${list().length}件`}
                  onClick={() => setSelected(c.date)}
                >
                  <span class="sch-day">{c.day}</span>
                  <For each={list().slice(0, 3)}>
                    {(e) => <span class="sch-bar" style={{ '--c': staffOf(e.staffId).color }}>{e.title}</span>}
                  </For>
                  <Show when={list().length > 3}><span class="sch-more">+{list().length - 3}</span></Show>
                </button>
              )
            }}
          </For>
        </div>

        {/* 選んだ日の予定 */}
        <section class="sch-dayview" aria-label={`${selectedLabel()}の予定`}>
          <h2>{selectedLabel()}</h2>
          <ul>
            <For each={dayEvents(selected())} fallback={<li class="sch-empty">予定はありません</li>}>
              {(e) => (
                <li>
                  <button type="button" class="sch-item" style={{ '--c': staffOf(e.staffId).color }} onClick={() => setSheet(e)}>
                    <span class="sch-time">{timeOf(e)}</span>
                    <span class="sch-title">{e.title}</span>
                    <span class="sch-who">{staffOf(e.staffId).name}</span>
                  </button>
                </li>
              )}
            </For>
          </ul>
        </section>
      </div>

      <button type="button" class="sch-fab" aria-label="予定を足す" onClick={() => setSheet('new')}>＋</button>

      {/* 予定の詳細・追加（見本） */}
      <Show when={sheet()}>
        <div class="sch-backdrop" onClick={() => setSheet(null)} />
        <div class="sch-sheet" role="dialog" aria-modal="true" aria-label="予定">
          <Show when={sheet() !== 'new'} fallback={
            <>
              <h3>予定を足す</h3>
              <label>タイトル<input placeholder="例：本社へ発注" /></label>
              <label>日付<input type="date" value={selected()} /></label>
              <div class="sch-row">
                <label>はじめ<input type="time" /></label>
                <label>おわり<input type="time" /></label>
              </div>
              <label>だれの予定
                <select><For each={STAFF}>{(s) => <option>{s.name}</option>}</For></select>
              </label>
              <label>メモ<textarea rows="2" /></label>
              <p class="sch-sample">見本なので、まだ保存されません。</p>
              <button type="button" class="sch-close" onClick={() => setSheet(null)}>閉じる</button>
            </>
          }>
            {(() => {
              const e = sheet() as ScheduleEvent
              return (
                <>
                  <div class="sch-sheet-who" style={{ '--c': staffOf(e.staffId).color }}><i aria-hidden="true" />{staffOf(e.staffId).name}</div>
                  <h3>{e.title}</h3>
                  <dl>
                    <dt>日にち</dt><dd>{e.date}{(e.days ?? 1) > 1 ? `から ${e.days}日間` : ''}</dd>
                    <dt>時間</dt><dd>{timeOf(e)}</dd>
                    <Show when={e.place}><dt>場所</dt><dd>{e.place}</dd></Show>
                    <Show when={e.memo}><dt>メモ</dt><dd>{e.memo}</dd></Show>
                  </dl>
                  <button type="button" class="sch-close" onClick={() => setSheet(null)}>閉じる</button>
                </>
              )
            })()}
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default PageSchedule
