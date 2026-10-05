import { type Component, createMemo, createSignal, For } from 'solid-js'
import { SURVEY_ITEMS, type SurveySet } from '../../db/survey'
import HelpButton, { HELP_SURVEY } from '../../components/HelpButton'
import { MARKS, answerOf, answers, cloudOk, setMark, setMemo } from './store'

// 病名・症状／美容の悩み アンケート。1項目ずつ ◎○△× とメモで答える
const SETS: { id: SurveySet; label: string }[] = [
  { id: 'disease', label: '病気・症状' },
  { id: 'beauty', label: '美容の悩み' },
]

const PageSurvey: Component = () => {
  const [set, setSet] = createSignal<SurveySet>('disease')
  const [category, setCategory] = createSignal('all')
  const [onlyOpen, setOnlyOpen] = createSignal(false)

  const inSet = createMemo(() => SURVEY_ITEMS.filter((item) => item.set === set()))
  const categories = createMemo(() => [...new Set(inSet().map((item) => item.category))])
  const answered = (s: SurveySet) => SURVEY_ITEMS.filter((item) => item.set === s && answerOf(item.id).mark).length
  const total = (s: SurveySet) => SURVEY_ITEMS.filter((item) => item.set === s).length
  const visible = createMemo(() => {
    answers()
    return inSet().filter((item) => (category() === 'all' || item.category === category()) && (!onlyOpen() || !answerOf(item.id).mark))
  })

  return (
    <div class="h-full overflow-y-auto">
      <div class="survey-page">
        <header class="survey-head">
          <p>NACC · SURVEY</p>
          <div class="survey-title">
            <h1>病名・症状アンケート</h1>
            <HelpButton title="アンケート" items={HELP_SURVEY} class="help-left" />
            <span class="survey-cloud" classList={{ 'is-ok': cloudOk() }}>{cloudOk() ? 'クラウドに保存' : 'この端末に保存'}</span>
          </div>
          <span>気になる項目に ◎○△× を付けてください。◎と○の項目を、DB10（症状/病名）に入れる候補にします。</span>
        </header>

        <div class="survey-tabs" role="tablist" aria-label="アンケートの種類">
          <For each={SETS}>
            {(s) => (
              <button type="button" role="tab" aria-selected={set() === s.id} classList={{ 'is-active': set() === s.id }} onClick={() => { setSet(s.id); setCategory('all') }}>
                {s.label}<span>{answered(s.id)} / {total(s.id)}</span>
              </button>
            )}
          </For>
        </div>

        <div class="survey-filters">
          <div class="survey-chips" role="radiogroup" aria-label="カテゴリ">
            <button type="button" role="radio" aria-checked={category() === 'all'} classList={{ 'is-active': category() === 'all' }} onClick={() => setCategory('all')}>すべて</button>
            <For each={categories()}>
              {(c) => <button type="button" role="radio" aria-checked={category() === c} classList={{ 'is-active': category() === c }} onClick={() => setCategory(c)}>{c}</button>}
            </For>
          </div>
          <label class="survey-only-open">
            <input type="checkbox" checked={onlyOpen()} onChange={(e) => setOnlyOpen(e.currentTarget.checked)} />
            まだ答えていない項目だけ
          </label>
        </div>

        <ol class="survey-list">
          <For each={visible()} fallback={<p class="survey-empty">この条件の項目はありません。</p>}>
            {(item) => {
              const a = () => answerOf(item.id)
              return (
                <li class="survey-item" classList={{ 'is-answered': !!a().mark }}>
                  <div class="survey-item-main">
                    <small>{item.id} · {item.category}</small>
                    <strong>{item.name}</strong>
                    <span class="survey-yomi">{item.yomi}</span>
                    <p><b>{item.set === 'disease' ? '主な症状' : '主な状態'}</b>{item.symptoms}</p>
                    <p class="survey-desc">{item.description}</p>
                  </div>
                  <div class="survey-answer">
                    <div class="survey-marks" role="radiogroup" aria-label={`${item.name}への興味`}>
                      <For each={MARKS}>
                        {(m) => (
                          <button type="button" role="radio" aria-checked={a().mark === m.id} aria-label={m.text} title={m.text} class={`is-${m.id}`} classList={{ 'is-active': a().mark === m.id }} onClick={() => setMark(item.id, m.id)}>
                            {m.label}
                          </button>
                        )}
                      </For>
                    </div>
                    <input class="survey-memo" value={a().memo} placeholder="メモ" aria-label={`${item.name}のメモ`} onChange={(e) => setMemo(item.id, e.currentTarget.value)} />
                  </div>
                </li>
              )
            }}
          </For>
        </ol>
        <p class="survey-note">一覧は 2026-10-05 にWebAIで作ったものです。出典URLは確認できなかったため載せていません。</p>
      </div>
    </div>
  )
}

export default PageSurvey
