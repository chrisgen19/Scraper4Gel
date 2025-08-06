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
    
    // --- New & Improved Price Scraping Logic ---
    let price = 'N/A';
    const priceElement = doc.querySelector('span.price_normal b');
    if (priceElement) {
        let rawPriceText = priceElement.textContent.trim();

        // Check if the price is a range (contains '-')
        if (rawPriceText.includes('-')) {
            // Split by the hyphen and take the second part (the higher value)
            const priceParts = rawPriceText.split('-');
            rawPriceText = priceParts[1] || ''; // Use the part after the hyphen
        }

        // Remove all non-numeric characters from the selected price string
        const numericPrice = rawPriceText.replace(/[^0-9]/g, '');

        if (numericPrice) { // If we have a number, use it
            price = numericPrice;
        } else {
            // Otherwise, it might be "Ask for Price" or something similar, so keep the original full text
            price = priceElement.textContent.trim();
        }
    }
    // --- End of New Price Logic ---

    const sellerName = doc.querySelector('.business-name')?.textContent.trim() || 'N/A';

    // --- Location Scraping Logic ---
    let location = 'N/A';
    const locationElement = doc.querySelector('a[onclick="showAdvertMap()"]');
    if (locationElement) {
        const fullLocationText = locationElement.textContent.trim();
        const locationParts = fullLocationText.split(',');
        if (locationParts.length > 1) {
            location = locationParts[locationParts.length - 1].trim();
        } else {
            location = fullLocationText;
        }
    }
    // --- End of Location Logic ---

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
    let targetPanel = Array.from(document.querySelectorAll('.search-right-head-panel'))
                            .find(panel => {
                              const text = panel.textContent.trim();
                              return text === 'Listings' || text.includes('Search Results');
                            });

    if (!targetPanel) {
      throw new Error("Could not find a 'Listings' or 'Search Results' section.");
    }

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

    const urls = targetTiles.map(tile => tile.querySelector('a.equip_link')?.href);
    const uniqueUrls = [...new Set(urls.filter(url => url))];

    const allData = [];
    for (let i = 0; i < uniqueUrls.length; i++) {
      const data = await scrapeDetailedPage(uniqueUrls[i]);
      if (data) {
        allData.push(data);
      }
      const progress = Math.round(((i + 1) / uniqueUrls.length) * 100);
      chrome.runtime.sendMessage({ status: 'progress', progress: progress });
    }

    chrome.runtime.sendMessage({ status: 'complete', data: allData });

  } catch (error) {
    chrome.runtime.sendMessage({ status: 'error', error: error.message });
  }
}

main();