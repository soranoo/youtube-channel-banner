// Popup script for YouTube Channel Banner
document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const channelInput = document.getElementById('channelInput');
  const addBanButton = document.getElementById('addBanButton');
  const banList = document.getElementById('banList');
  const banCount = document.getElementById('banCount');
  const refreshButton = document.getElementById('refreshButton');
  const clearAllButton = document.getElementById('clearAllButton');
  const searchInput = document.getElementById('searchInput');
  const clearSearchButton = document.getElementById('clearSearchButton');
  const prevPageButton = document.getElementById('prevPageButton');
  const nextPageButton = document.getElementById('nextPageButton');
  const pageInfo = document.getElementById('pageInfo');
  
  let currentBanList = [];
  let filteredBanList = [];
  let currentTab = null;
  let currentPage = 1;
  const itemsPerPage = 10;
  let searchTerm = '';
  
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  // Check if we're on YouTube
  const isYouTube = currentTab && currentTab.url && currentTab.url.includes('youtube.com');
  
  // Update status message
  const updateStatus = (message, type = 'info') => {
    statusElement.textContent = message;
    statusElement.className = `status status-${type}`;
  };
  
  // Load ban list from content script
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

  // Apply search filter
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

  // Get paginated data
  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBanList.slice(startIndex, endIndex);
  };

  // Update pagination controls
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
  
  // Display ban list in UI
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
  
  // Add channel to ban list
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
  
  // Remove channel from ban list
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
  
  // Clear all banned channels
  const clearAllBans = async () => {
    if (currentBanList.length === 0) {
      updateStatus('No channels to clear', 'info');
      return;
    }
    
    if (!isYouTube) {
      updateStatus('Please open a YouTube page to use this extension', 'error');
      return;
    }
    
    if (!confirm(`Are you sure you want to remove all ${currentBanList.length} banned channels?`)) {
      return;
    }
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'clearBanList' });
      
      if (response && response.success) {
        updateStatus('All banned channels cleared', 'success');
        await loadBanList(); // Refresh the list
      } else {
        updateStatus('Failed to clear ban list', 'error');
      }
    } catch (error) {
      console.error('Error clearing ban list:', error);
      updateStatus('Error clearing ban list', 'error');
    }
  };
  
  // Escape HTML to prevent XSS
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
  clearAllButton.addEventListener('click', clearAllBans);
  
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