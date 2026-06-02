const APPS_SCRIPT_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL";

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
    statusText.textContent = "Failed to run analysis.";
    console.error(error);
  } finally {
    runButton.disabled = false;
  }
});