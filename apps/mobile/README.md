# Carpool Admin Mobile

Carpoolの管理者向けExpoアプリです。既存のNext.js APIとSupabase Authを使い、Web版のデータをそのまま扱います。

## MVPでできること

- 管理者アカウントでログイン
- チーム一覧を確認
- チームごとの配車一覧を確認
- 配車予定を作成
- 回答依頼と決定後の案内をスマホの共有シートからLINEへ共有

メンバー回答、細かな自動割り当て・手動割り当て、課金・プロフィール管理は引き続きWeb版を使います。

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

## App Storeに進める前の残タスク

- アプリアイコンとスプラッシュ画像をCarpool正式デザインに差し替える
- EAS Build設定を追加する
- App Store Connect用の説明文、スクリーンショット、プライバシー情報を用意する
- 必要に応じてプッシュ通知やアプリ内課金を次フェーズで検討する
