/**
 * YouTube Channel Banner - Content Script
 * Handles YouTube page content filtering and UI injection
 * @fileoverview Content script for hiding banned channels on YouTube
 * @author soranoo
 * @version 1.0.1
 */
'use strict';

// === CONFIG ===
/** @constant {boolean} IS_DEBUG - Enable debug logging */
const IS_DEBUG = false;

/** @constant {string} BAN_STORAGE_KEY - Storage key for ban list */
const BAN_STORAGE_KEY = "yt_ban_list";

// === STATE ===
/** @type {boolean} SHOW_INLINE_BAN_BUTTONS - Whether to show inline ban buttons */
let SHOW_INLINE_BAN_BUTTONS = false;

// === Storage Helpers ===
/**
 * Retrieves the ban list from Chrome sync storage
 * @returns {Promise<string[]>} Promise that resolves to the ban list array
 */
const getBanList = () => {
  return new Promise((resolve) => {
    chrome.storage.sync.get([BAN_STORAGE_KEY], (result) => {
      const banList = result[BAN_STORAGE_KEY] || [];
      resolve(banList);
    });
  });
};

/**
 * Saves the ban list to Chrome sync storage
 * @param {string[]} list - Array of banned channel names
 * @returns {Promise<void>} Promise that resolves when save is complete
 */
const saveBanList = (list) => {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [BAN_STORAGE_KEY]: list }, () => {
      resolve();
    });
  });
};

/**
 * Adds a channel name to the ban list
 * @param {string} name - Channel name to ban
 * @returns {Promise<boolean>} Promise that resolves to true if added, false if already exists
 */
const addToBanList = (name) => {
  return new Promise((resolve) => {
    getBanList().then(list => {
      if (!list.includes(name)) {
        list.push(name);
        saveBanList(list).then(() => {
          resolve(true);
        });
      } else {
        resolve(false);
      }
    });
  });
};

/**
 * Removes a channel name from the ban list
 * @param {string} name - Channel name to unban
 * @returns {Promise<void>} Promise that resolves when removal is complete
 */
const removeFromBanList = (name) => {
  return new Promise((resolve) => {
    getBanList().then(list => {
      const filteredList = list.filter(b => b.toLowerCase() !== name.toLowerCase());
      saveBanList(filteredList).then(() => {
        resolve();
      });
    });
  });
};

// === UI Injection Helpers ===
/**
 * Creates a floating ban button for a YouTube video element
 * @param {string} channelName - Name of the channel to ban
 * @param {Function} onBan - Callback function when ban button is clicked
 * @returns {HTMLButtonElement} The created ban button element
 */
const createFloatingBanButton = (channelName, onBan) => {
  const btn = document.createElement("button");
  btn.textContent = "🚫 Ban";
  btn.style.position = "absolute";
  btn.style.top = "5px";
  btn.style.right = "5px";
  btn.style.zIndex = "1000";
  btn.style.width = "50px";
  btn.style.height = "24px";
  btn.style.fontSize = "12px";
  btn.style.padding = "0";
  btn.style.cursor = "pointer";
  btn.style.backgroundColor = "#cc0000";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "12%";
  btn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.className = "floating-ban-button";
  btn.title = `Ban channel: ${channelName}`;
  btn.onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    addToBanList(channelName).then(added => {
      if (added) {
        // Hide the ban button and show ban message immediately
        btn.remove();
        onBan();
      } else {
        alert(`"${channelName}" is already banned.`);
      }
    });
  };
  
  // Hover effects
  btn.onmouseenter = () => {
    btn.style.backgroundColor = "#aa0000";
    btn.style.transform = "scale(1.1)";
  };
  btn.onmouseleave = () => {
    btn.style.backgroundColor = "#cc0000";
    btn.style.transform = "scale(1)";
  };
  
  return btn;
};

/**
 * Creates an unban button for banned content
 * @param {string} channelName - Name of the channel to unban
 * @returns {HTMLButtonElement} The created unban button element
 */
const createUnbanButton = (channelName) => {
  const btn = document.createElement("button");
  btn.textContent = "✅ Unban";
  btn.style.marginLeft = "10px";
  btn.style.fontSize = "10px";
  btn.style.padding = "2px 6px";
  btn.style.cursor = "pointer";
  btn.style.backgroundColor = "#006600";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "3px";
  btn.onclick = () => {
    removeFromBanList(channelName).then(() => {
      // Find the parent container and show content immediately
      const banMessage = btn.closest('.ban-message');
      if (banMessage) {
        const container = banMessage.parentElement;
        showContentAndRemoveBanMessage(container);
      }
    });
  };
  return btn;
};

