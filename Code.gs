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
    sheet.appendRow([
      keyword,
      index + 1,
      item.title || "",
      item.link || "",
      item.snippet || ""
    ]);
  });
}