# 09. 開発環境セットアップ

## 方針

**DB は Docker、Next.js はネイティブの Node で動かす。**

macOS で Next.js を Docker に入れると、バインドマウント越しのファイル監視により
HMR が目に見えて遅くなる。バージョンの再現性は Volta で確保できるため、
アプリをコンテナに入れる利点が薄い。

| 対象 | 実行環境 | 理由 |
|---|---|---|
| MySQL（開発用） | Docker | 既存の `compose.yml` |
| MySQL（テスト用） | Docker | 別ポートで隔離 |
| Next.js | ネイティブ Node | HMR の速度、エディタ連携 |

Docker 化する価値があるのは「チームで環境を揃える」「本番ビルドを検証する」場合。
一人での学習では該当しない。

## 前提ツール

導入済みのバージョン（確認日: 2026-09-16）。

| ツール | バージョン | 用途 |
|---|---|---|
| Node | 24.21.0 | 実行環境 |
| pnpm | 12.4.1 | パッケージ管理 |
| Volta | 2.0.2 | Node / pnpm のバージョン固定 |
| Docker | 29.7.2 | DB |
| Docker Compose | 5.4.0 | 同上 |

## セットアップ手順

### 1. 既存の Next.js プロジェクトを使う

このリポジトリは直下が既に Next.js アプリである。`web/` ディレクトリを作らず、
以降の依存追加・環境変数・コマンドはすべてリポジトリ直下で扱う。

Node のバージョンは `package.json` の `volta.node`、pnpm のバージョンは
`packageManager` フィールドを正とする。corepack を無効化しない。

### 2. バージョンを確認する

```
node -v
pnpm -v
```

期待値は Node `v24.21.x`、pnpm `12.4.x`。
新たにバージョンを更新する場合は、`package.json` の `volta.node` と
`packageManager` を同時に更新する。

### 3. テスト用DBを確認する

[08-testing.md](./08-testing.md) のとおり、更新系テストのために別サーバーを立てる。
初期化SQL がスキーマ名 `sakila` を直書きしているため、
同一サーバーに `sakila_test` を作るには SQL の書き換えが必要になる。
別コンテナなら衝突しない。

`compose.yml` には既に `mysql-test` が定義されている。新規追加は不要だが、
構成を確認したい場合は以下を参照する。

```yaml
# compose.yml の services
  mysql-test:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: sakila
      MYSQL_DATABASE: sakila
    ports:
      - "3307:3306"
    volumes:
      - ./db/init:/docker-entrypoint-initdb.d:ro
    tmpfs:
      - /var/lib/mysql          # 永続化しない。作り直せば初期状態に戻る
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-psakila"]
      interval: 10s
      timeout: 5s
      retries: 10
```

`tmpfs` にしておくと、テストデータが壊れてもコンテナを作り直すだけで復旧できる。

### 4. 環境変数を用意する

開発用とテスト用で接続先が変わる。

```
# .env.local  （コミットしない）
DATABASE_URL=mysql://root:sakila@localhost:3306/sakila
AUTH_SECRET=<openssl rand -base64 32 で生成>
APP_TODAY=2006-02-14T00:00:00Z
```

```
# .env.test  （コミットしてよい。秘匿情報を含めない）
DATABASE_URL=mysql://root:sakila@localhost:3307/sakila
AUTH_SECRET=test-auth-secret-not-for-production-123456
APP_TODAY=2006-02-14T00:00:00Z
```

`APP_TODAY` はデータが2005〜2006年で止まっているための UTC 基準時刻。
理由は [04-features.md](./04-features.md) F-02 を参照。

Vitest は `.env.local` を読み込まない。そのため、Auth.js を import するテストには
`.env.test` の固定値 `AUTH_SECRET` も必要になる。テスト用の値は本番で使わないため、
`.env.test` にコミットしてよい。

`.env.local` は `.gitignore` に入れる。
`compose.yml` のパスワードは学習用に平文で書かれているが、
アプリ側の秘匿情報はコミットしない習慣をつけておく。

