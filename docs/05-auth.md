# 05. 認証設計

## 方針

**Auth.js v5 の Credentials Provider で、sakila の `staff` テーブルをそのままログインユーザーとして使う。**

`rental.staff_id` と `payment.staff_id` が `staff` を参照しているため、
ログインユーザー = `staff` にしておくと「誰が受け付けたレンタルか」が自然に記録される。
別途ユーザーテーブルを持つと、この紐付けを手作業で維持することになる。

```mermaid
flowchart LR
    Login[ログイン] --> Staff[(staff)]
    Staff -->|staff_id をセッションへ| Session[Session]
    Session -->|自動付与| Rental[(rental)]
    Session -->|自動付与| Payment[(payment)]
```

## 既存データの問題

`staff` テーブルの中身は以下のとおり。

| staff_id | username | password | store_id | active |
|---|---|---|---|---|
| 1 | `Mike` | `8cb2237d0679ca88db6464eac60da96345513964` | 1 | 1 |
| 2 | `Jon` | `NULL` | 2 | 1 |

問題が4つある。

### 1. パスワードが SHA1

`8cb2237d0679ca88db6464eac60da96345513964` は `SHA1('password')`。
SHA1 はソルトなし・高速で、パスワード保存には使ってはいけない方式。

### 2. `Jon` のパスワードが NULL

そのままではログインできない。

### 3. カラム長が足りない

`password VARCHAR(40)` は SHA1 の16進40桁にちょうど合わせた長さ。
bcrypt のハッシュは**60文字**なので、このままでは格納できない。

### 4. スタッフ管理に必要な制約がない

`username` と `email` に一意制約がないため、スタッフを追加するとログイン名や
連絡先が重複しうる。また、初期パスワードを本人が変更済みかを表す値もない。

## 対応：マイグレーションで bcrypt に移行する

`db/init` の SQL は sakila のオリジナルなので**直接書き換えない**。
Drizzle のマイグレーションとして別途適用する。

### 手順

```sql
-- 1. bcrypt (60文字) が入るようにカラムを拡張
ALTER TABLE staff MODIFY password VARCHAR(255) NULL;

-- 2. 初回パスワード変更を表す列と一意制約を追加
ALTER TABLE staff
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  ADD CONSTRAINT uq_staff_username UNIQUE (username),
  ADD CONSTRAINT uq_staff_email UNIQUE (email);

-- 3. 両スタッフに既知のパスワードを設定（アプリ側で bcrypt ハッシュを生成して流し込む）
--    開発用の初期パスワードは .env などで管理し、SQL にはハードコードしない
UPDATE staff
SET password = :hashedPassword,
    must_change_password = TRUE
WHERE staff_id IN (1, 2);
```

ハッシュ生成はマイグレーション用スクリプト（`scripts/reset-staff-password.ts` など）で行う。
`bcryptjs` か `@node-rs/bcrypt` を使う。

UNIQUE 制約を追加する前に、既存の `username` と非NULLの `email` に重複がないことを
確認する。制約追加後、スタッフ登録時の重複エラーは「ユーザー名またはメールアドレスは
既に使われています」として扱う。

### なぜ SHA1 との互換を残さないか

「既存の SHA1 でも認証でき、成功時に bcrypt へ書き換える」という段階移行の手法もあるが、
今回は**採用しない**。理由は2つ。

- 実データのユーザーは2名で、どちらも開発者自身。移行の必要がない
- SHA1 の照合コードが残ると、学習用のコードに「使ってはいけない方式」の実装例が残ってしまう

最初から bcrypt のみを扱う形にする。

### VARCHAR(255) にする理由

bcrypt は60文字だが、将来 argon2 などに変える可能性を考えると 255 が無難。
カラム長の見積もりで悩む時間を節約する意図。

## Auth.js の構成

### セッション戦略

**JWT を使う**（`strategy: 'jwt'`）。

