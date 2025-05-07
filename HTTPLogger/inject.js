(function () {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      const clone = response.clone();
  
      clone.text().then(body => {
        chrome.runtime.sendMessage({
          action: "logResponse",
          url: clone.url,
          body: body
        });
      }).catch(() => {}); // optional ignore
  
      return response;
    };
  
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      this._url = url;
      return originalOpen.apply(this, arguments);
    };
  
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (body) {
      this.addEventListener("load", function () {
        chrome.runtime.sendMessage({
          action: "logResponse",
          url: this._url,
          body: this.responseText
        });
      });
      return originalSend.apply(this, arguments);
    };
  })();
  
