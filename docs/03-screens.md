# 03. 画面設計

## ルーティング一覧

App Router の Route Group を使い、認証必須の画面を `(protected)` に置く。
`(protected)/layout.tsx` でセッションを検証し、さらに `(protected)/(admin)/layout.tsx` で
スーパーユーザー権限を検証する。

| パス | 画面名 | 認証 | 主な使用テーブル |
|---|---|---|---|
| `/login` | ログイン | 不要 | `staff` |
| `/account/password` | 初回パスワード変更 | 必要 | `staff` |
| `/` | ダッシュボード | 必要 | `rental`, `payment`, `inventory` |
| `/films` | 作品一覧 | 必要 | `film`, `category`, `language` |
| `/films/[filmId]` | 作品詳細 | 必要 | `film`, `actor`, `category`, `inventory` |
| `/actors` | 俳優一覧 | 必要 | `actor`, `film_actor` |
| `/actors/[actorId]` | 俳優詳細 | 必要 | `actor`, `film` |
| `/customers` | 顧客一覧 | 必要 | `customer`, `address`, `city`, `country` |
| `/customers/[customerId]` | 顧客詳細 | 必要 | `customer`, `rental`, `payment` |
| `/customers/new` | 顧客登録 | 必要 | `customer`, `address` |
| `/customers/[customerId]/edit` | 顧客編集 | 必要 | `customer`, `address` |
| `/staff` | スタッフ一覧・管理 | 必要（店長のみ） | `staff`, `store` |
| `/staff/new` | スタッフ登録 | 必要（店長のみ） | `staff`, `address` |
| `/staff/[staffId]/edit` | スタッフ編集 | 必要（店長のみ） | `staff`, `address` |
| `/rentals` | レンタル一覧 | 必要 | `rental`, `customer`, `film` |
| `/rentals/new` | レンタル受付 | 必要 | `rental`, `payment`, `inventory` |
| `/rentals/outstanding` | 未返却一覧 | 必要 | `rental`, `customer`, `film` |
| `/inventory` | 在庫状況 | 必要 | `inventory`, `film`, `store`, `rental` |
| `/reports/sales` | 売上レポート | 必要 | `payment`, `store`, `staff` |
| `/reports/films` | 作品ランキング | 必要 | `rental`, `film`, `category` |
| `/reports/customers` | 顧客ランキング | 必要 | `payment`, `customer` |

合計21画面。すべてを一度に作る必要はなく、
[01-overview.md](./01-overview.md) の段階表に沿って積み上げる。

## 画面遷移図

```mermaid
flowchart TD
    Login["/login<br/>ログイン"]
    Password["/account/password<br/>初回パスワード変更"]
    Dash["/<br/>ダッシュボード"]

    Login -->|通常の認証成功| Dash
    Login -->|初回変更が必要| Password
    Password -->|変更後に再ログイン| Login
    Dash -->|ログアウト| Login

    subgraph カタログ
        Films["/films<br/>作品一覧"]
        FilmDetail["/films/[filmId]<br/>作品詳細"]
        Actors["/actors<br/>俳優一覧"]
        ActorDetail["/actors/[actorId]<br/>俳優詳細"]
    end

    subgraph 顧客
        Customers["/customers<br/>顧客一覧"]
        CustomerDetail["/customers/[customerId]<br/>顧客詳細"]
        CustomerNew["/customers/new<br/>顧客登録"]
        CustomerEdit["/customers/[customerId]/edit<br/>顧客編集"]
    end

    subgraph レンタル
        Rentals["/rentals<br/>レンタル一覧"]
        RentalNew["/rentals/new<br/>レンタル受付"]
        Outstanding["/rentals/outstanding<br/>未返却一覧"]
    end

    subgraph スタッフ管理（店長のみ）
        Staff["/staff<br/>スタッフ一覧"]
        StaffNew["/staff/new<br/>スタッフ登録"]
        StaffEdit["/staff/[staffId]/edit<br/>スタッフ編集"]
    end

    subgraph レポート
        Inventory["/inventory<br/>在庫状況"]
        SalesReport["/reports/sales<br/>売上"]
        FilmReport["/reports/films<br/>作品ランキング"]
    end

    Dash --> Films
    Dash --> Customers
    Dash --> Rentals
    Dash --> Outstanding
    Dash --> SalesReport

    Films <--> FilmDetail
    FilmDetail --> ActorDetail
    FilmDetail -->|この作品を貸出| RentalNew
    FilmDetail --> Inventory

    Actors <--> ActorDetail
    ActorDetail --> FilmDetail

    Customers <--> CustomerDetail
    Customers --> CustomerNew
    CustomerDetail --> CustomerEdit
    CustomerDetail -->|この顧客に貸出| RentalNew
    CustomerNew --> CustomerDetail
    CustomerEdit --> CustomerDetail

    Dash --> Staff
    Staff --> StaffNew
    Staff --> StaffEdit
    StaffNew --> Staff
    StaffEdit --> Staff

    Rentals --> CustomerDetail
    Rentals --> FilmDetail
    Outstanding -->|返却処理| Outstanding
    RentalNew -->|登録完了| CustomerDetail

    FilmReport --> FilmDetail
```

