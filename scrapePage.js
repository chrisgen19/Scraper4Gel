async function scrapePage() {
  // --- Helper function to scrape a single product page ---
  async function scrapeProductPage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        return null;
      }
      const text = await response.text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      
      const productName = doc.querySelector('h1.list-title')?.textContent.trim() || 'N/A';
      const price = doc.querySelector('span.price_normal')?.textContent.trim() || 'N/A';
      const sellerName = doc.querySelector('div.business-name')?.textContent.trim() || 'N/A';
      
      const details = {
        Condition: '', Category: '', Make: '', Model: '', Year: '', 'Type of Sale': ''
      };
      
      // A more robust way to find details
      const detailElements = doc.querySelectorAll('div.ad_det_children');
      for (const detailEl of detailElements) {
        const label = detailEl.textContent.replace(':', '').trim();
        if (details.hasOwnProperty(label)) {
          details[label] = detailEl.nextElementSibling?.textContent.trim() || 'N/A';
        }
      }

      return {
        "Product Name": productName,
        "Price": price,
        "Seller": sellerName,
        "Condition": details.Condition,
        "Category": details.Category,
        "Make": details.Make,
        "Model": details.Model,
        "Year": details.Year,
        "Type of Sale": details['Type of Sale'],
        "URL": url
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    }
  }

  // --- Main logic to get links and process them ---
  try {
    // This selector is less brittle, targeting the container directly
    const listingsContainer = document.querySelector('.listings-area');

    if (!listingsContainer) {
        throw new Error("Could not find the listings container (.listings-area).");
    }

    const productLinks = Array.from(listingsContainer.querySelectorAll('.tiled_results.small'))
                               .map(el => el.getAttribute('data-equip_link'))
                               .filter(link => link)
                               .map(link => new URL(link, document.baseURI).href);

    const uniqueLinks = [...new Set(productLinks)];
    const allData = [];
    const totalLinks = uniqueLinks.length;

    if (totalLinks === 0) {
        chrome.runtime.sendMessage({ status: 'complete', data: [] });
        return;
    }

    for (let i = 0; i < totalLinks; i++) {
      const link = uniqueLinks[i];
      const data = await scrapeProductPage(link);
      if (data) {
        allData.push(data);
      }
      const progress = Math.round(((i + 1) / totalLinks) * 100);
      chrome.runtime.sendMessage({ status: 'in_progress', progress: progress });
    }
    
    chrome.runtime.sendMessage({ status: 'complete', data: allData });
  } catch (error) {
    chrome.runtime.sendMessage({ status: 'error', error: error.message });
  }
}

scrapePage();