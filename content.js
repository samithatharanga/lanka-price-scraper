// ST Lanka Smart Price Scraper - Advanced Content Script
// Specially tuned for Sri Lanka E-Commerce & Global Marketplaces

(function () {
  // Prevent duplicate initialization
  if (window.__stLankaScraperInitialized) return;
  window.__stLankaScraperInitialized = true;

  // In-memory overrides when user uses the Element Picker
  const manualOverrides = {
    title: null,
    price: null
  };

  // 1. Utility: Parse domain name into a clean store label
  function getStoreName() {
    const host = window.location.hostname.replace(/^www\./, '').toLowerCase();
    
    // Known Sri Lankan & Global Stores
    const storeMap = {
      'daraz.lk': 'Daraz Sri Lanka',
      'ikman.lk': 'Ikman.lk',
      'singer.lk': 'Singer Sri Lanka',
      'buyabans.com': 'Abans',
      'abans.com': 'Abans',
      'mysoftlogic.lk': 'Softlogic',
      'softlogicglomark.com': 'Glomark',
      'damro.lk': 'Damro',
      'wasi.lk': 'Wasi.lk',
      'kapruka.com': 'Kapruka',
      'nanotek.lk': 'Nanotek',
      'redlinetech.lk': 'Redline Tech',
      'barclays.lk': 'Barclays',
      'urban.lk': 'Urban.lk',
      'keellssuper.com': 'Keells Super',
      'cargillsonline.com': 'Cargills',
      'aliexpress.com': 'AliExpress',
      'amazon.com': 'Amazon',
      'ebay.com': 'eBay'
    };

    for (let key in storeMap) {
      if (host.includes(key)) return storeMap[key];
    }

    const parts = host.split('.');
    if (parts.length > 0) {
      let name = parts[0];
      if (name.length <= 3 && parts.length > 1) name = parts[0] + '.' + parts[1];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return host;
  }

  // 2. Utility: Extract numeric price safely (prevents 'Rs.' dot bug where Rs. 25,000 becomes 0.25)
  function extractNumericPrice(priceStr) {
    if (!priceStr) return 0;
    // Look for digits, commas, and decimal portion
    const match = priceStr.match(/([0-9][0-9,]*(\.[0-9]+)?)/);
    if (!match) return 0;
    const cleanNum = match[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    return isNaN(val) ? 0 : val;
  }

  // 3. Utility: Format / Clean Price String
  function parsePrice(text) {
    if (!text) return "";
    let clean = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Match common currencies in Sri Lanka & Global
    // e.g. Rs. 25,000 | Rs 25,000 | LKR 25,000 | රු. 25,000 | $25.00 | €25.00 | £25.00
    let match = clean.match(/(Rs\.?|LKR|\$|€|£|රු\.?|US\s*\$)\s*[0-9,]+(\.[0-9]{1,2})?/i) || 
                clean.match(/[0-9,]+(\.[0-9]{1,2})?\s*(LKR|Rs\.?|රු\.?)/i);
    if (match) {
      return match[0].trim();
    }

    // Fallback: look for numbers with commas or decimals
    let numMatch = clean.match(/[0-9,]{2,}(\.[0-9]{1,2})?/);
    if (numMatch) {
      return "Rs. " + numMatch[0].trim();
    }
    return clean.slice(0, 35);
  }

  // 4. Utility: Calculate discount percentage
  function calculateDiscount(currentPriceStr, originalPriceStr) {
    if (!currentPriceStr || !originalPriceStr) return null;
    let curr = extractNumericPrice(currentPriceStr);
    let orig = extractNumericPrice(originalPriceStr);
    if (orig > 0 && curr > 0 && orig > curr) {
      let pct = Math.round(((orig - curr) / orig) * 100);
      return pct + "% OFF";
    }
    return null;
  }

  // 5. Utility: Resolve absolute URL for images
  function resolveUrl(urlStr) {
    if (!urlStr) return "";
    if (urlStr.startsWith('data:')) return urlStr;
    try {
      return new URL(urlStr, window.location.href).href;
    } catch (e) {
      return urlStr;
    }
  }

  // 6. Utility: Extract JSON-LD (Schema.org) structured data
  function extractJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (let script of scripts) {
      try {
        let content = script.textContent.trim();
        if (!content) continue;
        let json = JSON.parse(content);
        let items = Array.isArray(json) ? json : (json['@graph'] ? json['@graph'] : [json]);

        for (let item of items) {
          if (!item) continue;
          const type = item['@type'];
          const isProduct = type === 'Product' || type === 'IndividualProduct' || (Array.isArray(type) && type.includes('Product'));
          
          if (isProduct) {
            let title = item.name || '';
            let image = '';
            if (item.image) {
              if (typeof item.image === 'string') image = item.image;
              else if (Array.isArray(item.image) && item.image.length > 0) {
                image = typeof item.image[0] === 'string' ? item.image[0] : (item.image[0]?.url || '');
              } else if (item.image.url) {
                image = item.image.url;
              }
            }

            let price = '';
            let originalPrice = '';
            let stock = '';

            let offers = item.offers;
            if (offers) {
              let offer = Array.isArray(offers) ? offers[0] : offers;
              if (offer) {
                let currency = offer.priceCurrency || 'Rs.';
                let pVal = offer.price !== undefined ? offer.price : offer.lowPrice;
                if (pVal !== undefined && pVal !== null && pVal !== '') {
                  price = `${currency} ${pVal}`.trim();
                }
                if (offer.highPrice && offer.highPrice !== pVal) {
                  originalPrice = `${currency} ${offer.highPrice}`.trim();
                }

                if (offer.availability) {
                  let av = String(offer.availability).toLowerCase();
                  if (av.includes('outofstock') || av.includes('soldout')) stock = 'Out of Stock';
                  else if (av.includes('instock')) stock = 'In Stock';
                }
              }
            }

            if (title || price) {
              return { title, price, originalPrice, image, stock };
            }
          }
        }
      } catch (e) {
        // Ignore JSON parse errors in malformed script tags
      }
    }
    return null;
  }

  // 7. Utility: Detect stock status
  function detectStockStatus() {
    // Check specific buttons or badges
    const buyBtns = document.querySelectorAll('button, .btn, .add-to-cart, #add-to-cart, [data-testid="buy-button"]');
    for (let btn of buyBtns) {
      let txt = (btn.innerText || '').toLowerCase();
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true' || 
          txt.includes('out of stock') || txt.includes('sold out') || txt.includes('අවසන්')) {
        return "Out of Stock";
      }
    }

    // Check meta tags
    let metaAvail = document.querySelector('meta[property="og:availability"], meta[itemprop="availability"], meta[property="product:availability"]');
    if (metaAvail) {
      let content = (metaAvail.getAttribute('content') || '').toLowerCase();
      if (content.includes('out of stock') || content.includes('outofstock')) return "Out of Stock";
      if (content.includes('in stock') || content.includes('instock')) return "In Stock";
    }

    // Check page text clues
    const pageText = document.body ? document.body.innerText.toLowerCase() : "";
    if (pageText.includes("currently unavailable") || pageText.includes("item is out of stock") || pageText.includes("භාණ්ඩය අවසන් වී ඇත")) {
      return "Out of Stock";
    }

    return "In Stock";
  }

  // 8. Site-specific Extractor Rules
  function getSiteSpecificData() {
    const host = window.location.hostname.toLowerCase();
    let data = { title: "", price: "", originalPrice: "", discount: "", image: "" };

    // --- Daraz Sri Lanka (daraz.lk) ---
    if (host.includes("daraz.lk")) {
      let t = document.querySelector('.pdp-mod-product-badge-title, .pdp-product-title, #module_product_title_1 h1');
      if (t) data.title = t.innerText.trim();
      
      let p = document.querySelector('.pdp-price_color, .pdp-mod-product-price .pdp-price, .pdp-price, .pdp-v2-product-price-current');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('.pdp-price_type_deleted, .pdp-price_color_lightgray');
      if (op) data.originalPrice = op.innerText.trim();

      let disc = document.querySelector('.pdp-product-price__discount, .pdp-mod-product-price .discount');
      if (disc) data.discount = disc.innerText.trim();

      let img = document.querySelector('.pdp-mod-common-image, .gallery-preview-panel img, .pdp-block__gallery img');
      if (img) data.image = img.getAttribute('data-src') || img.src;
    }

    // --- Ikman.lk (Leading SL classifieds & marketplace) ---
    else if (host.includes("ikman.lk")) {
      let t = document.querySelector('h1[data-testid="ad-title"], .ad-title, h1.title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('div[data-testid="ad-price"], .ad-price, .amount, .price');
      if (p) data.price = p.innerText.trim();

      let img = document.querySelector('img[data-testid="main-image"], .gallery-image img, .item-top img, img.image');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Singer.lk ---
    else if (host.includes("singer.lk")) {
      let t = document.querySelector('.page-title span, h1.page-title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.special-price .price, .price-box .price, [data-price-type="finalPrice"] .price, .price');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('.old-price .price');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.fotorama__img, .gallery-placeholder img, .product.media img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- BuyAbans.com / Abans.com ---
    else if (host.includes("buyabans.com") || host.includes("abans.com")) {
      let t = document.querySelector('h1.product-title, h1.page-title, h1, .product-title');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.special-price .price, .product-info-price .price, .price, .product-price, .current-price');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('.old-price .price, .regular-price .price');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.product-image img, #zoom_01, .fotorama__img, .gallery-placeholder img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Softlogic / Glomark ---
    else if (host.includes("mysoftlogic.lk") || host.includes("softlogicglomark.com")) {
      let t = document.querySelector('h1.product-name, h1.page-title, h1, .product-name');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.special-price .price, .product-price, .price, .current-price');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('.old-price .price, .old-price');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.product-image img, .fotorama__img, .gallery-placeholder img, .product-item img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Damro.lk ---
    else if (host.includes("damro.lk")) {
      let t = document.querySelector('h1.product_title, h1.product-title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.price .woocommerce-Price-amount, .product-price, .price');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('del .woocommerce-Price-amount');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.woocommerce-product-gallery__image img, .product-image img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Kapruka.com ---
    else if (host.includes("kapruka.com")) {
      let t = document.querySelector('h1, .product-details-title, #product-title');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('#product_price, .price, .current-price, .prod-price');
      if (p) data.price = p.innerText.trim();

      let img = document.querySelector('#main_product_image, .product-image img, .carousel-item.active img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Wasi.lk ---
    else if (host.includes("wasi.lk")) {
      let t = document.querySelector('h1.product_title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('p.price ins .amount, p.price .amount, .woocommerce-Price-amount');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('p.price del .amount');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.woocommerce-product-gallery__image img, .wp-post-image');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Nanotek.lk ---
    else if (host.includes("nanotek.lk")) {
      let t = document.querySelector('h1.product-title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.product-price, .price, .amount');
      if (p) data.price = p.innerText.trim();

      let img = document.querySelector('.product-image img, .main-image img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Redline Technologies (redlinetech.lk) ---
    else if (host.includes("redlinetech.lk")) {
      let t = document.querySelector('h1.product_title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.price .woocommerce-Price-amount, .price');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('del .woocommerce-Price-amount');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.woocommerce-product-gallery__image img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Barclays.lk ---
    else if (host.includes("barclays.lk")) {
      let t = document.querySelector('h1, .product-title');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.price, .product-price');
      if (p) data.price = p.innerText.trim();

      let img = document.querySelector('.product-image img');
      if (img) data.image = img.src;
    }

    // --- Urban.lk ---
    else if (host.includes("urban.lk")) {
      let t = document.querySelector('h1.product_title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.summary .price, .price');
      if (p) data.price = p.innerText.trim();

      let img = document.querySelector('.woocommerce-product-gallery__image img');
      if (img) data.image = img.src;
    }

    // --- AliExpress (aliexpress.com) ---
    else if (host.includes("aliexpress.")) {
      let t = document.querySelector('h1[data-pl="product-title"], .product-title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.product-price-current, .price, .current-price, [class*="price--current"]');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('.product-price-del, [class*="price--original"]');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('.magnifier-image img, .slider-image img, .gallery-main img');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- Amazon (amazon.*) ---
    else if (host.includes("amazon.")) {
      let t = document.querySelector('#productTitle, h1#title');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, #corePriceDisplay_desktop_feature_div .a-price .a-offscreen');
      if (p) data.price = p.innerText.trim();

      let op = document.querySelector('.a-price.a-text-price .a-offscreen');
      if (op) data.originalPrice = op.innerText.trim();

      let img = document.querySelector('#landingImage, #imgBlkFront, #main-image');
      if (img) data.image = img.src || img.getAttribute('data-src');
    }

    // --- eBay (ebay.*) ---
    else if (host.includes("ebay.")) {
      let t = document.querySelector('h1.x-item-title__mainTitle span, .vi-product-title, h1');
      if (t) data.title = t.innerText.trim();

      let p = document.querySelector('.x-price-primary .ux-textspans, #prcIsum, .main-price');
      if (p) data.price = p.innerText.trim();

      let img = document.querySelector('.ux-image-magnify__image--original, .picture-panel img');
      if (img) data.image = img.src;
    }

    return data;
  }

  // 9. Universal Smart Scraper Engine
  function universalSmartScraper() {
    // Check manual overrides first if user picked elements
    let manualTitle = manualOverrides.title;
    let manualPrice = manualOverrides.price;

    // 1. Try Site-Specific Scraper
    let siteData = getSiteSpecificData();

    // 2. Try JSON-LD Schema.org Structured Data
    let jsonLdData = extractJsonLd() || {};

    let title = manualTitle || siteData.title || jsonLdData.title || "";
    let price = manualPrice || siteData.price || jsonLdData.price || "";
    let originalPrice = siteData.originalPrice || jsonLdData.originalPrice || "";
    let discount = siteData.discount || "";
    let image = siteData.image || jsonLdData.image || "";
    let stock = jsonLdData.stock || "";

    // 3. Title Fallbacks
    if (!title) {
      let h1s = document.querySelectorAll("h1");
      for (let h1 of h1s) {
        let txt = h1.innerText.trim();
        if (txt.length > 2 && txt.length < 200) {
          if (!h1.closest('header') && !h1.closest('#header') && !h1.closest('.nav') && !h1.closest('footer')) {
            title = txt;
            break;
          }
        }
      }
    }
    if (!title) {
      let metaTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]');
      if (metaTitle) title = (metaTitle.getAttribute("content") || "").trim();
    }
    if (!title) {
      let cleanDocTitle = document.title.split('-')[0].split('|')[0].split(':')[0].trim();
      if (cleanDocTitle) title = cleanDocTitle;
    }

    // 4. Price Fallbacks
    if (!price) {
      let metaPrice = document.querySelector('meta[property="product:price:amount"], meta[itemprop="price"], meta[property="og:price:amount"]');
      if (metaPrice) {
        let val = metaPrice.getAttribute("content") || "";
        let currency = document.querySelector('meta[property="product:price:currency"], meta[itemprop="priceCurrency"]');
        let currStr = currency ? (currency.getAttribute("content") || "Rs.") : "Rs.";
        if (val) price = `${currStr} ${val}`.trim();
      }
    }
    if (!price) {
      const priceRegex = /(Rs\.?|LKR|\$|€|£|රු\.?)\s*[0-9,]+(\.[0-9]{1,2})?/i;
      let candidates = document.querySelectorAll(".price, .current-price, .amount, .product-price, .offer-price, .special-price, [class*='price']");
      for (let el of candidates) {
        if (el.children.length === 0 && priceRegex.test(el.innerText)) {
          let txt = el.innerText.trim();
          if (txt.length < 40 && !el.closest('footer') && !el.closest('header')) {
            price = parsePrice(txt);
            break;
          }
        }
      }
    }
    if (!price) {
      // Deeper scan of simple spans/strongs
      const priceRegex = /(Rs\.?|LKR|\$|€|£|රු\.?)\s*[0-9,]+(\.[0-9]{1,2})?/i;
      let inlineEls = document.querySelectorAll("span, strong, b, div, p");
      for (let el of inlineEls) {
        if (el.children.length === 0 && priceRegex.test(el.innerText)) {
          let txt = el.innerText.trim();
          if (txt.length > 2 && txt.length < 35 && !el.closest('footer') && !el.closest('header')) {
            price = parsePrice(txt);
            break;
          }
        }
      }
    }

    // Standardize price
    price = parsePrice(price);

    // 5. Original Price & Discount Fallbacks
    if (!originalPrice) {
      let strikeEls = document.querySelectorAll('del, s, .strike, .original-price, .old-price, .was-price, .regular-price');
      for (let el of strikeEls) {
        let txt = el.innerText.trim();
        let parsed = parsePrice(txt);
        if (parsed && parsed !== price) {
          originalPrice = parsed;
          break;
        }
      }
    }

    if (!discount && price && originalPrice) {
      discount = calculateDiscount(price, originalPrice);
    }

    // 6. Image Fallbacks
    if (!image) {
      let metaImg = document.querySelector('meta[property="og:image"], meta[name="twitter:image"]');
      if (metaImg) image = metaImg.getAttribute("content") || "";
    }
    if (!image) {
      // Find main product image by looking for large img elements
      let imgs = document.querySelectorAll('main img, #product-image img, .product img, .gallery img, img');
      for (let img of imgs) {
        if (img.width > 120 && img.height > 120) {
          image = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.src;
          if (image && !image.includes('placeholder') && !image.includes('loader')) break;
        }
      }
    }

    // 7. Stock Status Fallback
    if (!stock) {
      stock = detectStockStatus();
    }

    return {
      title: title || "Product Title Not Detected",
      price: price || "Price Not Detected",
      originalPrice: originalPrice || "",
      discount: discount || "",
      image: resolveUrl(image),
      store: getStoreName(),
      stock: stock || "In Stock",
      url: window.location.href,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // 10. Interactive Visual Element Picker Tool
  let activePickerMode = null;
  let activePickerOverlay = null;

  function showToastNotification(message) {
    let oldToast = document.getElementById('lanka-scraper-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'lanka-scraper-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 25px;
      right: 25px;
      z-index: 1000000;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-family: 'Segoe UI', system-ui, sans-serif;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      border-left: 4px solid #10b981;
      transition: all 0.3s ease;
    `;
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function startElementPicker(targetField) {
    activePickerMode = targetField;

    if (!activePickerOverlay) {
      activePickerOverlay = document.createElement('div');
      activePickerOverlay.id = 'lanka-scraper-picker-banner';
      activePickerOverlay.style.cssText = `
        position: fixed;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000000;
        background: #2563eb;
        color: white;
        padding: 10px 24px;
        border-radius: 30px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        gap: 12px;
        user-select: none;
      `;
      
      const labelSpan = document.createElement('span');
      labelSpan.id = 'lanka-picker-banner-text';
      labelSpan.innerText = `🎯 Hover & Click to select product ${targetField.toUpperCase()}`;
      
      const cancelBtn = document.createElement('button');
      cancelBtn.innerText = '✕ Cancel (ESC)';
      cancelBtn.style.cssText = `
        background: rgba(255,255,255,0.25);
        border: none;
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
      `;
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        stopElementPicker();
      });

      activePickerOverlay.appendChild(labelSpan);
      activePickerOverlay.appendChild(cancelBtn);
      document.body.appendChild(activePickerOverlay);
    } else {
      let labelSpan = document.getElementById('lanka-picker-banner-text');
      if (labelSpan) labelSpan.innerText = `🎯 Hover & Click to select product ${targetField.toUpperCase()}`;
    }

    document.addEventListener('mouseover', handlePickerMouseOver, true);
    document.addEventListener('mouseout', handlePickerMouseOut, true);
    document.addEventListener('click', handlePickerClick, true);
    document.addEventListener('keydown', handlePickerKeyDown, true);
  }

  function stopElementPicker() {
    activePickerMode = null;
    if (activePickerOverlay) {
      activePickerOverlay.remove();
      activePickerOverlay = null;
    }
    document.removeEventListener('mouseover', handlePickerMouseOver, true);
    document.removeEventListener('mouseout', handlePickerMouseOut, true);
    document.removeEventListener('click', handlePickerClick, true);
    document.removeEventListener('keydown', handlePickerKeyDown, true);
  }

  function handlePickerMouseOver(e) {
    if (!activePickerMode) return;
    if (e.target.closest('#lanka-scraper-picker-banner') || e.target.closest('#lanka-scraper-toast')) return;
    e.target.style.outline = '2px dashed #2563eb';
    e.target.style.cursor = 'crosshair';
  }

  function handlePickerMouseOut(e) {
    if (!activePickerMode) return;
    e.target.style.outline = '';
    e.target.style.cursor = '';
  }

  function handlePickerClick(e) {
    if (!activePickerMode) return;
    if (e.target.closest('#lanka-scraper-picker-banner') || e.target.closest('#lanka-scraper-toast')) return;

    e.preventDefault();
    e.stopPropagation();

    let target = e.target;
    target.style.outline = '';

    let pickedValue = "";
    if (activePickerMode === "image") {
      pickedValue = target.src || target.getAttribute('data-src') || resolveUrl(target.getAttribute('style')?.match(/url\(['"]?(.*?)['"]?\)/)?.[1]);
    } else {
      pickedValue = target.innerText.trim();
    }

    if (activePickerMode === "price") {
      pickedValue = parsePrice(pickedValue);
    }

    let field = activePickerMode;
    manualOverrides[field] = pickedValue;

    stopElementPicker();

    // Persist to chrome.storage.local so popup can pick it up even when closed & reopened
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        lastPicked: {
          url: window.location.href,
          field: field,
          value: pickedValue,
          timestamp: Date.now()
        }
      });
    }

    // Send active message to extension runtime in case popup is currently open
    try {
      chrome.runtime.sendMessage({
        action: "elementPicked",
        field: field,
        value: pickedValue
      });
    } catch (err) {}

    showToastNotification(`✅ ${field.toUpperCase()} Selected: "${pickedValue.slice(0, 35)}${pickedValue.length > 35 ? '...' : ''}". Reopen the extension icon to add to queue!`);
  }

  function handlePickerKeyDown(e) {
    if (e.key === "Escape") {
      stopElementPicker();
    }
  }

  // 11. Listen for requests from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getUniversalData") {
      let data = universalSmartScraper();
      sendResponse(data);
    } else if (request.action === "startPicker") {
      startElementPicker(request.field || "price");
      sendResponse({ status: "picker_started" });
    }
    return true;
  });

})();