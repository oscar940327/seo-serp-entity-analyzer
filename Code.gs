function searchGoogleToSheet() {
  const SERP_API_KEY = PropertiesService
    .getScriptProperties()
    .getProperty("SERP_API_KEY");

  if (!SERP_API_KEY) {
    throw new Error("找不到 SERP_API_KEY，請先到 Script Properties 設定 API key");
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const inputSheet = spreadsheet.getSheetByName("Input");
  const resultSheet = spreadsheet.getSheetByName("SERP Results");

  const keyword = inputSheet.getRange("A2").getValue();

  if (!keyword) {
    throw new Error("請先在 Input!A2 輸入關鍵字");
  }

  const url =
    "https://serpapi.com/search.json" +
    "?engine=google" +
    "&q=" + encodeURIComponent(keyword) +
    "&google_domain=google.com.tw" +
    "&hl=zh-tw" +
    "&gl=tw" +
    "&num=10" +
    "&api_key=" + SERP_API_KEY;

  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());

  const results = data.organic_results || [];

  resultSheet.clearContents();

  resultSheet.appendRow([
    "keyword",
    "rank",
    "title",
    "url",
    "snippet",
    "entities",
    "entity_count"
  ]);

  results.slice(0, 10).forEach((item, index) => {
    const title = item.title || "";
    const link = item.link || "";
    const snippet = item.snippet || "";

    const text = title + " " + snippet;
    const entities = extractEntities(text);

    resultSheet.appendRow([
      keyword,
      index + 1,
      title,
      link,
      snippet,
      entities.join(", "),
      entities.length
    ]);
  });
}

function extractEntities(text) {
  const ENTITY_KEYWORDS = [
    "4G",
    "5G",
    "吃到飽",
    "中華電信",
    "台灣大哥大",
    "遠傳",
    "亞太電信",
    "台灣之星",
    "月租",
    "不限速",
    "限速",
    "網速",
    "方案",
    "電信",
    "資費",
    "合約",
    "門號",
    "上網",
    "流量",
    "優惠",
    "學生",
    "NP",
    "攜碼"
  ];

  const foundEntities = [];

  ENTITY_KEYWORDS.forEach(entity => {
    if (text.includes(entity)) {
      foundEntities.push(entity);
    }
  });

  return foundEntities;
}