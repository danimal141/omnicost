# GitHub ActionsでClaude Assistantを使用する設定

このプロジェクトでは、公式の[Claude Code Action](https://github.com/anthropics/claude-code-action)を使用して、GitHub上でClaude AIアシスタント機能を提供しています。

## 必要な設定

### 1. Claude GitHub Appのインストール
[Claude GitHub App](https://github.com/apps/claude)をリポジトリにインストールしてください。

**重要**: GitHub Appのインストールは必須です。インストールしないとワークフローが動作しません。

### 2. シークレットの設定
GitHub リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください：

#### ANTHROPIC_API_KEY
Claude APIキーを設定します。

1. [Anthropic Console](https://console.anthropic.com/)にアクセス
2. API Keys セクションで新しいキーを作成
3. リポジトリのシークレットに `ANTHROPIC_API_KEY` として追加

## ワークフロー機能

### Claude Assistant (`claude-code.yml`)
- **自動レビュー**: Pull Requestを作成すると、Claudeが自動的にコードをレビュー
- **インタラクティブアシスト**: コメントで `@claude` をメンションすると応答
- **レビュー観点**:
  - コード品質とTypeScriptベストプラクティス
  - 潜在的なバグや問題
  - パフォーマンスの考慮事項
  - セキュリティの懸念事項
  - プロジェクトアーキテクチャとの整合性

## 使用例

### PRコメントでの使用
```
@claude このコードのテストを書いて
@claude この関数のパフォーマンスを改善する方法を提案して
@claude このエラーの原因を説明して
@claude このPRの変更をレビューして
```

### PRレビューでの使用
PRレビューコメントでも同様に `@claude` をメンションできます。

## 注意事項

- APIキーは必ずGitHub Secretsに保存し、コードにハードコードしないでください
- Claude Code Actionは現在ベータ版です
- APIの使用量に応じて課金が発生する可能性があります
- Claudeは自動的にコミットを作成する権限を持ちます
