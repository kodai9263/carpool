# 課金導線改善の公開手順・提出文案

2026-09-09 / `codex/improve-paid-conversion`

## 現在の状態

実装・ローカル検証は完了。承認済みの本番DB適用とWebhook2通知追加も完了。アプリ本番公開・Stripe実決済は未実施。
既存のチーム作成・LP等の未コミット変更を作業ツリーに保持しているため、`git add .` で一括追加しない。
プッシュはユーザーが行う。PRはまだ作成していない。

## 公開前の順序

1. Stripeにログインし、本番月額300円／年額3,000円のJPY定期料金が有効であることと、Vercel設定のPriceとの対応を確認する。
2. Webhookが本番 `/api/stripe/webhook` に届き、Checkout完了・非同期支払成功・契約更新／削除・請求成功／失敗を受信できることを確認する。Customer Portalで支払方法変更・解約が可能か確認する。
3. Stripeテストキー、テストPrice、Webhook署名secret、隔離DBを揃えた検証環境で、下記の購入・復元・重複防止を確認する。本番キーを使うPreviewでテスト購入しない。
4. 接続先がCarpool本番DBであることを確認し、新規migration `20260909000000_add_billing_conversion` の適用を承認してから実行する。先にmigration履歴と差分を確認し、意図しない未適用migrationをまとめて実行しない。
5. 新テーブル・一意制約・RLS・anon/authenticatedのアクセス不可を確認してから、レビュー済み変更をmainへ反映してデプロイする。
6. Vercelが対象コミットでReadyになったことを確認し、認証済みPC／スマホ画面、エラーログを確認する。

## 動作確認

- 無料管理者の配車で、回答0件なら回答依頼へ進める。回答が揃うと無料の自動割り当てを使え、結果の人数・台数が実データと一致する。
- 無料枠が残る状態と上限到達状態の両方でPro案内を開ける。月額300円を主に、年額3,000円と自動更新条件を確認できる。
- 未保存の配車・往復設定・回答期限を変更してから申込を開く。キャンセルして元の配車へ戻ると入力が復元する。保存後に戻っても古い入力で上書きされない。
- テスト購入後、Webhook／照合APIで契約が反映されてからPro表示になる。戻りURLだけを書き換えても購入成功扱いにならない。
- 反映遅延や通信停止は30秒で再確認案内へ移る。再確認中に二重申込できない。
- 既存契約者が別タブから申込を開いても新規契約が増えず、契約管理へ進む。未決済セッション再利用と月／年切替も確認する。
- 同じCheckout通知を再送しても `BillingConversion` が増えない。他人のsession IDで契約を照会できない。
- 支払失敗で無料表示になった管理者もプロフィールから契約管理を開ける。
- 390px幅で横スクロールが出ず、ダイアログを閉じる・Escape・フォーカス移動が使える。

ローカル再検証:

```sh
npm test -- --runInBand --testPathIgnorePatterns '/.claude/'
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
git diff --check
```

古い `.claude/worktrees` は本体のテスト対象から除外。現時点で23 suites / 142 tests、型チェック、lint、schema、build成功。決済テストはモックであり、Stripe実購入の証明ではない。

## コミットメッセージ案

```text
無料体験からPro申込への導線と決済復帰を改善

- 配車画面に価値説明と月払い中心のPro案内を追加
- 決済前の未保存入力を保持して元の配車画面へ復元
- 契約照合・重複申込防止・料金検証を強化
- 契約成立を重複なく記録し、課金ファネルを計測
- 既存の型エラーを修正し、回帰テストを追加
```

## PRタイトル案

無料体験からPro申込までの導線を改善し、決済後の配車入力を復元

## PR本文案

無料の自動割り当てを使った管理者が、配車画面から料金と用途を確認してProへ申し込めるようにしました。月払いを主な選択肢にし、決済前の未保存入力を保持して、購入・キャンセル後に元の配車へ復元します。無料枠と価格は維持しています。

戻りURLだけで購入成功を表示せず、Stripeの現在の契約状態を確認します。既存契約は契約管理へ誘導し、DBロック・冪等キー・未決済セッション整理で重複申込を抑止します。表示料金とStripe Priceの不一致も申込前に検出します。

契約成立は新設のBillingConversionへ一意に記録します。DBを一次記録とし、GA送信の欠測を購入数と混同しない設計です。

検証: 142テスト、TypeScript、lint、Prisma schema、production buildが成功。PC／390pxで実コンポーネントを確認。Stripe実購入と購入後の実ブラウザ復帰は未検証です。

公開条件: 新規migrationの先行適用、Stripe本番設定の照合、隔離したStripeテスト環境での購入確認。現時点では未公開です。

## Stripe管理画面で確認した内容

- Carpool本番アカウントの商品: 月300円／年3,000円が有効。旧月500円も残る。
- Webhook: `https://carpool-navy.vercel.app/api/stripe/webhook` がアクティブ。
- 登録済み: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`。
- 追加済み: `invoice.paid`, `checkout.session.async_payment_succeeded`。既存5件を維持した計7件を保存後に確認。
- Portal: 支払方法更新、請求履歴、期間末キャンセルが有効。プラン切替は無効。
- 料金IDとVercel設定値の一致、署名secret一致、実際の配信・購入・復帰は未検証。
- 本番変更済み: 上記Webhook2件追加、およびVercel本番との接続先照合後に `20260909000000_add_billing_conversion` 1件を適用。既存テーブルは変更せず、購入記録テーブルと一意制約・RLSを追加した。
- DB検証: migration完了、subscriptionId／checkoutIdの一意制約、RLS有効、anon/authenticatedのSELECT・INSERT・sequence USAGE不可。追加テーブル0件、過去migrationのchecksum不整合なし。

公開差分単独のsnapshot（既存の未コミット変更を除外）でも、TypeScript・22 suites / 139 tests・production buildが成功。全作業ツリーの142件との差3件は、既存未コミットのteamCodeテスト。Team.tsの実ファイル名も内容を保持して追跡名へ統一済み。
