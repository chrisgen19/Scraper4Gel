// background.js

// This is the single source of truth for the extension's state.
let state = {
  status: 'idle', // 'idle', 'scraping', 'complete', 'error', 'cancelled'
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
    
    // First, reload the tab. Then, inject the script once reloading is complete.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        
        // Listener for when the tab is fully reloaded
        const listener = (updatedTabId, changeInfo) => {
          if (updatedTabId === tabId && changeInfo.status === 'complete') {
            // The tab is reloaded, now inject the content script
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            });
            // Remove the listener so it doesn't fire again
            chrome.tabs.onUpdated.removeListener(listener);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);
        chrome.tabs.reload(tabId);
      }
    });
    sendResponse({status: "reloading"}); // Inform popup that page is reloading
    return true;
  }

  // Message from popup to cancel the scraping process
  if (message.action === 'cancelScraping') {
    state = { status: 'idle', progress: 0, data: [], error: '' }; // Reset state
    // Tell the active content script to stop its execution
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'stopExecution' });
      }
    });
    sendResponse({status: "cancelled"});
    return true;
  }
  
  // Message from content script with progress update
  if (message.status === 'progress') {
    state.progress = message.progress;
    // Also broadcast this change to the popup if it's open
    chrome.runtime.sendMessage({ status: 'update', newState: state });
    return true;
  }

  // Message from content script when scraping is complete
  if (message.status === 'complete') {
    state.status = 'complete';
    state.data = message.data;
    chrome.runtime.sendMessage({ status: 'update', newState: state });
    return true;
  }
  
  // Message from content script with an error
  if (message.status === 'error') {
    state.status = 'error';
    state.error = message.error;
    chrome.runtime.sendMessage({ status: 'update', newState: state });
    return true;
  }
});