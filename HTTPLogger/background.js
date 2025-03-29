// Penampung sementara. Pertimbangkan chrome.storage untuk lebih permanen.
let requestLogs = [];

// Fungsi mencatat request
function onBeforeRequestListener(details) {
  const { method, url, requestId, timeStamp, type, ip } = details;

  // Buat object log
  const logEntry = {
    requestId,
    method,
    url,
    type,
    ip: ip || "N/A",
    timeStamp,
    // Bisa tambah field custom lain (misal protocol, cookies, dsb.)
  };

  requestLogs.push(logEntry);
}

// Fungsi mencatat status code (onCompleted)
function onCompletedListener(details) {
  const { requestId, statusCode } = details;
  const idx = requestLogs.findIndex(item => item.requestId === requestId);
  if (idx !== -1) {
    requestLogs[idx].statusCode = statusCode;
  }
}

// Fungsi mencatat header request (opsional)
function onSendHeadersListener(details) {
  const { requestId, requestHeaders } = details;
  const idx = requestLogs.findIndex(item => item.requestId === requestId);
  if (idx !== -1) {
    requestLogs[idx].requestHeaders = requestHeaders;
  }
}

// Fungsi mencatat header response (opsional)
function onHeadersReceivedListener(details) {
  const { requestId, responseHeaders } = details;
  const idx = requestLogs.findIndex(item => item.requestId === requestId);
  if (idx !== -1) {
    requestLogs[idx].responseHeaders = responseHeaders;
  }
}

// Pasang listener
chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequestListener,
  { urls: ["<all_urls>"] },
  []
);

chrome.webRequest.onCompleted.addListener(
  onCompletedListener,
  { urls: ["<all_urls>"] }
);

// Jika Anda butuh header, tambahkan:
chrome.webRequest.onSendHeaders.addListener(
  onSendHeadersListener,
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

chrome.webRequest.onHeadersReceived.addListener(
  onHeadersReceivedListener,
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Listener pesan dari main.js (minta data log, hapus log, dll.)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getLogs") {
    sendResponse({ logs: requestLogs });
  } else if (message.action === "clearLogs") {
    requestLogs = [];
    sendResponse({ success: true });
  } else if (message.action === "deleteLog") {
    // Hapus log tertentu, misalnya by requestId
    requestLogs = requestLogs.filter(log => log.requestId !== message.requestId);
    sendResponse({ success: true });
  }
});

// Buka main.html di tab baru saat ikon diklik
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("main.html") });
});

// Tambahkan content script untuk menangkap response body
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "logResponse") {
    requestLogs.push({
      url: message.url,
      responseBody: message.body
    });
  }
  sendResponse({ success: true });
});