### 5. 依存パッケージを入れる

```
pnpm install
pnpm add drizzle-orm mysql2 drizzle-zod zod
pnpm add next-auth@beta bcryptjs
pnpm add react-hook-form @hookform/resolvers
pnpm add -D drizzle-kit vitest @next/env
```

`biome.json` と `components.json` は既に存在する。Biome や shadcn/ui の初期化を
繰り返さない。必要な shadcn/ui 部品だけを追加する。

```
pnpm dlx shadcn@latest add table
```

Vitest を入れたら、`package.json` の `scripts` に以下を追加する。

```json
{
  "test": "vitest",
  "test:unit": "vitest run tests/unit",
  "test:db": "vitest run tests/db"
}
```

`.env.test` を Vitest から読み込む設定は [08-testing.md](./08-testing.md) に従う。

## 日常の開発フロー

### 起動

```
docker compose up -d --wait
```

```
pnpm dev
```

DB は一度立てれば起動したままでよい。
アプリだけ止めたり再起動したりする形になる。

### 接続確認

```
docker compose exec mysql mysql -uroot -psakila sakila -e "SELECT COUNT(*) FROM film;"
```

`1000` が返れば開発用DBは正常。テスト用は以下。

```
docker compose exec mysql-test mysql -uroot -psakila sakila -e "SELECT COUNT(*) FROM film;"
```

### テスト

```
pnpm test:unit
```

```
pnpm test
```

層1（DB不要）だけなら数百ミリ秒で終わる。
開発中は層1を回し、区切りで全体を流す、という使い分けができる。

## つまずきやすい点

### 1. テスト用DBの初期化待ち

`docker compose up -d` の直後はまだ初期化中。
`rental` と `payment` が各16,044件あるため、投入完了まで数十秒かかる。

healthcheck が `healthy` になってもデータ投入が終わっているとは限らない。
テスト実行前に、テスト用DBで `film` が1000件あることを確認する。

```
docker compose exec mysql-test mysql -N -uroot -psakila sakila -e "SELECT COUNT(*) FROM film;"
```

`1000` が返る前にテストを開始しない。後で `tests/setup.ts` に同じ待機処理を
移せば、初期化待ちを自動化できる。

### 2. `mysql2` が必要

Drizzle は MySQL ドライバを同梱していない。`mysql2` を別途入れる。
入れ忘れると接続時に分かりにくいエラーが出る。

### 3. ポートの衝突

開発用 3306 は既に使用中。テスト用に 3307 を割り当てているが、
他のプロジェクトで使っていないか確認する。

```
lsof -i :3306 -i :3307
```

学習環境には `pgexercises-postgres` も動いているが、
PostgreSQL は 5432 を使うため衝突しない。

### 4. Volta が効いていないように見えるとき

リポジトリ直下の `package.json` に `volta.node` が定義されていることを確認する。
その上で、リポジトリ直下で `node -v` を実行する。

## Biome の設定

ESLint を入れていないため、Lint と Format は既存の Biome 設定に集約する。

```
pnpm lint           # 検査のみ
pnpm check          # 検査と自動修正
```

既に `.vscode/` があるので、保存時フォーマットの設定を追記する。
shadcn/ui の生成コードは Biome の一部ルールに引っかかることがあるため、
`src/components/ui/` を対象外にするか該当ルールを緩める。
詳細は [07-components.md](./07-components.md) を参照。

## セットアップ完了の確認

以下がすべて通れば準備完了。

| 確認 | 期待 |
|---|---|
| `node -v` | `v24.21.x` |
| `pnpm -v` | `12.4.x` |
| `docker compose ps` | `mysql` と `mysql-test` が `healthy` |
| 開発用DBの `film` 件数 | 1000 |
| テスト用DBの `film` 件数 | 1000 |
| `pnpm dev` | `localhost:3000` が開く |

ここまで来たら [08-testing.md](./08-testing.md) の Vitest 設定に進む。
テスト環境を先に整えるのは、多段 JOIN の正しさを目視で確認できないため。