## 画面ごとの構成

### `/login` — ログイン

認証前の唯一の画面。

| 要素 | 内容 |
|---|---|
| 入力 | `username`（必須）、`password`（必須） |
| 送信 | Auth.js の `signIn('credentials', ...)` |
| エラー | 「ユーザー名またはパスワードが正しくありません」（どちらが誤りかは明かさない） |
| 成功時 | `/` へリダイレクト |

`staff.active = false` のスタッフはログインを拒否する。
`must_change_password = true` のスタッフはログイン後、パスワード変更を完了するまで
`/account/password` とログアウト以外の画面へ進めない。

### `/account/password` — 初回パスワード変更

スタッフ登録・再有効化・パスワード再発行の後に使う画面。

| 要素 | 内容 |
|---|---|
| 入力 | 現在の一時パスワード、新しいパスワード、確認入力 |
| 送信 | 現在のパスワードを bcrypt で照合してから新しいハッシュを保存 |
| 成功時 | サインアウト後、再ログイン画面へ遷移 |
| 制約 | `must_change_password = false` になるまで他画面・他 Action を使えない |

### `/` — ダッシュボード

ログイン直後の着地点。数字を並べて各画面への入口にする。

| カード | 表示内容 | 遷移先 |
|---|---|---|
| 未返却 | 貸出中の件数（現在183件） | `/rentals/outstanding` |
| 延滞 | 貸出期間を超過している件数 | `/rentals/outstanding?filter=overdue` |
| 在庫総数 | `inventory` 件数と貸出中の割合 | `/inventory` |
| 本日の受付 | ログイン中スタッフの当日処理件数 | `/rentals` |
| 売上推移 | 月次売上の折れ線グラフ | `/reports/sales` |

**注意:** データが2005〜2006年のため「本日の受付」は常に0件になる。
基準日の扱いは [04-features.md](./04-features.md) のダッシュボード節を参照。

### `/films` — 作品一覧

1,000件あるためページネーション必須。

| 要素 | 内容 |
|---|---|
| 検索 | タイトル・説明文（`film_text` の FULLTEXT を使う） |
| フィルタ | カテゴリ、レーティング、言語 |
| ソート | タイトル、公開年、貸出料金、上映時間 |
| 表示列 | タイトル / カテゴリ / レーティング / 上映時間 / 貸出料金 / 在庫数 |
| ページング | URLクエリ（`?page=2&category=Action`）で状態を保持 |

検索・フィルタの状態を URL に持たせると、Server Component のまま実装でき、
ブラウザバックや共有も自然に動く。

### `/films/[filmId]` — 作品詳細

| セクション | 内容 |
|---|---|
| 基本情報 | タイトル、説明、公開年、上映時間、レーティング、言語 |
| 料金 | 貸出料金、貸出日数、弁償額 |
| 特典 | `special_features`（カンマ区切りを分解してバッジ表示） |
| 出演者 | 俳優名の一覧（各名前から俳優詳細へ） |
| カテゴリ | ジャンルのバッジ |
| 在庫 | 店舗別の「総数 / 貸出可能数」 |
| 操作 | 「この作品を貸し出す」→ `/rentals/new?filmId=...` |

### `/customers` — 顧客一覧

| 要素 | 内容 |
|---|---|
| 検索 | 氏名、メールアドレス |
| フィルタ | 店舗、有効/無効（`active`） |
| 表示列 | 氏名 / メール / 都市 / 国 / 店舗 / 状態 |
| 操作 | 「新規登録」ボタン |

都市・国の表示に `address` → `city` → `country` の3段JOINが必要。

### `/customers/[customerId]` — 顧客詳細

| セクション | 内容 |
|---|---|
| 基本情報 | 氏名、メール、住所（3段JOINで整形）、所属店舗、登録日 |
| 貸出中 | この顧客が現在借りているDVD一覧 |
| 履歴 | 過去のレンタル履歴（ページング） |
| 支払い | 支払い履歴と累計額 |
| 未払い | `get_customer_balance` 相当の残高 |
| 操作 | 「編集」「この顧客に貸し出す」 |

