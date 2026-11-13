import { type Component, For, Show, createSignal, onCleanup, onMount } from 'solid-js'
import HelpButton, { HELP_FAX } from '../../components/HelpButton'
import { imagesToPdf } from './imageToPdf'

// 本社へ FAX を送る専用の画面。宛先は本社だけで、画面からは変えられない（番号はサーバー側にある）
// 送る前に「中身を見た」「本社あて」を確かめ、最後にもう一度聞いてから送る

type Config = { mode: 'test' | 'live'; hqName: string; hqNumberMasked: string; ready: boolean; problems: string[]; maxPdfBytes: number }
type Status = 'sending' | 'pending' | 'ok' | 'error' | 'rejected'
type Sent = { jobId: string; at: string; fileName: string; pages: number; mode: 'test' | 'live'; status: Status; detail?: string }

const HISTORY_KEY = 'nacc-fax-history'
const PASS_KEY = 'nacc-fax-passcode'
const STATUS_LABEL: Record<Status, string> = { sending: '送信中', pending: '送信中', ok: '送れた', error: 'エラー', rejected: '送れない' }

const readJson = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || '') as T } catch { return fallback }
}
const writeLocal = (key: string, value: string) => {
  try { localStorage.setItem(key, value) } catch { /* 端末に残せなくても送信はできる */ }
}

/** PDF のページ数を数える（だいたい。読めなければ 0） */
async function countPages(file: File): Promise<number> {
  const text = new TextDecoder('latin1').decode(await file.arrayBuffer())
  return (text.match(/\/Type\s*\/Page(?!s)/g) ?? []).length
}

