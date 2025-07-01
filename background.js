// Convenience functions
function executeScript(tabId, func) {
  chrome.scripting.executeScript({ target: { tabId }, func });
}

function updateTabUrl(tabId, url) {
  chrome.tabs.update(tabId, { url });
}

// Edits HTML to remove YouTube Shorts recommendations
function removeShortsFromYouTube() {
  function removeShortsShelves() {
    const selectors = ['ytd-reel-shelf-renderer', '[class*="ytd-rich-shelf-renderer"]'];
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
  }
  removeShortsShelves();
  new MutationObserver(removeShortsShelves).observe(document.body, { childList: true, subtree: true });
}

// Edits HTML to remove YouTube video recommendations
function removeFromYouTubeRecommended() {
  function removeRecommended() {
    document.querySelectorAll('[id*="related"]').forEach(el => el.remove());
    if (location.hostname === "www.youtube.com" && location.pathname === "/") {
      document.querySelectorAll('ytd-two-column-browse-results-renderer').forEach(el => el.remove());
    }
  }
  removeRecommended();
  new MutationObserver(removeRecommended).observe(document.body, { childList: true, subtree: true });
}

// Edits HTML to remove Instagram post recommendations
function removeFromInstagramHome() {
  function removeArticles() {
    document.querySelectorAll('div').forEach(div => {
      const articles = div.querySelectorAll('article');
      if (articles.length >= 1) articles.forEach(article => article.remove());
    });
  }
  removeArticles();
  new MutationObserver(removeArticles).observe(document.body, { childList: true, subtree: true });
}

// Edits HTML to remove Twitter post recommendations
function removeFromTwitter() {
  function removeRecommended() {
    const selectors = [
      '[aria-labelledby*="accessible-list-0"]',
      '[aria-labelledby*="accessible-list-1"]',
      '[aria-labelledby*="accessible-list-2"]'
    ];
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.remove()));
  }
  removeRecommended();
  new MutationObserver(removeRecommended).observe(document.body, { childList: true, subtree: true });
}

function handleMonitoring(details) {
  const { url: href, tabId } = details;
  const url = new URL(href);
  const domain = url.hostname;

  // Block domains completely
  chrome.storage.sync.get("blockedDomains", ({ blockedDomains = [] }) => {
    if (blockedDomains.includes(domain)) {
      executeScript(tabId, () => {
        if (history.length > 1) history.back();
        else window.close();
      });
    }
  });

  // Protects against scrolling
  chrome.storage.sync.get(["noScrolling", "blockedDomains"], ({ noScrolling = [], blockedDomains = [] }) => {
    if (!noScrolling.includes(domain) || blockedDomains.includes(domain)) return;

    if (href.includes("www.youtube.com/shorts/")) {
      const id = href.split("shorts/")[1];
      updateTabUrl(tabId, `https://www.youtube.com/watch?v=${id}`);
    }

    else if (href.includes("www.tiktok.com")) {
      const isVideo = /^https:\/\/www\.tiktok\.com\/@[^\/]+\/video\/\d+$/.test(href);
      if (isVideo) {
        updateTabUrl(tabId, `${href}?is_from_webapp=1`);
      } else {
        executeScript(tabId, () => {
          const exists = !!document.getElementById('main-content-homepage_hot');
          chrome.runtime.sendMessage({ foundHotContent: exists });
        });
      }
    }

    else if (href.includes("www.instagram.com/reels/")) {
      const [prefix, suffix] = href.split("reels");
      updateTabUrl(tabId, `${prefix}p${suffix}`);
    }
  });

  // Remove recommended content
  chrome.storage.sync.get("noRecommended", ({ noRecommended = [] }) => {
    if (blockedDomains.includes(domain)) return;
    if (href.includes("www.youtube.com")) {
      if (noRecommended.includes("www.youtube.com/shorts")) {
        executeScript(tabId, removeShortsFromYouTube);
      }
      if (noRecommended.includes("www.youtube.com")) {
        executeScript(tabId, removeFromYouTubeRecommended);
      }
    }

    if (noRecommended.includes(domain)) {
      if (domain === "www.instagram.com" && url.pathname === "/") {
        executeScript(tabId, removeFromInstagramHome);
      }
      else if (domain === "x.com") {
        executeScript(tabId, removeFromTwitter);
      }
    }
  });

  // Only allow messaging
  chrome.storage.sync.get("onlyMessage", ({ onlyMessage = [] }) => {
    if (!onlyMessage.includes(domain) || blockedDomains.includes(domain)) return;

    if (domain === "www.instagram.com" && !url.pathname.startsWith("/direct")) {
      updateTabUrl(tabId, "https://www.instagram.com/direct");
    }

    if (domain === "x.com" && url.pathname !== "/messages") {
      updateTabUrl(tabId, "https://x.com/messages");
    }
  });
}

// Navigation listeners
chrome.webNavigation.onCompleted.addListener(handleMonitoring, {
  url: [{ schemes: ["http", "https"] }]
});

chrome.webNavigation.onHistoryStateUpdated.addListener(handleMonitoring, {
  url: [{ schemes: ["http", "https"] }]
});

// Hard reroute for TikTok
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.foundHotContent) {
    chrome.tabs.update(sender.tab.id, {
      url: "https://www.tiktok.com/explore"
    });
  }
});
