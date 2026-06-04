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

  Logger.log("SERP results count: " + results.length);

  inputSheet.getRange("B1").setValue("result_count");
  inputSheet.getRange("B2").setValue(results.length);

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

  const allEntities = [];

  results.slice(0, 10).forEach((item, index) => {
    const title = item.title || "";
    const link = item.link || "";
    const snippet = item.snippet || "";

    const text = title + " " + snippet;
    const entities = extractEntities(text);

    entities.forEach(entity => {
      allEntities.push(entity);
    });

    const rowData = {
      keyword: keyword,
      rank: index + 1,
      title: title,
      url: link,
      snippet: snippet,
      entities: entities.join(", "),
      entity_count: entities.length
    };

    resultSheet.appendRow([
      rowData.keyword,
      rowData.rank,
      rowData.title,
      rowData.url,
      rowData.snippet,
      rowData.entities,
      rowData.entity_count
    ]);

    saveToSupabase(rowData);
  });

  writeEntitySummary(spreadsheet, allEntities);
  writeEntityGroups(spreadsheet, allEntities);
  writeGroupSummary(spreadsheet, allEntities);
  writeChartsInSummarySheets(spreadsheet);
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

function writeEntitySummary(spreadsheet, allEntities) {
  let summarySheet = spreadsheet.getSheetByName("Entity Summary");

  if (!summarySheet) {
    summarySheet = spreadsheet.insertSheet("Entity Summary");
  }

  summarySheet.clearContents();

  summarySheet.appendRow(["entity", "count"]);

  const entityCountMap = {};

  allEntities.forEach(entity => {
    if (!entityCountMap[entity]) {
      entityCountMap[entity] = 0;
    }

    entityCountMap[entity]++;
  });

  const sortedEntities = Object.entries(entityCountMap)
    .sort((a, b) => b[1] - a[1]);

  sortedEntities.forEach(([entity, count]) => {
    summarySheet.appendRow([entity, count]);
  });
}

function getEntityGroup(entity) {
  const groups = {
    "電信業者": ["中華電信", "台灣大哥大", "遠傳", "亞太電信", "台灣之星"],
    "方案特色": ["吃到飽", "不限速", "限速", "月租", "資費", "方案"],
    "網路服務": ["4G", "5G", "網速", "上網", "流量"],
    "申辦條件": ["合約", "門號", "NP", "攜碼", "學生"],
    "優惠行銷": ["優惠"]
  };

  for (const groupName in groups) {
    if (groups[groupName].includes(entity)) {
      return groupName;
    }
  }

  return "其他";
}

function writeEntityGroups(spreadsheet, allEntities) {
  let groupSheet = spreadsheet.getSheetByName("Entity Groups");

  if (!groupSheet) {
    groupSheet = spreadsheet.insertSheet("Entity Groups");
  }

  groupSheet.clearContents();
  groupSheet.appendRow(["group", "entity", "count"]);

  const entityCountMap = {};

  allEntities.forEach(entity => {
    if (!entityCountMap[entity]) {
      entityCountMap[entity] = 0;
    }
    entityCountMap[entity]++;
  });

  const rows = Object.entries(entityCountMap)
    .map(([entity, count]) => {
      return [getEntityGroup(entity), entity, count];
    })
    .sort((a, b) => {
      if (a[0] === b[0]) {
        return b[2] - a[2];
      }
      return a[0].localeCompare(b[0]);
    });

  rows.forEach(row => {
    groupSheet.appendRow(row);
  });
}

function writeGroupSummary(spreadsheet, allEntities) {
  let groupSummarySheet = spreadsheet.getSheetByName("Group Summary");

  if (!groupSummarySheet) {
    groupSummarySheet = spreadsheet.insertSheet("Group Summary");
  }

  groupSummarySheet.clearContents();
  groupSummarySheet.appendRow(["group", "total_count"]);

  const groupCountMap = {};

  allEntities.forEach(entity => {
    const group = getEntityGroup(entity);

    if (!groupCountMap[group]) {
      groupCountMap[group] = 0;
    }

    groupCountMap[group]++;
  });

  const sortedGroups = Object.entries(groupCountMap)
    .sort((a, b) => b[1] - a[1]);

  sortedGroups.forEach(([group, count]) => {
    groupSummarySheet.appendRow([group, count]);
  });
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("SEO Analyzer")
    .addItem("Run SERP Analysis", "searchGoogleToSheet")
    .addToUi();
}

function saveToSupabase(rowData) {
  const SUPABASE_URL = PropertiesService
    .getScriptProperties()
    .getProperty("SUPABASE_URL");

  const SUPABASE_ANON_KEY = PropertiesService
    .getScriptProperties()
    .getProperty("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("找不到 SUPABASE_URL 或 SUPABASE_ANON_KEY");
  }

  const endpoint = SUPABASE_URL + "/rest/v1/serp_results";

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
      Prefer: "return=minimal"
    },
    payload: JSON.stringify(rowData),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(endpoint, options);
  const statusCode = response.getResponseCode();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "Supabase 寫入失敗，rank=" +
      rowData.rank +
      "，status=" +
      statusCode +
      "，message=" +
      response.getContentText()
    );
  }
}

function doGet(e) {
  const keyword = e.parameter.keyword;

  if (!keyword) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing keyword"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = spreadsheet.getSheetByName("Input");

  inputSheet.getRange("A2").setValue(keyword);

  searchGoogleToSheet();

  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "SERP analysis completed",
      keyword: keyword
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeChartsInSummarySheets(spreadsheet) {
  const entitySummarySheet = spreadsheet.getSheetByName("Entity Summary");
  const groupSummarySheet = spreadsheet.getSheetByName("Group Summary");

  // 移除 Entity Summary 舊圖表
  entitySummarySheet.getCharts().forEach(chart => {
    entitySummarySheet.removeChart(chart);
  });

  // 移除 Group Summary 舊圖表
  groupSummarySheet.getCharts().forEach(chart => {
    groupSummarySheet.removeChart(chart);
  });

  const entityLastRow = entitySummarySheet.getLastRow();
  const groupLastRow = groupSummarySheet.getLastRow();

  // Entity Summary 長條圖
  if (entityLastRow > 1) {
    const entityRange = entitySummarySheet.getRange("A1:B" + entityLastRow);

    const entityChart = entitySummarySheet.newChart()
      .setChartType(Charts.ChartType.BAR)
      .addRange(entityRange)
      .setPosition(1, 4, 0, 0)
      .setOption("title", "Top Entities in SERP Results")
      .setOption("legend", { position: "none" })
      .build();

    entitySummarySheet.insertChart(entityChart);
  }

  // Group Summary 圓餅圖
  if (groupLastRow > 1) {
    const groupRange = groupSummarySheet.getRange("A1:B" + groupLastRow);

    const groupChart = groupSummarySheet.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(groupRange)
      .setPosition(1, 4, 0, 0)
      .setOption("title", "Entity Topic Group Distribution")
      .build();

    groupSummarySheet.insertChart(groupChart);
  }
}