# Carpool Admin Mobile

Carpoolの管理者向けExpoアプリです。既存のNext.js APIとSupabase Authを使い、Web版のデータをそのまま扱います。

## 公開準備の現在地（2026-11-07）

以下が最新の状況です。後段の日付付き検証記録は、その時点の結果として残しています。

- Apple Developerに`app.carpool.mobile`を登録。チーム`6F83KW7546`、App Store ConnectのアプリIDは`6831953729`です。
- グループ`22555528`へ月額`app.carpool.mobile.pro.monthly`（日本300円）・年額`app.carpool.mobile.pro.yearly`（日本3,000円）を登録。配信国は日本のみ、同一サービスレベル1、日本語表示、マルチシート・ファミリー共有はOFF、無料導入オファーなし。審査用スクリーンショット・初回申請は未完了です。
- 本番DBのApple契約migrationは適用・権限確認済み。Web/APIコードの反映と通知到達の確認は未完了です。Appleの本番・Sandbox通知URLは登録済み、VercelのProductionへ購入検証用10項目をSecretとして保存済みです。`APPLE_IAP_ENABLED=false`を維持します。
- 購入検証用キーは作成し、安全なローカルファイルへ保存済みです。Apple Sandboxの通知履歴APIが成功しました。Productionは401のため、本番公開後の再確認が必要です。キーをGitやアプリへ含めません。
- 最新ソース・本番公開URLを組み込んだiOS ReleaseビルドとCarpool専用の開発署名が成功しました。bundle ID、iOS16.4、`main.jsbundle`、codesign検証を確認済みです。初回archive/IPA書き出しも成功しましたが、旧Expoアイコン参照を検出したため未アップロードです。参照修正後の配布確認を進めています。TestFlight・実機購入/復元は未確認です。
- iOSアイコンと起動画面は既存Carpoolロゴを使用。Expo標準生成でストア用アイコンが1024px・透過なしになることを確認しました。
- App Storeからの商品選択は、ログイン後に購入画面へ一度だけ案内します。商品ID・所有アカウントを照合し、自動購入せず、既存の購入ボタンから`appAccountToken`付きで開始します。スマホ側15スイート124テスト・型検査・変更箇所lintが成功。実機の外部購入導線は未確認です。
- ストリームライン購入のOFF設定は、対応バイナリの審査承認前のためAppleに拒否されました。現在はONです。承認後にOFFへ変更し、実機で確認します。オファー・オファーコードは提供していません。

既存の生成済みiOSプロジェクトを更新する場合、Expo57では`prebuild`が既定で再生成するため、保持する意図なら`--no-clean`を明示します。破損した生成物でも削除が起き得るので、実行前にプロジェクトの存在・状態を確認してください。削除が必要なら別途承認を受けます。

## 管理者アプリでできること

- メール・パスワードで新規登録、ログイン、パスワード再設定
- 確認メールからアプリに復帰し、管理者アカウントを確認
- チーム作成、家族単位で複数の保護者・兄弟を登録
- チーム・家族・配車一覧をページ送りで確認
- 配車予定を作成
- 回答済み・未回答を確認し、配車案を自動作成（スマホ版の利用には有料Proが必要）
- 車と子どもの割り当てを行き・帰りごとに手動で調整して保存
- 回答依頼と決定後の案内をスマホの共有シートからLINEへ共有
- アカウント設定から定期購入を管理し、二段階確認でアカウントを削除（未契約・契約確認エラー時も利用可能）

保護者の回答は従来どおりWebで行います。家族の編集・削除、引率者の追加・変更はWeb版を使います。既存の引率情報は手動保存時に保持し、引率者を設定済みの配車は自動で作り直せないようにしています。

子どもの参加回答が揃うまで自動作成を停止します。未保存・未割り当て・更新競合・保存後の再取得失敗がある状態では決定後の共有を停止します。Web版の自動作成用無料枠は、スマホ版の利用権にはなりません。

## スマホ版の利用条件（2026-11-07）

ダウンロード・登録・ログインは無料で、チーム・家族・配車の機能には有料Pro契約が必要です。既存のWeb Pro契約者は同じ管理者アカウントで利用でき、スマホ版のための追加契約は不要です。