/**
 * Checks if a channel name is in the ban list
 * @param {string} name - Channel name to check
 * @param {string[]} banList - Array of banned channel names
 * @returns {boolean} True if the channel is banned
 */
const isBanned = (name, banList) => {
  return banList.some(banned => name.toLowerCase().includes(banned.toLowerCase()));
};

// === Hide Content and Add Ban Message ===
/**
 * Hides content and adds a ban message for banned channels
 * @param {HTMLElement} element - The DOM element to hide
 * @param {string} channelName - Name of the banned channel
 */
const hideContentAndAddBanMessage = (element, channelName) => {
  // Check if already has ban message
  if (element.querySelector('.ban-message')) {
    return;
  }
  
  // Hide all existing content by setting display: none
  const children = Array.from(element.children);
  children.forEach(child => {
    if (!child.classList.contains('ban-message')) {
      child.style.display = 'none';
      child.classList.add('hidden-by-ban');
    }
  });
  
  // Create and add ban message
  const msg = document.createElement("div");
  msg.className = "ban-message";
  msg.style.color = "red";
  msg.style.fontWeight = "bold";
  msg.style.padding = "20px";
  msg.style.textAlign = "center";
  msg.style.backgroundColor = "#ffebee";
  msg.style.borderRadius = "8px";
  msg.style.border = "2px solid #ff5252";
  msg.style.margin = "10px";
  msg.textContent = `This content is hidden due to banned channel: "${channelName}"`;
  msg.appendChild(createUnbanButton(channelName));
  element.appendChild(msg);
};

// === Show Content and Remove Ban Message ===
/**
 * Shows previously hidden content and removes ban message
 * @param {HTMLElement} element - The DOM element to restore
 */
const showContentAndRemoveBanMessage = (element) => {
  // Remove ban message
  const banMessage = element.querySelector('.ban-message');
  if (banMessage) {
    banMessage.remove();
  }
  
  // Show all hidden content
  const hiddenChildren = element.querySelectorAll('.hidden-by-ban');
  hiddenChildren.forEach(child => {
    child.style.display = '';
    child.classList.remove('hidden-by-ban');
  });
};

// === Content Scan and Filter ===
/**
 * Scans the page for YouTube video elements and applies filtering based on ban list
 */
