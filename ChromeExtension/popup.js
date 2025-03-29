document.addEventListener("DOMContentLoaded", () => {
    loadProxies();

    document.getElementById("startProxy").addEventListener("click", () => {
        let proxy = document.getElementById("proxyInput").value;
        if (!proxy) return alert("Enter a valid IP:PORT");
        chrome.storage.local.set({ lastProxy: proxy }, () => {
            chrome.runtime.sendMessage({ action: "setProxy", proxy: proxy });
        });
    });

    document.getElementById("stopProxy").addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "clearProxy" });
    });

    document.getElementById("addProxy").addEventListener("click", () => {
        document.getElementById("proxyForm").classList.toggle("hidden");
    });

    document.getElementById("saveProxy").addEventListener("click", saveProxy);
});

function saveProxy() {
    let title = document.getElementById("titleInput").value.trim();
    let ip = document.getElementById("ipInput").value.trim();
    let port = document.getElementById("portInput").value.trim();
    let user = document.getElementById("userInput").value.trim();
    let pass = document.getElementById("passInput").value.trim();

    if (!ip || !port) {
        alert("IP and Port are required!");
        return;
    }

    let newProxy = { title: title || `${ip}:${port}`, ip, port, user, pass };

    chrome.storage.local.get("proxies", (data) => {
        let proxies = data.proxies || [];
        proxies.push(newProxy);
        chrome.storage.local.set({ proxies }, () => {
            document.getElementById("proxyForm").classList.add("hidden");
            loadProxies();
        });
    });
}

function loadProxies() {
    let proxyList = document.getElementById("proxyList");
    proxyList.innerHTML = "";

    chrome.storage.local.get("proxies", (data) => {
        let proxies = data.proxies || [];
        proxies.forEach((proxy, index) => {
            let proxyItem = document.createElement("div");
            proxyItem.className = "proxy-item";
            proxyItem.innerHTML = `
                <span>${proxy.title}</span>
                <div class="button-group">
                    <span class="edit-btn">✏️</span>
                    <span class="del-btn">❌</span>
                </div>
            `;

            proxyItem.addEventListener("click", () => {
                document.getElementById("proxyInput").value = `${proxy.ip}:${proxy.port}`;
            });

            proxyItem.querySelector(".edit-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                document.getElementById("titleInput").value = proxy.title;
                document.getElementById("ipInput").value = proxy.ip;
                document.getElementById("portInput").value = proxy.port;
                document.getElementById("userInput").value = proxy.user;
                document.getElementById("passInput").value = proxy.pass;
                document.getElementById("proxyForm").classList.remove("hidden");
                deleteProxy(index);
            });

            proxyItem.querySelector(".del-btn").addEventListener("click", (e) => {
                e.stopPropagation();
                deleteProxy(index);
            });

            proxyList.appendChild(proxyItem);
        });
    });

    chrome.storage.local.get("lastProxy", (data) => {
        if (data.lastProxy) {
            document.getElementById("proxyInput").value = data.lastProxy;
        }
    });
}

function deleteProxy(index) {
    chrome.storage.local.get("proxies", (data) => {
        let proxies = data.proxies || [];
        proxies.splice(index, 1);
        chrome.storage.local.set({ proxies }, loadProxies);
    });
}
