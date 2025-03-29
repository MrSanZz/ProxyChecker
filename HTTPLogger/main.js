// Variabel penampung data log (setelah difilter)
let currentLogs = [];

// Variabel filter
let includePattern = "";
let excludePattern = "";

// Ambil elemen-elemen
const includeInput = document.getElementById("includePattern");
const excludeInput = document.getElementById("excludePattern");
const logTableBody = document.querySelector("#logTable tbody");

const requestDetailsEl = document.getElementById("requestDetails");
const responseDetailsEl = document.getElementById("responseDetails");

// --- Event binding ---
document.getElementById("applyFilter").addEventListener("click", () => {
  includePattern = includeInput.value.trim();
  excludePattern = excludeInput.value.trim();
  fetchLogs();
});

document.getElementById("clearFilter").addEventListener("click", () => {
  includePattern = "";
  excludePattern = "";
  includeInput.value = "";
  excludeInput.value = "";
  fetchLogs();
});

document.getElementById("deleteSelected").addEventListener("click", () => {
  deleteSelectedLogs();
});

document.getElementById("clearLogs").addEventListener("click", () => {
  if (confirm("Are you sure to delete all logs?")) {
    chrome.runtime.sendMessage({ action: "clearLogs" }, (response) => {
      fetchLogs();
    });
  }
});

document.querySelectorAll(".tab-button").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab-content").forEach(tab => tab.classList.add("hidden"));
    document.getElementById(button.dataset.tab + "Tab").classList.remove("hidden");
  });
});

// --- Fungsi ambil data dari background ---
function fetchLogs() {
  chrome.runtime.sendMessage({ action: "getLogs" }, (response) => {
    if (response && response.logs) {
      // Lakukan filtering
      let logs = response.logs;

      if (includePattern) {
        logs = logs.filter(log => matchPattern(log.url, includePattern));
      }
      if (excludePattern) {
        logs = logs.filter(log => !matchPattern(log.url, excludePattern));
      }

      // Simpan ke currentLogs
      currentLogs = logs;
      renderTable(logs);
    }
  });
}

// Fungsi bantu untuk mencocokkan pattern sederhana (misal "*google*")
function matchPattern(url, pattern) {
  // Ubah pattern "*google*" menjadi regex ".*google.*"
  const regexString = pattern.replace(/\*/g, ".*");
  const regex = new RegExp(regexString, "i");
  return regex.test(url);
}

// Fungsi render tabel log
function renderTable(logs) {
  logTableBody.innerHTML = "";
  logs.forEach(log => {
    const row = document.createElement("tr");

    // Checkbox
    const selectTd = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.requestId = log.requestId;
    selectTd.appendChild(checkbox);
    row.appendChild(selectTd);

    // Method
    const methodTd = document.createElement("td");
    methodTd.textContent = log.method;
    row.appendChild(methodTd);

    // URL
    const urlTd = document.createElement("td");
    urlTd.textContent = log.url;
    row.appendChild(urlTd);

    // Status
    const statusTd = document.createElement("td");
    statusTd.textContent = log.statusCode || "-";
    row.appendChild(statusTd);

    // Type
    const typeTd = document.createElement("td");
    typeTd.textContent = log.type;
    row.appendChild(typeTd);

    // IP (Pastikan diambil dari log yang sudah diperbarui di background.js)
    const ipTd = document.createElement("td");
    ipTd.textContent = log.ip !== "-" ? log.ip : "(No IP)";
    row.appendChild(ipTd);

    // Time
    const timeTd = document.createElement("td");
    const date = new Date(log.timeStamp);
    timeTd.textContent = date.toLocaleTimeString() + " " + date.toLocaleDateString();
    row.appendChild(timeTd);

    // Event click row -> Tampilkan detail
    row.addEventListener("click", () => {
      showDetails(log);
    });

    logTableBody.appendChild(row);
  });
}

// Perbaikan untuk menampilkan body dalam details
function showDetails(log) {
  const reqHeaders = log.requestHeaders || [];
  const reqHeadersStr = reqHeaders.map(h => `${h.name}: ${h.value}`).join("\n");
  const requestBody = log.requestBody && log.requestBody.trim() !== "" ? log.requestBody : "(No Request Body)";

  const requestInfo = `
Request ID: ${log.requestId}
Method: ${log.method}
URL: ${log.url}
Type: ${log.type}
IP: ${log.ip !== "-" ? log.ip : "(No IP)"}

Headers:
${reqHeadersStr}

Body:
${requestBody}
`;
  requestDetailsEl.textContent = requestInfo;

  // Response Headers
  const resHeaders = log.responseHeaders || [];
  const resHeadersStr = resHeaders.map(h => `${h.name}: ${h.value}`).join("\n");
  const responseBody = log.responseBody && log.responseBody.trim() !== "" ? log.responseBody : "(No Response Body)";

  const responseInfo = `
Status Code: ${log.statusCode || '-'}

Headers:
${resHeadersStr}

Body:
${responseBody}
`;
  responseDetailsEl.textContent = responseInfo;
}

// Hapus log terpilih
function deleteSelectedLogs() {
  const checkboxes = logTableBody.querySelectorAll("input[type='checkbox']:checked");
  const idsToDelete = Array.from(checkboxes).map(cb => cb.dataset.requestId);

  idsToDelete.forEach(requestId => {
    chrome.runtime.sendMessage({ action: "deleteLog", requestId }, () => {
      // setelah delete, refresh
      fetchLogs();
    });
  });
}

document.getElementById("sendRequest").addEventListener("click", async () => {
  const url = document.getElementById("requestUrl").value;
  const method = document.getElementById("requestMethod").value;
  const headersInput = document.getElementById("requestHeaders").value;
  const bodyInput = document.getElementById("requestBody").value;

  let headers = new Headers();
  let body = null;

  // Pisahkan header dengan format: "Key: Value"
  if (headersInput.trim() !== "") {
    headersInput.split("\n").forEach(header => {
      let [key, value] = header.split(":").map(item => item.trim());
      if (key && value) {
        headers.append(key, value);
      }
    });
  }

  // Body tetap sebagai string untuk POST/PUT
  if (bodyInput && method !== "GET") {
    body = bodyInput;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? body : null,
    });
  
    let resHeadersStr = "";
    response.headers.forEach((value, key) => {
      resHeadersStr += `${key}: ${value}\n`;
    });
  
    const result = await response.text();
  
    // Buka popup dan tampilkan response seperti view-source
    const popup = window.open("", "ResponseWindow", "width=800,height=600");
    popup.document.write(`<pre>${resHeadersStr}\n\n${result}</pre>`);
    popup.document.close();
  } catch (error) {
    alert("Failed to send request: " + error.message);
  }
});

// Ambil log pertama kali
fetchLogs();