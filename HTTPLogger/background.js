let requestLogs = [];

function extractMultipartBody(rawBytes, headers) {
  try {
    const decoder = new TextDecoder("utf-8");
    const bodyText = decoder.decode(rawBytes);

    const boundaryHeader = headers.find(h => h.name.toLowerCase() === "content-type");
    const boundary = boundaryHeader && boundaryHeader.value.split("boundary=")[1];

    if (!boundary) return bodyText;

    // Split dengan boundary dan bersihkan
    const parts = bodyText.split(`--${boundary}`).filter(p => p.trim() && !p.includes('--'));
    const parsed = parts.map(part => {
      const [headerPart, ...bodyParts] = part.split("\r\n\r\n");
      const nameMatch = headerPart.match(/name="([^"]+)"/);
      const filenameMatch = headerPart.match(/filename="([^"]+)"/);
      return {
        name: nameMatch ? nameMatch[1] : "unknown",
        filename: filenameMatch ? filenameMatch[1] : null,
        content: bodyParts.join("\r\n\r\n").trim()
      };
    });

    return parsed;
  } catch (e) {
    return "(Failed to decode multipart)";
  }
}

function onBeforeRequestListener(details) {
  const { method, url, requestId, timeStamp, type, ip, requestBody } = details;

  let body = "(No Body)";
  if (requestBody) {
    if (requestBody.raw && requestBody.raw.length > 0) {
      const headers = details.requestHeaders || [];
      body = extractMultipartBody(requestBody.raw[0].bytes, headers);
    } else if (requestBody.formData) {
      body = JSON.stringify(requestBody.formData);
    }
  }

  if (requestBody && requestBody.raw && requestBody.raw.length > 0) {
    try {
      const decoder = new TextDecoder("utf-8");
      body = decoder.decode(requestBody.raw[0].bytes);
    } catch (e) {
      body = "(Error decoding body)";
    }
  }

  const logEntry = {
    requestId,
    method,
    url,
    type,
    ip: ip || "N/A",
    timeStamp,
    requestBody: body,
  };

  requestLogs.push(logEntry);
}

function onCompletedListener(details) {
  const { requestId, statusCode } = details;
  const idx = requestLogs.findIndex(item => item.requestId === requestId);
  if (idx !== -1) {
    requestLogs[idx].statusCode = statusCode;
  }
}

function onSendHeadersListener(details) {
  const { requestId, requestHeaders } = details;
  const idx = requestLogs.findIndex(item => item.requestId === requestId);
  if (idx !== -1) {
    requestLogs[idx].requestHeaders = requestHeaders;
  }
}

function onHeadersReceivedListener(details) {
  const { requestId, responseHeaders } = details;
  const idx = requestLogs.findIndex(item => item.requestId === requestId);
  if (idx !== -1) {
    requestLogs[idx].responseHeaders = responseHeaders;
  }
}

chrome.webRequest.onBeforeRequest.addListener(
  onBeforeRequestListener,
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

chrome.webRequest.onCompleted.addListener(
  onCompletedListener,
  { urls: ["<all_urls>"] }
);

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

// Pesan dari UI atau inject.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getLogs") {
    sendResponse({ logs: requestLogs });
  } else if (message.action === "clearLogs") {
    requestLogs = [];
    sendResponse({ success: true });
  } else if (message.action === "deleteLog") {
    requestLogs = requestLogs.filter(log => log.requestId !== message.requestId);
    sendResponse({ success: true });
  } else if (message.action === "logResponse") {
    const idx = requestLogs.findIndex(log => log.url === message.url && !log.responseBody);
    if (idx !== -1) {
      requestLogs[idx].responseBody = message.body;
    } else {
      // Jika tidak ada match, tetap simpan
      requestLogs.push({
        url: message.url,
        responseBody: message.body
      });
    }
    sendResponse({ success: true });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("main.html") });
});
