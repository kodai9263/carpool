# 課金導線改善の実装・検証結果

2026-09-09 / branch: `codex/improve-paid-conversion`

## 変更内容

- 配車画面に自動割り当ての価値説明、無料体験、月300円のプラン選択を追加。
- 回答がまだない場合は回答依頼を案内。作成成功時は実際の人数・台数を表示。
- 申込時に未保存の配車と回答期限を同じタブへ24時間保存し、決済後に元の配車へ復元。
- プロフィールも月払い優先。支払い失敗でFreeへ戻った契約者も支払管理を利用可能。
- Checkoutの所有者と現在の契約状態をサーバーで確認。反映待ちは30秒で区切り、再確認を表示。
- 既存契約は支払管理へ誘導。管理者ごとのDBロック・Stripe冪等キー・未決済セッションの整理で重複申込を抑止。
- 無料範囲・価格・既存データ・メンバー共有URLは維持。

## 計測の区別

| イベント／記録 | 意味 |
|---|---|
| `auto_assign_offer_viewed` | 無料案内・上限表示が画面内に入った |
| `upgrade_offer_clicked` | 配車画面からプラン選択を開いた |
| `upgrade_dialog_viewed` | プラン選択を表示した |
| `upgrade_clicked` | 月／年の申込みを選んだ |
| `checkout_started` | サーバーが新規Checkoutを作成した |
| `checkout_redirected` | 配車画面からCheckoutへ遷移した |
| `billing_portal_redirected` | 新規申込ではなく既存契約の管理へ遷移した |
| `checkout_confirmed` | 復帰画面でPro反映を確認した（購入人数には使わない） |
| `BillingConversion` / `purchase` | 新実装で成立した契約を契約IDごとに1件記録 |

自動割り当て成功は既存のサーバーイベントを利用する。購入の一次記録はDB。GA送信はベストエフォートで、送信中断時の欠測があり得る。過去契約の再同期を新規購入に含めない。管理者ごとの集計では除外設定・同一期間・同一対象を揃え、イベント総数を人数と混同しない。

## 検証済み

- 本体の23 suites / 142 tests成功（古い`.claude/worktrees`内の別作業テストを除外）。
- 全体lint、TypeScriptチェック、Prisma schema検証、production build、diff check成功。
- 決済の所有者、未決済・未払い、既存契約誘導、セッション再利用、冪等キー、契約記録の重複除外をモックで検証。
- 未保存入力の復元・再取得による上書き防止・期限保存後の復元をコンポーネントテストで検証。
- 認証済みデモ配車の実APIで自動割り当ての結果表示を確認。配車の確定・期限変更は未実施。
- PCと390pxスマホ幅を確認。無料枠別のプラン選択は実コンポーネントを使うローカルfixtureで確認。

## 未確認・公開前の条件

- 既存の型エラー14件も最小限の型修正で解消。最新main `01101d5` の方向別ドライバー修正を取り込み済み。
- `20260909000000_add_billing_conversion` はユーザー承認後に本番へ適用済み。適用完了、一意制約、RLS有効、anon/authenticatedのSELECT・INSERT・sequence USAGE不可を確認。
- ローカル設定のStripeキーは読み取り時に認証エラー、年払いPrice IDは未設定。Vercel管理画面では本番用の月・年Price ID、Stripeキー、Webhook secretの存在を確認。ただし値の有効性は未確認。
- Stripe実決済、実DBでの並行決済操作、購入後の実ブラウザ復帰は未確認。これらは有効なテスト環境での検証が必要。
- 課金転換の改善効果は未検証。公開後に体験率・Checkout開始率・契約成立率を評価する。
- push・PR作成は行っていない。既存のチーム作成関連の未コミット変更を保持している。本番変更は承認済みのWebhook2通知追加と購入記録テーブル追加のみ実施。

## 公開準備の追加確認

- Vercel本番は `01101d5` / Ready。今回の変更は未公開。
- Vercel本番のDB接続先とローカルの接続先を照合。未適用migrationが今回の1件のみ、過去のchecksum不整合・未完了履歴なしを確認してから適用。追加テーブルの件数は0件。
- StripeのCarpool本番アカウントで、有効な月300円／年3,000円の商品、本番WebhookのURLと有効状態、Portalの支払方法変更・期間末解約設定を確認。
- Webhookへ `invoice.paid` と `checkout.session.async_payment_succeeded` を追加済み。保存後に既存5種類を含む計7種類と有効状態を確認。直近1週間は配信0件のため、エラー0%は配信成功の証明にはならない。
- VercelのPrice IDとの値の照合、署名secret一致、実決済・復帰は未確認。
- 決済開始前に料金の金額・通貨・月／年・有効性を照合し、本番でテストPriceを拒否する検証を追加。
- Vercel PreviewにはWebhook secretがないため、現状のPreviewでは新規Checkoutを開始できない。決済検証にはテスト用Stripe設定一式と隔離DBが必要。
- 動作確認手順とコミット・PR文案は `docs/paid-conversion-release.md` に記載。

## 公開差分の独立検証

- 既存のチーム作成・LP変更を除外したsnapshotで、Team型のimport表記不一致を発見。追跡名 `Team.ts` に5箇所を統一。
- Stripeの既存「アプリ開発サンドボックス」は商品0件・Webhook未設定。現時点では実決済テスト環境が未構成であり、実購入テストは未実施。

公開差分単独のsnapshot（既存の未コミット変更を除外）でも、TypeScript・22 suites / 139 tests・production buildが成功。全作業ツリーの142件との差3件は、既存未コミットのteamCodeテスト。Team.tsの実ファイル名も内容を保持して追跡名へ統一済み。