const runFiltering = () => {
  getBanList().then(banList => {
    // ytd-rich-grid-media
    document.querySelectorAll("ytd-rich-grid-media").forEach(media => {
      if (IS_DEBUG) media.style.border = "2px solid red";
      
      // Make sure the container is relatively positioned for floating button
      media.style.position = "relative";
      
      const channelNameElem = media.querySelector("ytd-channel-name a");
      if (channelNameElem) {
        const channelName = channelNameElem.textContent.trim();
        if (IS_DEBUG) channelNameElem.style.border = "2px solid blue";

        // Check if channel is banned
        const isBannedChannel = isBanned(channelName, banList);
        
        // Check if we already have a floating button for this channel
        const existingButton = media.querySelector(".floating-ban-button");
        const hasCorrectButton = existingButton && existingButton.title === `Ban channel: ${channelName}`;
        
        // Only add/remove buttons if state has changed
        if (SHOW_INLINE_BAN_BUTTONS && !isBannedChannel && !hasCorrectButton) {
          // Remove any existing buttons first
          media.querySelectorAll(".floating-ban-button").forEach(b => b.remove());
          // Add new button
          media.appendChild(createFloatingBanButton(channelName, () => hideContentAndAddBanMessage(media, channelName)));
        } else if (!SHOW_INLINE_BAN_BUTTONS && existingButton) {
          // Remove button if toggle is off
          existingButton.remove();
        }

        if (isBannedChannel) {
          // Only hide content and add ban message if not already done
          if (!media.querySelector('.ban-message')) {
            hideContentAndAddBanMessage(media, channelName);
          }
        } else {
          // Show content if channel is not banned
          showContentAndRemoveBanMessage(media);
        }
      }
    });

    // yt-lockup-view-model
    document.querySelectorAll("yt-lockup-view-model").forEach(lockup => {
      if (IS_DEBUG) lockup.style.border = "2px solid red";
      
      // Make sure the container is relatively positioned for floating button
      lockup.style.position = "relative";
      
      const metadata = lockup.querySelector("yt-content-metadata-view-model");
      if (metadata) {
        const firstDiv = metadata.querySelector("div");
        if (firstDiv) {
          const firstSpan = firstDiv.querySelector("span");
          if (firstSpan) {
            const channelName = firstSpan.textContent.trim();
            if (IS_DEBUG) firstSpan.style.border = "2px solid blue";

            // Check if channel is banned
            const isBannedChannel = isBanned(channelName, banList);
            
            // Check if we already have a floating button for this channel
            const existingButton = lockup.querySelector(".floating-ban-button");
            const hasCorrectButton = existingButton && existingButton.title === `Ban channel: ${channelName}`;
            
            // Only add/remove buttons if state has changed
            if (SHOW_INLINE_BAN_BUTTONS && !isBannedChannel && !hasCorrectButton) {
              // Remove any existing buttons first
              lockup.querySelectorAll(".floating-ban-button").forEach(b => b.remove());
              // Add new button
              lockup.appendChild(createFloatingBanButton(channelName, () => hideContentAndAddBanMessage(lockup, channelName)));
            } else if (!SHOW_INLINE_BAN_BUTTONS && existingButton) {
              // Remove button if toggle is off
              existingButton.remove();
            }

            if (isBannedChannel) {
              // Only hide content and add ban message if not already done
              if (!lockup.querySelector('.ban-message')) {
                hideContentAndAddBanMessage(lockup, channelName);
              }
            } else {
              // Show content if channel is not banned
              showContentAndRemoveBanMessage(lockup);
            }
          }
        }
      }
    });

    // ytd-video-renderer (search results)
    document.querySelectorAll("ytd-video-renderer").forEach(video => {
      if (IS_DEBUG) video.style.border = "2px solid red";
      
      // Make sure the container is relatively positioned for floating button
      video.style.position = "relative";
      
      const channelNameElem = video.querySelector("ytd-channel-name a");
      if (channelNameElem) {
        const channelName = channelNameElem.textContent.trim();
        if (IS_DEBUG) channelNameElem.style.border = "2px solid blue";

        // Check if channel is banned
        const isBannedChannel = isBanned(channelName, banList);
        
        // Check if we already have a floating button for this channel
        const existingButton = video.querySelector(".floating-ban-button");
        const hasCorrectButton = existingButton && existingButton.title === `Ban channel: ${channelName}`;
        
        // Only add/remove buttons if state has changed
        if (SHOW_INLINE_BAN_BUTTONS && !isBannedChannel && !hasCorrectButton) {
          // Remove any existing buttons first
          video.querySelectorAll(".floating-ban-button").forEach(b => b.remove());
          // Add new button
          video.appendChild(createFloatingBanButton(channelName, () => hideContentAndAddBanMessage(video, channelName)));
        } else if (!SHOW_INLINE_BAN_BUTTONS && existingButton) {
          // Remove button if toggle is off
          existingButton.remove();
        }

        if (isBannedChannel) {
          // Only hide content and add ban message if not already done
          if (!video.querySelector('.ban-message')) {
            hideContentAndAddBanMessage(video, channelName);
          }
        } else {
          // Show content if channel is not banned
          showContentAndRemoveBanMessage(video);
        }
      }
    });

    // ytd-compact-video-renderer (sidebar recommendations)
    document.querySelectorAll("ytd-compact-video-renderer").forEach(video => {
      if (IS_DEBUG) video.style.border = "2px solid red";
      
      // Make sure the container is relatively positioned for floating button
      video.style.position = "relative";
      
      const channelNameElem = video.querySelector("ytd-channel-name a");
      if (channelNameElem) {
        const channelName = channelNameElem.textContent.trim();
        if (IS_DEBUG) channelNameElem.style.border = "2px solid blue";

        // Check if channel is banned
        const isBannedChannel = isBanned(channelName, banList);
        
        // Check if we already have a floating button for this channel
        const existingButton = video.querySelector(".floating-ban-button");
        const hasCorrectButton = existingButton && existingButton.title === `Ban channel: ${channelName}`;
        
        // Only add/remove buttons if state has changed
        if (SHOW_INLINE_BAN_BUTTONS && !isBannedChannel && !hasCorrectButton) {
          // Remove any existing buttons first
          video.querySelectorAll(".floating-ban-button").forEach(b => b.remove());
          // Add new button
          video.appendChild(createFloatingBanButton(channelName, () => hideContentAndAddBanMessage(video, channelName)));
        } else if (!SHOW_INLINE_BAN_BUTTONS && existingButton) {
          // Remove button if toggle is off
          existingButton.remove();
        }

        if (isBannedChannel) {
          // Only hide content and add ban message if not already done
          if (!video.querySelector('.ban-message')) {
            hideContentAndAddBanMessage(video, channelName);
          }
        } else {
          // Show content if channel is not banned
          showContentAndRemoveBanMessage(video);
        }
      }
    });
  });
};

// === Insert Top-Level Toggle Button ===
/**
 * Inserts the toggle button for showing/hiding ban buttons in the YouTube UI
 */
