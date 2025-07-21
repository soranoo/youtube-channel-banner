// Service worker for YouTube Channel Banner extension
const BAN_STORAGE_KEY = "yt_ban_list";

// Log messages to console
const log = (level, ...args) => {
  console[level]('[YouTube Channel Banner Service Worker]', ...args);
};

// Storage helper functions using sync storage (works in incognito)
const getBanListFromStorage = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get([BAN_STORAGE_KEY], (result) => {
      const banList = result[BAN_STORAGE_KEY] || [];
      resolve(banList);
    });
  });
};

const saveBanListToStorage = (banList) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [BAN_STORAGE_KEY]: banList }, () => {
      log('info', 'Saved ban list to sync storage', banList);
      resolve();
    });
  });
};

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('info', 'Received message:', message.action);

  if (message.action === 'getBanList') {
    getBanListFromStorage().then(banList => {
      sendResponse({ success: true, banList });
    });
    return true;
  }

  if (message.action === 'syncBanList') {
    // This is now handled directly by storage operations
    return false;
  }

  if (message.action === 'addToBanList') {
    const { channelName } = message;
    
    getBanListFromStorage().then(banList => {
      if (!banList.includes(channelName)) {
        banList.push(channelName);
        saveBanListToStorage(banList).then(() => {
          // Notify all content scripts to refresh
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              if (tab.url && tab.url.includes('youtube.com')) {
                chrome.tabs.sendMessage(tab.id, {
                  action: 'refreshBanList'
                });
              }
            });
          });
          sendResponse({ success: true, added: true });
        });
      } else {
        sendResponse({ success: true, added: false });
      }
    });
    
    return true;
  }

  if (message.action === 'removeFromBanList') {
    const { channelName } = message;
    
    getBanListFromStorage().then(banList => {
      const filteredList = banList.filter(b => b.toLowerCase() !== channelName.toLowerCase());
      saveBanListToStorage(filteredList).then(() => {
        // Notify all content scripts to refresh
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.url && tab.url.includes('youtube.com')) {
              chrome.tabs.sendMessage(tab.id, {
                action: 'refreshBanList'
              });
            }
          });
        });
        sendResponse({ success: true });
      });
    });
    
    return true;
  }

  if (message.action === 'clearBanList') {
    saveBanListToStorage([]).then(() => {
      // Notify all content scripts to refresh
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.url && tab.url.includes('youtube.com')) {
            chrome.tabs.sendMessage(tab.id, {
              action: 'refreshBanList'
            });
          }
        });
      });
      sendResponse({ success: true });
    });
    
    return true;
  }

  if (message.action === 'getBanListFromPage') {
    // Get ban list directly from sync storage
    getBanListFromStorage().then(banList => {
      sendResponse({ success: true, banList });
    });
    
    return true;
  }
  
  // Return false for unhandled messages
  return false;
});

// When the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  log('info', 'Extension installed/updated', chrome.runtime.getManifest().version);
});
