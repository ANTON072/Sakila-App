name: post-pending-review
description: 指定されたPRのコードレビューを実施し、pending reviewとして投稿する
tools:
  - bash
  - gh (GitHub CLI)
---

# PRレビュー作業

PR $ARGUMENTS のコードレビューを実施してください

## 実行手順

### 1. PR情報の取得

ghコマンドでPRの詳細を取得してください：
```bash
gh pr view $ARGUMENTS
gh pr diff $ARGUMENTS
```

#### ⚠️ レビュー対象ファイルは必ず PR head 時点のリモート内容を参照すること

ローカル作業ツリーが PR head より古いと、`Read` で取得したファイルの行番号が
GitHub 側の最新 diff と一致せず、投稿時に
`422 Unprocessable Entity ("Line could not be resolved")` になります。

**`Read` でローカルファイルを直接読まないこと。** 代わりに GitHub Contents API
から PR head 時点の内容を行番号付きで取得します（`git fetch`/`pull`/`checkout`
は一切不要、ローカルの作業ツリーも `origin/*` refs も変えません）:

```bash
PR_HEAD_OID=$(gh pr view $ARGUMENTS --json headRefOid     -q .headRefOid)
REPO=$(gh pr view $ARGUMENTS       --json headRepository -q '.headRepository.nameWithOwner')

# 変更されたファイル一覧
gh pr view $ARGUMENTS --json files -q '.files[].path'

# 各ファイルを PR head 時点の内容で取得（行番号付き）
path=".claude/scripts/post-pending-review.sh"  # 例
gh api "repos/${REPO}/contents/${path}?ref=${PR_HEAD_OID}" \
  -H "Accept: application/vnd.github.raw" | nl -ba
```

`nl -ba` の出力する行番号がそのままレビューコメントの `line` / `start_line` に
使える値です。差分 hunk 内の行は `gh pr diff $ARGUMENTS` で確認してください。

### 2. レビュー実施

agents code-reviewer を利用してコードレビューを実施してください

### 3. レビュー結果をpending reviewとして投稿

**`gh api` を直接呼ばないこと。** 必ず以下のラッパースクリプトを経由してください:

```
./.claude/scripts/post-pending-review.sh <owner/repo> <pr_number>
```

このスクリプトは入力 JSON から `event` フィールド（トップレベル / `comments[]` 内）を
`jq` で **無条件に除去**してから `gh api` に渡すため、誤って `event` を書いてしまっても
レビューが即時公開されることはありません。さらに投稿後にレスポンスの `state` が
`PENDING` であることを検証し、もし `PENDING` 以外だった場合はレスポンス全文を
stderr に出力して非ゼロ終了します（自動的なコメント削除は行わないので、必要なら
呼び出し側で対応してください）。

#### フィールド説明
- `path`: 対象ファイルのリポジトリルートからの相対パス
- `body`: コメント内容
- `line`: コメント対象の最終行（新しいファイル側の行番号）
- `side`: 追加/変更行は `"RIGHT"`、削除行は `"LEFT"`
- `start_line`: 複数行コメントの場合のみ指定（開始行番号）
- `start_side`: `start_line` を指定する場合は必須（通常は `"RIGHT"`）
- `event`: **書かないこと**。スクリプトが除去するが、最初から書かないのが望ましい

#### 投稿コマンド
```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
PR_NUMBER=$ARGUMENTS

./.claude/scripts/post-pending-review.sh "${REPO}" "${PR_NUMBER}" << 'EOF'
{
  "body": "レビュー全体のサマリー",
  "comments": [
    {
      "path": "対象ファイルのパス",
      "body": "コメント内容",
      "line": 42,
      "side": "RIGHT"
    }
  ]
}
EOF
```

スクリプトが成功すると `Pending review created.` と review URL を出力します。
失敗した場合は exit code が非ゼロになるので、その内容をユーザーに報告してください。

#### 修正提案がある場合

`comments` 配列に含めるオブジェクトの `body` で、以下のようにGitHub suggestion形式を使用してください：
```json
{
  "body": "レビュー全体のサマリー",
  "comments": [
    {
      "path": "src/example.py",
      "line": 42,
      "side": "RIGHT",
      "body": "変数名をより明確にすることを提案します：\n\n```suggestion\nuser_count = len(users)\n```"
    }
  ]
}
```

### 4. 完了報告

投稿完了後、以下を報告してください：
- pending review が作成されたこと
- ユーザーが GitHub UI で確認・編集後に submit する必要があること
- PR の URL

## 注意事項

- 必ず `./.claude/scripts/post-pending-review.sh` 経由で投稿すること（`gh api .../reviews` を直接叩かない）
- `line` は差分の中での行番号（新しいファイル側の行番号）を指定する
- 複数行コメントの場合は `start_line` と `start_side` の両方を指定する
- コメントがない場合は `comments` を空配列にして全体コメントのみ投稿可能
- pending review は作成者本人にのみ見え、submit するまで他の人には見えない