Credentials Provider は database session に対応していないため、実質的に JWT 一択。
セッションテーブルを追加せずに済む点も、sakila のスキーマを汚さないという方針に合う。

### セッションに持たせる情報

| キー | 型 | 用途 |
|---|---|---|
| `staffId` | number | `rental` / `payment` への自動付与 |
| `storeId` | number | 既定の店舗絞り込み |
| `name` | string | ヘッダー表示 |
| `username` | string | ヘッダー表示 |
| `mustChangePassword` | boolean | 初回パスワード変更への強制遷移 |

`staffId` と `storeId` をセッションに入れておくと、
Server Action で毎回 `staff` を引き直す必要がなくなる。

### 型定義の拡張

Auth.js の `Session` と `JWT` は既定で `staffId` を知らないため、
型を拡張しないと `session.user.staffId` が型エラーになる。

```ts
// types/next-auth.d.ts
declare module 'next-auth' {
  interface Session {
    user: {
      staffId: number
      storeId: number
      username: string
      name: string
      mustChangePassword: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    staffId: number
    storeId: number
    username: string
    mustChangePassword: boolean
  }
}
```

`jwt` コールバックで JWT に値を詰め、`session` コールバックで
それを `session.user` に移す、という2段構成になる。この流れは最初つまずきやすい。

### 認証処理の流れ

```mermaid
sequenceDiagram
    participant U as ブラウザ
    participant A as Auth.js
    participant DB as MySQL

    U->>A: username + password
    A->>DB: staff を username で検索
    DB-->>A: staff 行（なければ null）
    A->>A: active か確認
    A->>A: bcrypt.compare(password, hash)
    A->>A: JWT に staffId / storeId を格納
    A-->>U: セッション Cookie
```

### authorize で確認すること

| 順序 | 確認内容 | 失敗時 |
|---|---|---|
| 1 | Zod で入力形式を検証 | `null` を返す |
| 2 | `username` で `staff` を検索 | `null` |
| 3 | `staff.active === true` | `null` |
| 4 | `staff.password` が NULL でない | `null` |
| 5 | `bcrypt.compare` が真 | `null` |

失敗理由をクライアントに返さないのが重要。
「ユーザー名は存在するがパスワードが違う」と分かると、有効なユーザー名を列挙されてしまう。
画面には常に同一の文言を出す。

```
ユーザー名またはパスワードが正しくありません
```

### タイミング攻撃への配慮

ユーザーが存在しない場合に即座に `null` を返すと、
存在する場合（bcrypt 照合で時間がかかる）との応答時間の差から
ユーザー名の有無を推測できてしまう。

ユーザーが見つからなくてもダミーのハッシュに対して `bcrypt.compare` を実行し、
処理時間を揃えるのが定石。2名のアプリで実害はないが、
書き方を知っておく価値はある。

## 初回パスワード変更

スタッフを登録・再有効化・パスワード再発行した直後は
`must_change_password = true` とする。認証成功後、この値を JWT / Session に含め、
該当するスタッフは `/account/password` へリダイレクトする。

パスワード変更画面では現在のパスワードと新しいパスワードを検証し、bcrypt ハッシュを
更新して `must_change_password = false` にする。変更後は一度サインアウトさせて
再ログインを求め、古い JWT に残ったフラグを確実に更新する。

この状態のスタッフは、パスワード変更とログアウト以外の Server Action を実行できない。
各 Action の `requireSession()` は、セッションだけでなく DB 上の `staff.active` と
`must_change_password` も確認する。

## 画面の保護

### Route Group による一括保護

```
src/app/
├── (auth)/
│   └── login/page.tsx        # 未認証でアクセス可
└── (dashboard)/
    ├── layout.tsx            # ← ここでセッション検証
    ├── page.tsx
    ├── films/
    └── ...
```

`(dashboard)/layout.tsx` でセッションを確認し、なければ `/login` へリダイレクトする。
配下に画面を追加するたびに保護を書く必要がなくなる。

