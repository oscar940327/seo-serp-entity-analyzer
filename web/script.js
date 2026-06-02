const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUTMGdUw-z2njptvrVeyo99jte7nLkUl9Va7SuiD_3fsIQKMewCuRhTtqgDqZMGURXrA/exec";

const runButton = document.getElementById("runButton");
const statusText = document.getElementById("status");

runButton.addEventListener("click", async () => {
  statusText.textContent = "Running analysis...";
  runButton.disabled = true;

  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const data = await response.json();

    statusText.textContent = data.message || "Analysis completed.";
  } catch (error) {
    console.error(error);
    statusText.textContent = "Failed to run analysis.";
  } finally {
    runButton.disabled = false;
  }
});