### `/staff` — スタッフ一覧・管理

店長だけが自店舗のスタッフを管理できる画面。別店舗のスタッフは表示・操作ともに対象外。

| 要素 | 内容 |
|---|---|
| 表示列 | 氏名 / ユーザー名 / メール / 有効状態 / 初回変更の要否 |
| 検索 | 氏名、ユーザー名、メールアドレス |
| 操作 | 「新規登録」「編集」「無効化 / 再有効化」「一時パスワード再発行」 |
| 制約 | 自分自身は無効化不可。店長の無効化時は店長移管を先に要求する |

一時パスワードは画面上で一度だけ表示し、保存済みハッシュから復元しない。

### `/staff/new` / `/staff/[staffId]/edit` — スタッフ登録・編集

| 要素 | 内容 |
|---|---|
| 入力 | 氏名、ユーザー名、メール、住所。登録・再有効化時は一時パスワード |
| 店舗 | フォームでは選ばせず、ログイン中の店長の店舗をサーバー側で設定する |
| 送信 | `address` と `staff` をトランザクションで登録 / 更新する |
| 成功時 | `/staff` へ戻り、一時パスワードを伝達するよう案内する |

### `/rentals/new` — レンタル受付

このアプリで最も複雑な画面。**トランザクションが必要**。

```mermaid
flowchart LR
    A[顧客を選択] --> B[作品を選択]
    B --> C[貸出可能な在庫を特定]
    C --> D{在庫あり?}
    D -->|なし| E[エラー表示]
    D -->|あり| F[確認画面]
    F --> G[rental + payment を同時登録]
    G --> H[顧客詳細へ]
```

- クエリパラメータ（`?customerId=` / `?filmId=`）で前画面からの引き継ぎに対応する
- 在庫の確定から登録までの間に他スタッフが同じDVDを貸し出す可能性があるため、
  **登録時に再度在庫を確認する**（詳細は [06-data-access.md](./06-data-access.md)）

### `/rentals/outstanding` — 未返却一覧

| 要素 | 内容 |
|---|---|
| 表示列 | 顧客名 / 作品 / 貸出日 / 返却期限 / 経過日数 / 状態 |
| フィルタ | 延滞のみ、店舗別 |
| 操作 | 各行に「返却処理」ボタン |

返却期限は `rental.rental_date + film.rental_duration` で算出する。
`rental` から `inventory` を経て `film` に到達する必要がある点に注意。

### `/inventory` — 在庫状況

| 要素 | 内容 |
|---|---|
| 表示単位 | 作品 × 店舗 |
| 表示列 | 作品 / 店舗 / 総数 / 貸出中 / 貸出可能 |
| フィルタ | 店舗、在庫切れのみ |

集計の考え方は「`inventory` の件数」から「未返却 `rental` の件数」を引く。

### `/reports/sales` — 売上レポート

| 要素 | 内容 |
|---|---|
| 期間選択 | 開始日・終了日（既定値はデータ範囲の2005-05〜2006-02） |
| 集計軸 | 月別 / 店舗別 / スタッフ別 |
| 表示 | グラフ + 明細テーブル |

## URL 設計の方針

検索条件やページ番号は **URL のクエリパラメータに置く**。

```
/films?q=dinosaur&category=Action&rating=PG&sort=title&page=2
```

理由は3つ。

1. Server Component のまま実装できる（`searchParams` を受け取るだけ）
2. ブラウザバック・リロード・URL共有が自然に動く
3. 一覧条件のためのクライアント状態が不要になり、入力フォームは Conform と Server Action に集中できる

一覧画面のフィルタを `useState` で持つと Client Component 化が連鎖するため、
最初から URL に寄せておくほうが構成が崩れにくい。

## レイアウト

```
┌────────────────────────────────────────────┐
│ ヘッダー: ロゴ / 検索 / ログイン中スタッフ名   │
├──────────┬─────────────────────────────────┤
│          │                                 │
│ サイド    │  各画面のコンテンツ               │
│ ナビ      │                                 │
│          │                                 │
│ ・ホーム   │                                 │
│ ・作品     │                                 │
│ ・俳優     │                                 │
│ ・顧客     │                                 │
│ ・レンタル  │                                 │
│ ・在庫     │                                 │
│ ・レポート  │                                 │
└──────────┴─────────────────────────────────┘
```

ヘッダーとサイドナビは `(protected)/layout.tsx` に置き、全画面で共有する。
ログイン中のスタッフ名と所属店舗をヘッダーに常時表示しておくと、
「誰として操作しているか」が明確になり、`staff_id` の自動付与が理解しやすくなる。
