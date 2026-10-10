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
