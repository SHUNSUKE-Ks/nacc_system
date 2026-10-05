// 使い方: プロジェクト直下で node data/survey/build_survey_ts.mjs（src/db/survey.ts を作り直す）
import { readFileSync, writeFileSync } from 'node:fs'
const dir = 'data/survey/'
const FIX = {
  'D-04-01': { name: '気管支喘息' },
  'D-12-03': { name: '全身性エリテマトーデス（SLE）' },
  'D-06-02': { symptoms: '頭全体の締め付け感・後頭部の重さ・肩こり' },
  'D-08-04': { symptoms: '過多月経・貧血・下腹部痛・頻尿' },
  'D-11-06': { symptoms: 'あごの痛み・開口時の雑音・口が開きにくい' },
  'D-01-05': { symptoms: '脈が飛ぶ・脈が速くなる・動悸・胸の不快感' },
  'B-07-04': { yomi: 'てのこうのうきでたけっかん・ふけて' },
}
const items = []
for (const [file, set] of [['2026-10-05_A_病気症状_受領.csv', 'disease'], ['2026-10-05_B_美容の悩み_受領.csv', 'beauty']]) {
  const rows = readFileSync(dir + file, 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(','))
  for (const [id, category, name, yomi, symptoms, description] of rows) items.push({ id, set, category, name, yomi, symptoms, description, ...FIX[id] })
}
const body = `// 病名・症状／美容の悩み アンケート用の一覧（2026-10-05 受領）
// 生成元: data/survey/*_受領.csv（誤字7か所を直した版）。手で書き換えず、元CSVを直して作り直す。
// 出典URLは検品で不合格だったため入れていない（data/survey/検品_2026-10-05.md）。
export type SurveySet = 'disease' | 'beauty'
export type SurveyItem = { id: string; set: SurveySet; category: string; name: string; yomi: string; symptoms: string; description: string }

export const SURVEY_ITEMS: SurveyItem[] = ${JSON.stringify(items, null, 2)}
`
writeFileSync('src/db/survey.ts', body)
console.log(items.length)
