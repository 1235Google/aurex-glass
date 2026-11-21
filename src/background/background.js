chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.local.get(["aurexSettings"], (res) => {
      if (!res.aurexSettings) {
        chrome.storage.local.set({ aurexInstalledAt: Date.now() });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "OPEN_SETTINGS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }
  if (msg && msg.type === "OPEN_NEWTAB") {
    chrome.tabs.create({ url: "chrome://newtab" });
    sendResponse({ ok: true });
    return true;
  }
  return false;
});
