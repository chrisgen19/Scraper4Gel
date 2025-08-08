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
    return true; // Indicates we will send a response asynchronously
  }

  // Message from popup to start the scraping process
  if (message.action === 'startScraping') {
    state = { ...state, status: 'scraping', progress: 0, data: [], error: '' };
    
    // Inject the content script into the active tab
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
  
  // Message from content script with progress update
  if (message.status === 'progress') {
    state.progress = message.progress;
    return true;
  }

  // Message from content script when scraping is complete
  if (message.status === 'complete') {
    state.status = 'complete';
    state.data = message.data;
    return true;
  }
  
  // Message from content script with an error
  if (message.status === 'error') {
    state.status = 'error';
    state.error = message.error;
    return true;
  }
});