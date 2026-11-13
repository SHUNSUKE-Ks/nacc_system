// 写真（手書きの紙など）を A4 縦の PDF にする。1枚＝1ページ。ライブラリを使わずに作る
// FAX は白黒なので「くっきり」にすると、白黒にして文字を濃くし、紙の影を飛ばす

const A4_W = 595.28 // pt
const A4_H = 841.89
const PX_W = 1654 // 200dpi
const PX_H = 2339

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    // decode 後は描けるので URL は捨ててよい
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/** 1枚を A4 の白い紙に収めて JPEG にする */
async function renderPage(file: File, crisp: boolean): Promise<Uint8Array> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = PX_W
  canvas.height = PX_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, PX_W, PX_H)
  // 横長の写真は90度回して縦に置く（A4 縦にしか送れないため）
  const landscape = img.naturalWidth > img.naturalHeight
  const iw = landscape ? img.naturalHeight : img.naturalWidth
  const ih = landscape ? img.naturalWidth : img.naturalHeight
  const margin = 40
  const scale = Math.min((PX_W - margin * 2) / iw, (PX_H - margin * 2) / ih)
  const w = iw * scale
  const h = ih * scale
  ctx.save()
  ctx.translate(PX_W / 2, PX_H / 2)
  if (landscape) ctx.rotate(Math.PI / 2)
  const dw = landscape ? h : w
  const dh = landscape ? w : h
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()

  if (crisp) {
    const data = ctx.getImageData(0, 0, PX_W, PX_H)
    const p = data.data
    for (let i = 0; i < p.length; i += 4) {
      const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]
      // 明るい所（紙）は白に、暗い所（文字）はより濃く
      const v = y > 170 ? 255 : y < 90 ? 0 : Math.round(((y - 90) / 80) * 255)
      p[i] = p[i + 1] = p[i + 2] = v
    }
    ctx.putImageData(data, 0, 0)
  }

  const blob = await new Promise<Blob>((ok, ng) => canvas.toBlob((b) => (b ? ok(b) : ng(new Error('画像を作れませんでした'))), 'image/jpeg', 0.82))
  return new Uint8Array(await blob.arrayBuffer())
}

const enc = new TextEncoder()

/** JPEG を1ページずつ並べた PDF を組み立てる */
function buildPdf(jpegs: Uint8Array[]): Uint8Array {
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: Uint8Array | string) => {
    const b = typeof chunk === 'string' ? enc.encode(chunk) : chunk
    parts.push(b)
    length += b.length
  }
  const obj = (n: number, body: () => void) => {
    offsets[n] = length
    push(`${n} 0 obj\n`)
    body()
    push('\nendobj\n')
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  const pageIds = jpegs.map((_, i) => 3 + i * 3)
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'))
  obj(2, () => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${jpegs.length} >>`))
  jpegs.forEach((jpg, i) => {
    const pageId = 3 + i * 3
    const contentId = pageId + 1
    const imageId = pageId + 2
    const content = `q ${A4_W} 0 0 ${A4_H} 0 0 cm /Im0 Do Q`
    obj(pageId, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`))
    obj(contentId, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`))
    obj(imageId, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${PX_W} /Height ${PX_H} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`)
      push(jpg)
      push('\nendstream')
    })
  })
  const count = 3 + jpegs.length * 3
  const xref = length
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`
  for (let n = 1; n < count; n++) table += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  push(table)
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const b of parts) { out.set(b, at); at += b.length }
  return out
}

/** PDF と、見本に出す各ページの画像（blob URL。使い終わったら revoke する）を返す */
export async function imagesToPdf(files: File[], crisp: boolean): Promise<{ file: File; previews: string[] }> {
  const jpegs: Uint8Array[] = []
  for (const f of files) jpegs.push(await renderPage(f, crisp))
  const pdf = buildPdf(jpegs)
  const d = new Date()
  const p2 = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`
  return {
    file: new File([pdf as BlobPart], `手書き_${stamp}.pdf`, { type: 'application/pdf' }),
    previews: jpegs.map((j) => URL.createObjectURL(new Blob([j as BlobPart], { type: 'image/jpeg' }))),
  }
}