- `/api/admin/billing/status` の `billing.mobileAccess` が `true` のときだけ利用を許可します。サーバーは既存の契約判定 `isPaidPro === true` からこの値を返します。
- Webの30日間無料体験で使う `isPro`、自動作成の無料残回数、課金除外設定ではスマホ版を開放しません。
- ログイン後・トークン更新後・アプリ復帰時・利用中の定期確認で契約を再確認できます。確認中や通信エラーでは機能の操作を止め、再試行とログアウトの導線を表示します。同じアカウントの再確認では、入力途中の画面を保持します。
- これは公式アプリ内の利用制御です。共通のWeb APIをスマホ専用の有料APIへ変更するものではありません。

**アプリ配布前に、このブランチの契約確認APIをサーバーへ反映する必要があります。** 旧APIのように `billing.mobileAccess` がないレスポンスや不正な値は確認エラーとして扱い、既存Proでも利用を許可しません。サーバー反映後、実際の有料アカウントと無料アカウントでログイン・再確認を確認してからアプリを配布します。

月額・年額のアプリ内購入、購入復元、Appleの契約管理を実装しています。App Storeの商品価格を取得して表示し、購入者・署名・Appleの最新契約状態をサーバーで確認して保存した後にだけStoreKitの取引を完了します。Apple設定が未完了なら購入を開始しません。実決済・実機確認と配布設定はまだ済んでいないため、App Store提出可能な完成版ではありません。

再確認は利用中5分ごとにも行い、15秒応答がなければ再試行できるエラー画面にします。確認中・未契約・確認失敗時は画面を隠し、新たな保存リクエストも送信しません。確認開始前に送信済みの処理は取り消しません。未契約状態での直接リンクは案内画面へ戻ります。コールド起動の配車リンクは、契約確認後に元の配車へ戻す処理をまだ持たず、チーム一覧から開き直す必要があります。

## 2026-11-07 利用制御のみの段階での検証結果

- 関連11スイート・84テスト成功（API、無料体験の除外、通信失敗、タイムアウト、復帰、token更新、アカウント切替、契約失効、保存停止を含む）
- mobile型チェック、変更箇所のESLint、差分の空白検査が成功
- iOS向けHermesコード生成が成功。署名済みアプリのビルド・実機確認ではない
- 全体テストでは504件成功、メール通知の1スイートは共有node_modulesに既存依存nodemailerがないため実行不可。その後追加したprovider連携5件は関連テストで成功
- 全体型チェックもnodemailer本体と型の不足2件で停止。それ以外の型エラーはなし。依存追加・共有node_modulesの変更はしていない
- 390px幅で未契約案内、Pro確認後の開放、定期確認による利用停止、通信失敗、再確認後の入力保持、未契約の直接リンク拒否、ログアウトを画面確認。横溢れなし

今回の画面確認はローカルの架空認証・架空APIで行いました。本番アカウント、実機、購入・復元、App Store審査は未確認です。APIは本番未反映のため、現時点でこのアプリを本番APIに向けても利用できません。

## メールからアプリへ戻る設定

アプリは `carpool://auth/callback` を使ったPKCE認証に対応しています。Supabase側のリダイレクト許可とメールテンプレートが、この戻り先を利用できる必要があります。リンクを発行した端末のアプリでメールリンクを開く前提です。これらのサービス設定は今回変更していません。

ログイン後に既存の `/api/auth/ensure-admin` で管理者登録を確認します。チーム作成APIはチームIDの省略に対応し、自動発行します。既存Webクライアントが指定するチームIDも受け付けます。Apple課金の追加では、後述の契約テーブル・権限キャッシュのDB移行が必要です。

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
- ローカル設定にCarpool専用のbundle identifier候補 `app.carpool.mobile` と、献立で使う開発チーム `6F83KW7546` を設定しました。Apple側での識別子登録・署名プロファイルの確認はログイン後に行います。Expo owner/project ID・App Store ConnectアプリIDは未設定です。献立アプリの識別子は流用しません。
- Expo環境には前述の公開URL・公開キーのみ設定します。Appleの秘密鍵やSupabase service role keyはアプリ設定へ入れません。

2026-10-04時点の調査では、献立アプリはCapacitorとApple Personal Teamによる開発版で、Apple Developer Programの有料登録は手続き途中でした。これは当時の記録であり、現在の登録状況を示しません。2026-11-07に確認した献立のローカル資料には、11月1日のTestFlight配布とApple購入・復元実装が記録されています。Apple上の最新状態や実機での購入・復元結果は、このCarpool作業では確認していません。CarpoolのExpo/EAS設定とアプリ識別子は別途用意します。

