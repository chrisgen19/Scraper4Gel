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
    const price = doc.querySelector('span.price_normal b')?.textContent.trim() || 'N/A';
    const sellerName = doc.querySelector('.business-name')?.textContent.trim() || 'N/A';

    // --- New Location Scraping Logic ---
    let location = 'N/A';
    const locationElement = doc.querySelector('a[onclick="showAdvertMap()"]');
    if (locationElement) {
        const fullLocationText = locationElement.textContent.trim();
        const locationParts = fullLocationText.split(',');
        if (locationParts.length > 1) {
            // Get the last part (the state) and trim any whitespace
            location = locationParts[locationParts.length - 1].trim();
        } else {
            location = fullLocationText; // Fallback if format is unexpected
        }
    }
    // --- End of New Location Logic ---

    const details = {
      'Condition': 'N/A',
      'Category': 'N/A',
      'Make': 'N/A',
      'Model': 'N/A',
      'Year': 'N/A',
      'Type of Sale': 'N/A'
    };

    const detailElements = doc.querySelectorAll('.ad_det_children');
    detailElements.forEach(element => {
      const label = element.textContent.trim().replace(':', '');
      if (details.hasOwnProperty(label)) {
        const valueElement = element.nextElementSibling;
        if (valueElement) {
          details[label] = valueElement.textContent.trim();
        }
      }
    });

    // --- Reordered return object with updated labels ---
    return {
      "Brand": details.Make,
      "Model": details.Model,
      "Condition": details.Condition,
      "Location": location,
      "Seller": sellerName,
      "Year": details.Year,
      "Price": price,
      "URL": url,
      "AD Title": productName
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

/**
 * Main function to orchestrate the scraping process.
 */
async function main() {
  try {
    // 1. Find the relevant section header. It could be "Listings" or "Search Results".
    let targetPanel = Array.from(document.querySelectorAll('.search-right-head-panel'))
                           .find(panel => {
                             const text = panel.textContent.trim();
                             return text === 'Listings' || text.includes('Search Results');
                           });

    if (!targetPanel) {
      throw new Error("Could not find a 'Listings' or 'Search Results' section.");
    }

    // 2. Precisely find all product tiles between this header and the next one.
    const allTiles = Array.from(document.querySelectorAll('.tiled_results_container'));
    const allPanels = Array.from(document.querySelectorAll('.search-right-head-panel'));
    const targetPanelIndex = allPanels.indexOf(targetPanel);
    const nextPanel = allPanels[targetPanelIndex + 1];

    const targetTiles = allTiles.filter(tile => {
      const isAfterTarget = targetPanel.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_FOLLOWING;
      const isBeforeNext = !nextPanel || (nextPanel.compareDocumentPosition(tile) & Node.DOCUMENT_POSITION_PRECEDING);
      return isAfterTarget && isBeforeNext;
    });

    if (targetTiles.length === 0) {
      throw new Error("No product tiles were found within the target section.");
    }

    // 3. Extract the unique URLs from the correctly filtered tiles.
    const urls = targetTiles.map(tile => tile.querySelector('a.equip_link')?.href);
    const uniqueUrls = [...new Set(urls.filter(url => url))];

    // 4. Scrape each unique URL and report progress.
    const allData = [];
    for (let i = 0; i < uniqueUrls.length; i++) {
      const data = await scrapeDetailedPage(uniqueUrls[i]);
      if (data) {
        allData.push(data);
      }
      const progress = Math.round(((i + 1) / uniqueUrls.length) * 100);
      chrome.runtime.sendMessage({ status: 'progress', progress: progress });
    }

    // 5. Send the final compiled data back to the popup.
    chrome.runtime.sendMessage({ status: 'complete', data: allData });

  } catch (error) {
    chrome.runtime.sendMessage({ status: 'error', error: error.message });
  }
}

main();
