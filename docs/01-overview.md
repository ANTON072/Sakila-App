# 01. プロジェクト概要

## 目的

`db/init` にある sakila サンプルデータベースを題材に、**DVDレンタル店のスタッフ向け管理システム**を実装する。
SQL の学習内容（書籍「初めてのSQL」）を、実際に動くアプリケーションへ接続することが狙い。

学習として重視する点は以下の3つ。

1. **SQL とアプリケーションの接続** — 書いたクエリが画面にどう現れるか
2. **型安全の一貫性** — DB スキーマから UI まで TypeScript の型が繋がる感覚
3. **データモデルの読解** — 既存の正規化されたスキーマを読み、そこから機能を導く

## 対象ユーザー

店舗スタッフ（`staff` テーブルの2名）。一般顧客向けの画面は作らない。
「店頭でスタッフが業務に使う社内ツール」という想定に統一する。

## 技術スタック

| 役割 | 採用 | 選定理由 |
|---|---|---|
| フレームワーク | Next.js（App Router） | Server Actions で API 層を挟まずに DB へ到達できる |
| 言語 | TypeScript | スタック全体を型で貫く |
| ORM | Drizzle ORM | SQL に近い記述。学んだ SQL の知識がそのまま活きる |
| スキーマ→検証 | drizzle-zod | Drizzle スキーマから Zod スキーマを生成し二重管理を避ける |
| バリデーション | Zod | Server Actions の入力検証 |
| フォーム | React Hook Form | フォーム状態管理 |
| UI | shadcn/ui | コンポーネントをコードとして手元に持てる |
| Lint / Format | Biome | ESLint + Prettier を1つに集約 |
| 認証 | Auth.js v5（Credentials） | `staff` テーブルをそのままログインユーザーにできる |
| テスト | Vitest | 実DBに接続してクエリを検証する。モックは使わない |
| DB | MySQL 8.0（Docker） | 既存の `docker-compose.yml` をそのまま使う |

### 採用しなかったもの

- **Hono** — UI を含むアプリ全体を作るため、フロント／バックを分ける利点が薄い
- **Better Auth** — 独自の user / session テーブルを持つ設計のため、`staff` テーブルを主体にしづらい
- **Cognito** — AWS 環境構築のコストが学習目的に見合わない
- **seed スクリプト** — `db/init/02-sakila-data.sql` に実データが入っており不要

## ディレクトリ構成（想定）

```
SQL-TRAINING/
├── db/init/                    # 既存: sakila スキーマ + データ
├── docker-compose.yml          # 既存: MySQL 8.0
├── docs/                       # 既存: 書籍の章まとめ
├── web-docs/                   # 本ドキュメント群
└── web/                        # ← これから作る Next.js アプリ
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/           # 認証前
    │   │   └── (dashboard)/            # 認証後（layout でセッション必須化）
    │   │       ├── films/
    │   │       ├── customers/
    │   │       ├── rentals/
    │   │       ├── inventory/
    │   │       └── reports/
    │   ├── components/
    │   │   ├── ui/                     # shadcn/ui 生成物
    │   │   └── features/               # 機能単位のコンポーネント
    │   ├── db/
    │   │   ├── schema/                 # Drizzle スキーマ（テーブルごとに分割）
    │   │   └── index.ts                # db インスタンス
    │   ├── features/                   # 機能単位のサーバー処理
    │   │   └── <feature>/
    │   │       ├── queries.ts          # 参照系
    │   │       ├── actions.ts          # 'use server'。認証・検証・Tx境界
    │   │       ├── core.ts             # 業務ロジック（テスト対象）
    │   │       └── schema.ts           # Zod スキーマ
    │   └── lib/
    │       ├── auth.ts                 # Auth.js 設定
    │       └── app-date.ts             # 集計の基準日
    ├── tests/
    │   ├── setup.ts
    │   ├── unit/                       # DB不要
    │   └── db/                         # DB接続あり
    ├── drizzle.config.ts
    ├── vitest.config.ts
    └── biome.json
```

