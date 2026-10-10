// ST Lanka Smart Price Scraper - Popup Controller Script

document.addEventListener("DOMContentLoaded", async () => {
  // DOM Elements - Tabs
  const tabScrape = document.getElementById("tab-btn-scrape");
  const tabQueue = document.getElementById("tab-btn-queue");
  const tabExport = document.getElementById("tab-btn-export");

  const viewScrape = document.getElementById("view-scrape");
  const viewQueue = document.getElementById("view-queue");
  const viewExport = document.getElementById("view-export");

  // DOM Elements - Scrape View
  const storeBadge = document.getElementById("store-badge");
  const prodImg = document.getElementById("prod-img");
  const stockBadge = document.getElementById("stock-badge");
  const discountBadge = document.getElementById("discount-badge");
  const prodTitleInput = document.getElementById("prod-title");
  const prodPriceInput = document.getElementById("prod-price");
  const pickTitleBtn = document.getElementById("pick-title-btn");
  const pickPriceBtn = document.getElementById("pick-price-btn");
  const redetectBtn = document.getElementById("redetect-btn");
  const addToListBtn = document.getElementById("add-to-list");
  const quickExportBtn = document.getElementById("quick-export");

  // DOM Elements - Queue View
  const summaryCountVal = document.getElementById("summary-count-val");
  const summaryPriceVal = document.getElementById("summary-price-val");
  const queueSearch = document.getElementById("queue-search");
  const queueListContainer = document.getElementById("queue-list");
  const clearQueueBtn = document.getElementById("clear-queue");

  // DOM Elements - Export View
  const exportCsvCard = document.getElementById("export-csv-card");
  const exportJsonCard = document.getElementById("export-json-card");
  const exportCopyCard = document.getElementById("export-copy-card");
  const autoClearCheck = document.getElementById("auto-clear-check");

  // DOM Elements - General
  const queueBadge = document.getElementById("queue-badge");
  const statusMsg = document.getElementById("status-msg");
  const popupToast = document.getElementById("popup-toast");

  let currentScrapedData = null;
  let activeTabId = null;
  let activeTabUrl = null;

  // --- Inline Toast Helper ---
  function showToast(message, type = "info") {
    if (!popupToast) return;
    popupToast.className = type;
    popupToast.innerText = message;
    popupToast.style.display = "block";

    setTimeout(() => {
      popupToast.style.display = "none";
    }, 2800);
  }

  // --- Tab Navigation Logic ---
  function switchTab(activeTabBtn, activeViewDiv) {
    [tabScrape, tabQueue, tabExport].forEach(btn => btn.classList.remove("active"));
    [viewScrape, viewQueue, viewExport].forEach(v => v.style.display = "none");

    activeTabBtn.classList.add("active");
    activeViewDiv.style.display = "block";

    if (activeViewDiv === viewQueue) {
      loadQueueData(queueSearch ? queueSearch.value : "");
    }
  }

  tabScrape.addEventListener("click", () => switchTab(tabScrape, viewScrape));
  tabQueue.addEventListener("click", () => switchTab(tabQueue, viewQueue));
  tabExport.addEventListener("click", () => switchTab(tabExport, viewExport));

  // --- Price Utilities ---
  // Safely extract numeric value without the 'Rs.' dot bug (where Rs. 25,000 becomes 0.25)
  function extractNumericPrice(priceStr) {
    if (!priceStr) return 0;
    const match = priceStr.match(/([0-9][0-9,]*(\.[0-9]+)?)/);
    if (!match) return 0;
    const numStr = match[1].replace(/,/g, '');
    const val = parseFloat(numStr);
    return isNaN(val) ? 0 : val;
  }

  function formatMoney(amount) {
    return "LKR " + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Flash highlight input when value changes
  function flashInput(inputElement) {
    if (!inputElement) return;
    inputElement.classList.add("flash-highlight");
    setTimeout(() => inputElement.classList.remove("flash-highlight"), 1200);
  }

  // --- Storage & Queue Sync ---
  function updateBadgeAndCount(count) {
    if (queueBadge) queueBadge.innerText = count;
    if (statusMsg) statusMsg.innerText = `${count} item${count === 1 ? '' : 's'} in queue`;
    
    // Send message to background service worker to sync toolbar icon badge
    try {
      chrome.runtime.sendMessage({ action: "updateBadgeCount", count: count });
    } catch (e) {}
  }

  function loadQueueData(searchTerm = "") {
    chrome.storage.local.get({ scraperList: [] }, (result) => {
      let list = result.scraperList || [];
      updateBadgeAndCount(list.length);

      // Accurately calculate total accumulated price
      let totalSum = 0;
      list.forEach(item => {
        let p = item.numericPrice !== undefined ? item.numericPrice : extractNumericPrice(item.price);
        totalSum += p;
      });

      if (summaryCountVal) summaryCountVal.innerText = `${list.length} Product${list.length === 1 ? '' : 's'}`;
      if (summaryPriceVal) summaryPriceVal.innerText = formatMoney(totalSum);

      // Filter items if search term is active
      let filtered = list;
      if (searchTerm && searchTerm.trim() !== "") {
        let term = searchTerm.toLowerCase();
        filtered = list.filter(item => 
          (item.title || "").toLowerCase().includes(term) ||
          (item.store || "").toLowerCase().includes(term) ||
          (item.price || "").toLowerCase().includes(term)
        );
      }

      renderQueueList(filtered);
    });
  }

  function renderQueueList(items) {
    if (!queueListContainer) return;
    queueListContainer.innerHTML = "";

    if (items.length === 0) {
      queueListContainer.innerHTML = `
        <div class="empty-state">
          📦 Your queue is empty.<br>Browse any shopping page and click <b>➕ Add to Excel Queue</b>!
        </div>
      `;
      return;
    }

    items.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "queue-item-card";

      const title = item.title || "Product Title";
      const price = item.price || "N/A";
      const store = item.store || "Web";
      const image = item.image || "icons/icon128.png";
      const url = item.url || "#";

      card.innerHTML = `
        <img class="item-thumb" src="${image}" onerror="this.src='icons/icon128.png'">
        <div class="item-details">
          <a class="item-title" href="${url}" target="_blank" title="${title}">${title}</a>
          <div class="item-price">${price}</div>
          <div class="item-store">🏬 ${store}</div>
        </div>
        <button class="btn-delete-item" data-index="${index}" title="Remove Item">🗑️</button>
      `;

      queueListContainer.appendChild(card);
    });

    // Delete item listeners
    const deleteBtns = queueListContainer.querySelectorAll(".btn-delete-item");
    deleteBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        let idxToDelete = parseInt(e.currentTarget.getAttribute("data-index"));
        deleteQueueItem(idxToDelete);
      });
    });
  }

  function deleteQueueItem(index) {
    chrome.storage.local.get({ scraperList: [] }, (result) => {
      let list = result.scraperList || [];
      if (index >= 0 && index < list.length) {
        list.splice(index, 1);
        chrome.storage.local.set({ scraperList: list }, () => {
          loadQueueData(queueSearch ? queueSearch.value : "");
          showToast("Item removed from queue.", "info");
        });
      }
    });
  }

  // --- Apply Scraped Data to UI ---
  function applyScrapedData(data) {
    currentScrapedData = data;
    prodTitleInput.value = data.title || "";
    prodPriceInput.value = data.price || "";
    storeBadge.innerText = data.store || "Shopping Site";

    if (data.image) {
      prodImg.src = data.image;
    }

    // Stock Badge
    stockBadge.innerText = data.stock || "In Stock";
    if (data.stock === "Out of Stock") {
      stockBadge.classList.add("out-of-stock");
    } else {
      stockBadge.classList.remove("out-of-stock");
    }

    // Discount Badge
    if (data.discount) {
      discountBadge.innerText = data.discount;
      discountBadge.style.display = "inline-block";
    } else {
      discountBadge.style.display = "none";
    }

    addToListBtn.disabled = false;
    quickExportBtn.disabled = false;
  }

  // --- Scan Active Tab with Dynamic Injection Fallback ---
  async function fetchTabProductData() {
    try {
      let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      activeTabId = tab.id;
      activeTabUrl = tab.url;

      // Disallow scraping on internal browser pages
      if (tab.url && (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.startsWith("chrome-extension://"))) {
        prodTitleInput.value = "Internal browser page (open an online shop)";
        prodPriceInput.value = "N/A";
        storeBadge.innerText = "Browser Page";
        addToListBtn.disabled = true;
        quickExportBtn.disabled = true;
        return;
      }

      // Try sending message to existing content script
      chrome.tabs.sendMessage(tab.id, { action: "getUniversalData" }, async (response) => {
        if (chrome.runtime.lastError || !response) {
          // Content script not loaded yet (e.g. tab opened before extension installed/reloaded)
          // Dynamically inject content.js using scripting API
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
            });

            // Wait a brief tick and retry message
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "getUniversalData" }, (retryResponse) => {
                if (retryResponse) {
                  applyScrapedData(retryResponse);
                  checkLastPickedOverride();
                } else {
                  prodTitleInput.value = "Please refresh the page and try again.";
                  prodPriceInput.value = "N/A";
                }
              });
            }, 150);
          } catch (injectErr) {
            prodTitleInput.value = "Cannot access page. Please refresh.";
            prodPriceInput.value = "N/A";
          }
        } else {
          applyScrapedData(response);
          checkLastPickedOverride();
        }
      });
    } catch (err) {
      prodTitleInput.value = "Error connecting to webpage.";
    }
  }

  // --- Check if user picked an element with Picker Tool ---
  function checkLastPickedOverride() {
    chrome.storage.local.get(["lastPicked"], (result) => {
      const p = result.lastPicked;
      if (p && p.url === activeTabUrl && (Date.now() - p.timestamp < 300000)) {
        if (p.field === "title" && p.value) {
          prodTitleInput.value = p.value;
          flashInput(prodTitleInput);
          showToast(`🎯 Applied picked title: "${p.value.slice(0, 25)}..."`, "success");
        } else if (p.field === "price" && p.value) {
          prodPriceInput.value = p.value;
          flashInput(prodPriceInput);
          showToast(`🎯 Applied picked price: "${p.value}"`, "success");
        }
      }
    });
  }

  // Re-detect button
  redetectBtn.addEventListener("click", () => {
    redetectBtn.innerText = "⏳ Scanning...";
    fetchTabProductData().then(() => {
      setTimeout(() => redetectBtn.innerText = "🔄 Re-detect", 600);
      showToast("Page re-scanned successfully!", "info");
    });
  });

  // --- Element Picker Buttons ---
  pickTitleBtn.addEventListener("click", () => triggerPicker("title"));
  pickPriceBtn.addEventListener("click", () => triggerPicker("price"));

  function triggerPicker(field) {
    if (activeTabId) {
      chrome.tabs.sendMessage(activeTabId, { action: "startPicker", field: field }, () => {
        window.close(); // Close popup so user can click directly on the webpage element
      });
    }
  }

  // Runtime message listener (in case popup was kept open)
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "elementPicked") {
      if (msg.field === "title") {
        prodTitleInput.value = msg.value;
        flashInput(prodTitleInput);
      }
      if (msg.field === "price") {
        prodPriceInput.value = msg.value;
        flashInput(prodPriceInput);
      }
    }
  });

  // --- Add to Queue Handler ---
  addToListBtn.addEventListener("click", () => {
    let titleVal = prodTitleInput.value.trim();
    let priceVal = prodPriceInput.value.trim();

    if (!titleVal || titleVal.includes("Internal browser") || titleVal.includes("Please refresh") || titleVal.includes("Cannot access")) {
      showToast("No valid product data to add!", "error");
      return;
    }

    const numericPriceVal = extractNumericPrice(priceVal);

    const itemToAdd = {
      title: titleVal,
      price: priceVal,
      numericPrice: numericPriceVal,
      originalPrice: currentScrapedData?.originalPrice || "",
      discount: currentScrapedData?.discount || "",
      stock: currentScrapedData?.stock || stockBadge.innerText || "In Stock",
      store: currentScrapedData?.store || storeBadge.innerText || "Web Store",
      image: currentScrapedData?.image || prodImg.src,
      url: currentScrapedData?.url || activeTabUrl || "",
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    chrome.storage.local.get({ scraperList: [] }, (result) => {
      let list = result.scraperList || [];
      list.push(itemToAdd);

      chrome.storage.local.set({ scraperList: list }, () => {
        updateBadgeAndCount(list.length);
        addToListBtn.innerText = "✅ Added to Queue!";
        addToListBtn.style.background = "#10b981";
        showToast("Added to queue successfully!", "success");

        setTimeout(() => {
          addToListBtn.innerText = "➕ Add to Excel Queue";
          addToListBtn.style.background = "";
        }, 1500);
      });
    });
  });

  // --- Search Input Listener ---
  if (queueSearch) {
    queueSearch.addEventListener("input", (e) => {
      loadQueueData(e.target.value);
    });
  }

  // --- Clear Queue Handler ---
  clearQueueBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all items from your queue?")) {
      chrome.storage.local.set({ scraperList: [] }, () => {
        loadQueueData();
        showToast("Queue cleared.", "info");
      });
    }
  });

  // --- File Download Utility ---
  function triggerDownload(content, mimeType, filename, onComplete) {
    try {
      // Use Data URI for resilient downloading that won't fail if popup closes
      let dataUrl = `data:${mimeType};charset=utf-8,` + encodeURIComponent(content);

      if (chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError || downloadId === undefined) {
            // Fallback to programmatic link click
            fallbackLinkDownload(dataUrl, filename);
          }
          if (onComplete) onComplete(true);
        });
      } else {
        fallbackLinkDownload(dataUrl, filename);
        if (onComplete) onComplete(true);
      }
    } catch (err) {
      showToast("Download failed: " + err.message, "error");
      if (onComplete) onComplete(false);
    }
  }

  function fallbackLinkDownload(url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // --- EXPORT FUNCTIONS ---

  // 1. Export CSV
  function handleCsvExport() {
    chrome.storage.local.get({ scraperList: [] }, (result) => {
      let list = result.scraperList || [];

      // If queue is empty, but we have current product on screen, export current product directly
      if (list.length === 0 && prodTitleInput.value && !prodTitleInput.value.includes("Detecting")) {
        list = [{
          title: prodTitleInput.value,
          price: prodPriceInput.value,
          numericPrice: extractNumericPrice(prodPriceInput.value),
          originalPrice: currentScrapedData?.originalPrice || "",
          discount: currentScrapedData?.discount || "",
          stock: currentScrapedData?.stock || "In Stock",
          store: currentScrapedData?.store || storeBadge.innerText || "Web Store",
          url: currentScrapedData?.url || activeTabUrl || "",
          date: new Date().toLocaleDateString()
        }];
      } else if (list.length === 0) {
        showToast("Your queue is empty! Add products first.", "error");
        return;
      }

      // UTF-8 BOM (\ufeff) ensures Excel correctly displays Sinhala (රු.), LKR, accents, symbols
      let csvContent = "\ufeff";
      csvContent += "Product Title,Price,Price (Numeric LKR),Original Price,Discount,Stock Status,Store Name,Source URL,Date Scraped\n";

      list.forEach((row) => {
        let title = (row.title || "").replace(/"/g, '""');
        let price = (row.price || "").replace(/"/g, '""');
        let numPrice = row.numericPrice !== undefined ? row.numericPrice : extractNumericPrice(row.price);
        let origPrice = (row.originalPrice || "").replace(/"/g, '""');
        let discount = (row.discount || "").replace(/"/g, '""');
        let stock = (row.stock || "").replace(/"/g, '""');
        let store = (row.store || "").replace(/"/g, '""');
        let url = (row.url || "").replace(/"/g, '""');
        let date = (row.date || "").replace(/"/g, '""');

        csvContent += `"${title}","${price}","${numPrice}","${origPrice}","${discount}","${stock}","${store}","${url}","${date}"\n`;
      });

      let filename = "ST_Lanka_Price_Scrape_" + new Date().toISOString().slice(0, 10) + ".csv";

      triggerDownload(csvContent, "text/csv", filename, (success) => {
        if (success) {
          if (autoClearCheck && autoClearCheck.checked) {
            chrome.storage.local.set({ scraperList: [] }, () => {
              loadQueueData();
            });
          }
          showToast("Excel Sheet (.csv) exported successfully!", "success");
        }
      });
    });
  }

  quickExportBtn.addEventListener("click", handleCsvExport);
  exportCsvCard.addEventListener("click", handleCsvExport);

  // 2. Export JSON
  exportJsonCard.addEventListener("click", () => {
    chrome.storage.local.get({ scraperList: [] }, (result) => {
      let list = result.scraperList || [];
      if (list.length === 0) {
        showToast("Your queue is empty!", "error");
        return;
      }

      let jsonStr = JSON.stringify(list, null, 2);
      let filename = "ST_Lanka_Price_Scrape_" + new Date().toISOString().slice(0, 10) + ".json";

      triggerDownload(jsonStr, "application/json", filename, (success) => {
        if (success) {
          if (autoClearCheck && autoClearCheck.checked) {
            chrome.storage.local.set({ scraperList: [] }, () => {
              loadQueueData();
            });
          }
          showToast("JSON file downloaded successfully!", "success");
        }
      });
    });
  });

  // 3. Copy to Clipboard (TSV table for pasting straight into Excel / Sheets)
  exportCopyCard.addEventListener("click", () => {
    chrome.storage.local.get({ scraperList: [] }, (result) => {
      let list = result.scraperList || [];
      if (list.length === 0) {
        showToast("Your queue is empty!", "error");
        return;
      }

      let textTable = "Title\tPrice\tPrice Numeric\tStore\tStock\tURL\n";
      list.forEach((row) => {
        let numPrice = row.numericPrice !== undefined ? row.numericPrice : extractNumericPrice(row.price);
        textTable += `${row.title}\t${row.price}\t${numPrice}\t${row.store}\t${row.stock || 'In Stock'}\t${row.url}\n`;
      });

      navigator.clipboard.writeText(textTable).then(() => {
        showToast("Table copied! Paste into Excel with Ctrl+V.", "success");
        if (autoClearCheck && autoClearCheck.checked) {
          chrome.storage.local.set({ scraperList: [] }, () => {
            loadQueueData();
          });
        }
      }).catch(() => {
        showToast("Failed to copy to clipboard.", "error");
      });
    });
  });

  // Initial load
  loadQueueData();
  fetchTabProductData();
});