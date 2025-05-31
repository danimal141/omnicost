# GitHub ActionsでClaude Codeを使用する設定

このプロジェクトでは、GitHub ActionsでClaude Codeを使用して自動コードレビューとアシスタント機能を提供しています。

## 必要なシークレット設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定してください：

### ANTHROPIC_API_KEY
Claude APIキーを設定します。

1. [Anthropic Console](https://console.anthropic.com/)にアクセス
2. API Keys セクションで新しいキーを作成
3. リポジトリのシークレットに `ANTHROPIC_API_KEY` として追加

## ワークフロー概要

### 1. Claude Code Review (`claude-code.yml`)
- **トリガー**: Pull Requestの作成・更新時
- **機能**: 変更されたコードを自動的にレビューし、フィードバックをPRコメントとして投稿
- **レビュー観点**:
  - コード品質とベストプラクティス
  - 潜在的なバグや問題
  - パフォーマンスの考慮事項
  - セキュリティの懸念事項

### 2. Claude Code Assist (`claude-assist.yml`)
- **トリガー**: PRコメントで `@claude` をメンション
- **機能**: コメントの内容に基づいてClaude Codeがアシスタントとして応答
- **使用例**:
  ```
  @claude このコードのテストを書いて
  @claude この関数のパフォーマンスを改善する方法を提案して
  @claude このエラーの原因を説明して
  ```

## 使用方法

1. **自動レビュー**: PRを作成すると自動的にClaude Codeによるレビューが実行されます

2. **インタラクティブアシスト**: PRコメントで `@claude` に続けて質問や依頼を書くと、Claude Codeが応答します

## 注意事項

- APIキーは必ずGitHub Secretsに保存し、コードにハードコードしないでください
- Claude Code CLIは現在開発中のため、実際の使用時はドキュメントを確認してください
- APIの使用量に応じて課金が発生する可能性があります
