import { type Component, createSignal, For, onCleanup, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

// 携帯では、親要素の重なりや切り取りの影響を受けないよう body 直下に出す
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches

// 画面ごとの「？」ヘルプ。クライアント向けに、その画面でできることを短く並べる
export type HelpItem = { title: string; text: string }

const HelpButton: Component<{ title: string; items: HelpItem[]; class?: string; viewport?: boolean }> = (props) => {
  const [open, setOpen] = createSignal(false)
  let rootRef!: HTMLDivElement
  let panelRef: HTMLElement | undefined

  const onOutside = (event: PointerEvent) => {
    if (open() && !rootRef.contains(event.target as Node) && !panelRef?.contains(event.target as Node)) setOpen(false)
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
        <Portal mount={props.viewport || isPhone() ? document.body : rootRef}>
        <section ref={panelRef} class={`help-panel ${props.viewport ? 'help-panel-viewport' : ''}`} role="dialog" aria-label={`${props.title}の使い方`}>
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
        </Portal>
      </Show>
    </div>
  )
}

export default HelpButton

// ── 各画面のヘルプ文 ─────────────────────────────────────────────────────
// 1項目＝1つの操作。「どこを・どうすると・どうなる」を短く書く
export const HELP_PRODUCT_GALLERY: HelpItem[] = [
  { title: '商品を開く', text: '商品カードを押すと、その商品のノート（説明・成分カード）が開きます。' },
  { title: '絞り込み', text: '上の「お気に入り／全て／サプリ／コスメ」で切り替えます。検索欄で商品名・説明・成分から探せます。' },
  { title: 'お気に入り', text: 'カード右上の☆を押すと★になり、もう一度押すと外れます。お気に入りはアプリを開いたときに最初に出ます。' },
  { title: '原本／配布用', text: '「原本」は商品ノート、「配布用」は「配布可」にしたリーフレットだけを並べます。' },
  { title: '表示形式', text: '右の◇で「カード・目次・テーブル」を切り替えます。' },
  { title: '成分カードを足す', text: '商品ノートの「＋ 成分を追加」で、共有の成分から選ぶか、「＋ 新規」で名前と説明を入れて作ります。' },
  { title: 'リーフレット', text: '商品ノート右上の「＋ リーフレットを作る」で、商品ノートの並びのまま配布用の資料を作ります。' },
  { title: 'メモ・カタログ', text: '左上の ☰ のメニューから開きます。' },
]

export const HELP_SIDEBAR: HelpItem[] = [
  { title: 'クイックメモ', text: 'どの画面からでもすぐメモを書けます。「未分類」に入ります。商品ノートを開いているときは、その商品名がタグに付きます。' },
  { title: '商品一覧', text: '商品カードの一覧です。押すと商品ノートが開きます。' },
  { title: '写真', text: '商品の写真と、端末から追加した写真をグループで並べます。メモの「＋ 写真を貼る」はここから選びます。' },
  { title: 'カタログ', text: '新しいカタログの商品と成分を1つずつ確認するチェック表です。' },
  { title: 'アンケート', text: '病名・症状と美容の悩みの一覧に、◎○△×で興味を付けます。' },
  { title: 'リーフレット', text: '全商品の編集中のリーフレットをまとめて開きます。' },
  { title: '資料PDF', text: '商品・成分資料のPDFを右側に開きます。' },
  { title: 'ノートブック', text: 'メモの入れ物です。見出しの＋で作り、ノートブックに触れると出る＋で中にもう1段作れます。名前はダブルクリックで変更。数字は中のメモの数です。' },
  { title: 'ごみ箱', text: '消したメモはここに残ります。「復元」で戻せます。' },
  { title: 'ログイン・文字の大きさ', text: '右上の⚙（設定）にあります。' },
]

export const HELP_LEAFLET_GALLERY: HelpItem[] = [
  { title: 'リーフレットとは', text: '商品ノート（原本）をもとに作る配布用の資料です。リーフレットを直しても原本は変わりません。' },
  { title: '作る・複製', text: '「＋ リーフレットを作成」で新しく作ります。「複製」は中身ごとコピーして別の資料にします。' },
  { title: '編集', text: '「編集」でカードの順番・表示・文を直します。「配布用レイアウト」で見た目を整えて印刷・PDFにします。' },
  { title: '削除', text: 'カード右上の×で消せます（確認が出ます。原本は残ります）。' },
  { title: '写真ギャラリー', text: '上の「写真ギャラリー」タブで、端末から写真を追加できます。背景が透明なPNGもそのまま使えます。' },
]

export const HELP_LEAFLET_V21: HelpItem[] = [
  { title: 'この画面', text: '商品ノートと同じ並びのまま、配布用のカードを整えます。ここで直しても原本は変わりません。' },
  { title: '並び替え', text: 'カード左上の番号を0.3秒長押しすると持ち上がります。青い線の位置で離すと入ります。番号は自動で付け直されます。' },
  { title: '表示／非表示', text: 'カード右上の「表示」のチェックを外すと、カードが暗くなって最後に回り、配布用レイアウトに出なくなります。' },
  { title: '文を直す', text: '「編集」でタイトルと説明を直します。「このリーフレットだけ」は原本を変えません。「原本に保存」は商品ノートとほかのリーフレットにも反映されます。' },
  { title: '成分を追加', text: '「＋ 成分を追加」で、原本から・共有の成分から・新規作成の3通りで足せます。' },
  { title: '原本に成分が増えたとき', text: '画面を開いたときにお知らせが出ます。「そろえる」で最後に追加されます。' },
  { title: 'header', text: '上の欄で対象者・タイトル・コメント・担当者を入力します。写真を押すと画像を変えられます。' },
  { title: '配布可', text: '仕上がったら「配布可にする」を押すと、商品一覧の「配布用」に並びます。' },
  { title: '次へ', text: '「配布用レイアウト →」で見た目を整えて、印刷・PDFにします。' },
]

export const HELP_LEAFLET_LAYOUT: HelpItem[] = [
  { title: 'header', text: '「HEADER」でデザインを4種類から選べます。写真を押すと画像を変更、「二重線」で飾り線を入れられます。' },
  { title: 'セクション', text: '「＋ セクション」で主成分サークルやTopicを好きな位置に入れます。↑↓で順番、×で削除。' },
  { title: 'カードの見た目・順番', text: '「カード／主要成分」で見た目を切り替えます。カード右上の ‹ › で順番を前後に動かせます。' },
  { title: '主成分サークル', text: '成分を最大4つ入れられます。カードを長押ししてサークルの上で離すか、「＋ 成分を選ぶ（複数可）」でまとめて追加します。丸の中の文字はEnterで改行できます。' },
  { title: 'マーカー', text: '「マーカー」を押してから文字を選ぶと、黄色マーカーや下線を引けます。' },
  { title: 'コピー', text: 'タイトルや説明の横のコピーアイコンで、Canvaへそのまま貼り付けられます（印刷には出ません）。' },
  { title: 'PDF・印刷', text: '「A4ページ区切り」で分かれ目を確認し、「印刷 / PDF」で出力します。商品名とページ番号はページの片隅に小さく入ります。' },
]

export const HELP_CATALOG_CHECK: HelpItem[] = [
  { title: 'この画面', text: '新しいカタログの商品と、その成分を1つずつ確認するチェック表です。' },
  { title: 'チェック', text: '成分の左の□を押すと「確認済み」、もう一度押すと「未確認」に戻ります。' },
  { title: '保留', text: '右のステータスで「保留」を選び、メモ欄に理由を書きます。「＋ 名前を確認」「＋ 成分説明確認」を押すとその言葉が入ります。' },
  { title: '商品確認済み', text: '成分がすべて確認済みになると「商品確認済み」が押せます。押すと商品名に取り消し線が付きます。' },
  { title: '文を直す', text: '商品名・商品説明・成分名・成分説明は、押すとその場で直せます。欄の外を押すと保存され、商品ノート（原本）にも反映されます。' },
  { title: '成分を足す', text: '各商品の下の「＋ 成分を追加」で、カタログで見つけた成分を足せます。チェックを外すとこの表だけに入ります。' },
  { title: '絞り込み', text: '「ALL／未確認／確認済み／保留」とサプリ・コスメで絞り込み、検索欄で商品名・成分名から探せます。' },
  { title: '確認日・タイトル', text: '確認日は押すと変えられます。表のタイトルと説明も、押すと書き換えられます。' },
  { title: 'チェックをリセット', text: '確認日の横のボタンで、すべてのチェックを「未確認」に戻します（確認が出ます。メモと足した成分は残ります）。' },
  { title: '最終更新', text: '一番右に最後に操作した日時が出ます。どこまで進んだか分からなくなったら見てください。' },
]

export const HELP_MEMO: HelpItem[] = [
  { title: '書く', text: '「＋ 新規」で新しいメモを作ります。見ているノートブックの中に入ります。文字は自動で保存されます。' },
  { title: 'ノートブックへ移す', text: 'メモの上の「ノートブック」で入れ先を選びます。' },
  { title: 'タグ', text: '「＋ タグ追加」で商品・成分を付けられます。' },
  { title: '写真を貼る', text: '右上の「写真を貼る」で写真ページの写真を選びます。端末から追加した写真は、その端末でだけ見えます。' },
  { title: '消す', text: '右上のごみ箱で移します。メニューの「ごみ箱」から戻せます。' },
]

export const HELP_PHOTOS: HelpItem[] = [
  { title: 'グループ', text: '上のボタンでグループを切り替えます。「商品画像」は商品の写真が自動で並びます。' },
  { title: '写真を追加', text: '「2026_写真」などのグループを選んでから、上の「＋ 写真を追加」を押します。選んでいるグループに入ります。写真はこの端末に保存されます。' },
  { title: 'グループを作る', text: '「＋ グループ」で名前を入れて作ります。' },
  { title: 'メモに貼る', text: 'メモの「＋ 写真を貼る」から、ここの写真を選べます。' },
]

export const HELP_SCHEDULE: HelpItem[] = [
  { title: 'この画面', text: '自分とスタッフの予定を、月のカレンダーで見ます。今は見本の画面で、予定は保存されません。' },
  { title: '月を変える', text: '上の ‹ › を押すか、カレンダーを左右にはらいます。「今日」で今月に戻ります。' },
  { title: 'スタッフで絞る', text: '名前のチップを押すと、その人の予定を出す・隠すを切り替えます。2回続けて押すと、その人だけになります。「全員」で元に戻ります。' },
  { title: '時間割', text: '日付を押すと、下にその日の時間割が出ます。横にスタッフ、縦に時刻が並びます。上で絞った人だけの列になります。予定を押すと詳しく見られます。' },
  { title: '予定を足す', text: '右下の ＋ は予定を足す画面の見本です（まだ保存されません）。' },
]

export const HELP_FAX: HelpItem[] = [
  { title: 'この画面', text: '本社の FAX へ送る専用の画面です。宛先は本社に決まっていて、変えられません。' },
  { title: 'PDF を送る', text: '「PDF を選ぶ」で選びます。A4 縦で、大きさは 3MB までです。' },
  { title: '手書きを送る', text: '「手書きの写真から作る」で紙の写真を選ぶと、A4 の PDF にします。何枚でも選べ、1枚が1ページになります。「くっきり白黒」にすると FAX で読みやすくなります。' },
  { title: '送る前に', text: '見本で中身を確かめ、2つの確認に印を付けると送れます。最後にもう一度聞かれます。' },
  { title: '結果', text: '下の履歴に「送信中」→「送れた」か「エラー」が出ます。結果が出るまで数分かかることがあります。' },
]

export const HELP_SURVEY: HelpItem[] = [
  { title: 'この画面', text: '病名・症状（72項目）と美容の悩み（40項目）の一覧です。気になるものに印を付けます。' },
  { title: '印を付ける', text: '◎ とても興味あり／○ 興味あり／△ 少し／× 興味なし。同じ印をもう一度押すと外れます。' },
  { title: 'メモ', text: '右の欄に一言書けます。欄の外を押すと保存されます。' },
  { title: '切り替え・絞り込み', text: '上の「病気・症状／美容の悩み」で切り替え、カテゴリで絞り込みます。「まだ答えていない項目だけ」で残りだけを表示します。' },
  { title: '保存', text: '自動で保存されます。クラウドにつながっていれば、ほかの端末とも同じ回答になります。' },
]
