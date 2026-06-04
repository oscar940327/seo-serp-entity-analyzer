function searchGoogleToSheet(keywordFromRequest) {
  const SERP_API_KEY = PropertiesService
    .getScriptProperties()
    .getProperty("SERP_API_KEY");

  const OPENROUTER_API_KEY = PropertiesService
    .getScriptProperties()
    .getProperty("OPENROUTER_API_KEY");

  if (!SERP_API_KEY) {
    throw new Error("找不到 SERP_API_KEY，請先到 Script Properties 設定 API key");
  }

  if (!OPENROUTER_API_KEY) {
    throw new Error("找不到 OPENROUTER_API_KEY，請先到 Script Properties 設定 API key");
  }

  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const inputSheet = getOrCreateSheet(spreadsheet, "Input");
  const resultSheet = getOrCreateSheet(spreadsheet, "SERP Results");

  const keyword = writeKeywordToInput(spreadsheet, keywordFromRequest);

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

  const results = (data.organic_results || []).slice(0, 10).map((item, index) => {
    return {
      rank: index + 1,
      title: item.title || "",
      url: item.link || "",
      snippet: item.snippet || ""
    };
  });

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

  const analysis = extractEntitiesWithOpenRouter(keyword, results, OPENROUTER_API_KEY);
  const entitiesByRank = buildEntitiesByRank(analysis.results || []);
  const allEntities = [];

  results.forEach(item => {
    const entityRecords = entitiesByRank[item.rank] || [];
    const entities = entityRecords.map(entity => entity.name);

    entityRecords.forEach(entity => {
      allEntities.push(entity);
    });

    const rowData = {
      keyword: keyword,
      rank: item.rank,
      title: item.title,
      url: item.url,
      snippet: item.snippet,
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

  return {
    keyword: keyword,
    resultCount: results.length,
    entityCount: allEntities.length
  };
}

function getOrCreateSheet(spreadsheet, sheetName) {
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function writeKeywordToInput(spreadsheet, keywordFromRequest) {
  const inputSheet = getOrCreateSheet(spreadsheet, "Input");
  const keyword = (keywordFromRequest || inputSheet.getRange("A2").getValue() || "")
    .toString()
    .trim();

  if (keyword) {
    inputSheet.getRange("A1").setValue("keyword");
    inputSheet.getRange("A2").setValue(keyword);
    SpreadsheetApp.flush();
  }

  return keyword;
}

function extractEntitiesWithOpenRouter(keyword, results, apiKey) {
  const endpoint = "https://openrouter.ai/api/v1/chat/completions";
  const payload = {
    model: "openai/gpt-4.1-mini",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: [
          "你是 SEO SERP entity 分析器。",
          "只根據每筆 Google SERP 的 title 和 snippet 抽取 entities，不要使用外部知識。",
          "每筆結果的 entities 必須是該筆 title 或 snippet 中明確出現、或語意上直接指向的 SEO 重要詞。",
          "entity 應包含品牌、產品、服務、功能、需求、比較條件、價格/方案、地點、受眾、重要概念。",
          "請先全域比對所有 SERP 結果，再輸出標準化後的 canonical entity name。",
          "相同或高度相近的概念必須合併成同一個 entity name，且在所有結果中使用完全相同的寫法。",
          "entity name 請使用短名詞或短詞，不要直接複製很長的 title/snippet 片段。",
          "不要把價格、規格、合約、優惠、限制條件全部塞進同一個 entity；應拆成較穩定的 entity，例如 品牌、產品/服務類型、價格條件、規格條件、合約條件。",
          "標準化規則適用任何關鍵字，不要因為範例而輸出 title/snippet 中不存在的 entity。",
          "同一概念若只是差在空白、標點、方案/專案/資費/推薦/比較等修飾詞，應合併成同一個短 entity。",
          "若一個長詞同時包含核心產品與條件，請拆開。例如「A產品最低599元方案」應拆成「A產品」與「599 元」。",
          "價格類 entity 請統一成「599 元」、「月租 599 元」、「每月 599 元」這類一致格式；規格類 entity 也請統一單位格式。",
          "不要抽太泛的詞，例如 文章、推薦、最新、完整、介紹，除非它是搜尋意圖的核心。",
          "每筆結果建議保留 3 到 8 個最重要 entities，避免輸出大量細碎、重複、只差修飾語的 entities。",
          "group 請使用繁體中文短分類，例如 品牌、產品類型、方案特色、價格條件、速度條件、合約條件、通路平台、優惠、其他。"
        ].join("\n")
      },
      {
        role: "user",
        content: JSON.stringify({
          keyword: keyword,
          serp_results: results.map(result => {
            return {
              rank: result.rank,
              title: result.title,
              snippet: result.snippet
            };
          })
        })
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "serp_entity_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["results"],
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["rank", "entities"],
                properties: {
                  rank: {
                    type: "integer"
                  },
                  entities: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["name", "group"],
                      properties: {
                        name: {
                          type: "string"
                        },
                        group: {
                          type: "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + apiKey,
      "HTTP-Referer": "https://seo-serp-entity-analyzer.vercel.app",
      "X-OpenRouter-Title": "SEO SERP Entity Analyzer"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const statusCode = response.getResponseCode();
  const body = response.getContentText();

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error("OpenRouter 分析失敗，status=" + statusCode + "，message=" + body);
  }

  const data = JSON.parse(body);
  const content = data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (!content) {
    throw new Error("OpenRouter 回傳內容為空");
  }

  return JSON.parse(content);
}

function buildEntitiesByRank(results) {
  const entitiesByRank = {};

  results.forEach(result => {
    const seen = {};
    const records = [];

    (result.entities || []).forEach(entity => {
      const name = normalizeEntityName(entity.name);
      const group = normalizeEntityName(entity.group) || "其他";

      if (!name || seen[name]) {
        return;
      }

      seen[name] = true;
      records.push({
        name: name,
        group: group
      });
    });

    entitiesByRank[result.rank] = records;
  });

  return entitiesByRank;
}

function normalizeEntityName(value) {
  return (value || "")
    .toString()
    .replace(/\s+/g, " ")
    .replace(/臺灣/g, "台灣")
    .replace(/(\d+)\s*元/g, "$1 元")
    .replace(/(\d+)\s*GB/g, "$1GB")
    .replace(/(\d+)\s*Mbps/gi, "$1Mbps")
    .replace(/(方案|專案|資費)$/g, "")
    .trim();
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
    if (!entityCountMap[entity.name]) {
      entityCountMap[entity.name] = 0;
    }

    entityCountMap[entity.name]++;
  });

  const sortedEntities = Object.entries(entityCountMap)
    .sort((a, b) => b[1] - a[1]);

  sortedEntities.forEach(([entity, count]) => {
    summarySheet.appendRow([entity, count]);
  });
}

function writeEntityGroups(spreadsheet, allEntities) {
  const groupSheet = getOrCreateSheet(spreadsheet, "Entity Groups");

  groupSheet.clearContents();
  groupSheet.appendRow(["group", "entity", "count"]);

  const entityMap = {};

  allEntities.forEach(entity => {
    if (!entityMap[entity.name]) {
      entityMap[entity.name] = {
        group: entity.group || "其他",
        count: 0
      };
    }

    entityMap[entity.name].count++;
  });

  const rows = Object.entries(entityMap)
    .map(([entity, data]) => {
      return [data.group, entity, data.count];
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
  const groupSummarySheet = getOrCreateSheet(spreadsheet, "Group Summary");

  groupSummarySheet.clearContents();
  groupSummarySheet.appendRow(["group", "total_count"]);

  const groupCountMap = {};

  allEntities.forEach(entity => {
    const group = entity.group || "其他";

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
  const keyword = (e && e.parameter ? e.parameter.keyword : "")
    .toString()
    .trim();

  if (!keyword) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: "Missing keyword"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const result = searchGoogleToSheet(keyword);

    return ContentService
      .createTextOutput(JSON.stringify({
        status: "success",
        message: "SERP analysis completed",
        keyword: result.keyword,
        result_count: result.resultCount,
        entity_count: result.entityCount
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: "error",
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
      .setOption("width", 900)
      .setOption("height", 500)
      .setOption("fontSize", 14)
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
      .setOption("width", 900)
      .setOption("height", 500)
      .setOption("fontSize", 14)
      .build();

    groupSummarySheet.insertChart(groupChart);
  }
}