アプリを `web/` 配下に置くのは、リポジトリ直下の学習用ファイル（`docs/`、`book.pdf`）と混ざらないようにするため。

## データの前提

`db/init/02-sakila-data.sql` に投入済みのデータ量は以下のとおり。

| テーブル | 件数 | | テーブル | 件数 |
|---|---:|---|---|---:|
| `film` | 1,000 | | `rental` | 16,044 |
| `film_text` | 1,000 | | `payment` | 16,044 |
| `film_actor` | 5,462 | | `inventory` | 4,581 |
| `film_category` | 1,000 | | `customer` | 599 |
| `actor` | 200 | | `address` | 603 |
| `category` | 16 | | `city` | 600 |
| `language` | 6 | | `country` | 109 |
| `staff` | 2 | | `store` | 2 |

一覧画面ではページネーションが必須になる規模（`film` 1,000件、`rental` 16,044件）であり、
学習題材として都合がよい。

### 注意すべき点

**1. データの日付が 2005〜2006 年**

```
rental / payment の期間: 2005-05-24 〜 2006-02-14
```

「今月の売上」のような現在日時基準の集計は**すべてゼロ件になる**。
ダッシュボードは期間を明示的に選択する設計にするか、集計の基準日をデータ範囲内に固定する。
詳細は [04-features.md](./04-features.md) の売上レポートを参照。

**2. 未返却レンタルが183件ある**

`rental.return_date IS NULL` が183件。返却処理画面の題材としてそのまま使える。

**3. `staff.password` が SHA1、しかも1件は NULL**

| staff_id | username | password |
|---|---|---|
| 1 | `Mike` | `8cb2237d...`（SHA1） |
| 2 | `Jon` | `NULL` |

そのままでは認証に使えない。対応方針は [05-auth.md](./05-auth.md) を参照。

## ドキュメント一覧

| # | ドキュメント | 内容 |
|---|---|---|
| 01 | [概要](./01-overview.md) | 本ドキュメント |
| 02 | [ER図・テーブル定義](./02-er-diagram.md) | スキーマ構造と Drizzle 型対応 |
| 03 | [画面設計](./03-screens.md) | ルーティングと画面遷移 |
| 04 | [機能一覧](./04-features.md) | 各機能の仕様と使用テーブル |
| 05 | [認証設計](./05-auth.md) | Auth.js + staff テーブル |
| 06 | [データアクセス設計](./06-data-access.md) | Server Actions / Query 一覧 |
| 07 | [コンポーネント設計](./07-components.md) | UI の構成方針 |
| 08 | [テスト設計](./08-testing.md) | Vitest・実DB接続・ロールバック |

## 進め方の目安

実装は以下の順で積み上げると、前段の成果が次段で必ず使われる形になる。

| 段階 | 内容 | 得られるもの |
|---|---|---|
| 1 | プロジェクト初期化・Drizzle 接続 | DB に繋がる |
| 2 | スキーマ定義（中核テーブル手書き） | 型付きのテーブル定義 |
| 3 | Vitest 導入・テスト用DB | 以降の実装を検証できる |
| 4 | 認証（ログイン／ログアウト） | 以降の画面を保護できる |
| 5 | 作品一覧・詳細（参照のみ） | 一覧・詳細・JOIN の型 |
| 6 | 顧客一覧・詳細 | 同上の反復で定着 |
| 7 | レンタル受付・返却（更新系） | トランザクション |
| 8 | 売上レポート | 集計クエリ |

段階4までを終えると「DBに繋がり、テストが書け、ログインでき、型が通る」土台ができる。
以降の画面はこの土台の上で同じパターンの反復になる。

テスト環境を認証より前に置いたのは、多段 JOIN の正しさを目視で確認できないため。
`rental → inventory → film` のような経路は、実データに対する検証がないと誤りに気づけない。
