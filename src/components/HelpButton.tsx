import { type Component, createSignal, For, onCleanup, Show } from 'solid-js'

// 画面ごとの「？」ヘルプ。クライアント向けに、その画面でできることを短く並べる
export type HelpItem = { title: string; text: string }

const HelpButton: Component<{ title: string; items: HelpItem[]; class?: string }> = (props) => {
  const [open, setOpen] = createSignal(false)
  let rootRef!: HTMLDivElement

  const onOutside = (event: PointerEvent) => {
    if (open() && !rootRef.contains(event.target as Node)) setOpen(false)
  }
  const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
  document.addEventListener('pointerdown', onOutside)
  document.addEventListener('keydown', onKey)
  onCleanup(() => {
    document.removeEventListener('pointerdown', onOutside)
    document.removeEventListener('keydown', onKey)
  })

  return (
    <div class={`help-button ${props.class ?? ''}`} ref={rootRef}>
      <button
        type="button"
        class="help-button-trigger"
        aria-label={`${props.title}の使い方`}
        aria-expanded={open()}
        title="使い方"
        onClick={() => setOpen(!open())}
      >
        ?
      </button>
      <Show when={open()}>
        <section class="help-panel" role="dialog" aria-label={`${props.title}の使い方`}>
          <header>
            <span>HOW TO USE</span>
            <strong>{props.title}</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="閉じる">×</button>
          </header>
          <ol>
            <For each={props.items}>
              {(item) => (
                <li>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </li>
              )}
            </For>
          </ol>
        </section>
      </Show>
    </div>
  )
}

export default HelpButton

// ── 各画面のヘルプ文 ─────────────────────────────────────────────────────
export const HELP_PRODUCT_GALLERY: HelpItem[] = [
  { title: '商品を開く', text: '商品カードを押すと、その商品のノート（説明・成分カード）が開きます。' },
  { title: '成分カードを新しく作る', text: '商品ノートの「＋ 成分を追加」を開き、右上の「＋ 新規」で成分名と説明を入れて作成します。' },
  { title: 'リーフレット Ver2.1', text: '商品ノート右上の赤いボタンで、商品ノートの並びのまま配布用リーフレットの編集画面へ進みます。' },
  { title: 'お気に入り', text: 'カード右上の☆を押すと★になって登録、もう一度押すと解除。お気に入りはアプリを開いたときに最初に表示されます。' },
  { title: '絞り込み', text: '上のタブで「お気に入り／全て／サプリ／コスメ」を切り替えられます。' },
  { title: 'メモ', text: '右上の「メモ」で、どの画面からでもすぐにメモを書けます。商品ページで押すと、その商品名がタグに入ります。' },
  { title: 'リーフレット', text: '右上の「リーフレット」から、お客様に渡す資料（配布用）を作れます。' },
]

export const HELP_LEAFLET_GALLERY: HelpItem[] = [
  { title: 'リーフレットとは', text: '商品ノート（原本）をもとに作る、配布用の資料です。リーフレットを編集しても原本は変わりません。' },
  { title: '作る', text: '「＋ リーフレットを作成」で新しく作ります。「複製」は中身ごとコピーして別の資料にします。' },
  { title: '編集', text: '「編集」で載せる成分カードを選び、「配布用レイアウト」で見た目を整えて印刷・PDFにします。' },
  { title: '写真ギャラリー', text: '上の「写真ギャラリー」タブで、端末から写真を追加できます。背景が透明なPNGもそのまま使えます。' },
]

export const HELP_LEAFLET_EDITOR: HelpItem[] = [
  { title: 'カードを載せる', text: 'iPadではカードを0.6秒長押しして、少し浮いたら指を動かして右へ運びます（マウスはそのままドラッグ）。入れた順に 01, 02… と番号が付きます。' },
  { title: 'まとめて載せる', text: '左の「☑ 一括選択」を押すと全部にチェックが入ります。載せないカードだけチェックを外して（カードを押しても切り替わります）、「右へ移動 →」を押します。' },
  { title: '外す', text: '右から左へ戻すと掲載から外れます（原本の成分は消えません）。' },
  { title: '並び替え', text: '同じように長押しで持ち上げて、青い線の位置で指を離すとそこに入ります。長押しの前に指を動かすと、ふつうのスクロールになります。' },
  { title: '表示／非表示', text: '「表示中」を押すと非表示になり、配布用の資料には出なくなります。' },
  { title: '＋ Topic', text: '補足の見出しと文章を追加できます。原本は書き換えず、この資料だけのメモとして保存されます。' },
  { title: '同じ成分', text: '同じ成分は2枚入れられません（入れようとするとお知らせが出ます）。' },
  { title: '保存', text: '自動で保存されます。「保存」ボタンを押して確かめることもできます。' },
  { title: '商品・コメント', text: '上の「商品・コメントを編集 ▾」で、対象者やコメントの欄を開きます。普段はたたんで2カラムを広く使えます。' },
]

export const HELP_LEAFLET_LAYOUT: HelpItem[] = [
  { title: 'header', text: '「HEADER」でデザインを4種類から選べます。写真をクリックすると画像を変更、「二重線」で飾り線を入れられます。' },
  { title: 'セクション', text: '「＋ セクション」で主成分サークルやTopicを好きな位置に入れられます。↑↓で順番、×で削除。' },
  { title: 'カードの見た目・順番', text: 'カードGalleryは「カード／主要成分」で見た目を切り替えられます。カード右上の ‹ › で順番を前後に動かせます。' },
  { title: '主成分サークル', text: '成分を最大4つまで入れられます。iPadではカードを長押しして、サークルの上まで運んで離します（画面の端に寄せると自動でスクロール）。「＋ 成分を選ぶ（複数可）」でチェックを入れてまとめて追加もできます。丸の中の文字はEnterで改行できます。' },
  { title: 'コピー', text: 'タイトルや説明の横のコピーアイコンで、Canvaへそのまま貼り付けられます（印刷には出ません）。' },
  { title: 'マーカー', text: '「マーカー」を押してから文字を選ぶと、黄色マーカーや下線を引けます。' },
  { title: 'PDF・印刷', text: '「A4ページ区切り」でページの分かれ目を確認し、「印刷 / PDF」で出力します。商品名とページ番号はページの片隅に小さく入ります。' },
]

export const HELP_LEAFLET_V21: HelpItem[] = [
  { title: 'Ver2.1とは', text: '商品ノートと同じ並びのまま、配布用に編集する版です。原本のカードは変わりません。' },
  { title: '並び替え', text: 'カード左上の番号を長押し（0.3秒）すると持ち上がります。指を動かして青い線の位置で離すと入ります。番号は左から付け直されます。長押しの時間は上の「長押し」で0.3秒／0.6秒を選べます。' },
  { title: '表示／非表示', text: 'カード右上の「表示」のチェックを外すと、カードが暗くなって一番最後に回ります。暗いカードは配布用レイアウトに出ません。' },
  { title: '編集', text: '「編集」でタイトルや説明を、このリーフレット用に書き換えられます。「原本の文に戻す」で元に戻ります。' },
  { title: 'header', text: 'ワイド固定です。上の欄で対象者・タイトル・コメント・担当者を入力し、写真を押すと画像を変えられます。' },
  { title: '配布用レイアウト', text: '右上の「配布用レイアウト →」で、主成分サークルやTopicを足して、印刷・PDFにします。' },
]
