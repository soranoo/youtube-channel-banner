/**
 * Settings page script for YouTube Channel Banner
 * Handles import/export functionality and settings management
 * @fileoverview Settings interface for managing extension data
 * @author soranoo
 * @version 1.0.1
 */
document.addEventListener('DOMContentLoaded', async () => {
  /** @type {HTMLElement} statusElement - Status message display element */
  const statusElement = document.getElementById('status');
  /** @type {HTMLElement} totalBannedElement - Total banned count display */
  const totalBannedElement = document.getElementById('totalBanned');
  /** @type {HTMLElement} lastUpdatedElement - Last updated display */
  const lastUpdatedElement = document.getElementById('lastUpdated');
  /** @type {HTMLButtonElement} exportBtn - Export button */
  const exportBtn = document.getElementById('exportBtn');
  /** @type {HTMLButtonElement} importBtn - Import button */
  const importBtn = document.getElementById('importBtn');
  /** @type {HTMLInputElement} importFile - File input for import */
  const importFile = document.getElementById('importFile');
  /** @type {HTMLButtonElement} clearAllBtn - Clear all button */
  const clearAllBtn = document.getElementById('clearAllBtn');
  
  // Modal elements
  /** @type {HTMLElement} confirmModal - Confirmation modal */
  const confirmModal = document.getElementById('confirmModal');
  /** @type {HTMLElement} modalTitle - Modal title */
  const modalTitle = document.getElementById('modalTitle');
  /** @type {HTMLElement} modalBody - Modal body */
  const modalBody = document.getElementById('modalBody');
  /** @type {HTMLButtonElement} modalCancel - Modal cancel button */
  const modalCancel = document.getElementById('modalCancel');
  /** @type {HTMLButtonElement} modalConfirm - Modal confirm button */
  const modalConfirm = document.getElementById('modalConfirm');
  
  /** @type {string[]} currentBanList - Current list of banned channels */
  let currentBanList = [];
  /** @type {Function|null} pendingAction - Action waiting for confirmation */
  let pendingAction = null;
  
  /**
   * Updates the status message display
   * @param {string} message - Message to display
   * @param {'info'|'success'|'error'} type - Type of message for styling
   */
  const updateStatus = (message, type = 'info') => {
    statusElement.textContent = message;
    statusElement.className = `status status-${type} show`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, 5000);
  };

  /**
   * Shows confirmation modal
   * @param {string} title - Modal title
   * @param {string} body - Modal body text
   * @param {Function} onConfirm - Callback for confirmation
   * @param {string} confirmText - Text for confirm button
   * @param {string} confirmClass - CSS class for confirm button
   */
  const showConfirmModal = (title, body, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-danger') => {
    modalTitle.textContent = title;
    modalBody.textContent = body;
    modalConfirm.textContent = confirmText;
    modalConfirm.className = `btn ${confirmClass}`;
    
    pendingAction = onConfirm;
    confirmModal.classList.add('show');
  };

  /**
   * Hides confirmation modal
   */
  const hideConfirmModal = () => {
    confirmModal.classList.remove('show');
    pendingAction = null;
  };

  /**
   * Loads the ban list from storage
   * @returns {Promise<void>}
   */
  const loadBanList = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getBanList' });
      
      if (response && response.success) {
        currentBanList = response.banList || [];
        updateStats();
      } else {
        updateStatus('Failed to load ban list', 'error');
      }
    } catch (error) {
      console.error('Error loading ban list:', error);
      updateStatus('Error loading ban list', 'error');
    }
  };

  /**
   * Updates the statistics display
   */
  const updateStats = () => {
    totalBannedElement.textContent = currentBanList.length;
    lastUpdatedElement.textContent = new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString();
  };

  /**
   * Exports the ban list as a JSON file
   */
  const exportBanList = () => {
    if (currentBanList.length === 0) {
      updateStatus('No banned channels to export', 'info');
      return;
    }

    const exportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      banList: currentBanList,
      totalChannels: currentBanList.length
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `youtube-channel-ban-list-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    updateStatus(`Exported ${currentBanList.length} banned channels`, 'success');
  };

  /**
   * Imports ban list from a JSON file
   * @param {File} file - The file to import
   * @returns {Promise<void>}
   */
  const importBanList = async (file) => {
    if (!file) {
      updateStatus('Please select a file to import', 'error');
      return;
    }

    if (!file.name.endsWith('.json')) {
      updateStatus('Please select a valid JSON file', 'error');
      return;
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate import data structure
      if (!importData.banList || !Array.isArray(importData.banList)) {
        updateStatus('Invalid file format. Missing or invalid ban list.', 'error');
        return;
      }

      // Validate that all items are strings
      const invalidItems = importData.banList.filter(item => typeof item !== 'string');
      if (invalidItems.length > 0) {
        updateStatus('Invalid file format. Ban list contains non-string values.', 'error');
        return;
      }

      const importList = importData.banList;
      const originalCount = currentBanList.length;
      
      // Merge lists, avoiding duplicates (case-insensitive)
      const newChannels = [];
      importList.forEach(channel => {
        const channelLower = channel.toLowerCase();
        if (!currentBanList.some(existing => existing.toLowerCase() === channelLower)) {
          newChannels.push(channel);
        }
      });

      if (newChannels.length === 0) {
        updateStatus('No new channels to import. All channels are already in your ban list.', 'info');
        return;
      }

      // Show confirmation
      showConfirmModal(
        'Confirm Import',
        `This will add ${newChannels.length} new channels to your ban list. Your current list has ${originalCount} channels.`,
        async () => {
          try {
            const mergedList = [...currentBanList, ...newChannels];
            
            // Save to storage
            const response = await chrome.runtime.sendMessage({ 
              action: 'setBanList', 
              banList: mergedList 
            });
            
            if (response && response.success) {
              currentBanList = mergedList;
              updateStats();
              updateStatus(`Successfully imported ${newChannels.length} new channels. Total: ${mergedList.length}`, 'success');
              
              // Clear file input
              importFile.value = '';
            } else {
              updateStatus('Failed to save imported ban list', 'error');
            }
          } catch (error) {
            console.error('Error saving imported ban list:', error);
            updateStatus('Error saving imported ban list', 'error');
          }
        },
        'Import',
        'btn-success'
      );
      
    } catch (error) {
      console.error('Error parsing import file:', error);
      updateStatus('Invalid JSON file format', 'error');
    }
  };

  /**
   * Clears all banned channels with confirmation
   * @returns {Promise<void>}
   */
  const clearAllBans = async () => {
    if (currentBanList.length === 0) {
      updateStatus('No channels to clear', 'info');
      return;
    }

    showConfirmModal(
      'Clear All Banned Channels',
      `Are you sure you want to remove all ${currentBanList.length} banned channels? This action cannot be undone.`,
      async () => {
        try {
          const response = await chrome.runtime.sendMessage({ action: 'clearBanList' });
          
          if (response && response.success) {
            currentBanList = [];
            updateStats();
            updateStatus('All banned channels cleared successfully', 'success');
          } else {
            updateStatus('Failed to clear ban list', 'error');
          }
        } catch (error) {
          console.error('Error clearing ban list:', error);
          updateStatus('Error clearing ban list', 'error');
        }
      }
    );
  };

  // Event listeners
  exportBtn.addEventListener('click', exportBanList);
  
  importBtn.addEventListener('click', () => {
    importFile.click();
  });
  
  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importBanList(file);
    }
  });
  
  clearAllBtn.addEventListener('click', clearAllBans);
  
  // Modal event listeners
  modalCancel.addEventListener('click', hideConfirmModal);
  
  modalConfirm.addEventListener('click', () => {
    if (pendingAction) {
      pendingAction();
    }
    hideConfirmModal();
  });
  
  // Close modal when clicking outside
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      hideConfirmModal();
    }
  });
  
  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && confirmModal.classList.contains('show')) {
      hideConfirmModal();
    }
  });
  
  // Initial load
  loadBanList();
});
