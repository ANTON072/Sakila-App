# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm lint         # Biome でチェック（読み取り専用）
pnpm check        # Biome でチェック＆自動修正
pnpm test         # 全テスト（DB必要）
pnpm test:unit    # 層1のみ（DB不要、高速）
pnpm test:db      # 層2・3のみ（DB必要）
```

テスト用DBは `.env.test` の `DATABASE_URL`（ポート3307）を参照する。
開発DBと分離するため、テスト実行前に `docker compose up -d mysql-test` でコンテナを起動する。

## アーキテクチャ

### 技術スタック

Next.js 16（App Router）+ TypeScript + Drizzle ORM + MySQL 8.0（Docker）。
認証は Auth.js v5 Credentials Provider で `staff` テーブルを直接ログインユーザーとして使う。
フォームは Conform + Zod + Server Actions。UIは shadcn/ui。Lint/Formatは Biome。

### ディレクトリ構成

```
src/
├── app/
│   ├── login/                 # 未認証でアクセス可
│   └── (protected)/           # layout.tsx でセッション必須化
│       ├── films/ customers/ rentals/ inventory/ reports/
│       ├── (admin)/           # スーパーユーザー権限が必要
│       │   ├── staff/
│       │   └── layout.tsx     # ← ここでスーパーユーザー権限を確認
│       └── layout.tsx         # ← ここで認証チェック
├── common/
│   └── components/
│       ├── ui/                # shadcn/ui 生成物（直接編集してよいが再生成で上書きされる）
│       └── <shared>.tsx       # ドメインを問わず使う共通 UI
├── db/
│   ├── schema/                # Drizzle スキーマ（テーブルごとに分割）
│   └── index.ts               # db インスタンス・Executor 型
├── features/
│   └── <name>/
│       ├── components/        # このドメイン専用の UI
│       ├── queries.ts         # 参照系（'use server' なし）
│       ├── actions.ts         # 'use server'。認証・検証・Tx境界のみ
│       ├── service.ts         # 業務処理（テスト対象。'use server' なし）
│       └── schema.ts          # Zod スキーマ
└── lib/
    ├── auth.ts                # Auth.js 設定
    └── app-date.ts            # appNow()。集計の基準日を返す
tests/
├── setup.ts                   # loadEnvConfig + afterAll で接続クローズ
├── unit/                      # 層1: DB不要
└── db/                        # 層2・3: DB接続あり
```

### データアクセスの基本パターン

**参照系（queries.ts）** — `'use server'` を付けない。DB ハンドルを既定引数で受け取り、テスト時にトランザクションを注入できるようにする。

```ts
export async function locateFilms(params: FilmSearchParams, executor: Executor = db) {
  return executor.select({ ... }).from(film)
}
```

**更新系（actions.ts → service.ts）** — Action は「認証・Conform/Zod 検証・トランザクション境界・revalidatePath・redirect」のみ担い、業務処理は `service.ts` に委譲する。

```ts
// actions.ts
'use server'
export async function createRental(_previousState: unknown, formData: FormData) {
  const session = await requireSession()
  const submission = parseWithZod(formData, { schema: createRentalSchema })
  if (submission.status !== 'success') return submission.reply()
  const rentalId = await db.transaction((tx) => performRental(tx, submission.value, session.user.staffId))
  revalidatePath(...)
  redirect(`/rentals/${rentalId}`)
}
```

フォーム Action は `(previousState, formData)` の形で `useActionState` に接続する。
検証・業務エラーは `submission.reply()` の `SubmissionResult` を返し、
フォーム側の `useForm({ lastResult })` へ渡す。成功時は原則 `redirect()` する。
フォームを使わない Action はこの型へ無理に統一しない。

### 認証

- Auth.js v5、JWT セッション戦略
- `(protected)/layout.tsx` でセッション確認 → 未認証は `/login` へリダイレクト
- `(protected)/(admin)/layout.tsx` でスーパーユーザー権限を確認
- **Server Action は独立したエンドポイントになるため、各 Action 冒頭でも必ず `requireSession()` を呼ぶ**
- スタッフ管理 Action はさらに `requireStoreManager()` で店長権限を DB 照合（JWT 内の値だけでは判定しない）
- `staffId` はフォームの hidden input から取らず、セッションから取る

### テスト設計

DB モックは使わない。テスト3層：

| 層 | 対象 | DB | 分離 |
| --- | --- | --- | --- |
| 1 | Zod スキーマ・純粋関数 | 不要 | 不要 |
| 2 | Query 関数（参照のみ） | 必要 | 不要（sakila の固定データを使う） |
| 3 | service 関数（更新系） | 必要 | トランザクション + ロールバック |

更新系テストは `db.transaction` で囲み、検証も同一トランザクション（`tx`）経由で行い、最後に `throw new RollbackError()` でロールバックする。

```ts
// DECIMAL は string で返る。expect(amount).toBe('4.99') と書く
// 接続クローズを忘れると Vitest が終了しない（setup.ts の afterAll を参照）
```

### データの制約

- `rental` / `payment` の日付は 2005〜2006年。現在時刻基準の集計はゼロになる
- `app-date.ts` の `appNow()` を経由し、環境変数 `APP_TODAY` で基準日を固定する
- 基準日は関数の内部で呼ばず、**引数で受け取る形**にする（テストで制御しやすくなる）
- MySQL の `DECIMAL` は Drizzle から文字列で返る（`decimal` 列を数値として扱わない）
- `rental.return_date IS NULL` が 183件（未返却）

### 型の流れ

Drizzle の推論に任せ、Query の戻り値に明示的な型注釈を付けない。コンポーネント側は `Awaited<ReturnType<typeof locateFilms>>[number]` で型を得る。

## 環境変数

| 変数 | 用途 |
| --- | --- |
| `DATABASE_URL` | `mysql://root:sakila@localhost:3306/sakila`（開発）/ `3307`（テスト） |
| `AUTH_SECRET` | JWT 署名鍵 |
| `APP_TODAY` | 集計基準時刻（UTC ISO 8601。例: `2006-02-14T00:00:00Z`） |