## Apple購入・復元の実装（2026-11-07）

`expo-iap` 6.4.3 と `@apple/app-store-server-library` 3.1.0を固定追加しました。献立の購入検証・契約管理の設計を参考にし、スマホで購入したProも同じCarpoolアカウントのWeb版で使える構成です。Web/Android/Expo GoではiOSの購入モジュールを読み込みません。

- `AppleSubscription` にApple契約を保存し、`Admin`のApple有効期限・環境・購入者キャッシュを同じDB取引で更新します。Stripeの`billingPlan`は独立して保持し、有効な契約を合算します。AppleとStripeの契約管理ボタンも区別します。
- `appAccountToken`は認証済みのSupabaseユーザーUUIDです。署名内の購入者と照合し、別アカウントへの復元や担当者引継ぎ時の自動移譲を認めません。
- クライアントのJWSだけを信頼せず、Apple Server APIから最新の契約を取得して、返金・期限切れ・支払猶予を反映します。古い署名の再送で返金を取り消せません。Apple公式G3証明書とオンライン失効確認を使います。
- 保存後だけ`finishTransaction`を呼び、失敗した取引は未完了のまま残します。起動時の未完了取引と手動復元で再送します。購入結果待ち・承認待ちの再購入を止め、アカウント切替や遅い通知で処理が交差しないようにします。
- Web契約が存在する場合は新たなApple購入を案内せず、有効なApple契約があればStripe Checkoutも開始しません。既に両方で契約していた場合は両方の管理先を表示します。
- 検証APIは`/api/admin/billing/apple/transactions`、設定確認は`/api/admin/billing/apple/config`、Appleの署名付き通知は`/api/billing/apple/notifications`です。本文上限256KB、認証・署名検証・再試行可能な503応答を用意しています。

### 配布前に必要な設定

サーバー用の設定一覧はルートの `.env.apple.example` にあります。秘密鍵はホスティング側の秘密環境変数へ設定し、チャット・Git・アプリの公開設定へ入れません。設定不足・不正な鍵では`configured:false`を返します。

