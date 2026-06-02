const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUTMGdUw-z2njptvrVeyo99jte7nLkUl9Va7SuiD_3fsIQKMewCuRhTtqgDqZMGURXrA/exec";

const keywordInput = document.getElementById("keywordInput");
const runButton = document.getElementById("runButton");
const statusText = document.getElementById("status");

runButton.addEventListener("click", async () => {
  const keyword = keywordInput.value.trim();

  if (!keyword) {
    statusText.textContent = "請先輸入關鍵字";
    return;
  }

  statusText.textContent = "Running analysis...";
  runButton.disabled = true;

  try {
    const url = APPS_SCRIPT_URL + "?keyword=" + encodeURIComponent(keyword);

    const response = await fetch(url);
    const data = await response.json();

    statusText.textContent = data.message || "Analysis completed.";
  } catch (error) {
    console.error(error);
    statusText.textContent = "Failed to run analysis.";
  } finally {
    runButton.disabled = false;
  }
});