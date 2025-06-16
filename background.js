chrome.webNavigation.onCompleted.addListener((details) => {
  chrome.tabs.update(details.tabId, {
    url: "https://www.google.com/"
  });
}, {
  url: [
    { urlEquals: "https://www.tiktok.com/en/" }
  ]
});
