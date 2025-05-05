chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "setProxy") {
        let [ip, port] = message.proxy.split(":");
        chrome.proxy.settings.set(
            {
                value: {
                    mode: "fixed_servers",
                    rules: {
                        singleProxy: { scheme: "http", host: ip, port: parseInt(port) }
                    }
                },
                scope: "regular"
            },
            () => {
                console.log("Proxy applied:", message.proxy);
                sendResponse({ status: "ok" });
            }
        );
        return true; // Diperlukan agar `sendResponse` async tetap valid
    }

    if (message.action === "clearProxy") {
        chrome.proxy.settings.clear({}, () => {
            console.log("Proxy cleared");
            sendResponse({ status: "cleared" });
        });
        return true;
    }
});