1. Carpool専用のbundle identifier、App Store Connectアプリ、同じサブスクリプショングループの月額・年額商品を用意します。無料体験を付けない仕様のため、App Store側でも無料の導入オファーを設定しません。表示金額はApp Storeから取得します。
2. アプリ識別子・商品ID・グループID・In-App Purchaseキーの情報をサーバーに設定します。アプリのbundle identifierと`APPLE_BUNDLE_ID`を一致させます。
3. `20261107000000_add_apple_pro_subscriptions`をAPI公開より先に反映します。AppleSubscriptionとAdminをサーバー専用にするため、RLSとPUBLIC/anon/authenticatedのテーブル・列権限の剥奪を含みます。既存コードのAdmin操作はPrisma経由です。
4. AppleのServer Notifications V2に、対象サーバーの`/api/billing/apple/notifications`を登録します。更新・返金・失効の継続反映に必要です。アプリ公開前の内部確認段階で、設定・API反映・審査アカウントの許可を揃えて`APPLE_IAP_ENABLED=true`にし、通知の到達を確認します。通知処理もこのフラグで制御されるため、無効状態では到達テストを成功扱いにしません。確認に失敗した場合は無効へ戻し、アプリを配布しません。
5. 本番は`APPLE_IAP_ENVIRONMENT=Production`を維持します。審査もSandbox購入を使うため、本番で確認する専用アカウントのSupabase UUIDだけを`APPLE_IAP_SANDBOX_REVIEW_ACCOUNT_TOKENS`へカンマ区切りで設定します。空欄または不正な設定では例外を無効化し、一般ユーザーのSandbox購入を拒否します。審査用ログインとこの制約を審査メモへ記載し、検証専用データだけを使います。許可を外すとSandbox由来の権利は無効になります。本番Apple契約があるアカウントは、失効後もSandbox契約へ戻しません。ProductionとSandboxの通知URLはともに本番の同じ署名検証エンドポイントを指定できます。独立した検証サーバー・DBを使う場合は従来どおり`Sandbox`を明示できます。
   - 未検証JWSの環境は接続先のヒントのみです。署名・所有者・商品・現在状態を検証してから保存します。取引IDだけの復元は、許可アカウントかつAppleの`4040010`応答時のみSandboxで再確認し、通信障害などでは切り替えません。
   - [Apple公式の審査購入の説明](https://developer.apple.com/help/app-review/before-submitting-for-review/configure-in-app-purchases/)
6. 専用iPhoneビルドで、購入、再起動、再インストール後の復元、購入取消、承認待ち、別アカウント、解約後の期限内利用、期限切れ、返金を確認します。実際の購入操作はユーザーが行います。

### 実装後の検証範囲

- 最終78スイート・627テスト（ローカル実DB7件を含む）、Web/mobile型検査、対象lint、Next.js本番ビルドが成功。前段のnodemailer不足は専用依存環境の導入で解消しました。
- 独立したPostgreSQL 16へ既存を含む30マイグレーションを適用し、保存の同時実行・所有者保護・返金再送・Stripe併用・別Apple契約維持・担当者引継ぎ・RLSの7テストが成功しました。旧式の列GRANTもローカルで再現し、権限剥奪を確認しました。
- iOS向けHermes出力と、検証用bundle IDを使う一時フォルダでの`expo prebuild --platform ios --no-install`が成功しました。CocoaPodsによるネイティブコンパイル・署名済みIPA・実機StoreKit検証ではありません。検証用IDはリポジトリのアプリ設定に保存していません。
- 390pxのWebプレビューで購入画面への導線、非対応環境・Apple未設定時の案内、既存Web Proの追加購入不要表示、アプリへの復帰を確認しました。iOSの月/年価格表示・処理中・承認待ち・既存Proの表示はモック付き画面テストで確認しています。

上記は実装直後の記録です。その後の商品・鍵・DBの反映状況は冒頭の「公開準備の現在地」を参照してください。実購入・実復元・ストア申請は未実施です。

購入ライブラリにはネイティブコードが必要で、Expo Goだけでは確認できません。[Expo公式の購入実装ガイド](https://docs.expo.dev/guides/in-app-purchases/)に沿って専用ビルドを用意します。既存Web契約と共通の機能を提供するアプリでは、[Appleのマルチプラットフォームサービス規定](https://developer.apple.com/app-store/review/guidelines/#multiplatform-services)を確認し、同等の商品をアプリ内でも購入できる状態で申請します。

### Xcode 27向けの最低iOSバージョン

`app.json` の `ios.deploymentTarget` をSDK 57の最低バージョンと同じ `16.4` に明示しています。Expo標準設定はアプリとPodfileの最低バージョンに反映されますが、AsyncStorage 3.1.1のPrivacy Manifest用resource bundleにはpodspecの`13.0`が残り、Xcode 27ではビルドエラーになります。React Nativeの既存post_installもnative targetのみを更新します。

`plugins/with-async-storage-resource-target.js` がprebuild時に補正を加え、`AsyncStorage-AsyncStorage_resources`だけの下限をアプリに揃えます。より高い設定や他のPodは変更しません。依存の追加や生成済みPodsへの手編集は不要で、EASでも再生成時に適用されます。上流で修正されたバージョンへ更新する際に、この補正の必要性を再確認してください。

`npm run test:ios-config` はNodeとRubyで生成コードの実行、対象限定、再生成時の重複防止、テンプレート変更時の検出を確認します。これは署名・実機実行の検証ではありません。[Expoの標準設定](https://docs.expo.dev/versions/latest/config/app/#deploymenttarget)、[AsyncStorageの該当不具合](https://github.com/react-native-async-storage/async-storage/issues/1355)

アカウント削除は既存の本人認証付きAPIを使います。Apple・Webの定期購入は自動解約されないため、削除前に契約管理を案内します。確認前・キャンセル時は削除せず、成功後にログアウトします。画面と通信はモックテストで確認済みですが、実際のアカウント削除は検証していません。

## App Storeに進める前の残タスク

- Carpoolアイコン・起動画面の実機表示を確認する（既存ロゴへの差し替え・生成検証済み）
- iOSの識別子・署名・ビルド設定を整備し、実機でメール復帰・保存・共有を確認する
- Apple商品の登録、通知と秘密設定、DB/API反映、実機での購入・復元・権限反映を確認する
- レビュー依頼を整え、アカウント削除・利用規約・プライバシーの導線を実機で確認する
- App Store Connect用の説明文、スクリーンショット、プライバシー情報を用意する

基本導線・Pro利用制御・購入復元の実装まで準備しています。Web/APIの本番反映とApp Store公開は別工程で確認します。ストア申請は未実施です。
