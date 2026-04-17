# 登記ひろい機

登記関連PDFから主要項目を抽出し、メール文面とExcelをまとめて出力する Next.js アプリです。

## 主な機能
- テキストPDFの抽出
- OCRテキストからの再抽出
- 複数テンプレ
- Excel出力
- 問い合わせフォーム
- 利用規約 / プライバシーポリシー
- SEO用 robots / sitemap
- GitHub Pages 用の説明ページ

## セットアップ
```bash
npm install
npm run dev
```

## 本番デプロイ
- GitHub に push
- Vercel で import
- 環境変数を設定

### 環境変数
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.example
RESEND_API_KEY=
CONTACT_TO_EMAIL=
```

## 公開時の重要注意
1. 取得元サービスへの自動ログインやスクレイピングをしない
2. PDFの恒久保存をしない設計にする
3. 処理画面に広告や不要な解析タグを置かない
4. 原本照合が必要であることを明記する
5. 利用規約とプライバシーポリシーを整える

## 収益化の推奨構成
- 説明ページ: 広告あり
- ツール画面: 広告なし

## 実装メモ
- `pdf-parse` はテキストPDF向けです
- 画像PDFは OCR でテキスト化して貼り付ける運用です
- より高精度にする場合は Python OCR サービスの別建てを検討してください