### middleware との使い分け

Auth.js は `middleware.ts` による保護にも対応している。

| 方式 | 利点 | 欠点 |
|---|---|---|
| layout で検証 | DB アクセス可。ロジックを1箇所に書ける | 画面ごとにレンダリングが走る |
| middleware で検証 | リクエスト到達前に弾ける。高速 | Edge Runtime のため DB アクセス不可 |

**両方使う**のが定石。middleware で未ログインを大まかに弾き、
layout で確実に検証する。ただし最初は layout だけで十分で、
middleware は後から足せばよい。

### Server Action での検証も必須

画面が保護されていても、Server Action は**独立したエンドポイント**として
直接呼び出せる。各 Action の冒頭で必ずセッションを確認する。

```ts
const session = await auth()
if (!session) throw new Error('Unauthorized')
```

これを忘れると、ログインしていない相手からレンタル登録を実行されうる。
毎回書くのが面倒なら、セッション取得と検証をまとめたヘルパーを1つ用意して
全 Action の先頭で呼ぶ形にする。

## staff_id の自動付与

このアプリで認証を `staff` テーブルに乗せる最大の利点。

```ts
// レンタル登録時、staff_id はフォームからではなくセッションから取る
await db.insert(rental).values({
  rentalDate: appNow(),
  inventoryId: input.inventoryId,
  customerId: input.customerId,
  staffId: session.user.staffId,   // ← クライアントの値を使わない
})
```

`staff_id` をフォームの hidden input に入れてはいけない。
クライアントが送る値は改竄できるため、他スタッフの名前で記録を残せてしまう。
**サーバー側が知っている情報は、サーバー側から取る。**

同じことが `payment.staff_id` にも当てはまる。

## 認可（権限）について

sakila の `staff` には役職や権限を表すカラムがない。
`store.manager_staff_id` から「店長かどうか」は判定できるが、
2名とも店長（店舗が2つ、店長が2人）なので実質的に差がつかない。

**役割ベースの認可は実装しない。** 全スタッフが全機能にアクセスできる前提とする。

店舗による絞り込み（自分の店舗のデータだけ見る）は
機能として入れてもよいが、権限ではなく**既定のフィルタ**として扱う。
他店舗のデータも見られるが、初期表示は自分の店舗、という形。

### スタッフ管理の認可

スタッフ管理だけは例外として、各店舗の店長に限定する。
`store.manager_staff_id` がログイン中の `staff_id` と一致する場合に限り、
その店舗に所属するスタッフの登録・編集・無効化・パスワード再発行を許可する。

店長の判定は JWT に保存せず、Action ごとに DB を参照する。これにより店長移管後の
古いセッションで管理操作ができる問題を防ぐ。

## 環境変数

| 変数 | 用途 |
|---|---|
| `AUTH_SECRET` | JWT の署名鍵。`openssl rand -base64 32` で生成 |
| `DATABASE_URL` | `mysql://root:sakila@localhost:3306/sakila` |
| `APP_TODAY` | 集計・更新の UTC 基準時刻（[04-features.md](./04-features.md) F-02 参照） |

`.env.local` に置き、`.gitignore` で除外する。
`compose.yml` のパスワードは学習用に平文で書かれているが、
アプリ側の `.env.local` はコミットしない習慣をつけておく。

## 実装の順序

| 順 | 内容 |
|---|---|
| 1 | `password` カラムを VARCHAR(255) に拡張するマイグレーション |
| 2 | 両スタッフのパスワードを bcrypt で再設定するスクリプト |
| 3 | Auth.js の設定（`lib/auth.ts`）と型拡張 |
| 4 | ログイン画面 |
| 5 | 初回パスワード変更画面と強制リダイレクト |
| 6 | `(dashboard)/layout.tsx` でのセッション検証 |
| 7 | Server Action 用のセッション検証・店長認可ヘルパー |

ここまで終えれば、以降の画面はすべて保護された状態で作り始められる。
