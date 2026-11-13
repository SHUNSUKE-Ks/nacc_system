// FAX 送信のサーバー側の中身（Vercel の api/fax/* と、開発中の Vite から同じものを使う）
//
// 宛先は本社だけ。番号はサーバーの環境変数にだけ置き、画面からは変えられない。
//   NACC_FAX_MODE        test（既定）| live
//   NACC_FAX_HQ_NAME     宛先の名前（例「NACC 本社」）
//   NACC_FAX_HQ_NUMBER   本社の FAX 番号（数字だけ。例 0312345678）
//   NACC_FAX_PASSCODE    送信の合言葉（知らない人が送れないように）
//   NETFAX_API_URL / NETFAX_API_KEY   NetFax の契約後に渡される値（live のときだけ）
//
// NetFax の仕様（2026-11-13 公開ページで分かったこと）：POST・HTTPS・JSON で返る。
// 原稿は PDF（A4 縦・10MB まで）を base64 にして宛先と一緒に送る。返るジョブ ID で結果を問い合わせる。
// 結果は 未処理／正常／エラー／送信不可。エンドポイント・認証・項目名は契約後に案内される。

export type FaxStatus = 'pending' | 'ok' | 'error' | 'rejected'
export type FaxResult = { status: number; json: unknown }
type Env = Record<string, string | undefined>

/** Vercel の関数は受け取れる大きさが 4.5MB まで。base64 で 4/3 倍になるので PDF は 3MB まで */
export const MAX_PDF_BYTES = 3 * 1024 * 1024

const mode = (env: Env) => (env.NACC_FAX_MODE === 'live' ? 'live' : 'test')
const digits = (s: string | undefined) => (s ?? '').replace(/\D/g, '')
const hqName = (env: Env) => env.NACC_FAX_HQ_NAME || '本社（未設定）'
const mask = (n: string) => (n ? `${n.slice(0, 2)}**-****-${n.slice(-4)}` : '未設定')

function configOf(env: Env) {
  const number = digits(env.NACC_FAX_HQ_NUMBER)
  const m = mode(env)
  const problems: string[] = []
  if (!number) problems.push('本社の FAX 番号（NACC_FAX_HQ_NUMBER）が未設定')
  else if (!/^0\d{9}$/.test(number)) problems.push('本社の FAX 番号が 0 から始まる10桁ではない')
  if (!env.NACC_FAX_PASSCODE) problems.push('送信の合言葉（NACC_FAX_PASSCODE）が未設定')
  if (m === 'live' && (!env.NETFAX_API_URL || !env.NETFAX_API_KEY)) problems.push('NetFax の URL・キーが未設定')
  // テストモードは番号・合言葉が無くても試せる（実際には送らない）
  const ready = m === 'test' || problems.length === 0
  return { mode: m, hqName: hqName(env), hqNumberMasked: mask(number), ready, problems, maxPdfBytes: MAX_PDF_BYTES }
}

function isPdf(buf: Buffer) {
  return buf.subarray(0, 5).toString('latin1') === '%PDF-'
}

// ── テストモード：実際には送らない。ジョブ ID に時刻を入れ、20秒たったら「正常」にする ──
function testSend(): { jobId: string } {
  return { jobId: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
}
function testStatus(jobId: string): { status: FaxStatus; detail: string } {
  const t = Number(jobId.split('-')[1])
  if (!t) return { status: 'error', detail: 'ジョブ ID が読めない' }
  return Date.now() - t < 20_000
    ? { status: 'pending', detail: 'テスト：送信中のつもり' }
    : { status: 'ok', detail: 'テスト：送れたつもり（実際には送っていない）' }
}

// ── 本番：NetFax の詳しい仕様が届いたらここを埋める ──
async function liveSend(env: Env, _to: string, _pdfBase64: string): Promise<{ jobId: string }> {
  void env
  throw new Error('NetFax の仕様（エンドポイント・認証・項目名）が届いていないため、本番の送信はまだ作っていません')
}
async function liveStatus(env: Env, _jobId: string): Promise<{ status: FaxStatus; detail: string }> {
  void env
  throw new Error('NetFax の結果の問い合わせはまだ作っていません')
}

export async function handleFax(route: string, method: string, body: unknown, query: URLSearchParams, env: Env): Promise<FaxResult> {
  try {
    if (route === 'config' && method === 'GET') {
      return { status: 200, json: configOf(env) }
    }

    if (route === 'send' && method === 'POST') {
      const cfg = configOf(env)
      const b = (body ?? {}) as { pdfBase64?: string; fileName?: string; passcode?: string }
      if (!cfg.ready) return { status: 503, json: { error: `送信の準備ができていません：${cfg.problems.join('／')}` } }
      if (env.NACC_FAX_PASSCODE && b.passcode !== env.NACC_FAX_PASSCODE) return { status: 401, json: { error: '合言葉が違います' } }
      if (!b.pdfBase64) return { status: 400, json: { error: 'PDF がありません' } }
      const buf = Buffer.from(b.pdfBase64, 'base64')
      if (!isPdf(buf)) return { status: 400, json: { error: 'PDF ではありません' } }
      if (buf.length > MAX_PDF_BYTES) return { status: 413, json: { error: `PDF が大きすぎます（${MAX_PDF_BYTES / 1024 / 1024}MB まで）` } }
      // 宛先は画面から受け取らない。いつも本社
      const to = digits(env.NACC_FAX_HQ_NUMBER)
      const { jobId } = cfg.mode === 'live' ? await liveSend(env, to, b.pdfBase64) : testSend()
      return { status: 200, json: { jobId, mode: cfg.mode, to: cfg.hqName, toMasked: cfg.hqNumberMasked, bytes: buf.length } }
    }

    if (route === 'status' && method === 'GET') {
      const jobId = query.get('id') ?? ''
      if (!jobId) return { status: 400, json: { error: 'id がありません' } }
      const r = jobId.startsWith('TEST-') ? testStatus(jobId) : await liveStatus(env, jobId)
      return { status: 200, json: { jobId, ...r } }
    }

    return { status: 404, json: { error: 'ありません' } }
  } catch (e) {
    return { status: 500, json: { error: e instanceof Error ? e.message : String(e) } }
  }
}
