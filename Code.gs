function searchGoogleToSheet() {
  const SERP_API_KEY = PropertiesService
    .getScriptProperties()
    .getProperty("SERP_API_KEY");

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const keyword = sheet.getRange("A2").getValue();

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

  sheet.getRange("A4:E100").clearContent();

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

function extractEntities(text){
  const Entity_KEYWORDS = [
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
    "網速",
    "方案",
    "電信",
    "資費",
    "合約"
  ];

  const foundEntities = [];

  ENTITY_KEYWORDS.forEach(entity => {
    if(texst.includes(entity)) {
      foundEntities.push(entity);
    }
  });

  return foundEntities;
}