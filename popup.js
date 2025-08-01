let scrapedData = [];

// Function to generate a default filename from the URL
function generateFilenameFromUrl(url) {
  try {
    const urlObject = new URL(url);
    const pathParts = urlObject.pathname.split('/').filter(part => part); // Split and remove empty parts
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    // Use the last two parts of the path for the filename, or a default
    let name = 'machines4u-scrape';
    if (pathParts.length >= 2) {
      name = `${pathParts[pathParts.length - 2]}-${pathParts[pathParts.length - 1]}`;
    } else if (pathParts.length === 1) {
      name = pathParts[0];
    }
    
    return `${name}-${dateString}.csv`;
  } catch (error) {
    console.error("Error generating filename:", error);
    // Fallback filename
    const today = new Date().toISOString().split('T')[0];
    return `machines4u-scrape-${today}.csv`;
  }
}


document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('startScrapeBtn');
  const statusDiv = document.getElementById('status');
  const downloadSection = document.getElementById('downloadSection');
  const downloadBtn = document.getElementById('downloadBtn');
  const filenameInput = document.getElementById('filenameInput');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');

  // Set default filename on popup open
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      filenameInput.value = generateFilenameFromUrl(tabs[0].url);
    }
  });

  startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    downloadSection.style.display = 'none';
    statusDiv.textContent = 'Gathering links...';
    progressBar.style.width = '0%';
    progressContainer.style.display = 'block';
    scrapedData = [];

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      });
    });
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.status === 'progress') {
      statusDiv.textContent = `Scraping... (${message.progress}%)`;
      progressBar.style.width = `${message.progress}%`;
    } else if (message.status === 'complete') {
      scrapedData = message.data;
      statusDiv.textContent = `Scraping Complete! ${scrapedData.length} items found.`;
      progressContainer.style.display = 'none';
      if (scrapedData.length > 0) {
        downloadSection.style.display = 'block';
      }
      startBtn.disabled = false;
    } else if (message.status === 'error') {
      statusDiv.textContent = `Error: ${message.error}`;
      progressContainer.style.display = 'none';
      startBtn.disabled = false;
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
      // Use the filename from the input field
      const filename = filenameInput.value || 'machines4u-scrape.csv';

      chrome.downloads.download({
        url: encodedUri,
        filename: filename,
        saveAs: true
      });
    }
  });
});
