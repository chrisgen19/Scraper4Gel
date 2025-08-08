// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startScrapeBtn');
  const cancelBtn = document.getElementById('cancelScrapeBtn');
  const statusDiv = document.getElementById('status');
  const downloadSection = document.getElementById('downloadSection');
  const downloadBtn = document.getElementById('downloadBtn');
  const filenameInput = document.getElementById('filenameInput');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  let scrapedData = [];

  // Function to update the UI based on the state received from the background
  function updateUI(state) {
    if (!state) return;
    
    scrapedData = state.data || [];
    
    switch(state.status) {
      case 'idle':
        statusDiv.textContent = 'Ready';
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        cancelBtn.style.display = 'none';
        progressContainer.style.display = 'none';
        downloadSection.style.display = 'none';
        break;

      case 'scraping':
        statusDiv.textContent = `Scraping... (${state.progress}%)`;
        progressBar.style.width = `${state.progress}%`;
        startBtn.disabled = true;
        startBtn.style.display = 'none';
        cancelBtn.style.display = 'block';
        progressContainer.style.display = 'block';
        downloadSection.style.display = 'none';
        break;

      case 'complete':
        statusDiv.textContent = `Scraping Complete! ${scrapedData.length} items found.`;
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        cancelBtn.style.display = 'none';
        progressContainer.style.display = 'none';
        if (scrapedData.length > 0) {
          downloadSection.style.display = 'block';
        }
        break;

      case 'error':
        statusDiv.textContent = `Error: ${state.error}`;
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        cancelBtn.style.display = 'none';
        progressContainer.style.display = 'none';
        downloadSection.style.display = 'none';
        break;
    }
  }

  // When the popup opens, immediately ask the background script for the current state
  chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
    if (chrome.runtime.lastError) {
        console.log("Error getting state:", chrome.runtime.lastError.message);
    } else if (response) {
      updateUI(response);
    }
  });

  // Function to generate a default filename from the URL
  function generateFilenameFromUrl(url) {
    try {
      const urlObject = new URL(url);
      const pathParts = urlObject.pathname.split('/').filter(part => part);
      const today = new Date();
      const dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      let name = 'machines4u-scrape';
      if (pathParts.length >= 2) {
        name = `${pathParts[pathParts.length - 2]}-${pathParts[pathParts.length - 1]}`;
      } else if (pathParts.length === 1 && pathParts[0]) {
        name = pathParts[0];
      }
      return `${name}-${dateString}.csv`;
    } catch (error) {
      const today = new Date().toISOString().split('T')[0];
      return `machines4u-scrape-${today}.csv`;
    }
  }

  // Set default filename on popup open
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      filenameInput.value = generateFilenameFromUrl(tabs[0].url);
    }
  });

  // When start button is clicked, send a message to the background script
  startBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'startScraping' });
    // Optimistically update the UI so it feels responsive
    statusDiv.textContent = 'Reloading page...';
    startBtn.disabled = true;
  });

  // When cancel button is clicked, send a message to the background script
  cancelBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'cancelScraping' });
    // Optimistically update the UI
    updateUI({ status: 'idle' });
  });

  // Listen for real-time updates pushed from the background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.status === 'update' && message.newState) {
        updateUI(message.newState);
    }
  });


  downloadBtn.addEventListener('click', () => {
    if (scrapedData.length > 0) {
      let csvContent = "data:text/csv;charset=utf-8,";
      const headers = Object.keys(scrapedData[0]).join(",");
      csvContent += headers + "\r\n";
      scrapedData.forEach(item => {
        const row = Object.values(item).map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
        csvContent += row + "\r\n";
      });
      const encodedUri = encodeURI(csvContent);
      const filename = filenameInput.value || 'machines4u-scrape.csv';
      chrome.downloads.download({
        url: encodedUri,
        filename: filename,
        saveAs: true
      });
    }
  });
});