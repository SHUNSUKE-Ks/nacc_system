export function exportDetailViewPdf(productName?: string): void {
  const previousTitle = document.title
  const safeName = (productName || 'NACC商品詳細').replace(/[\\/:*?"<>|]/g, '_')
  document.title = `${safeName}_成分ノート`
  document.documentElement.dataset.pdfExport = 'detail'

  const restore = () => {
    document.title = previousTitle
    delete document.documentElement.dataset.pdfExport
    window.removeEventListener('afterprint', restore)
  }

  window.addEventListener('afterprint', restore)
  window.requestAnimationFrame(() => window.print())
}
