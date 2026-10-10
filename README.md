# 🛒 Lanka Price Scraper & Market Intelligence Extension

![Version](https://img.shields.io/badge/version-2.1-blue.svg?style=for-the-badge)
![Platform](https://img.shields.io/badge/platform-Chrome%20%7C%20Edge-success.svg?style=for-the-badge)
![Manifest](https://img.shields.io/badge/manifest-V3-orange.svg?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)

A lightweight, automated Google Chrome & Chromium Extension engineered to intelligently detect, scrape, queue, and export real-time product prices and titles from any Sri Lankan e-commerce or supermarket website directly into clean Excel (.CSV) spreadsheets.

Designed and maintained by **Samitha Tharanga** (ST Imagix).

---

## 🌟 Key Features

* **Universal Smart Extraction:** Uses heuristic DOM and structured schema (JSON-LD / OpenGraph) parsing to dynamically identify product names and prices without hardcoded site-specific selectors.
* **Sri Lankan Currency & Decimal Support:** Perfectly handles local currencies including `Rs.`, `LKR`, `රු.`, and multi-decimal e-commerce price formatting.
* **Target Platforms Covered:**
  * Daraz.lk
  * MyArpico.com / Arpico Supercentre
  * Keells Super
  * Singer.lk & Damro.lk
  * Ikman.lk
  * Global platforms: Amazon, AliExpress, eBay
* **Interactive Batch Queue:** Browse across multiple online stores and add items to a persistent browser storage queue (`chrome.storage.local`).
* **UTF-8 Excel (.CSV) & JSON Export:** Instant single-click export featuring UTF-8 BOM encoding so Sinhala and special characters display cleanly in Microsoft Excel.
* **Element Picker Tool:** Point-and-click backup utility to manually grab prices from custom or non-standard website templates.

---

## 🚀 Installation Guide (Run Locally in 60 Seconds)

Since this extension is open-source and does not require the Chrome Web Store:

1. **Clone or Download Repository:**
   ```bash
   git clone [https://github.com/samithatharanga/lanka-price-scraper.git](https://github.com/samithatharanga/lanka-price-scraper.git)
(Or download the ZIP directly from GitHub and extract it).

Open Extensions Page in Browser:

Google Chrome: Visit chrome://extensions/

Microsoft Edge: Visit edge://extensions/

Enable Developer Mode:

Toggle the Developer mode switch located in the top-right corner.

Load the Extension:

Click the "Load unpacked" button on the top-left.

Select the extracted lanka-price-scraper folder.

Pin & Use:

Pin Lanka Price Scraper to your browser toolbar.

Open any product page and click the extension icon to start scraping!

🛠️ Project Architecture
Plaintext
lanka-price-scraper/
├── manifest.json       # Manifest V3 configuration & permission boundaries
├── background.js       # Background service worker for life-cycle management
├── content.js          # Heuristic DOM scraping & element picker logic
├── popup.html          # Clean dark/light hybrid extension interface
├── popup.js            # Queue management, parsing & Excel download generator
└── icons/              # Resolution-independent extension icon pack
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
📊 Analytics & BI Integration
Exported .csv sheets from this extension can be directly ingested into our Lanka Market BI & SPSS Decision Portal for:

Z-Score Anomaly & Price Outlier Detection

Token-based Same-Product Duplicate Clustering

Standard Deviation & Arbitrage Margins


👨‍💻 Author
Samitha Tharanga Wijesinghe

Founder & Creative Lead, ST Imagix

IT Undergraduate, Nāgānanda International Institute for Buddhist Studies (NIIBS)

GitHub Profile

📜 License
This project is licensed under the MIT License. Free for personal, academic, and commercial exploration.
