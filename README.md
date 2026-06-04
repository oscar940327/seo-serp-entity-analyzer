# SEO SERP Entity Analyzer

這是一個 SEO SERP 分析工具，可以輸入關鍵字，自動抓取 Google 搜尋結果前幾名文章，並分析每篇結果中的 entity 數量與主題分群。

## Features

- 使用 SerpApi 抓取 Google 搜尋結果
- 支援自由輸入關鍵字
- 將 SERP 結果輸出到 Google Sheet
- 計算每篇文章的 entity 數量
- 統計所有 entity 出現次數
- 將 entity 分成不同主題群組
- 將分析結果存入 Supabase
- 使用 Vercel 部署前端操作頁面

## Tech Stack

- Google Apps Script
- Google Sheets
- SerpApi
- OpenRouter API
- Supabase
- Vercel
- HTML / CSS / JavaScript

## Project Structure

```text
seo-serp-entity-analyzer/
├── apps-script/
│   └── Code.gs
├── web/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── README.md
```

## Workflow

1. 使用者輸入關鍵字
2. Vercel 前端呼叫 Apps Script Web App
3. Apps Script 呼叫 SerpApi
4. 取得 Google SERP organic results
5. 使用 OpenRouter 串接 LLM 分析 title / snippet 並抽取 entity
6. 輸出到 Google Sheet
7. 同步儲存到 Supabase

## Apps Script Properties

請在 Apps Script 的 Script Properties 設定：

- `SERP_API_KEY`
- `OPENROUTER_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Entity Groups

Entity 分群由 OpenRouter 串接的 LLM 依據每次 SERP 的 title / snippet 動態產生，不再綁定單一產業字典。

## Notes

本專案會抓取 SerpApi 回傳的 Google organic_results，最多取前 10 筆。若當次搜尋結果自然排序不足 10 筆，則以實際回傳數量為準。

---
