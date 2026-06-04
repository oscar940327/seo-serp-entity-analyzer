const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvkCkeFzTGMV62fddOf2oWY4fXeoKyK1JfagwEaphbnSGSv0lWmTuy-s0gPgyq1tDd8Q/exec";

const keywordInput = document.getElementById("keywordInput");
const runButton = document.getElementById("runButton");
const statusText = document.getElementById("status");

async function runAnalysis() {
  const keyword = keywordInput.value.trim();

  if (!keyword) {
    statusText.textContent = "請先輸入關鍵字";
    return;
  }

  statusText.textContent = "正在分析「" + keyword + "」...";
  runButton.disabled = true;

  try {
    const url = APPS_SCRIPT_URL + "?keyword=" + encodeURIComponent(keyword);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "error") {
      statusText.textContent = "分析失敗：" + (data.message || "未知錯誤");
      return;
    }

    statusText.textContent =
      "分析完成，共取得 " +
      (data.result_count || 0) +
      " 筆 SERP 結果，抽取 " +
      (data.entity_count || 0) +
      " 個 entities。";
  } catch (error) {
    console.error(error);
    statusText.textContent = "分析失敗，請查看瀏覽器 Console 或 Apps Script Logs。";
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runAnalysis);

keywordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    runAnalysis();
  }
});
