// Vercel の関数：/api/fax/config・/api/fax/send・/api/fax/status
// 中身は api/_fax/core.ts（開発中は vite.config.ts から同じものを呼ぶ）
import { handleFax } from '../_fax/core.js'

type Req = { method?: string; url?: string; body?: unknown; query: Record<string, string | string[] | undefined> }
type Res = { status: (code: number) => { json: (body: unknown) => void } }

export default async function handler(req: Req, res: Res) {
  const action = String(req.query.action ?? '')
  const query = new URL(req.url ?? '/', 'http://localhost').searchParams
  const r = await handleFax(action, req.method ?? 'GET', req.body, query, process.env)
  res.status(r.status).json(r.json)
}