async function toBase64(file: File): Promise<string> {
  const url = await new Promise<string>((ok, ng) => {
    const r = new FileReader()
    r.onload = () => ok(String(r.result))
    r.onerror = () => ng(r.error)
    r.readAsDataURL(file)
  })
  return url.slice(url.indexOf(',') + 1)
}

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.ceil(n / 1024)}KB` : `${(n / 1024 / 1024).toFixed(1)}MB`)

const PageFax: Component = () => {
  const [config, setConfig] = createSignal<Config | null>(null)
  const [configError, setConfigError] = createSignal('')
  const [file, setFile] = createSignal<File | null>(null)
  const [pages, setPages] = createSignal(0)
  const [previewUrl, setPreviewUrl] = createSignal('')
  /** 写真から作ったときの各ページの画像（携帯は PDF を枠の中に出せないため、画像で見せる） */
  const [pagePreviews, setPagePreviews] = createSignal<string[]>([])
  const [making, setMaking] = createSignal(false)
  const [crisp, setCrisp] = createSignal(true)
  const [checkedTo, setCheckedTo] = createSignal(false)
  const [checkedBody, setCheckedBody] = createSignal(false)
  const [passcode, setPasscode] = createSignal((() => { try { return localStorage.getItem(PASS_KEY) ?? '' } catch { return '' } })())
  const [sending, setSending] = createSignal(false)
  const [message, setMessage] = createSignal<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [history, setHistory] = createSignal<Sent[]>(readJson<Sent[]>(HISTORY_KEY, []))
  let pdfInput!: HTMLInputElement
  let photoInput!: HTMLInputElement
  const timers = new Set<number>()
  onCleanup(() => { timers.forEach(clearTimeout); clearPreviews() })

  const saveHistory = (next: Sent[]) => {
    const trimmed = next.slice(0, 30)
    setHistory(trimmed)
    writeLocal(HISTORY_KEY, JSON.stringify(trimmed))
  }
  const patchSent = (jobId: string, patch: Partial<Sent>) =>
    saveHistory(history().map((h) => (h.jobId === jobId ? { ...h, ...patch } : h)))

  onMount(async () => {
    try {
      const r = await fetch('/api/fax/config')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setConfig(await r.json())
    } catch (e) {
      setConfigError(`送信の窓口につながりません（${e instanceof Error ? e.message : e}）`)
    }
    // 途中で閉じた送信の結果を取りに行く
    history().filter((h) => h.status === 'pending').forEach((h) => watch(h.jobId))
  })

  const clearPreviews = () => {
    if (previewUrl()) URL.revokeObjectURL(previewUrl())
    pagePreviews().forEach((u) => URL.revokeObjectURL(u))
    setPreviewUrl('')
    setPagePreviews([])
  }

  async function useFile(f: File, previews: string[] = []) {
    setMessage(null)
    setCheckedBody(false)
    clearPreviews()
    setPagePreviews(previews)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setPages(await countPages(f))
  }

  async function onPickPdf(list: FileList | null) {
    const f = list?.[0]
    if (!f) return
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setMessage({ kind: 'error', text: 'PDF を選んでください。写真は「手書きの写真から作る」を使います。' })
      return
    }
    await useFile(f)
  }

  async function onPickPhotos(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return
    setMaking(true)
    try {
      const made = await imagesToPdf(files, crisp())
      await useFile(made.file, made.previews)
    } catch (e) {
      setMessage({ kind: 'error', text: `写真から PDF を作れませんでした（${e instanceof Error ? e.message : e}）` })
    } finally {
      setMaking(false)
    }
  }

  const tooBig = () => !!file() && !!config() && file()!.size > config()!.maxPdfBytes
  const canSend = () => !!config()?.ready && !!file() && !tooBig() && checkedTo() && checkedBody() && !sending() && !making()

  async function send() {
    const cfg = config()
    const f = file()
    if (!cfg || !f || !canSend()) return
    const where = `${cfg.hqName}（${cfg.hqNumberMasked}）`
    const test = cfg.mode === 'test' ? '\n\n※テストモードです。実際には送られません。' : ''
    if (!window.confirm(`${where} へ\n「${f.name}」${pages() || '?'} ページを送ります。\n\nよろしいですか？${test}`)) return

    setSending(true)
    setMessage(null)
    writeLocal(PASS_KEY, passcode())
    try {
      const r = await fetch('/api/fax/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: await toBase64(f), fileName: f.name, passcode: passcode() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      saveHistory([{ jobId: j.jobId, at: new Date().toISOString(), fileName: f.name, pages: pages(), mode: j.mode, status: 'pending' }, ...history()])
      setMessage({ kind: 'ok', text: `${where} への送信を受け付けました。結果は下の履歴に出ます。` })
      // 同じ物を二度送らないよう、原稿と確認を外す
      setFile(null)
      clearPreviews()
      setCheckedTo(false)
      setCheckedBody(false)
      watch(j.jobId)
    } catch (e) {
      setMessage({ kind: 'error', text: `送れませんでした：${e instanceof Error ? e.message : e}` })
    } finally {
      setSending(false)
    }
  }

  /** 結果が出るまで 5秒ごとに聞く（最大 30分） */
  function watch(jobId: string, tries = 0) {
    const id = window.setTimeout(async () => {
      timers.delete(id)
      try {
        const r = await fetch(`/api/fax/status?id=${encodeURIComponent(jobId)}`)
        const j = await r.json()
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
        patchSent(jobId, { status: j.status, detail: j.detail })
        if (j.status === 'pending' && tries < 360) watch(jobId, tries + 1)
      } catch (e) {
        patchSent(jobId, { detail: `結果を聞けません：${e instanceof Error ? e.message : e}` })
        if (tries < 360) watch(jobId, tries + 1)
      }
    }, 5000)
    timers.add(id)
  }

  return (
    <div class="h-full overflow-y-auto">
      <div class="fax-page">
        <header class="survey-head">
          <p>NACC · FAX</p>
          <div class="survey-title">
            <h1>本社へ FAX を送る</h1>
            <HelpButton title="FAX" items={HELP_FAX} class="help-left" />
          </div>
          <span>PDF か、手書きの紙の写真を、本社の FAX へ送ります。宛先は本社だけです。</span>
        </header>

        <Show when={config()?.mode === 'test'}>
          <div class="fax-banner is-test" role="status">テストモード：送信の流れだけを試します。実際には FAX は送られません。</div>
        </Show>
        <Show when={configError()}>
          <div class="fax-banner is-error" role="alert">{configError()}</div>
        </Show>
        <Show when={config() && config()!.problems.length > 0}>
          <div class="fax-banner is-warn">
            準備がまだです：
            <ul><For each={config()!.problems}>{(p) => <li>{p}</li>}</For></ul>
          </div>
        </Show>

        {/* 宛先（変えられない） */}
        <section class="fax-card fax-to" aria-label="宛先">
          <div class="fax-step">宛先</div>
          <div class="fax-to-main">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 11h12v10H6zM9 11V7a3 3 0 0 1 6 0v4" /></svg>
            <strong>{config()?.hqName ?? '…'}</strong>
            <span class="fax-number">{config()?.hqNumberMasked ?? ''}</span>
          </div>
          <small>宛先は本社に決まっていて、この画面からは変えられません。</small>
        </section>

        {/* 1. 原稿 */}
        <section class="fax-card" aria-label="原稿">
          <div class="fax-step">1. 送る物を選ぶ</div>
          <div class="fax-pick">
            <button type="button" class="fax-btn" onClick={() => pdfInput.click()}>PDF を選ぶ</button>
            <button type="button" class="fax-btn" onClick={() => photoInput.click()} disabled={making()}>
              {making() ? 'PDF にしています…' : '手書きの写真から作る'}
            </button>
            <label class="fax-check-inline">
              <input type="checkbox" checked={crisp()} onChange={(e) => setCrisp(e.currentTarget.checked)} />
              写真をくっきり白黒にする
            </label>
            <input ref={pdfInput} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { onPickPdf(e.currentTarget.files); e.currentTarget.value = '' }} />
            <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => { onPickPhotos(e.currentTarget.files); e.currentTarget.value = '' }} />
          </div>
          <Show when={file()} fallback={<p class="fax-empty">まだ選んでいません。写真は何枚でも選べます（1枚＝1ページ）。</p>}>
            <div class="fax-file">
              <strong>{file()!.name}</strong>
              <span>{pages() || '?'} ページ · {kb(file()!.size)}</span>
              <button type="button" class="fax-link" onClick={() => { setFile(null); setCheckedBody(false); clearPreviews() }}>外す</button>
            </div>
            <Show when={tooBig()}>
              <p class="fax-error">大きすぎます。{kb(config()!.maxPdfBytes)} までにしてください。</p>
            </Show>
            <Show when={pagePreviews().length > 0} fallback={
              <>
                <iframe class="fax-preview" src={previewUrl()} title="送る物の見本" />
                <a class="fax-link" href={previewUrl()} target="_blank" rel="noopener">見本が出ないときは、ここで開いて確かめる</a>
              </>
            }>
              <div class="fax-pages">
                <For each={pagePreviews()}>
                  {(src, i) => <figure><img src={src} alt={`${i() + 1}ページ目`} /><figcaption>{i() + 1} / {pagePreviews().length}</figcaption></figure>}
                </For>
              </div>
            </Show>
          </Show>
        </section>

        {/* 2. 確認と送信 */}
        <section class="fax-card" aria-label="確認と送信">
          <div class="fax-step">2. 確かめて送る</div>
          <label class="fax-check">
            <input type="checkbox" checked={checkedBody()} disabled={!file()} onChange={(e) => setCheckedBody(e.currentTarget.checked)} />
            上の見本で、中身とページ数を確かめた
          </label>
          <label class="fax-check">
            <input type="checkbox" checked={checkedTo()} onChange={(e) => setCheckedTo(e.currentTarget.checked)} />
            宛先の「{config()?.hqName ?? '…'}」に送る物だ
          </label>
          <label class="fax-pass">
            合言葉
            <input type="password" value={passcode()} autocomplete="off" onInput={(e) => setPasscode(e.currentTarget.value)} placeholder={config()?.mode === 'test' ? 'テストでは空でもよい' : ''} />
          </label>
          <button type="button" class="fax-send" disabled={!canSend()} onClick={send}>
            {sending() ? '送っています…' : config()?.mode === 'test' ? '本社へ送る（テスト）' : '本社へ送る'}
          </button>
          <Show when={message()}>
            <p classList={{ 'fax-ok': message()!.kind === 'ok', 'fax-error': message()!.kind === 'error' }} role="status">{message()!.text}</p>
          </Show>
        </section>

        {/* 履歴 */}
        <section class="fax-card" aria-label="送った履歴">
          <div class="fax-step">送った履歴（この端末）</div>
          <ol class="fax-history">
            <For each={history()} fallback={<p class="fax-empty">まだありません。</p>}>
              {(h) => (
                <li>
                  <span class={`fax-badge is-${h.status}`}>{STATUS_LABEL[h.status]}</span>
                  <Show when={h.mode === 'test'}><span class="fax-badge is-testmark">テスト</span></Show>
                  <span class="fax-h-name">{h.fileName}</span>
                  <span class="fax-h-meta">{new Date(h.at).toLocaleString('ja-JP')} · {h.pages || '?'}ページ</span>
                  <Show when={h.detail}><span class="fax-h-detail">{h.detail}</span></Show>
                </li>
              )}
            </For>
          </ol>
        </section>
      </div>
    </div>
  )
}

export default PageFax