const insertToggleBanUIBtn = () => {
  const container = document.getElementById("end");
  if (!container) {
    setTimeout(insertToggleBanUIBtn, 500);
    return;
  }

  if (document.getElementById("ban-toggle-button")) return;

  // Detect theme
  const isDarkTheme = document.documentElement.hasAttribute('dark') || 
                     document.querySelector('html[dark]') ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches ||
                     document.body.classList.contains('dark-theme') ||
                     getComputedStyle(document.body).backgroundColor === 'rgb(15, 15, 15)';

  const button = document.createElement("button");
  button.id = "ban-toggle-button";
  button.textContent = "➕ Show Ban Buttons";
  
  // Theme-aware colors
  const colors = {
    light: {
      text: '#0f0f0f',
      textInverse: '#ffffff',
      border: 'rgba(0, 0, 0, 0.1)',
      hoverBg: 'rgba(0, 0, 0, 0.05)',
      activeBg: '#065fd4',
      activeBorder: '#065fd4'
    },
    dark: {
      text: '#ffffff',
      textInverse: '#0f0f0f',
      border: 'rgba(255, 255, 255, 0.2)',
      hoverBg: 'rgba(255, 255, 255, 0.1)',
      activeBg: '#3ea6ff',
      activeBorder: '#3ea6ff'
    }
  };
  
  const theme = isDarkTheme ? colors.dark : colors.light;
  
  // YouTube-style button styling with theme support
  button.style.marginLeft = "8px";
  button.style.padding = "6px 12px";
  button.style.cursor = "pointer";
  button.style.backgroundColor = "transparent";
  button.style.color = theme.text;
  button.style.border = `1px solid ${theme.border}`;
  button.style.borderRadius = "18px";
  button.style.fontSize = "14px";
  button.style.fontWeight = "500";
  button.style.fontFamily = "Roboto, Arial, sans-serif";
  button.style.height = "36px";
  button.style.display = "inline-flex";
  button.style.alignItems = "center";
  button.style.justifyContent = "center";
  button.style.minWidth = "auto";
  button.style.outline = "none";
  button.style.transition = "all 0.2s ease";
  button.style.textTransform = "none";
  button.style.letterSpacing = "0.25px";
  button.style.whiteSpace = "nowrap";
  
  // Store theme colors for dynamic updates
  button.dataset.lightText = colors.light.text;
  button.dataset.darkText = colors.dark.text;
  button.dataset.lightBorder = colors.light.border;
  button.dataset.darkBorder = colors.dark.border;
  button.dataset.lightHover = colors.light.hoverBg;
  button.dataset.darkHover = colors.dark.hoverBg;
  button.dataset.lightActive = colors.light.activeBg;
  button.dataset.darkActive = colors.dark.activeBg;
  button.dataset.lightActiveText = colors.light.textInverse;
  button.dataset.darkActiveText = colors.dark.textInverse;
  
  // Function to update theme
  const updateTheme = () => {
    const isCurrentlyDark = document.documentElement.hasAttribute('dark') || 
                           document.querySelector('html[dark]') ||
                           window.matchMedia('(prefers-color-scheme: dark)').matches ||
                           document.body.classList.contains('dark-theme') ||
                           getComputedStyle(document.body).backgroundColor === 'rgb(15, 15, 15)';
    
    const currentTheme = isCurrentlyDark ? colors.dark : colors.light;
    
    if (!SHOW_INLINE_BAN_BUTTONS) {
      button.style.backgroundColor = "transparent";
      button.style.color = currentTheme.text;
      button.style.borderColor = currentTheme.border;
    } else {
      button.style.backgroundColor = currentTheme.activeBg;
      button.style.color = currentTheme.textInverse;
      button.style.borderColor = currentTheme.activeBorder;
    }
  };
  
  // Hover and focus effects
  button.onmouseenter = () => {
    const isCurrentlyDark = document.documentElement.hasAttribute('dark') || 
                           document.querySelector('html[dark]') ||
                           window.matchMedia('(prefers-color-scheme: dark)').matches ||
                           document.body.classList.contains('dark-theme') ||
                           getComputedStyle(document.body).backgroundColor === 'rgb(15, 15, 15)';
    
    const currentTheme = isCurrentlyDark ? colors.dark : colors.light;
    
    if (!SHOW_INLINE_BAN_BUTTONS) {
      button.style.backgroundColor = currentTheme.hoverBg;
      button.style.borderColor = currentTheme.activeBorder;
    }
  };
  
  button.onmouseleave = () => {
    const isCurrentlyDark = document.documentElement.hasAttribute('dark') || 
                           document.querySelector('html[dark]') ||
                           window.matchMedia('(prefers-color-scheme: dark)').matches ||
                           document.body.classList.contains('dark-theme') ||
                           getComputedStyle(document.body).backgroundColor === 'rgb(15, 15, 15)';
    
    const currentTheme = isCurrentlyDark ? colors.dark : colors.light;
    
    if (!SHOW_INLINE_BAN_BUTTONS) {
      button.style.backgroundColor = "transparent";
      button.style.borderColor = currentTheme.border;
    }
  };
  
  button.onfocus = () => {
    const isCurrentlyDark = document.documentElement.hasAttribute('dark') || 
                           document.querySelector('html[dark]') ||
                           window.matchMedia('(prefers-color-scheme: dark)').matches ||
                           document.body.classList.contains('dark-theme') ||
                           getComputedStyle(document.body).backgroundColor === 'rgb(15, 15, 15)';
    
    const currentTheme = isCurrentlyDark ? colors.dark : colors.light;
    button.style.outline = `2px solid ${currentTheme.activeBorder}`;
    button.style.outlineOffset = "2px";
  };
  
  button.onblur = () => {
    button.style.outline = "none";
  };

  button.onclick = () => {
    SHOW_INLINE_BAN_BUTTONS = !SHOW_INLINE_BAN_BUTTONS;
    button.textContent = SHOW_INLINE_BAN_BUTTONS ? "➖ Hide Ban Buttons" : "➕ Show Ban Buttons";
    
    // Update theme and active state
    updateTheme();
    
    runFiltering(); // re-run to add or remove buttons
  };
  
  // Listen for theme changes
  const observer = new MutationObserver(() => {
    updateTheme();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['dark', 'class']
  });
  
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addListener(updateTheme);

  container.appendChild(button);
};

