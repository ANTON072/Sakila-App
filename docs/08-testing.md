# 08. テスト設計

## 方針

**Vitest を使い、DB に実際に接続してテストする。モックは使わない。**

このアプリの価値のある部分は SQL そのものにある。
Drizzle をモックすると「モックが期待どおり呼ばれたか」を確認するだけになり、
**クエリが正しい結果を返すかは何も検証できない**。
JOIN の経路を間違えていても、モックテストは緑になる。

画面はほぼ Server Component のため、**コンポーネントテストは書かない**。
jsdom も Testing Library も不要で、すべて Node 環境で完結する。

## テストする / しない

| 対象 | テストする | 理由 |
|---|---|---|
| Query 関数 | ○ | JOIN の経路と集計の正しさが本体 |
| Server Action のコアロジック | ○ | トランザクション、在庫判定、競合制御 |
| Zod スキーマ | ○ | 境界値。DB 不要で速い |
| 純粋関数（延滞料金計算など） | ○ | 同上 |
| Server Component | × | データ取得は Query 側でテスト済み。描画は目視 |
| shadcn/ui の部品 | × | 自作していない |
| フォームの入力挙動 | × | React Hook Form の責務 |
| Auth.js の内部動作 | × | ライブラリの責務。`authorize` の中身だけ切り出してテスト |

## テストの3層

```mermaid
flowchart TD
    A["純粋関数テスト<br/>DB不要・ミリ秒"] --> B["Query テスト<br/>DB接続・読み取りのみ"]
    B --> C["Action テスト<br/>DB接続・書き込み+ロールバック"]
```

| 層 | 対象 | DB | 分離 |
|---|---|---|---|
| 1 | Zod スキーマ、日付計算、金額計算 | 不要 | 不要 |
| 2 | `locateFilms`, `fetchCustomerDetail` など参照系 | 必要 | **不要**（読むだけ） |
| 3 | `createRental`, `registerCustomer` など更新系 | 必要 | 必要 |

**層2に分離が要らないのが大きい。**
sakila の投入済みデータ（`film` 1,000件、`rental` 16,044件）は変化しないため、
参照系テストはそのまま固定データとして扱える。テスト件数の大半がここに収まる。

## テスト用DBの用意

`db/init/01-sakila-schema.sql` は冒頭でスキーマ名を直書きしている。

```sql
DROP SCHEMA IF EXISTS sakila;
CREATE SCHEMA sakila;
USE sakila;
```

そのため同一サーバー上に `sakila_test` を作るには SQL の書き換えが要る。
オリジナルを触らない方針([05-auth.md](./05-auth.md))と矛盾するので、
**別コンテナを別ポートで立てる**ほうが素直。

```yaml
# compose.yml の既存サービス
  mysql-test:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: sakila
      MYSQL_DATABASE: sakila
    ports:
      - "3307:3306"          # 開発用は 3306、テスト用は 3307
    volumes:
      - ./db/init:/docker-entrypoint-initdb.d:ro
    # データ永続化は不要。コンテナを捨てれば初期状態に戻る
    tmpfs:
      - /var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-psakila"]
      interval: 10s
      timeout: 5s
      retries: 10
```

名前付きボリュームを付けず `tmpfs` にしておくと、
コンテナを作り直すだけで完全な初期状態に戻せる。
テストデータが壊れたときは、`docker compose rm -sf mysql-test` の後に
`docker compose up -d mysql-test` を実行すれば初期状態へ戻せる。

接続先は環境変数で切り替える。

```
DATABASE_URL=mysql://root:sakila@localhost:3306/sakila       # .env.local
DATABASE_URL=mysql://root:sakila@localhost:3307/sakila       # .env.test
```

### 開発DBとのスキーマ同期

初期化SQLで作られるのはオリジナルの sakila スキーマだけである。`staff.password` の拡張や
初期パスワード設定など、Drizzle マイグレーションで加えた変更はテスト用DBにも適用する。

テスト用コンテナを作り直した後は、`.env.test` を読み込んだ状態で開発DBと同じ
マイグレーションを一度だけ実行してからテストを始める。各テストの前に実行すると遅く、
開発DBだけに適用すると認証・スキーマの検証結果が一致しない。

## 更新系テストの分離

### トランザクションロールバック

各テストをトランザクションで囲み、終了時に必ずロールバックする。
Rails の `use_transactional_fixtures` と同じ考え方。

```mermaid
sequenceDiagram
    participant T as テスト
    participant DB as MySQL

    T->>DB: BEGIN
    T->>DB: createRental を実行
    T->>DB: 結果を SELECT で検証
    T->>DB: ROLLBACK
    Note over DB: データは変化しない
```

`TRUNCATE` して再投入する方式もあるが、`rental` と `payment` が各16,044件あるため
毎回の再投入は現実的でない。ロールバックなら一瞬で戻る。

### そのために必要な設計

ロールバックを効かせるには、**テスト側のトランザクションを
テスト対象の関数に渡す**必要がある。
関数が内部でグローバルな `db` を直接使っていると、
別の接続になりロールバックの外に出てしまう。

そこで、DB ハンドルを引数で受け取れるようにする。

