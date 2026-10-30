# Carpool Admin Mobile

Carpoolの管理者向けExpoアプリです。既存のNext.js APIとSupabase Authを使い、Web版のデータをそのまま扱います。

## 管理者アプリでできること

- メール・パスワードで新規登録、ログイン、パスワード再設定
- 確認メールからアプリに復帰し、管理者アカウントを確認
- チーム作成、家族単位で複数の保護者・兄弟を登録
- チーム・家族・配車一覧をページ送りで確認
- 配車予定を作成
- 回答済み・未回答を確認し、無料残回数・Pro利用状態に応じて配車案を自動作成
- 車と子どもの割り当てを行き・帰りごとに手動で調整して保存
- 回答依頼と決定後の案内をスマホの共有シートからLINEへ共有

保護者の回答は従来どおりWebで行います。家族の編集・削除、引率者の追加・変更はWeb版を使います。既存の引率情報は手動保存時に保持し、引率者を設定済みの配車は自動で作り直せないようにしています。

子どもの参加回答が揃うまで自動作成を停止します。自動作成は案の生成時点で無料回数を消費し、保存とは別です。未保存・未割り当て・更新競合・保存後の再取得失敗がある状態では決定後の共有を停止します。アプリ内購入は未実装です。

## メールからアプリへ戻る設定

アプリは `carpool://auth/callback` を使ったPKCE認証に対応しています。Supabase側のリダイレクト許可とメールテンプレートが、この戻り先を利用できる必要があります。リンクを発行した端末のアプリでメールリンクを開く前提です。これらのサービス設定は今回変更していません。

ログイン後に既存の `/api/auth/ensure-admin` で管理者登録を確認します。チーム作成APIはチームIDの省略に対応し、自動発行します。既存Webクライアントが指定するチームIDも受け付けます。DBスキーマの変更はありません。

## セットアップ

```bash
cp .env.example .env
npm install
npm run start
```

`.env` には次を設定します。

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
EXPO_PUBLIC_WEB_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

`EXPO_PUBLIC_` の値はアプリに埋め込まれるため、service role keyなどの秘密情報は入れないでください。

リリース用のAPI・Web・Supabase URLにはHTTPSが必要です。HTTP接続は開発モードに限定しています。

## ローカル接続の注意

- iOS Simulator: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- 実機: Macと同じWi-Fiに接続し、`http://<MacのLAN IP>:3000`

Next.js側も別ターミナルで起動しておきます。

```bash
cd ../..
npm run dev
```

## 確認コマンド

```bash
npm run typecheck
npm run lint
```

## 2026-10-04の確認結果

- モバイルの型検査、変更箇所のESLint、差分の空白検査が成功
- 関連Jest 8スイート・73テストが成功（認証更新、登録入力、未保存入力、日付、往復方向、割り当て、更新競合、チーム作成、回答更新）
- 公開前の全体検証は63スイート・475テストが成功。往復共通に片道回答を割り当てない検証と、Webの引率候補・再選択の検証を含む
- iOS向けHermesコード生成とWeb静的出力が成功
- ローカルの架空APIで、新規登録案内→ログイン→チーム作成→複数保護者・兄弟登録→配車作成→回答反映→自動作成→手動調整→保存→再読み込みを画面確認
- 390px・1280px幅で横溢れなし。検証タブのコンソールエラーなし

画面確認は架空の認証・データによるものです。実際のSupabase確認メール、DBへの保存、iPhone実機、LINE共有シート、購入は未確認です。ブラウザの未保存確認ダイアログは検証操作が停止したため、操作完了を確認できていません（ガードの単体テストは成功）。

Xcode 27.0とiOS 27 Simulatorは導入済みです。以前の「Xcode未導入」という記録は、`xcode-select` がCommandLineToolsを選んでいたことによる誤判定でした。必要時は `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` をコマンド単位で指定できます。Carpool用CocoaPods・EAS CLI・iOSプロジェクトは未準備です。iOSコード生成の成功は署名済みアプリのビルド成功を意味しません。

全体型検査の6件は、参照していた依存とPrisma生成型が古いことによるものでした。ロックファイルが一致する既存依存と、現在のスキーマと同じ生成型を使った隔離スナップショットでは、全体型検査・lint・Next.js本番ビルドが成功しました。共有依存の書き換え・本番DB接続は行っていません。

## 配布設定の準備状況

`eas.json` にSimulator確認用とApp Store向けのビルド設定を用意しています。これはビルド・配布の完了を示すものではありません。

- `simulator`: preview環境、署名不要のSimulator向けReleaseビルド
- `production`: production環境、ストア向け署名ビルド、ビルド番号はEAS側で管理・更新
- SDK 57のビルドイメージを指定。開発クライアント依存は追加していません。
- Carpool専用のbundle identifier、Expo owner/project ID、Apple署名、App Store ConnectアプリIDは未設定です。献立アプリの識別子を流用しません。
- Expo環境には前述の公開URL・公開キーのみ設定します。Appleの秘密鍵やSupabase service role keyはアプリ設定へ入れません。

献立アプリはCapacitorとApple Personal Teamによる開発版で、CarpoolのExpo/EAS設定とは別です。Apple Developer Programの有料登録は2026-10-04時点で手続き途中です。

## App Storeに進める前の残タスク

- アプリアイコンとスプラッシュ画像をCarpool正式デザインに差し替える
- iOSの識別子・署名・ビルド設定を整備し、実機でメール復帰・保存・共有を確認する
- アプリ内課金・購入復元と権限反映を実装する
- レビュー依頼、アカウント削除、必要な利用規約・プライバシー導線を整える
- App Store Connect用の説明文、スクリーンショット、プライバシー情報を用意する

今回の変更は基本導線と配布設定のひな形までです。Web/APIの本番反映とApp Store公開は別工程で確認します。ストア申請は未実施です。
