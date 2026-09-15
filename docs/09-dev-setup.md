# 09. 開発環境セットアップ

## 方針

**DB は Docker、Next.js はネイティブの Node で動かす。**

macOS で Next.js を Docker に入れると、バインドマウント越しのファイル監視により
HMR が目に見えて遅くなる。バージョンの再現性は Volta で確保できるため、
アプリをコンテナに入れる利点が薄い。

| 対象 | 実行環境 | 理由 |
|---|---|---|
| MySQL（開発用） | Docker | 既存の `docker-compose.yml` |
| MySQL（テスト用） | Docker | 別ポートで隔離 |
| Next.js | ネイティブ Node | HMR の速度、エディタ連携 |

Docker 化する価値があるのは「チームで環境を揃える」「本番ビルドを検証する」場合。
一人での学習では該当しない。

## 前提ツール

導入済みのバージョン（確認日: 2026-09-15）。

| ツール | バージョン | 用途 |
|---|---|---|
| Node | 24.19.0 | 実行環境 |
| pnpm | 11.22.0 | パッケージ管理 |
| Volta | 2.0.2 | Node / pnpm のバージョン固定 |
| Docker | 29.7.2 | DB |
| Docker Compose | 5.4.0 | 同上 |

## セットアップ手順

### 1. corepack を無効化する

Volta と corepack はどちらも pnpm のバージョンを管理できる。
両方が有効だと、`package.json` の `packageManager` フィールド（corepack）と
`volta` フィールドのどちらが効いているか分からなくなる。

**Volta に寄せるため corepack を切る。**

```
corepack disable
```

以降 `package.json` に `packageManager` フィールドを書かない。
バージョン指定は `volta` フィールドに一本化する。

### 2. Next.js プロジェクトを作る

リポジトリ直下ではなく `web/` に作る。
学習用ファイル（`docs/`、`book.pdf`）と混ざらないようにするため。

```
pnpm create next-app@latest web --typescript --app --src-dir --no-eslint
```

| オプション | 理由 |
|---|---|
| `--typescript` | 全体を TypeScript で通す |
| `--app` | App Router |
| `--src-dir` | `src/` 配下にまとめる（[01-overview.md](./01-overview.md) の構成） |
| `--no-eslint` | Biome を使うため ESLint は入れない |

Tailwind は shadcn/ui が前提にしているため入れる。

### 3. Volta でバージョンを固定する

```
cd web
volta pin node@24
volta pin pnpm@11
```

`package.json` に `volta` フィールドが書き込まれ、
このディレクトリに入ると自動的に指定バージョンが使われる。

```json
{
  "volta": {
    "node": "24.19.0",
    "pnpm": "11.22.0"
  }
}
```

Docker を使わなくてもバージョンの再現性はこれで確保される。

### 4. テスト用DBを docker-compose に追加する

[08-testing.md](./08-testing.md) のとおり、更新系テストのために別サーバーを立てる。
初期化SQL がスキーマ名 `sakila` を直書きしているため、
同一サーバーに `sakila_test` を作るには SQL の書き換えが必要になる。
別コンテナなら衝突しない。

```yaml
# docker-compose.yml の services に追加
  mysql-test:
    image: mysql:8.0
    container_name: hajimete-no-sql-mysql-test
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

### 5. 環境変数を用意する

開発用とテスト用で接続先が変わる。

```
# web/.env.local  （コミットしない）
DATABASE_URL=mysql://root:sakila@localhost:3306/sakila
AUTH_SECRET=<openssl rand -base64 32 で生成>
APP_TODAY=2006-02-14
```

```
# web/.env.test  （コミットしてよい。秘匿情報を含めない）
DATABASE_URL=mysql://root:sakila@localhost:3307/sakila
APP_TODAY=2006-02-14
```

`APP_TODAY` はデータが2005〜2006年で止まっているための基準日。
理由は [04-features.md](./04-features.md) F-02 を参照。

`.env.local` は `.gitignore` に入れる。
`docker-compose.yml` のパスワードは学習用に平文で書かれているが、
アプリ側の秘匿情報はコミットしない習慣をつけておく。

### 6. 依存パッケージを入れる

```
pnpm add drizzle-orm mysql2 drizzle-zod zod
pnpm add next-auth@beta bcryptjs
pnpm add react-hook-form @hookform/resolvers
pnpm add -D drizzle-kit @biomejs/biome vitest @types/bcryptjs
```

shadcn/ui は CLI で初期化する。

```
pnpm dlx shadcn@latest init
```

インストールは時間がかかるため、実行は各自のタイミングで行う。

## 日常の開発フロー

### 起動

```
docker compose up -d
```

```
cd web && pnpm dev
```

DB は一度立てれば起動したままでよい。
アプリだけ止めたり再起動したりする形になる。

### 接続確認

```
docker exec hajimete-no-sql-mysql mysql -uroot -psakila sakila -e "SELECT COUNT(*) FROM film;"
```

`1000` が返れば開発用DBは正常。テスト用は以下。

```
docker exec hajimete-no-sql-mysql-test mysql -uroot -psakila sakila -e "SELECT COUNT(*) FROM film;"
```

### テスト

```
pnpm vitest run tests/unit
```

```
pnpm vitest run
```

層1（DB不要）だけなら数百ミリ秒で終わる。
開発中は層1を回し、区切りで全体を流す、という使い分けができる。

## つまずきやすい点

### 1. テスト用DBの初期化待ち

`docker compose up -d` の直後はまだ初期化中。
`rental` と `payment` が各16,044件あるため、投入完了まで数十秒かかる。

healthcheck が `healthy` になってもデータ投入が終わっているとは限らない。
テスト実行前に件数を確認するスクリプトを用意しておくと、原因不明の失敗を避けられる。

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

`volta pin` は `package.json` に書き込むだけなので、
リポジトリ直下（`web/` の外）では効かない。
`cd web` してから `node -v` を確認する。

## Biome の設定

ESLint を入れていないため、Lint と Format は Biome に集約する。

```
pnpm biome init
```

既に `.vscode/` があるので、保存時フォーマットの設定を追記する。
shadcn/ui の生成コードは Biome の一部ルールに引っかかることがあるため、
`src/components/ui/` を対象外にするか該当ルールを緩める。
詳細は [07-components.md](./07-components.md) を参照。

## セットアップ完了の確認

以下がすべて通れば準備完了。

| 確認 | 期待 |
|---|---|
| `cd web && node -v` | `v24.x` |
| `pnpm -v` | `11.x` |
| `docker compose ps` | `mysql` と `mysql-test` が `healthy` |
| 開発用DBの `film` 件数 | 1000 |
| テスト用DBの `film` 件数 | 1000 |
| `pnpm dev` | `localhost:3000` が開く |

ここまで来たら [08-testing.md](./08-testing.md) の Vitest 設定に進む。
テスト環境を先に整えるのは、多段 JOIN の正しさを目視で確認できないため。