```ts
// db/index.ts
export const db = drizzle(connection)
export type Database = typeof db
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type Executor = Database | Transaction
```

Query 関数は既定引数でグローバル `db` を使い、テストでは差し替える。

```ts
export async function locateFilms(params: FilmSearchParams, executor: Executor = db) {
  return executor.select({ ... }).from(film)
}
```

呼び出し側（Server Component）は第2引数を省略するだけなので、
本番コードの書き味は変わらない。

### Server Action からコアロジックを分ける

Server Action は `'use server'` が付き、認証・検証・トランザクション境界を担う。
ここにビジネスロジックまで書くとテストしづらい。

```
actions.ts        'use server' — 認証・Zod検証・トランザクション開始
  └── core.ts     指示なし      — 実際の処理。Executor を受け取る
```

```ts
// rentals/actions.ts
'use server'
export async function createRental(input: unknown): Promise<ActionResult<{ rentalId: number }>> {
  const session = await requireSession()
  const parsed = createRentalSchema.safeParse(input)
  if (!parsed.success) { /* ... */ }

  const rentalId = await db.transaction((tx) =>
    performRental(tx, parsed.data, session.user.staffId)
  )

  revalidatePath(`/customers/${parsed.data.customerId}`)
  return { ok: true, data: { rentalId } }
}

// rentals/core.ts  ← テスト対象
export async function performRental(
  tx: Executor,
  input: CreateRentalInput,
  staffId: number,
): Promise<number> {
  // 在庫確定 → rental INSERT → payment INSERT
}
```

この分離には副次的な利点もある。

- `'use server'` ファイルを Vitest から直接 import すると、
  Next.js のビルド時変換が効かず扱いが面倒になる。core 側は素の関数なので問題ない
- `server-only` パッケージを import している場合も同様に回避できる
- 認証・検証と業務ロジックが混ざらず、読みやすくなる

[06-data-access.md](./06-data-access.md) の Action 骨格はこの分離を前提に読み替える。

## Vitest の設定

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',          // jsdom 不要
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,       // DB テストの競合を避ける
    env: { NODE_ENV: 'test' },
  },
})
```

Vitest は Next.js の実行環境ではないため、`.env.test` を自動では読み込まない。
`tests/setup.ts` の先頭で `@next/env` を使い、DB モジュールを import する前に読み込む。

```ts
// tests/setup.ts
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd(), false)
```

`NODE_ENV=test` では `.env.local` は読み込まれない。開発DBに誤接続しないための
仕様なので、`.env.test` には `DATABASE_URL` と、Auth.js を import するテスト用の
`AUTH_SECRET` を必ず定義する。値は [09-dev-setup.md](./09-dev-setup.md) を参照。

### `fileParallelism: false` の理由

更新系テストが並列に走ると、同じ行に対するロックで待ち合わせが発生し、
最悪デッドロックでタイムアウトする。
テスト数が少ないうちは逐次実行で困らない。

参照系だけを別プロジェクトに分けて並列化する方法もあるが、
最初から分ける必要はない。遅くなってから考える。

### 層ごとに分ける

DB が要らない層1のテストは高速なので、分けて実行できるようにしておくと開発中に便利。

| コマンド | 対象 |
|---|---|
| `pnpm test:unit` | 層1のみ。DB不要、数百ミリ秒 |
| `pnpm test:db` | 層2・3。DB必要 |
| `pnpm test` | 全部 |

## テストの書き方

### 層1: Zod スキーマ

DB に触らないので素直に書ける。境界値を押さえる。

```ts
describe('filmSearchSchema', () => {
  test('page が未指定なら 1 になる', () => { /* ... */ })
  test('page=0 は弾かれる', () => { /* ... */ })
  test('rating に不正な値が来たら弾かれる', () => { /* ... */ })
  test('文字列の category が数値に変換される', () => { /* ... */ })
})
```

`z.coerce.number()` の挙動確認は実際に価値がある。
`'abc'` を渡したときに `NaN` になるのか例外になるのか、書いてみないと分からない。

### 層2: Query（参照のみ）

sakila の実データを固定値として使える。

```ts
test('locateFilms はカテゴリで絞り込める', async () => {
  const result = await locateFilms({ category: 1, page: 1 })
  // 全件が指定カテゴリに属することを確認
})

