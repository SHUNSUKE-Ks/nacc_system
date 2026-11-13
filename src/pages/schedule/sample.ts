// 予定の画面（見た目だけ）の見本データ。保存はしない。今月を基準に作る
// 本物にするときは Firestore の schedules などに置き換える

export type Staff = { id: string; name: string; color: string }
export type ScheduleEvent = {
  id: string
  staffId: string
  title: string
  date: string // YYYY-MM-DD（始まりの日）
  days?: number // 何日続くか（既定 1）
  start?: string // HH:MM（無ければ終日）
  end?: string
  place?: string
  memo?: string
}

export const STAFF: Staff[] = [
  { id: 'me', name: '自分', color: '#b38247' },
  { id: 'sato', name: '佐藤', color: '#4f86c6' },
  { id: 'tanaka', name: '田中', color: '#5aa469' },
  { id: 'suzuki', name: '鈴木', color: '#d26f8e' },
  { id: 'shop', name: '店の予定', color: '#8a78c2' },
]

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** base の月の見本。today は「今日の予定」を置く日（今月でなければ 13日） */
export function sampleEvents(base: Date, today: number): ScheduleEvent[] {
  const day = (n: number) => ymd(new Date(base.getFullYear(), base.getMonth(), n))
  return [
    { id: 'e1', staffId: 'shop', title: '定休日', date: day(3) },
    { id: 'e2', staffId: 'shop', title: '定休日', date: day(17) },
    { id: 'e3', staffId: 'me', title: '本社へ発注', date: day(today), start: '10:00', end: '10:30', memo: '注文書を FAX で' },
    { id: 'e4', staffId: 'sato', title: 'お客様 来店（山本様）', date: day(today), start: '14:00', end: '15:00', place: '店頭' },
    { id: 'e5', staffId: 'tanaka', title: '商品の入荷', date: day(today), start: '16:00' },
    { id: 'e6', staffId: 'suzuki', title: '研修', date: day(Math.min(today + 2, 26)), days: 2, memo: '本社にて' },
    { id: 'e7', staffId: 'me', title: 'カタログの見直し', date: day(8), start: '13:00', end: '15:00' },
    { id: 'e8', staffId: 'sato', title: 'お休み', date: day(11) },
    { id: 'e9', staffId: 'tanaka', title: 'イベント出店', date: day(20), days: 3, place: '市民会館' },
    { id: 'e10', staffId: 'me', title: '月末の締め', date: day(28), start: '17:00' },
    { id: 'e11', staffId: 'suzuki', title: 'お客様へ電話', date: day(14), start: '11:00' },
    { id: 'e12', staffId: 'sato', title: 'チラシの配布', date: day(24), start: '09:30', end: '12:00' },
    { id: 'e13', staffId: 'me', title: '銀行', date: day(5), start: '15:00' },
    { id: 'e14', staffId: 'shop', title: '棚卸し', date: day(29) },
  ]
}

export { ymd }
