// ST Lanka Smart Price Scraper - Background Service Worker

// Update toolbar badge
function updateBadge(count) {
  if (typeof chrome !== 'undefined' && chrome.action) {
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
}

// Initial badge update on install or update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ scraperList: [] }, (result) => {
    updateBadge(result.scraperList ? result.scraperList.length : 0);
  });
});

// Update badge when browser starts up
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get({ scraperList: [] }, (result) => {
    updateBadge(result.scraperList ? result.scraperList.length : 0);
  });
});

// Watch for storage changes and update badge automatically
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.scraperList) {
    const newList = changes.scraperList.newValue || [];
    updateBadge(newList.length);
  }
});

// Handle messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateBadgeCount") {
    updateBadge(request.count || 0);
    sendResponse({ status: "success" });
  }
  return true;
});