test('fetchFilmStock は貸出中を除いた在庫数を返す', async () => {
  // 未返却 rental がある inventory が除外されているか
})
```

#### 件数をハードコードするか

`film` が1,000件であることをテストに直書きするか迷うところ。

| 方針 | 評価 |
|---|---|
| `expect(total).toBe(1000)` | データが変われば壊れる。ただし sakila は変わらない |
| `expect(total).toBeGreaterThan(0)` | 壊れないが、何も保証しない |
| 相対的な検証 | **推奨**。「カテゴリ絞り込み後の件数 < 全件数」など |

固定データに依存した検証は、意図が伝わる範囲で使う。
「`ACADEMY DINOSAUR` という作品が存在する」程度なら直書きしてよい。

### 層3: Action コアロジック

トランザクションで囲んでロールバックする。

```ts
test('performRental は rental と payment を対で作る', async () => {
  await expect(
    db.transaction(async (tx) => {
      const rentalId = await performRental(tx, { customerId: 1, filmId: 1 }, 1)

      // tx 経由で検証する（グローバル db では見えない）
      const payments = await tx.select().from(payment).where(eq(payment.rentalId, rentalId))
      expect(payments).toHaveLength(1)

      throw new RollbackError()   // 意図的に失敗させて戻す
    }),
  ).rejects.toThrow(RollbackError)
})
```

**検証も `tx` 経由で行う**のが重要。
トランザクション内の未コミットの変更は、別の接続からは見えない。

ロールバックは「専用の例外を投げて `rejects` で受ける」のが分かりやすい。
Drizzle には明示的な rollback API もあるが、
どちらでもテストの意図は表現できる。

### 検証したい振る舞い

更新系で押さえるべき点。

| 関数 | 検証内容 |
|---|---|
| `performRental` | `rental` と `payment` が対で作られる |
| | `payment.amount` が `film.rental_rate` と一致する |
| | 在庫がない作品では失敗する |
| | 同じ在庫1件への同時実行では、成功する処理が1件だけになる |
| | 途中で失敗したとき `rental` も残らない |
| `returnRental` | `return_date` が入る |
| | **既に返却済みなら更新件数が0になる** |
| `registerCustomer` | `address` と `customer` が両方作られる |
| | 失敗時に `address` だけ残らない |
| `deactivateCustomer` | 未返却レンタルがある顧客は無効化できない |
| | 無効化後の顧客は新規レンタルできず、再有効化後はできる |
| `registerStaff` | `address` と `staff` が両方作られ、 `must_change_password = true` になる |
| `deactivateStaff` | 自分自身と店長を移管なしで無効化できない |
| `reactivateStaff` | bcrypt ハッシュを更新し、初回変更フラグを true に戻す |
| `resetStaffPassword` | bcrypt ハッシュを更新し、初回変更フラグを true に戻す |
| スタッフ管理の認可 | 別店舗の店長・一般スタッフは対象スタッフを変更できない |

「失敗時に片方だけ残らない」の検証がトランザクションテストの本題。
わざと失敗する入力を与えて、DB が元の状態に戻ることを確認する。

## 落とし穴

### 1. `DECIMAL` は文字列で返る

```ts
expect(payment.amount).toBe(4.99)      // ✕ 失敗する
expect(payment.amount).toBe('4.99')    // ○
```

[02-er-diagram.md](./02-er-diagram.md) の型対応表のとおり、
Drizzle の `decimal` は既定で `string`。最初のテストで必ず引っかかる。

### 2. 日付の基準

[04-features.md](./04-features.md) F-02 のとおり `APP_TODAY` で基準日を固定している。
テストでは環境変数に依存せず、**基準日を引数で渡せる形**にしておく。

```ts
computeOverdueDays(rentalDate, rentalDurationDays, baseDate)  // 引数で受ける
```

`appNow()` を関数内で直接呼ぶと、テストで時刻を制御するのに
`vi.setSystemTime` が必要になり面倒になる。引数で受ければ不要。

### 3. 接続の後始末

テスト終了後に接続を閉じないと Vitest が終了しない。

```ts
// tests/setup.ts
afterAll(async () => {
  await connection.end()
})
```

「テストは通るのにプロセスが終わらない」という症状はこれが原因のことが多い。

### 4. テスト用DBの起動待ち

`docker compose up -d` の直後はまだ初期化中。
16,044件の投入が終わるまで数十秒かかる。

healthcheck が `healthy` になってもデータ投入が完了しているとは限らないため、
テスト実行前に `SELECT COUNT(*) FROM film` が 1000 を返すか確認するスクリプトを
用意しておくと、原因不明の失敗を避けられる。

## E2E テストについて

**今回は作らない。**

Playwright を入れればログイン〜レンタル受付の通しを検証できるが、
このアプリの学習目的（SQL とデータアクセス）から外れる。
層1〜3で SQL の正しさは押さえられている。

将来入れるなら、価値が高いのは以下の1本に絞られる。

```
ログイン → 顧客を選ぶ → 作品を選ぶ → レンタル登録 → 顧客詳細に反映される
```

複数テーブルをまたぐ唯一のフローで、ここが動けば大半の配線は正しい。

## 実装の順序

| 順 | 内容 |
|---|---|
| 1 | `compose.yml` のテスト用サービスを確認 |
| 2 | Vitest 導入と `vitest.config.ts` |
| 3 | `tests/setup.ts`（接続と後始末） |
| 4 | 層1: Zod スキーマのテスト（DB不要で手応えが早い） |
| 5 | `Executor` 型の導入と Query 関数への引数追加 |
| 6 | 層2: Query テスト |
| 7 | Action からコアロジックを分離 |
| 8 | 層3: トランザクションテスト |

5と7は既存コードへの変更を伴うため、
**Query や Action を書く時点で最初からこの形にしておく**ほうが手戻りがない。
[06-data-access.md](./06-data-access.md) の実装に着手する前に本ドキュメントを読む前提とする。
