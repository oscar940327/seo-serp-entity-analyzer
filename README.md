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
5. 抽取 entity 並統計數量
6. 輸出到 Google Sheet
7. 同步儲存到 Supabase

## Entity Groups

目前 entity 分群包含：

- 電信業者
- 方案特色
- 網路服務
- 申辦條件
- 優惠行銷

## Notes

本專案會抓取 SerpApi 回傳的 Google organic_results，最多取前 10 筆。若當次搜尋結果自然排序不足 10 筆，則以實際回傳數量為準。

---