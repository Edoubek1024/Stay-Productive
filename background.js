function handleNavigation(details) {

  const url = new URL(details.url);
  const domain = url.hostname;

  chrome.storage.sync.get("blockedDomains", ({ blockedDomains = [] }) => {

    if (blockedDomains.includes(domain)) {
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        func: () => {
          if (history.length > 1) {
            history.back();
          } else {
            window.close();
          }
        }
      });
    }
  });

  chrome.storage.sync.get("noScrolling", ({ noScrolling = [] }) => {
    const url = new URL(details.url);
    const domain = url.hostname;

    if (noScrolling.includes(domain)) {
      if (url.href.includes("www.youtube.com/shorts/")) {
        const end = url.href.split("shorts/")[1];
        const vidUrl = `https://www.youtube.com/watch?v=${end}`;

        chrome.tabs.update(details.tabId, {
          url: vidUrl
        });
      } else if (url.href.includes("www.tiktok.com")) {
        const urlPattern = /^https:\/\/www\.tiktok\.com\/@[^\/]+\/video\/\d+$/;
        if (urlPattern.test(url)) {
          const vidUrl = `${url.href}?is_from_webapp=1`;
          chrome.tabs.update(details.tabId, {
            url: vidUrl
          });
        } else {
          chrome.scripting.executeScript({
            target: { tabId: details.tabId },
            func: () => {
              const exists = document.getElementById('main-content-homepage_hot') !== null;
              chrome.runtime.sendMessage({ foundHotContent: exists });
            }
          });
        }
      } else if (url.href.includes("www.instagram.com/reels/")) {
        const urlParts = url.href.split("reels");
        const vidUrl = `${urlParts[0]}p${urlParts[1]}`;

        chrome.tabs.update(details.tabId, {
          url: vidUrl
        });
      }
    }
  });

  chrome.storage.sync.get("noRecommended", ({ noRecommended = [] }) => {
    if (url.href.includes("www.youtube.com")) {
      if (noRecommended.includes("www.youtube.com/shorts")) {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: () => {
            function removeShortsShelves() {
              const selectorsToRemove = [
                'ytd-reel-shelf-renderer',
                '[class*="ytd-rich-shelf-renderer"]',
                '[class*="ytp-endscreen-content"]'
              ];
              selectorsToRemove.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => el.remove());
              });
            }

            removeShortsShelves();

            const observer = new MutationObserver(removeShortsShelves);
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
      }
      if (noRecommended.includes("www.youtube.com")) {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: () => {
            function removeRecommended() {
              document.querySelectorAll('[id*="related"]').forEach(el => el.remove());
              if (location.hostname === "www.youtube.com" && location.pathname === "/") {
                document.querySelectorAll('ytd-two-column-browse-results-renderer').forEach(el => el.remove());
              }
            }

            removeRecommended();

            const observer = new MutationObserver(removeRecommended);
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
      }
    }
    if (noRecommended.includes(domain)) {
      if (url.hostname === "www.instagram.com" && url.pathname === "/") {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: () => {
            function removeExtraArticles() {
              document.querySelectorAll('div').forEach(div => {
                const articles = div.querySelectorAll('article');
                if (articles.length >= 1) {
                  articles.forEach(article => article.remove());
                }
              });
            }

            removeExtraArticles();

            const observer = new MutationObserver(() => {
              removeExtraArticles();
            });

            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          }
        });
      } else if (url.hostname === "x.com") {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: () => {
            function removeRecommended() {
              const listsToRemove = [
                '[aria-labelledby*="accessible-list-1"]',
                '[aria-labelledby*="accessible-list-2"]',
                '[aria-labelledby*="accessible-list-0"]'
              ];
              listsToRemove.forEach(list => {
                document.querySelectorAll(list).forEach(el => el.remove());
              });
            }

            removeRecommended();

            const observer = new MutationObserver(removeRecommended);
            observer.observe(document.body, { childList: true, subtree: true });
          }
        });
      }
    }
  });

  chrome.storage.sync.get("onlyMessage", ({ onlyMessage = [] }) => {
    if (onlyMessage.includes(domain)) {
      if (url.hostname === "www.instagram.com" && !url.pathname.startsWith("/direct")) {
        chrome.tabs.update(details.tabId, {
          url: "https://www.instagram.com/direct"
        });
      }
      if (url.hostname === "x.com" && url.pathname !== "/messages") {
        chrome.tabs.update(details.tabId, {
          url: "https://x.com/messages"
        });
      }
    }
  });
}

chrome.webNavigation.onCompleted.addListener(handleNavigation, {
  url: [{ schemes: ["http", "https"] }]
});

chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation, {
  url: [{ schemes: ["http", "https"] }]
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.foundHotContent) {
    chrome.tabs.update(sender.tab.id, {
      url: "https://www.tiktok.com/explore"
    });
  }
});
