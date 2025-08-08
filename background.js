// background.js

// This is the single source of truth for the extension's state.
let state = {
  status: 'idle', // 'idle', 'scraping', 'complete', 'error'
  progress: 0,
  data: [],
  error: ''
};

// Listen for messages from the popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Message from popup asking for the current state
  if (message.action === 'getState') {
    sendResponse(state);
    return true; 
  }

  // Message from popup to start the scraping process
  if (message.action === 'startScraping') {
    state = { status: 'scraping', progress: 0, data: [], error: '' };
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        });
      }
    });
    return true;
  }
  
  // --- New: Handle the cancel action ---
  if (message.action === 'cancelScraping') {
    state = { status: 'idle', progress: 0, data: [], error: '' };
    // Tell the active content script to stop its work
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { command: 'stopScraping' }, (response) => {
          // This prevents an error from showing in the console if the content script
          // has already been removed or isn't active.
          if (chrome.runtime.lastError) {
            console.log("Scraping was already stopped or content script not available.");
          }
        });
      }
    });
    return true;
  }
  // --- End of new code ---

  // Message from content script with progress update
  if (message.status === 'progress') {
    // Only update progress if we are still in the 'scraping' state
    if (state.status === 'scraping') {
      state.progress = message.progress;
    }
    return true;
  }

  // Message from content script when scraping is complete
  if (message.status === 'complete') {
    if (state.status === 'scraping') {
      state.status = 'complete';
      state.data = message.data;
    }
    return true;
  }
  
  // Message from content script with an error
  if (message.status === 'error') {
    if (state.status === 'scraping') {
      state.status = 'error';
      state.error = message.error;
    }
    return true;
  }
});