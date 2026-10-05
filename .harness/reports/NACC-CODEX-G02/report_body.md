# NACC-CODEX-G02 — 携帯カタログの表示・原文編集と本番反映

記録日: 2026-10-04。実行元: Codex。このチャットで実施した作業のみを報告する。

## 到達点と結果

携帯・タブレットでカタログを読みやすくし、原文をその場で編集する。実装と本番デプロイは完了。実機での受入確認は未完了。

| 要件 | 実装結果 | 確認状況 |
|---|---|---|
| タイトルNACC・カタログ導線 | HeaderをNACCに変更。商品Galleryのパンくず位置にアイコン＋カタログボタン。ブラウザタイトルもNACC | コード確認・ビルド成功 |
| クラウド保存中を非表示 | 正常接続時の文字を隠す。アカウント操作は残す | コード確認 |
| 携帯ヘルプ位置 | viewport指定時にPortalでbody直下へ表示。携帯では画面下・safe areaを考慮 | コード確認。実機未確認 |
| カタログHeader開閉 | 幅1024px以下またはcoarse pointerで下スクロール時に縮小。商品ページへ戻るボタンとheaderOpen...を残す。タップで再表示 | コード確認。実機未確認 |
| 説明全文 | 同条件で成分説明の3行省略を解除。商品説明も全文を追加表示 | コード確認。実機未確認 |
| 原文編集 | 商品名・商品説明、共有成分カードの名前・説明をcontentEditableで編集。blurでupdateProduct / updateNutrientを呼ぶ | 型検査成功。操作・クラウド保存未確認 |

## 検証と公開証拠

- このチャットで各変更後に `npm run build` を実行。TypeScript・Vite・PWA生成が終了コード0で成功。
- `npx vercel --prod --yes` で既存nacc-systemへ公開。最終デプロイは `dpl_9vA75j4XzWMwF9pQjxKHAJPSU6mR`、状態READY。
- 本番: https://nacc-system.vercel.app
- 最終公開の確認ページ: https://vercel.com/shunsuke-ks-projects/nacc-system/9vA75j4XzWMwF9pQjxKHAJPSU6mR
- 直前のHeader・ヘルプ修正公開: `dpl_EgpMtdsXZ4wWqaqnWA1c6tFtPLaG`。
- 大きなbundleの警告は残る。ビルド失敗ではない。
- 実機Safari、キーボード表示時、Header再開閉、編集後再読み込み・他端末同期は未確認。

## 再利用と制約

入口: [再利用索引](../../../reuse-index.json) の mobile-catalog-header / inline-original-edit / viewport-help。

- src/pages/catalog/index.tsx: onCatalogScroll / openHeader。スクロール位置と閉状態を分離し、上スクロールだけでは開かない。再表示後は24px下へ進むと再度閉じる。PCでは縮小CSSを適用しない。
- 同ファイル: OriginalText。blurを保存契機にする。保存成功の表示・失敗通知はこの部品にはない。共有成分の編集は関連商品の原本にも反映される。原材料表記とチェック表だけの追加成分は編集対象外。
- src/components/HelpButton.tsx: HelpButton(viewport)。backdrop-filter等がある親要素からポップアップを外す。Portal内クリックを外側クリック扱いしないためpanelRefも判定する。

原本編集の対応箇所を明示せず、全行が編集可能と説明しない。タッチ端末向けの閾値・CSS・保存adapterは移植先に合わせる。

## 他窓口との境界と次の一手

NACC-CC-G01はClaude Code側の確定報告として保持。本レポートでその検証結果を再確認済みとは扱わない。

作業開始時のHEADはc246b4a。CCのHEADは1382e30。双方のコミット存在をローカルで確認したが、GitHubへのpushは利用者報告であり、この報告時に遠隔確認はしていない。

今回のコード変更は作業ツリーに残り、本レポート作成時点で未コミット。本チャットからレポートのコミット・pushは実施していない。

次の一手（候補・未指示）: 携帯またはiPadでHeader開閉と原文編集→欄を離れる→再読み込みを確認し、その結果を本Goalへ追記する。
