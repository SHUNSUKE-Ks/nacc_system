import { createEffect, createRoot, createSignal, on } from 'solid-js'
import { state } from '../../store'
import { fetchSurveyFs, saveSurveyFs } from '../../db/firebase'

// 病名・症状／美容の悩み アンケートの回答。
// 端末に保存し、クラウドにつながっていればクラウドにも保存する（項目ごとに新しい方を採る）

export type SurveyMark = 'great' | 'good' | 'maybe' | 'no'
export const MARKS: { id: SurveyMark; label: string; text: string }[] = [
  { id: 'great', label: '◎', text: 'とても興味あり' },
  { id: 'good', label: '○', text: '興味あり' },
  { id: 'maybe', label: '△', text: '少し' },
  { id: 'no', label: '×', text: '興味なし' },
]

export type SurveyAnswer = { mark?: SurveyMark; memo: string; updatedAt: string }
type Answers = Record<string, SurveyAnswer>

const SURVEY_ID = 'symptoms-2026-10'
const STORAGE_KEY = `nacc-survey-${SURVEY_ID}`

function load(): Answers {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Answers
  } catch {
    return {}
  }
}

const [answers, setAnswers] = createSignal<Answers>(load())
export { answers }
const [cloudOk, setCloudOk] = createSignal(false)
export { cloudOk }

let cloudReady = false
let timer = 0

function persist(next: Answers) {
  setAnswers(next)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* 端末に保存できなくても続ける */ }
  if (!cloudReady) return
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    saveSurveyFs({ id: SURVEY_ID, updatedAt: new Date().toISOString(), json: JSON.stringify(answers()) })
      .catch((e) => { console.warn('[survey] cloud save failed', e); setCloudOk(false) })
  }, 800)
}

export const answerOf = (id: string): SurveyAnswer => answers()[id] ?? { memo: '', updatedAt: '' }

/** 同じ印をもう一度押すと外す */
export function setMark(id: string, mark: SurveyMark) {
  const prev = answerOf(id)
  persist({ ...answers(), [id]: { ...prev, mark: prev.mark === mark ? undefined : mark, updatedAt: new Date().toISOString() } })
}

export function setMemo(id: string, memo: string) {
  persist({ ...answers(), [id]: { ...answerOf(id), memo, updatedAt: new Date().toISOString() } })
}

async function syncWithCloud() {
  try {
    const remote = await fetchSurveyFs(SURVEY_ID)
    const merged: Answers = { ...answers() }
    if (remote) {
      const theirs = JSON.parse(remote.json) as Answers
      for (const [id, a] of Object.entries(theirs)) if (!merged[id] || a.updatedAt > merged[id].updatedAt) merged[id] = a
    }
    cloudReady = true
    setCloudOk(true)
    persist(merged)
  } catch (e) {
    console.warn('[survey] cloud sync failed', e)
    cloudReady = false
    setCloudOk(false)
  }
}

createRoot(() => {
  createEffect(on(() => state.dbStatus, (status) => { if (status === 'connected') void syncWithCloud() }))
})