// === Message Handler for Popup Communication ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getBanListFromPage') {
    getBanList().then(banList => {
      sendResponse({ banList });
    });
    return true;
  } else if (message.action === 'addToBanListFromPopup') {
    addToBanList(message.channelName).then(added => {
      runFiltering(); // Re-run filtering to hide newly banned content
      sendResponse({ added });
    });
    return true;
  } else if (message.action === 'removeFromBanListFromPopup') {
    removeFromBanList(message.channelName).then(() => {
      runFiltering(); // Re-run filtering to show unbanned content
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'clearBanListFromPopup') {
    saveBanList([]).then(() => {
      runFiltering(); // Re-run filtering to show all content
      sendResponse({ success: true });
    });
    return true;
  } else if (message.action === 'refreshBanList') {
    runFiltering();
    sendResponse({ success: true });
    return false;
  }
  
  return false;
});

// === Auto-refresh on page changes ===
/**
 * Sets up automatic refresh of filtering when page content changes
 */
const setupAutoRefresh = () => {
  let currentUrl = location.href;
  let filteringTimeout = null;
  
  // Set up observer for page changes
  const observer = new MutationObserver((mutations) => {
    let shouldRefilter = false;
    
    // Check if URL changed (navigation)
    if (location.href !== currentUrl) {
      currentUrl = location.href;
      setTimeout(() => {
        insertToggleBanUIBtn();
        runFiltering();
      }, 1000);
      return;
    }
    
    // Check if new video elements were added
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let node of mutation.addedNodes) {
          if (node.nodeType === 1) { // Element node
            // Check if it's a video container or contains video containers
            if (node.matches && (
              node.matches('ytd-rich-grid-media') ||
              node.matches('yt-lockup-view-model') ||
              node.matches('ytd-video-renderer') ||
              node.matches('ytd-compact-video-renderer') ||
              node.querySelector('ytd-rich-grid-media') ||
              node.querySelector('yt-lockup-view-model') ||
              node.querySelector('ytd-video-renderer') ||
              node.querySelector('ytd-compact-video-renderer')
            )) {
              shouldRefilter = true;
              break;
            }
          }
        }
      }
    });
    
    // Debounce filtering to avoid excessive calls
    if (shouldRefilter) {
      if (filteringTimeout) {
        clearTimeout(filteringTimeout);
      }
      filteringTimeout = setTimeout(() => {
        runFiltering();
        filteringTimeout = null;
      }, 300); // 300ms debounce
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// === Initialize ===
/**
 * Initializes the content script
 */
const init = () => {
  console.log('[YouTube Channel Banner] Extension initialized');
  
  // Initial load
  setTimeout(() => {
    insertToggleBanUIBtn();
    runFiltering();
  }, 1000);
  
  // Set up auto-refresh
  setupAutoRefresh();
};

// === Start ===
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
