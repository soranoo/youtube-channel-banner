/**
 * Popup script for YouTube Channel Banner
 * Handles the extension popup UI and communication with content scripts
 * @fileoverview Popup interface for managing banned channels
 * @author soranoo
 * @version 1.0.1
 */
document.addEventListener('DOMContentLoaded', async () => {
  /** @type {HTMLElement} statusElement - Status message display element */
  const statusElement = document.getElementById('status');
  /** @type {HTMLInputElement} channelInput - Channel name input field */
  const channelInput = document.getElementById('channelInput');
  /** @type {HTMLButtonElement} addBanButton - Add channel to ban list button */
  const addBanButton = document.getElementById('addBanButton');
  /** @type {HTMLElement} banList - Container for displaying ban list */
  const banList = document.getElementById('banList');
  /** @type {HTMLElement} banCount - Display for ban count */
  const banCount = document.getElementById('banCount');
  /** @type {HTMLButtonElement} refreshButton - Refresh ban list button */
  const refreshButton = document.getElementById('refreshButton');
  /** @type {HTMLInputElement} searchInput - Search input field */
  const searchInput = document.getElementById('searchInput');
  /** @type {HTMLButtonElement} clearSearchButton - Clear search button */
  const clearSearchButton = document.getElementById('clearSearchButton');
  /** @type {HTMLButtonElement} prevPageButton - Previous page button */
  const prevPageButton = document.getElementById('prevPageButton');
  /** @type {HTMLButtonElement} nextPageButton - Next page button */
  const nextPageButton = document.getElementById('nextPageButton');
  /** @type {HTMLElement} pageInfo - Page information display */
  const pageInfo = document.getElementById('pageInfo');
  
  /** @type {string[]} currentBanList - Current list of banned channels */
  let currentBanList = [];
  /** @type {string[]} filteredBanList - Filtered list based on search */
  let filteredBanList = [];
  /** @type {chrome.tabs.Tab|null} currentTab - Current active tab */
  let currentTab = null;
  /** @type {number} currentPage - Current page number for pagination */
  let currentPage = 1;
  /** @constant {number} itemsPerPage - Number of items per page */
  const itemsPerPage = 10;
  /** @type {string} searchTerm - Current search term */
  let searchTerm = '';
  
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  // Check if we're on YouTube
  /** @type {boolean} isYouTube - Whether current tab is YouTube */
  const isYouTube = currentTab && currentTab.url && currentTab.url.includes('youtube.com');
  
  /**
   * Updates the status message display
   * @param {string} message - Message to display
   * @param {'info'|'success'|'error'} type - Type of message for styling
   */
  const updateStatus = (message, type = 'info') => {
    statusElement.textContent = message;
    statusElement.className = `status status-${type}`;
  };
  
  /**
   * Loads the ban list from the content script
   * @returns {Promise<void>}
   */
  const loadBanList = async () => {
    if (!isYouTube) {
      updateStatus('Please open a YouTube page to use this extension', 'error');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBanListFromPage' });
      
      if (response && response.success) {
        currentBanList = response.banList || [];
        applySearchFilter();
        displayBanList();
        updateStatus(`${currentBanList.length} channels banned`, 'success');
      } else {
        updateStatus('Failed to load ban list', 'error');
      }
    } catch (error) {
      console.error('Error loading ban list:', error);
      updateStatus('Error loading ban list', 'error');
    }
  };

  /**
   * Applies search filter to the ban list
   */
  const applySearchFilter = () => {
    if (!searchTerm.trim()) {
      filteredBanList = [...currentBanList];
    } else {
      filteredBanList = currentBanList.filter(channel => 
        channel.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    currentPage = 1; // Reset to first page when filtering
  };

  /**
   * Gets paginated data for current page
   * @returns {string[]} Array of channel names for current page
   */
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBanList.slice(startIndex, endIndex);
  };

  /**
   * Updates pagination controls based on current state
   */
  const updatePagination = () => {
    const totalPages = Math.ceil(filteredBanList.length / itemsPerPage);
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
    
    // Hide pagination if only one page
    const paginationElement = document.getElementById('pagination');
    if (totalPages <= 1) {
      paginationElement.style.display = 'none';
    } else {
      paginationElement.style.display = 'flex';
    }
  };
  
  /**
   * Displays the ban list in the UI with pagination
   */
  const displayBanList = () => {
    banCount.textContent = currentBanList.length;
    
    if (filteredBanList.length === 0) {
      if (searchTerm.trim()) {
        banList.innerHTML = '<div class="empty-state">No channels found matching your search</div>';
      } else {
        banList.innerHTML = '<div class="empty-state">No channels banned yet</div>';
      }
      updatePagination();
      return;
    }
    
    const paginatedData = getPaginatedData();
    
    banList.innerHTML = paginatedData.map(channel => `
      <div class="ban-item">
        <div class="ban-item-name">${escapeHtml(channel)}</div>
        <button class="ban-item-remove" data-channel="${escapeHtml(channel)}">Remove</button>
      </div>
    `).join('');
    
    // Add event listeners for remove buttons
    banList.querySelectorAll('.ban-item-remove').forEach(button => {
      button.addEventListener('click', async (e) => {
        const channelName = e.target.dataset.channel;
        await removeFromBanList(channelName);
      });
    });
    
    updatePagination();
  };
  
  /**
   * Adds a channel to the ban list
   * @param {string} channelName - Name of the channel to ban
   * @returns {Promise<void>}
   */
  const addToBanList = async (channelName) => {
    if (!channelName.trim()) {
      updateStatus('Please enter a channel name', 'error');
      return;
    }
    
    if (!isYouTube) {
      updateStatus('Please open a YouTube page to use this extension', 'error');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'addToBanList', 
        channelName: channelName.trim() 
      });
      
      if (response && response.success) {
        if (response.added) {
          updateStatus(`"${channelName}" added to ban list`, 'success');
          channelInput.value = '';
          await loadBanList(); // Refresh the list
        } else {
          updateStatus(`"${channelName}" is already banned`, 'error');
        }
      } else {
        updateStatus('Failed to add channel to ban list', 'error');
      }
    } catch (error) {
      console.error('Error adding to ban list:', error);
      updateStatus('Error adding to ban list', 'error');
    }
  };
  
  /**
   * Removes a channel from the ban list
   * @param {string} channelName - Name of the channel to unban
   * @returns {Promise<void>}
   */
  const removeFromBanList = async (channelName) => {
    if (!isYouTube) {
      updateStatus('Please open a YouTube page to use this extension', 'error');
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'removeFromBanList', 
        channelName 
      });
      
      if (response && response.success) {
        updateStatus(`"${channelName}" removed from ban list`, 'success');
        await loadBanList(); // Refresh the list
      } else {
        updateStatus('Failed to remove channel from ban list', 'error');
      }
    } catch (error) {
      console.error('Error removing from ban list:', error);
      updateStatus('Error removing from ban list', 'error');
    }
  };
  
  /**
   * Escapes HTML to prevent XSS attacks
   * @param {string} text - Text to escape
   * @returns {string} HTML-escaped text
   */
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  
  // Event listeners
  addBanButton.addEventListener('click', () => {
    addToBanList(channelInput.value);
  });
  
  channelInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addToBanList(channelInput.value);
    }
  });
  
  refreshButton.addEventListener('click', loadBanList);
  
  // Search functionality
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    applySearchFilter();
    displayBanList();
  });
  
  clearSearchButton.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    applySearchFilter();
    displayBanList();
  });
  
  // Pagination functionality
  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayBanList();
    }
  });
  
  nextPageButton.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredBanList.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      displayBanList();
    }
  });
  
  // Initial load
  if (isYouTube) {
    loadBanList();
  } else {
    updateStatus('Please open a YouTube page to use this extension', 'error');
  }
});