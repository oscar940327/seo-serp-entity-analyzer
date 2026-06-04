const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvkCkeFzTGMV62fddOf2oWY4fXeoKyK1JfagwEaphbnSGSv0lWmTuy-s0gPgyq1tDd8Q/exec";
const LOGIN_USERNAME = "admin";
const LOGIN_PASSWORD = "123456";
const LOGIN_STORAGE_KEY = "seoSerpAnalyzerLoggedIn";

const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const loginStatus = document.getElementById("loginStatus");
const userLabel = document.getElementById("userLabel");
const keywordInput = document.getElementById("keywordInput");
const runButton = document.getElementById("runButton");
const statusText = document.getElementById("status");

function isLoggedIn() {
  return localStorage.getItem(LOGIN_STORAGE_KEY) === "true";
}

function updateAuthView() {
  if (isLoggedIn()) {
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userLabel.textContent = "已登入：" + LOGIN_USERNAME;
    keywordInput.focus();
    return;
  }

  loginSection.classList.remove("hidden");
  appSection.classList.add("hidden");
  userLabel.textContent = "";
  statusText.textContent = "";
  usernameInput.focus();
}

function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    localStorage.setItem(LOGIN_STORAGE_KEY, "true");
    loginStatus.textContent = "";
    passwordInput.value = "";
    updateAuthView();
    return;
  }

  loginStatus.textContent = "帳號或密碼錯誤";
}

function logout() {
  localStorage.removeItem(LOGIN_STORAGE_KEY);
  keywordInput.value = "";
  statusText.textContent = "";
  updateAuthView();
}

async function runAnalysis() {
  if (!isLoggedIn()) {
    updateAuthView();
    return;
  }

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

loginButton.addEventListener("click", login);
logoutButton.addEventListener("click", logout);
runButton.addEventListener("click", runAnalysis);

passwordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    login();
  }
});

keywordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    runAnalysis();
  }
});

updateAuthView();
