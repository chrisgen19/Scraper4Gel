// A flag to control the main scraping loop.
let shouldContinueScraping = true;

// Listen for the stop message from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'stopExecution') {
        console.log('Cancel signal received. Stopping scrape.');
        shouldContinueScraping = false;
        sendResponse({ status: "stopping" });
    }
    // Return true to indicate you might send a response asynchronously
    return true;
});


/**
 * Injects all the necessary HTML and CSS for the visual effects.
 */
function setupVisuals() {
  const style = document.createElement('style');
  style.id = 'scraper-visual-styles';
  style.innerHTML = `
    .scraper-item-container {
      position: relative !important; /* Needed to contain the absolute overlay */
    }
    .scraper-tile-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(26, 32, 44, 0.7);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      border-radius: 8px; /* Match tile's border radius */
      backdrop-filter: blur(5px);
    }
    .scraper-tile-overlay img {
      width: 100px; /* Smaller animation for the tile */
      height: 100px;
    }
    .scraper-tile-overlay p {
      font-size: 18px;
      font-weight: 600;
      margin-top: 10px;
      text-shadow: 0 0 8px black;
    }
    .scraper-item-processed {
      opacity: 0.4;
      transition: opacity 0.5s ease-in-out;
    }
  `;
  document.head.appendChild(style);
}

/**
 * A short delay to allow for smooth scrolling and for the user to see the effect.
 * @param {number} ms - The number of milliseconds to wait.
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches the HTML of a single product page and scrapes the required details.
 * @param {string} url - The URL of the product page to scrape.
 * @returns {Promise<object|null>} A promise that resolves to an object of scraped data or null if an error occurs.
 */
async function scrapeDetailedPage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
            return null;
        }
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');

        const productName = doc.querySelector('h1.list-title')?.textContent.trim() || 'N/A';
        
        let price = '';
        const priceElement = doc.querySelector('span.price_normal b');
        if (priceElement) {
            let rawPriceText = priceElement.textContent.trim();
            if (rawPriceText.includes('-')) {
                const priceParts = rawPriceText.split('-');
                rawPriceText = priceParts[1] || '';
            }
            const numericPrice = rawPriceText.replace(/[^0-9]/g, '');
            if (numericPrice) {
                price = numericPrice;
            }
        }

        const sellerName = doc.querySelector('.business-name')?.textContent.trim() || 'N/A';
        let location = 'N/A';
        const locationElement = doc.querySelector('a[onclick="showAdvertMap()"]');
        if (locationElement) {
            const fullLocationText = locationElement.textContent.trim();
            const locationParts = fullLocationText.split(',');
            location = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : fullLocationText;
        }

        const details = { 'Condition': 'N/A', 'Category': 'N/A', 'Make': 'N/A', 'Model': 'N/A', 'Year': 'N/A', 'Type of Sale': 'N/A' };
        doc.querySelectorAll('.ad_det_children').forEach(element => {
            const label = element.textContent.trim().replace(':', '');
            if (details.hasOwnProperty(label) && element.nextElementSibling) {
                details[label] = element.nextElementSibling.textContent.trim();
            }
        });

        return { "Brand": details.Make, "Model": details.Model, "Condition": details.Condition, "Location": location, "Seller": sellerName, "Year": details.Year, "Price": price, "URL": url, "AD Title": productName };
    } catch (error) {
        console.error(`Error scraping ${url}:`, error);
        return null;
    }
}


/**
 * Main function to orchestrate the scraping process.
 */
async function main() {
    let allTilesForCleanup = [];
    try {
        setupVisuals();

        let targetPanel = Array.from(document.querySelectorAll('.search-right-head-panel'))
                                 .find(panel => panel.textContent.trim() === 'Listings' || panel.textContent.trim().includes('Search Results'));
        if (!targetPanel) throw new Error("Could not find a 'Listings' or 'Search Results' section.");

        const allTiles = Array.from(document.querySelectorAll('.tiled_results_container'));
        allTilesForCleanup = allTiles;
        const allPanels = Array.from(document.querySelectorAll('.search-right-head-panel'));
        const targetPanelIndex = allPanels.indexOf(targetPanel);
        const nextPanel = allPanels[targetPanelIndex + 1];
        const targetTiles = allTiles.filter(tile => {
            const isAfterTarget = targetPanel.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_FOLLOWING;
            const isBeforeNext = !nextPanel || (nextPanel.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_PRECEDING);
            return isAfterTarget && isBeforeNext;
        });

        if (targetTiles.length === 0) throw new Error("No product tiles were found within the target section.");

        targetTiles.forEach(tile => tile.classList.add('scraper-item-container'));

        const uniqueTiles = [...new Map(targetTiles.map(tile => [tile.querySelector('a.equip_link')?.href, tile])).values()];
        const allData = [];

        for (let i = 0; i < uniqueTiles.length; i++) {
            // ✅ Check the flag before processing the next item
            if (!shouldContinueScraping) {
                console.log('Scraping loop terminated.');
                break; // Exit the loop
            }

            const tile = uniqueTiles[i];
            const url = tile.querySelector('a.equip_link')?.href;
            if (!url) continue;
            
            tile.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(500);

            const overlay = document.createElement('div');
            overlay.className = 'scraper-tile-overlay';
            const gifUrl = chrome.runtime.getURL('images/scan.gif');
            overlay.innerHTML = `<img src="${gifUrl}" alt="Scanning..."><p>Scraping...</p>`;
            tile.appendChild(overlay);

            await sleep(200);

            const data = await scrapeDetailedPage(url);
            if (data) {
                allData.push(data);
            }

            overlay.remove();
            tile.classList.add('scraper-item-processed');
            
            const progress = Math.round(((i + 1) / uniqueTiles.length) * 100);
            chrome.runtime.sendMessage({ status: 'progress', progress: progress });
        }
        
        // Only send 'complete' if the loop finished naturally (wasn't cancelled)
        if (shouldContinueScraping) {
            chrome.runtime.sendMessage({ status: 'complete', data: allData });
        }

    } catch (error) {
      // Only send an error message if the process wasn't cancelled by the user
      if (shouldContinueScraping) { 
          chrome.runtime.sendMessage({ status: 'error', error: error.message });
      }
    } finally {
        // This cleanup runs regardless of how the try block exits (complete, error, or cancel)
        console.log('Cleaning up visuals...');
        document.getElementById('scraper-visual-styles')?.remove();
        allTilesForCleanup.forEach(tile => {
            tile.classList.remove('scraper-item-container', 'scraper-item-processed');
            const overlay = tile.querySelector('.scraper-tile-overlay');
            if (overlay) {
                overlay.remove();
            }
        });
    }
}

// Start the scraping process
main();