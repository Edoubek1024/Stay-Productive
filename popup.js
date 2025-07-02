// Already considered domains
const knownDomains = [
  "www.youtube.com", "www.youtube.com/shorts",
  "www.tiktok.com", "www.instagram.com", "x.com"
];

// Handles changing UI tabs
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

    const target = button.getAttribute('data-tab');
    button.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

document.querySelector('.tab-button').click();

// Updates checkbox states to match saved data
function updateCheckboxStates(domains, className) {
  document.querySelectorAll(className).forEach(checkbox => {
    const domain = checkbox.dataset.domain;
    checkbox.checked = domains.includes(domain);
  });
}

// Loads stored data to be used in current session
function loadCollection(storageKey, className) {
  chrome.storage.sync.get(storageKey, (data) => {
    const domains = data[storageKey] || [];
    updateCheckboxStates(domains, className);
  });
}

// Allows for set editing by toggling UI switches
function setupToggle(storageKey, className) {
  document.querySelectorAll(className).forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      const domain = checkbox.dataset.domain;

      chrome.storage.sync.get(storageKey, (data) => {
        const domains = data[storageKey] || [];
        const index = domains.indexOf(domain);

        if (index === -1 && checkbox.checked) {
          domains.push(domain);
        } else if (index !== -1 && !checkbox.checked) {
          domains.splice(index, 1);
        } else {
          return;
        }

        chrome.storage.sync.set({ [storageKey]: domains });
      });
    });
  });
}

// All features to be tracked and their corresponding switch classes
const toggles = [
  { key: "blockedDomains", className: ".turn-off" },
  { key: "noScrolling", className: ".stop-scrolling" },
  { key: "noRecommended", className: ".prevent-recommended" },
  { key: "onlyMessage", className: ".only-message" }
];

// Sets up feature sets
toggles.forEach(({ key, className }) => {
  loadCollection(key, className);
  setupToggle(key, className);
});

// Handles adding custom domains to be considered
document.getElementById("add-custom-domain").addEventListener("click", () => {
  const input = document.getElementById("custom-domain-input");
  const rawValue = input.value.trim();

  let domain;

  try {
    const url = new URL(rawValue.startsWith("http") ? rawValue : `https://${rawValue}`);
    let hostname = url.hostname;
    if (!hostname.startsWith("www.") && hostname.split('.').length === 2) {
      hostname = "www." + hostname;
    }

    domain = hostname;

    if (!domain.includes('.')) {
      throw new Error("Domain invalid");
    }
  } catch (e) {
    alert("Please enter a valid URL (e.g. https://example.com or example.com)");
    return;
  }

  chrome.storage.sync.get("blockedDomains", ({ blockedDomains = [] }) => {
    const filtered = blockedDomains.filter(d => d !== domain);
    const updated = [domain, ...filtered];

    chrome.storage.sync.set({ blockedDomains: updated }, () => {
      renderCustomBlockList(updated);
      input.value = "";
    });
  });
});

// Allows for UI interaction for custom domains
function renderCustomBlockList(domains) {
  const container = document.getElementById("custom-block-list");
  container.innerHTML = "";

  domains.forEach(currentDomain => {
    if (knownDomains.includes(currentDomain)) return;

    const label = document.createElement("label");
    label.className = "remove";
    label.title = "Click to remove";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "cancel";
    checkbox.checked = true;
    checkbox.dataset.domain = currentDomain;

    checkbox.addEventListener("change", () => {
      chrome.storage.sync.get("blockedDomains", ({ blockedDomains = [] }) => {
        const filtered = blockedDomains.filter(d => d !== currentDomain);
        chrome.storage.sync.set({ blockedDomains: filtered }, () => {
          renderCustomBlockList(filtered);
        });
      });
    });

    const x = document.createElement("span");
    x.className = "x-symbol";
    x.textContent = "X";
    x.title = "Remove this domain";

    label.appendChild(checkbox);
    label.appendChild(x);

    const row = document.createElement("div");
    row.className = "setting-row";

    const span = document.createElement("span");
    span.textContent = currentDomain;

    row.appendChild(label);
    row.appendChild(span);

    container.appendChild(row);
  });
}

chrome.storage.sync.get("blockedDomains", ({ blockedDomains = [] }) => {
  renderCustomBlockList(blockedDomains);
});
